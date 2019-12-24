import { equalCT } from "./encoding";
import {
    API,
    RequestEmailVerificationParams,
    CompleteEmailVerificationParams,
    InitAuthParams,
    InitAuthResponse,
    CreateAccountParams,
    RecoverAccountParams,
    CreateSessionParams,
    GetInviteParams,
    GetAttachmentParams,
    DeleteAttachmentParams
} from "./api";
import { Storage, VoidStorage } from "./storage";
import { Attachment, AttachmentStorage } from "./attachment";
import { Session, SessionID } from "./session";
import { Account } from "./account";
import { Auth } from "./auth";
import { EmailVerification } from "./email-verification";
import { Request, Response } from "./transport";
import { Err, ErrorCode } from "./error";
import { Vault, VaultID } from "./vault";
import { Org, OrgID, OrgRole } from "./org";
import { Invite } from "./invite";
import { Messenger } from "./messenger";
import { Server as SRPServer } from "./srp";
import { DeviceInfo } from "./platform";
import { uuid } from "./util";
import { EmailVerificationMessage, InviteCreatedMessage, InviteAcceptedMessage, MemberAddedMessage } from "./messages";
import { BillingProvider, UpdateBillingParams, BillingAddress } from "./billing";
import { AccountQuota, OrgQuota } from "./quota";
import { loadLanguage, translate as $l } from "@padloc/locale/src/translate";
import { Logger } from "./log";

const pendingAuths = new Map<string, SRPServer>();

/** Server configuration */
export class ServerConfig {
    /** URL where the client interface is hosted. Used for creating links into the application */
    clientUrl = "";

    /** Email address to report critical errors to */
    reportErrors = "";

    /** Multi-factor authentication mode used for login */
    mfa: "email" | "none" = "email";

    /** Maximum accepted request age */
    maxRequestAge = 60 * 60 * 1000;

    /** Default quota applied to new accounts */
    accountQuota?: Partial<AccountQuota>;

    /** Default quota applied to new Orgs */
    orgQuota?: Partial<OrgQuota>;

    constructor(vals?: Partial<ServerConfig>) {
        if (vals) {
            Object.assign(this, vals);
        }
    }
}

/**
 * Request context
 */
export interface Context {
    /** Current [[Session]] */
    session?: Session;

    /** [[Account]] associated with current session */
    account?: Account;

    /** Information about the device the request is coming from */
    device?: DeviceInfo;
}

/**
 * Controller class for processing api requests
 */
export class Controller implements API {
    constructor(
        public context: Context,
        /** Server config */
        public config: ServerConfig,
        /** Storage for persisting data */
        public storage: Storage,
        /** [[Messenger]] implemenation for sending messages to users */
        public messenger: Messenger,
        public logger: Logger,
        /** Attachment storage */
        public attachmentStorage: AttachmentStorage,
        public billingProvider?: BillingProvider
    ) {}

    async log(type: string, data: any = {}) {
        const acc = this.context.account;
        this.logger.log(type, {
            account: acc && { email: acc.email, id: acc.id, name: acc.name },
            device: this.context.device && this.context.device.toRaw(),
            ...data
        });
    }

    async requestEmailVerification({ email, purpose }: RequestEmailVerificationParams) {
        const v = new EmailVerification(email, purpose);
        await v.init();
        await this.storage.save(v);
        this.messenger.send(email, new EmailVerificationMessage(v));
        this.log("verifyemail.request", { email, purpose });
    }

    async completeEmailVerification({ email, code }: CompleteEmailVerificationParams) {
        try {
            const token = await this._checkEmailVerificationCode(email, code);
            this.log("verifyemail.complete", { email, success: true });
            return token;
        } catch (e) {
            this.log("verifyemail.complete", { email, success: false });
            throw e;
        }
    }

    async initAuth({ email, verify }: InitAuthParams): Promise<InitAuthResponse> {
        let auth: Auth | null = null;

        try {
            auth = await this.storage.get(Auth, email);
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        this.logger.log("auth.init", { email, account: auth && { email, id: auth.account } });

        const deviceTrusted =
            auth && this.context.device && auth.trustedDevices.some(({ id }) => id === this.context.device!.id);

        if (this.config.mfa !== "none" && !deviceTrusted) {
            if (!verify) {
                throw new Err(ErrorCode.EMAIL_VERIFICATION_REQUIRED);
            } else {
                this._checkEmailVerificationToken(email, verify);
            }
        }

        if (!auth) {
            // The user has successfully verified their email address so it's safe to
            // tell them that this account doesn't exist.
            throw new Err(ErrorCode.NOT_FOUND, "An account with this email does not exist!");
        }

        // Initiate SRP key exchange using the accounts verifier. This also
        // generates the random `B` value which will be passed back to the
        // client.
        const srp = new SRPServer();
        await srp.initialize(auth.verifier!);

        // Store SRP context so it can be picked back up in [[createSession]]
        pendingAuths.set(auth.account, srp);

        return new InitAuthResponse({
            account: auth.account,
            keyParams: auth.keyParams,
            B: srp.B!
        });
    }

    async updateAuth(auth: Auth): Promise<void> {
        const { account } = this._requireAuth();

        // Auth information can only be updated by the corresponding account
        if (account.email !== auth.email) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        await this.storage.save(auth);

        this.log("auth.update");
    }

    async createSession({ account, A, M }: CreateSessionParams): Promise<Session> {
        // Get the pending SRP context for the given account
        const srp = pendingAuths.get(account);

        if (!srp) {
            this.log("login", { account: { id: account }, success: false });
            throw new Err(ErrorCode.INVALID_CREDENTIALS);
        }

        // Apply `A` received from the client to the SRP context. This will
        // compute the common session key and verification value.
        await srp.setA(A);

        // Verify `M`, which is the clients way of proving that they know the
        // accounts master password. This also guarantees that the session key
        // computed by the client and server are identical an can be used for
        // authentication.
        if (!equalCT(M, srp.M1!)) {
            this.log("login", { account: { id: account }, success: false });
            throw new Err(ErrorCode.INVALID_CREDENTIALS);
        }

        // Fetch the account in question
        const acc = await this.storage.get(Account, account);

        // Create a new session object
        const session = new Session();
        session.id = await uuid();
        session.created = new Date();
        session.account = account;
        session.device = this.context.device;
        session.key = srp.K!;

        // Add the session to the list of active sessions
        acc.sessions.push(session);

        // Persist changes
        await Promise.all([this.storage.save(session), this.storage.save(acc)]);

        // Delete pending SRP context
        pendingAuths.delete(account);

        // Add device to trusted devices
        const auth = await this.storage.get(Auth, acc.email);
        if (this.context.device && !auth.trustedDevices.some(({ id }) => equalCT(id, this.context.device!.id))) {
            auth.trustedDevices.push(this.context.device);
        }
        await this.storage.save(auth);

        // Although the session key is secret in the sense that it should never
        // be transmitted between client and server, it still needs to be
        // stored on both sides, which is why it is included in the [[Session]]
        // classes serialization. So we have to make sure to remove the key
        // explicitly before returning.
        delete session.key;

        this.log("login", { account: { email: acc.email, id: acc.id }, success: true });

        return session;
    }

    async revokeSession(id: SessionID) {
        const { account } = this._requireAuth();

        const session = await this.storage.get(Session, id);

        if (session.account !== account.id) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const i = account.sessions.findIndex(s => s.id === id);
        account.sessions.splice(i, 1);

        await Promise.all([this.storage.delete(session), this.storage.save(account)]);

        this.log("logout");
    }

    async createAccount({ account, auth, verify }: CreateAccountParams): Promise<Account> {
        await this._checkEmailVerificationToken(account.email, verify);

        // Make sure account does not exist yet
        try {
            await this.storage.get(Auth, auth.id);
            throw new Err(ErrorCode.ACCOUNT_EXISTS, "This account already exists!");
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        // Most of the account object is constructed locally but account id and
        // revision are exclusively managed by the server
        account.id = await uuid();
        account.revision = await uuid();
        auth.account = account.id;

        // Add device to trusted devices
        if (this.context.device && !auth.trustedDevices.some(({ id }) => id === this.context.device!.id)) {
            auth.trustedDevices.push(this.context.device);
        }

        // Provision the private vault for this account
        const vault = new Vault();
        vault.id = await uuid();
        vault.name = "My Vault";
        vault.owner = account.id;
        vault.created = new Date();
        vault.updated = new Date();
        account.mainVault = vault.id;

        // Set default account quota
        if (this.config.accountQuota) {
            Object.assign(account.quota, this.config.accountQuota);
        }

        // Persist data
        await Promise.all([this.storage.save(account), this.storage.save(vault), this.storage.save(auth)]);

        if (this.billingProvider) {
            await this.billingProvider.update(
                new UpdateBillingParams({
                    email: account.email,
                    account: account.id,
                    address: new BillingAddress({ name: account.name })
                })
            );
        }

        account = await this.storage.get(Account, account.id);

        this.log("account.create", { account: { email: account.email, id: account.id, name: account.name } });

        return account;
    }

    async getAccount() {
        const { account } = this._requireAuth();
        this.log("account.get");
        return account;
    }

    async updateAccount({ name, email, publicKey, keyParams, encryptionParams, encryptedData, revision }: Account) {
        const { account } = this._requireAuth();

        // Check the revision id to make sure the changes are based on the most
        // recent version stored on the server. This is to ensure continuity in
        // case two clients try to make changes to an account at the same time.
        if (revision !== account.revision) {
            throw new Err(ErrorCode.OUTDATED_REVISION);
        }

        // Update revision id
        account.revision = await uuid();

        const nameChanged = account.name !== name;

        // Update account object
        Object.assign(account, { name, email, publicKey, keyParams, encryptionParams, encryptedData });

        // Persist changes
        account.updated = new Date();
        await this.storage.save(account);

        // If the accounts name has changed, well need to update the
        // corresponding member object on all organizations this account is a
        // member of.
        if (nameChanged) {
            for (const id of account.orgs) {
                const org = await this.storage.get(Org, id);
                org.getMember(account)!.name = name;
                await this.storage.save(org);
            }
        }

        this.log("account.update");

        return account;
    }

    async recoverAccount({
        account: { email, publicKey, keyParams, encryptionParams, encryptedData },
        auth,
        verify
    }: RecoverAccountParams) {
        // Check the email verification token
        await this._checkEmailVerificationToken(auth.email, verify);

        // Find the existing auth information for this email address
        const existingAuth = await this.storage.get(Auth, auth.email);

        // Fetch existing account
        const account = await this.storage.get(Account, existingAuth.account);

        // Update account object
        Object.assign(account, { email, publicKey, keyParams, encryptionParams, encryptedData });

        // Create a new private vault, discarding the old one
        const mainVault = new Vault();
        mainVault.id = account.mainVault;
        mainVault.name = $l("My Vault");
        mainVault.owner = account.id;
        mainVault.created = new Date();
        mainVault.updated = new Date();

        // The new auth object has all the information except the account id
        auth.account = account.id;
        this.context.device && auth.trustedDevices.push(this.context.device);

        // Revoke all sessions
        await account.sessions.map(s => this.storage.delete(Object.assign(new Session(), s)));

        // Suspend memberships for all orgs that the account is not the owner of.
        // Since the accounts public key has changed, they will need to go through
        // the invite flow again to confirm their membership.
        for (const id of account.orgs) {
            const org = await this.storage.get(Org, id);
            if (!org.isOwner(account)) {
                const member = org.getMember(account)!;
                member.role = OrgRole.Suspended;
                await this.storage.save(org);
            }
        }

        // Persist changes
        await Promise.all([this.storage.save(account), this.storage.save(auth), this.storage.save(mainVault)]);

        this.log("account.recover", { account: { email: account.email, id: account.id, name: account.name } });

        return account;
    }

    async deleteAccount() {
        const { account } = this._requireAuth();

        // Make sure that the account is not owner of any organizations
        const orgs = await Promise.all(account.orgs.map(org => this.storage.get(Org, org)));
        if (orgs.some(org => org.isOwner(account))) {
            throw new Err(
                ErrorCode.BAD_REQUEST,
                "This account is the owner of one or more organizations and cannot " +
                    "be deleted. Please delete all your owned organizations first!"
            );
        }

        for (const org of orgs) {
            org.removeMember(account);
            await this.storage.save(org);
        }

        // Delete billing info with billing provider
        if (account.billing && this.billingProvider) {
            await this.billingProvider.delete(account.billing);
        }

        // Delete main vault
        await this.storage.delete(Object.assign(new Vault(), { id: account.mainVault }));

        // Revoke all sessions
        await account.sessions.map(s => this.storage.delete(Object.assign(new Session(), s)));

        // Delete auth object
        await this.storage.delete(new Auth(account.email));

        // Delete account object
        await this.storage.delete(account);

        this.log("account.delete");
    }

    async createOrg(org: Org) {
        const { account } = this._requireAuth();

        if (!org.name) {
            throw new Err(ErrorCode.BAD_REQUEST, "Please provide an organization name!");
        }

        const existingOrgs = await Promise.all(account.orgs.map(id => this.storage.get(Org, id)));
        const ownedOrgs = existingOrgs.filter(o => o.owner === account.id);

        if (account.quota.orgs !== -1 && ownedOrgs.length >= account.quota.orgs) {
            throw new Err(
                ErrorCode.ORG_QUOTA_EXCEEDED,
                "You have reached the maximum number of organizations for this account!"
            );
        }

        org.id = await uuid();
        org.revision = await uuid();
        org.owner = account.id;
        org.created = new Date();
        org.updated = new Date();

        // set default org quota
        if (this.config.orgQuota) {
            Object.assign(org.quota, this.config.orgQuota);
        }

        await this.storage.save(org);

        this.log("org.create", { org: { name: org.name, id: org.id, type: org.type } });

        return org;
    }

    async getOrg(id: OrgID) {
        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, id);

        // Only members can read organization data. For non-members,
        // we pretend the organization doesn't exist.
        if (org.owner !== account.id && !org.isMember(account)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        this.log("org.get", { org: { name: org.name, id: org.id, type: org.type } });

        return org;
    }

    async updateOrg({
        id,
        name,
        publicKey,
        keyParams,
        encryptionParams,
        encryptedData,
        signingParams,
        accessors,
        members,
        groups,
        vaults,
        invites,
        revision,
        minMemberUpdated
    }: Org) {
        const { account } = this._requireAuth();

        // Get existing org based on the id
        const org = await this.storage.get(Org, id);

        if (org.frozen) {
            throw new Err(
                ErrorCode.ORG_FROZEN,
                'You can not make any updates to an organization while it is in "frozen" state!'
            );
        }

        // Check the revision id to make sure the changes are based on the most
        // recent version stored on the server. This is to ensure continuity in
        // case two clients try to make changes to an organization at the same
        // time.
        if (revision !== org.revision) {
            throw new Err(ErrorCode.OUTDATED_REVISION);
        }

        const isOwner = org.owner === account.id || org.isOwner(account);
        const isAdmin = isOwner || org.isAdmin(account);

        // Only admins can make any changes to organizations at all.
        if (!isAdmin) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Only admins can make changes to organizations!");
        }

        // Verify that `minMemberUpdated` is equal to or larger than the previous value
        if (minMemberUpdated < org.minMemberUpdated) {
            throw new Err(
                ErrorCode.BAD_REQUEST,
                "`minMemberUpdated` property needs to be equal to or larger than the previous one!"
            );
        }

        const addedMembers = members.filter(m => !org.isMember(m));
        const removedMembers = org.members.filter(({ id }) => !members.some(m => id === m.id));
        const addedInvites = invites.filter(({ id }) => !org.getInvite(id));

        // Only org owners can add or remove members, change roles or create invites
        if (
            !isOwner &&
            (addedMembers.length ||
                removedMembers.length ||
                addedInvites.length ||
                members.some(({ id, role }) => {
                    const member = org.getMember({ id });
                    return !member || member.role !== role;
                }))
        ) {
            throw new Err(
                ErrorCode.INSUFFICIENT_PERMISSIONS,
                "Only organization owners can add or remove members, change roles or create invites!"
            );
        }

        // New invites
        for (const invite of addedInvites) {
            let link = `${this.config.clientUrl}/invite/${org.id}/${invite.id}?email=${invite.email}`;

            // If account does not exist yet, create a email verification code
            // and send it along with the url so they can skip that step
            try {
                await this.storage.get(Auth, invite.email);
            } catch (e) {
                if (e.code !== ErrorCode.NOT_FOUND) {
                    throw e;
                }
                // account does not exist yet; add verification code to link
                const v = new EmailVerification(invite.email);
                await v.init();
                await this.storage.save(v);
                link += `&verify=${v.token}`;
            }

            // Send invite link to invitees email address
            this.messenger.send(invite.email, new InviteCreatedMessage(invite, link));
        }

        // Removed members
        for (const { id } of removedMembers) {
            const acc = await this.storage.get(Account, id);
            acc.orgs = acc.orgs.filter(id => id !== org.id);
            await this.storage.save(acc);
        }

        // Update any changed vault names
        for (const { id, name } of org.vaults) {
            const newVaultEntry = vaults.find(v => v.id === id);
            if (newVaultEntry && newVaultEntry.name !== name) {
                const vault = await this.storage.get(Vault, id);
                vault.name = newVaultEntry.name;
                await this.storage.save(vault);
            }
        }

        Object.assign(org, {
            members,
            groups,
            vaults
        });

        // certain properties may only be updated by organization owners
        if (isOwner) {
            Object.assign(org, {
                name,
                publicKey,
                keyParams,
                encryptionParams,
                encryptedData,
                signingParams,
                accessors,
                invites,
                minMemberUpdated
            });
        }

        // Check members quota
        if (org.quota.members !== -1 && members.length > org.quota.members) {
            throw new Err(
                ErrorCode.MEMBER_QUOTA_EXCEEDED,
                "You have reached the maximum number of members for this organization!"
            );
        }

        // Check groups quota
        if (org.quota.groups !== -1 && groups.length > org.quota.groups) {
            throw new Err(
                ErrorCode.GROUP_QUOTA_EXCEEDED,
                "You have reached the maximum number of groups for this organization!"
            );
        }

        // Added members
        for (const member of addedMembers) {
            const acc = await this.storage.get(Account, member.id);
            acc.orgs.push(org.id);
            await this.storage.save(acc);

            if (member.id !== account.id) {
                // Send a notification email to let the new member know they've been added
                this.messenger.send(
                    member.email,
                    new MemberAddedMessage(org, `${this.config.clientUrl}/org/${org.id}`)
                );
            }
        }

        // Update revision
        org.revision = await uuid();
        org.updated = new Date();

        await this.storage.save(org);

        this.log("org.update", { org: { name: org.name, id: org.id, type: org.type } });

        return org;
    }

    async deleteOrg(id: OrgID) {
        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, id);

        if (!org.isOwner(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        // Delete all associated vaults
        await Promise.all(org.vaults.map(v => this.storage.delete(Object.assign(new Vault(), v))));

        // Remove org from all member accounts
        await Promise.all(
            org.members.map(async member => {
                const acc = await this.storage.get(Account, member.id);
                acc.orgs = acc.orgs.filter(id => id !== org.id);
                await this.storage.save(acc);
            })
        );

        if (this.billingProvider && org.billing) {
            await this.billingProvider.delete(org.billing);
        }

        await this.storage.delete(org);

        this.log("org.delete", { org: { name: org.name, id: org.id, type: org.type } });
    }

    async getVault(id: VaultID) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        // Accounts can only read their private vaults and vaults they have been assigned to
        // on an organization level. For everyone else, pretend like the vault doesn't exist.
        if ((org && !org.canRead(vault, account)) || (!org && vault.owner !== account.id)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        this.log("vault.get", {
            vault: { id: vault.id, name: vault.name },
            org: org && { id: org.id, name: org.name, type: org.type }
        });

        return vault;
    }

    async updateVault({ id, keyParams, encryptionParams, accessors, encryptedData, revision }: Vault) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        // Accounts can only read their private vaults and vaults they have been assigned to
        // on an organization level. For everyone else, pretend like the vault doesn't exist.
        if ((org && !org.canRead(vault, account)) || (!org && vault.owner !== account.id)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        // Vaults can only be updated by accounts that have explicit write access
        if (org && !org.canWrite(vault, account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        if (org && org.frozen) {
            throw new Err(
                ErrorCode.ORG_FROZEN,
                'You can not make any updates to a vault while it\'s organization is in "frozen" state!'
            );
        }

        // Check the revision id to make sure the changes are based on the most
        // recent version stored on the server. This is to ensure continuity in
        // case two clients try to make changes to an organization at the same
        // time.
        if (revision !== vault.revision) {
            throw new Err(ErrorCode.OUTDATED_REVISION);
        }
        vault.revision = await uuid();

        // Update vault properties
        Object.assign(vault, { keyParams, encryptionParams, accessors, encryptedData });
        vault.updated = new Date();

        // Persist changes
        await this.storage.save(vault);

        this.log("vault.update", {
            vault: { id: vault.id, name: vault.name },
            org: org && { id: org.id, name: org.name, type: org.type }
        });

        return vault;
    }

    async createVault(vault: Vault) {
        const { account } = this._requireAuth();

        // Explicitly creating vaults only works in the context of an
        // organization (private vaults are created automatically)
        if (!vault.org) {
            throw new Err(ErrorCode.BAD_REQUEST, "Shared vaults have to be attached to an organization.");
        }

        const org = await this.storage.get(Org, vault.org.id);

        // Only admins can create new vaults for an organization
        if (!org.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        // Create vault object
        vault.id = await uuid();
        vault.owner = account.id;
        vault.created = vault.updated = new Date();
        vault.revision = await uuid();

        // Add to organization
        org.vaults.push({ id: vault.id, name: vault.name });
        org.revision = await uuid();

        // Check vault quota of organization
        if (org.quota.vaults !== -1 && org.vaults.length > org.quota.vaults) {
            throw new Err(
                ErrorCode.VAULT_QUOTA_EXCEEDED,
                "You have reached the maximum number of vaults for this organization!"
            );
        }

        // Persist cahnges
        await Promise.all([this.storage.save(vault), this.storage.save(org)]);

        this.log("vault.create", {
            vault: { id: vault.id, name: vault.name },
            org: org && { id: org.id, name: org.name, type: org.type }
        });

        return vault;
    }

    async deleteVault(id: VaultID) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);

        // Only vaults that have been created in the context of an
        // organization can be deleted (private vaults are managed
        // by the server implicitly)
        if (!vault.org) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const org = await this.storage.get(Org, vault.org.id);

        // Only org admins can delete vaults
        if (!org.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        // Delete vault
        const promises = [this.storage.delete(vault)];

        // Delete all attachments associated with this vault
        promises.push(this.attachmentStorage.deleteAll(vault.id));

        // Remove vault from org
        org.vaults = org.vaults.filter(v => v.id !== vault.id);

        // Remove any assignments to this vault from members and groups
        for (const each of [...org.getGroupsForVault(vault), ...org.getMembersForVault(vault)]) {
            each.vaults = each.vaults.filter(v => v.id !== vault.id);
        }

        // Save org
        promises.push(this.storage.save(org));

        await Promise.all(promises);

        this.log("vault.delete", {
            vault: { id: vault.id, name: vault.name },
            org: org && { id: org.id, name: org.name, type: org.type }
        });
    }

    async getInvite({ org: orgId, id }: GetInviteParams) {
        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, orgId);
        const invite = org.getInvite(id);

        if (
            !invite ||
            // User may only see invite if they are a vault owner or the invite recipient
            (!org.isOwner(account) && invite.email !== account.email)
        ) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        this.log("invite.get", {
            invite: { id: invite.id, email: invite.email },
            org: { id: org.id, name: org.name, type: org.type }
        });

        return invite;
    }

    async acceptInvite(invite: Invite) {
        // Passed invite object need to have *accepted* status
        if (!invite.accepted) {
            throw new Err(ErrorCode.BAD_REQUEST);
        }

        const { account } = this._requireAuth();

        // Get existing invite object
        const org = await this.storage.get(Org, invite.org.id);
        const existing = org.getInvite(invite.id);

        if (!existing) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        // Only the invite recipient can accept the invite
        if (existing.email !== account.email) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Only the invite recipient can accept the invite.");
        }

        if (!existing.accepted && invite.invitedBy) {
            // Send message to the creator of the invite notifying them that
            // the recipient has accepted the invite
            this.messenger.send(
                invite.invitedBy.email,
                new InviteAcceptedMessage(invite, `${this.config.clientUrl}/invite/${org.id}/${invite.id}`)
            );
        }

        // Update invite object
        org.invites[org.invites.indexOf(existing)] = invite;

        // Persist changes
        await this.storage.save(org);

        this.log("invite.accept", {
            invite: { id: invite.id, email: invite.email },
            org: { id: org.id, name: org.name, type: org.type }
        });
    }

    async createAttachment(att: Attachment) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, att.vault);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        const allowed = org ? org.canWrite(vault, account) : vault.owner === account.id;

        if (!allowed) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        att.id = await uuid();

        const currentUsage = org ? org.usedStorage : account.usedStorage;
        const quota = org ? org.quota : account.quota;

        if (quota.storage !== -1 && currentUsage + att.size > quota.storage * 1e9) {
            throw new Err(
                ErrorCode.STORAGE_QUOTA_EXCEEDED,
                org
                    ? "You have reached the storage limit for this organization!"
                    : "You have reached the storage limit for this account!"
            );
        }

        await this.attachmentStorage.put(att);

        await this._updateUsedStorage(org || account);

        this.log("attachment.create", {
            attachment: { type: att.type, size: att.size, id: att.id },
            vault: { id: vault.id, name: vault.name },
            org: org && { id: org!.id, name: org!.name, type: org!.type }
        });

        return att;
    }

    async getAttachment({ id, vault: vaultId }: GetAttachmentParams) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, vaultId);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        const allowed = org ? org.canRead(vault, account) : vault.owner === account.id;

        if (!allowed) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const att = await this.attachmentStorage.get(vaultId, id);

        this.log("attachment.get", {
            attachment: { type: att.type, size: att.size, id: att.id },
            vault: { id: vault.id, name: vault.name },
            org: org && { id: org!.id, name: org!.name, type: org!.type }
        });

        return att;
    }

    async deleteAttachment({ vault: vaultId, id }: DeleteAttachmentParams) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, vaultId);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        const allowed = org ? org.canWrite(vault, account) : vault.owner === account.id;

        if (!allowed) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        await this.attachmentStorage.delete(vaultId, id);

        await this._updateUsedStorage(org || account);

        this.log("attachment.delete", {
            attachment: { id },
            vault: { id: vault.id, name: vault.name },
            org: org && { id: org!.id, name: org!.name, type: org!.type }
        });
    }

    async updateBilling(params: UpdateBillingParams) {
        if (!this.billingProvider) {
            throw new Err(ErrorCode.NOT_SUPPORTED);
        }
        const { account } = this._requireAuth();

        params.account = params.account || account.id;

        const { account: accId, org: orgId } = params;

        if (orgId) {
            const org = await this.storage.get(Org, orgId);
            if (!org.isOwner(account)) {
                throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
            }
        } else if (accId && accId !== account.id) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        await this.billingProvider.update(params);

        this.log("billing.update", {
            params: params.toRaw()
        });
    }

    async getPlans() {
        this.log("billing.getPlans");
        return this.billingProvider ? this.billingProvider.getInfo().plans : [];
    }

    async getBillingProviders() {
        this.log("billing.getProviders");
        return this.billingProvider ? [this.billingProvider.getInfo()] : [];
    }

    private async _updateUsedStorage(acc: Org | Account) {
        const vaults = acc instanceof Org ? acc.vaults.map(v => v.id) : [acc.mainVault];

        const usedStorage = (await Promise.all(vaults.map(id => this.attachmentStorage.getUsage(id)))).reduce(
            (sum: number, each: number) => sum + each,
            0
        );

        acc.usedStorage = usedStorage;
        await this.storage.save(acc);
    }

    private _requireAuth(): { account: Account; session: Session } {
        const { account, session } = this.context;

        if (!session || !account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        return { account, session };
    }

    private async _checkEmailVerificationCode(email: string, code: string) {
        let ev: EmailVerification;
        try {
            ev = await this.storage.get(EmailVerification, email);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.EMAIL_VERIFICATION_REQUIRED, "Email verification required.");
            } else {
                throw e;
            }
        }

        if (!equalCT(ev.code, code.toLowerCase())) {
            ev.tries++;
            if (ev.tries > 5) {
                await this.storage.delete(ev);
                throw new Err(ErrorCode.EMAIL_VERIFICATION_TRIES_EXCEEDED, "Maximum number of tries exceeded!");
            } else {
                await this.storage.save(ev);
                throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Invalid verification code. Please try again!");
            }
        }

        return ev.token;
    }

    private async _checkEmailVerificationToken(email: string, token: string) {
        let ev: EmailVerification;
        try {
            ev = await this.storage.get(EmailVerification, email);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Email verification required.");
            } else {
                throw e;
            }
        }

        if (!equalCT(ev.token, token)) {
            throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Invalid verification token. Please try again!");
        }

        await this.storage.delete(ev);
    }
}

export abstract class BaseServer {
    constructor(
        public config: ServerConfig,
        public storage: Storage,
        public messenger: Messenger,
        public logger: Logger
    ) {}

    /** Handles an incoming [[Request]], processing it and constructing a [[Reponse]] */
    async handle(req: Request) {
        const res = new Response();
        const context: Context = {};
        try {
            context.device = req.device && new DeviceInfo().fromRaw(req.device);
            try {
                await loadLanguage((context.device && context.device.locale) || "en");
            } catch (e) {}
            await this._authenticate(req, context);
            await this._process(req, res, context);
            if (context.session) {
                await context.session.authenticate(res);
            }
        } catch (e) {
            this._handleError(e, req, res, context);
        }
        return res;
    }

    abstract _process(req: Request, res: Response, ctx: Context): Promise<void>;

    private async _authenticate(req: Request, ctx: Context) {
        if (!req.auth) {
            return;
        }

        let session: Session;

        // Find the session with the id specified in the [[Request.auth]] property
        try {
            session = await this.storage.get(Session, req.auth.session);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.INVALID_SESSION);
            } else {
                throw e;
            }
        }

        // Reject expired sessions
        if (session.expires && session.expires < new Date()) {
            throw new Err(ErrorCode.SESSION_EXPIRED);
        }

        // Verify request signature
        if (!(await session.verify(req))) {
            throw new Err(ErrorCode.INVALID_REQUEST, "Failed to verify request signature!");
        }

        // Reject requests/responses older than a certain age to mitigate replay attacks
        const age = Date.now() - new Date(req.auth.time).getTime();
        if (age > this.config.maxRequestAge) {
            throw new Err(
                ErrorCode.MAX_REQUEST_AGE_EXCEEDED,
                "The request was rejected because it's timestamp is too far in the past. " +
                    "Please make sure your local clock is set to the correct time and try again!"
            );
        }

        // Get account associated with this session
        const account = await this.storage.get(Account, session.account);

        // Store account and session on context
        ctx.session = session;
        ctx.account = account;

        // Update session info
        session.lastUsed = new Date();
        session.device = ctx.device;
        session.updated = new Date();

        const i = account.sessions.findIndex(({ id }) => id === session.id);
        if (i !== -1) {
            account.sessions[i] = session.info;
        } else {
            account.sessions.push(session.info);
        }

        await Promise.all([this.storage.save(session), this.storage.save(account)]);
    }

    private _handleError(error: Error, req: Request, res: Response, context: Context) {
        const e =
            error instanceof Err
                ? error
                : new Err(
                      ErrorCode.SERVER_ERROR,
                      "Something went wrong while we were processing your request. " +
                          "Our team has been notified and will resolve the problem as soon as possible!",
                      { report: true, error }
                  );

        res.error = {
            code: e.code,
            message: e.message
        };

        const evt = this.logger.log("error", {
            account: context.account && {
                id: context.account.id,
                email: context.account.email,
                name: context.account.name
            },
            device: context.device && context.device.toRaw(),
            error: e.toRaw(),
            method: req.method,
            request: e.report ? req : undefined
        });

        if (e.report && this.config.reportErrors) {
            this.messenger.send(this.config.reportErrors, {
                title: "Padloc Error Notification",
                text:
                    `The following error occurred at ${e.time}:\n\n` +
                    `Code: ${e.code}\n` +
                    `Message: ${e.message}\n` +
                    `Event ID: ${evt.id}`,
                html: ""
            });
        }
    }
}

/**
 * The Padloc server acts as a central repository for [[Account]]s, [[Org]]s
 * and [[Vault]]s. [[Server]] handles authentication, enforces user privileges
 * and acts as a mediator for key exchange between clients.
 *
 * The server component acts on a strict zero-trust, zero-knowledge principle
 * when it comes to sensitive data, meaning no sensitive data is ever exposed
 * to the server at any point, nor should the server (or the person controlling
 * it) ever be able to temper with critical data or trick users into granting
 * them access to encrypted information.
 */
export class Server extends BaseServer {
    constructor(
        /** Server config */
        config: ServerConfig,
        /** Storage for persisting data */
        storage: Storage,
        /** [[Messenger]] implemenation for sending messages to users */
        messenger: Messenger,
        /** Logger to use */
        public logger: Logger = new Logger(new VoidStorage()),
        /** Attachment storage */
        public attachmentStorage: AttachmentStorage,
        public billingProvider?: BillingProvider
    ) {
        super(config, storage, messenger, logger);
    }

    makeController(ctx: Context) {
        return new Controller(
            ctx,
            this.config,
            this.storage,
            this.messenger,
            this.logger,
            this.attachmentStorage,
            this.billingProvider
        );
    }

    async _process(req: Request, res: Response, ctx: Context): Promise<void> {
        const ctlr = this.makeController(ctx);
        const method = req.method;
        const params = req.params || [];

        switch (method) {
            case "requestEmailVerification":
                await ctlr.requestEmailVerification(new RequestEmailVerificationParams().fromRaw(params[0]));
                break;

            case "completeEmailVerification":
                res.result = await ctlr.completeEmailVerification(
                    new CompleteEmailVerificationParams().fromRaw(params[0])
                );
                break;

            case "initAuth":
                res.result = (await ctlr.initAuth(new InitAuthParams().fromRaw(params[0]))).toRaw();
                break;

            case "updateAuth":
                await ctlr.updateAuth(new Auth().fromRaw(params[0]));
                break;

            case "createSession":
                res.result = (await ctlr.createSession(new CreateSessionParams().fromRaw(params[0]))).toRaw();
                break;

            case "revokeSession":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                await ctlr.revokeSession(params[0]);
                break;

            case "getAccount":
                res.result = (await ctlr.getAccount()).toRaw();
                break;

            case "createAccount":
                res.result = (await ctlr.createAccount(new CreateAccountParams().fromRaw(params[0]))).toRaw();
                break;

            case "updateAccount":
                res.result = (await ctlr.updateAccount(new Account().fromRaw(params[0]))).toRaw();
                break;

            case "recoverAccount":
                res.result = (await ctlr.recoverAccount(new RecoverAccountParams().fromRaw(params[0]))).toRaw();
                break;

            case "deleteAccount":
                await ctlr.deleteAccount();
                break;

            case "createOrg":
                res.result = (await ctlr.createOrg(new Org().fromRaw(params[0]))).toRaw();
                break;

            case "getOrg":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                res.result = (await ctlr.getOrg(params[0])).toRaw();
                break;

            case "updateOrg":
                res.result = (await ctlr.updateOrg(new Org().fromRaw(params[0]))).toRaw();
                break;

            case "deleteOrg":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                await ctlr.deleteOrg(params[0]);
                break;

            case "getVault":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                res.result = (await ctlr.getVault(params[0])).toRaw();
                break;

            case "updateVault":
                res.result = (await ctlr.updateVault(new Vault().fromRaw(params[0]))).toRaw();
                break;

            case "createVault":
                res.result = (await ctlr.createVault(new Vault().fromRaw(params[0]))).toRaw();
                break;

            case "deleteVault":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                await ctlr.deleteVault(params[0]);
                break;

            case "getInvite":
                res.result = (await ctlr.getInvite(new GetInviteParams().fromRaw(params[0]))).toRaw();
                break;

            case "acceptInvite":
                await ctlr.acceptInvite(new Invite().fromRaw(params[0]));
                break;

            case "createAttachment":
                res.result = (await ctlr.createAttachment(new Attachment().fromRaw(params[0]))).id;
                break;

            case "getAttachment":
                res.result = (await ctlr.getAttachment(new GetAttachmentParams().fromRaw(params[0]))).toRaw();
                break;

            case "deleteAttachment":
                await ctlr.deleteAttachment(new DeleteAttachmentParams().fromRaw(params[0]));
                break;

            case "updateBilling":
                await ctlr.updateBilling(new UpdateBillingParams().fromRaw(params[0]));
                break;

            case "getPlans":
                const plans = await ctlr.getPlans();
                res.result = plans.map(p => p.toRaw());
                break;

            case "getBillingProviders":
                const providers = await ctlr.getBillingProviders();
                res.result = providers.map(p => p.toRaw());
                break;

            default:
                throw new Err(ErrorCode.INVALID_REQUEST);
        }
    }
}
