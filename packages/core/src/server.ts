import { bytesToHex } from "./encoding";
import {
    API,
    RequestEmailVerificationParams,
    CompleteEmailVerificationParams,
    InitAuthParams,
    InitAuthResponse,
    CreateAccountParams,
    RecoverAccountParams,
    CreateSessionParams,
    GetInviteParams
} from "./api";
import { Storage } from "./storage";
import {
    // Attachment,
    AttachmentStorage
} from "./attachment";
import { Session, SessionID } from "./session";
import { Account } from "./account";
import { Auth, EmailVerification } from "./auth";
import { Request, Response } from "./transport";
import { Err, ErrorCode } from "./error";
import { Vault, VaultID } from "./vault";
import { Org, OrgID, OrgRole } from "./org";
import { Invite } from "./invite";
import { Messenger } from "./messenger";
import { Server as SRPServer } from "./srp";
import { DeviceInfo } from "./platform";
import { getProvider } from "./crypto";
import { uuid } from "./util";
import { EmailVerificationMessage, InviteCreatedMessage, InviteAcceptedMessage, MemberAddedMessage } from "./messages";
import { localize as $l } from "./locale";

const pendingAuths = new Map<string, SRPServer>();
const cachedFakeAuthParams = new Map<string, Auth>();

export interface ServerConfig {
    clientUrl: string;
    reportErrors: string;
}

export class Context implements API {
    session?: Session;
    account?: Account;
    device?: DeviceInfo;

    constructor(
        public config: ServerConfig,
        public storage: Storage,
        public messenger: Messenger,
        public attachmentStorage: AttachmentStorage
    ) {}

    async requestEmailVerification({ email, purpose }: RequestEmailVerificationParams) {
        const v = new EmailVerification(email, purpose);
        await v.init();
        await this.storage.save(v);
        this.messenger.send(email, new EmailVerificationMessage(v));
    }

    async completeEmailVerification({ email, code }: CompleteEmailVerificationParams) {
        return await this._checkEmailVerificationCode(email, code);
    }

    async initAuth({ email }: InitAuthParams): Promise<InitAuthResponse> {
        let auth: Auth;

        try {
            auth = await this.storage.get(Auth, email);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                // Account does not exist. We don't want to respond with an error though
                // because that would allow user enumeration. Instead, we'll just send back
                // random values...

                if (!cachedFakeAuthParams.has(email)) {
                    const auth = new Auth(email);
                    auth.keyParams.salt = await getProvider().randomBytes(32);
                    auth.account = await uuid();

                    // We'll have to cache our fake authentication params since returning
                    // different values on subsequent requests would give away our clever
                    // deceit...
                    cachedFakeAuthParams.set(email, auth);
                }

                return new InitAuthResponse({
                    auth: cachedFakeAuthParams.get(email)!,
                    B: await getProvider().randomBytes(32)
                });
            }
            throw e;
        }

        const srp = new SRPServer();
        await srp.initialize(auth.verifier!);

        pendingAuths.set(auth.account, srp);

        return new InitAuthResponse({
            auth,
            B: srp.B!
        });
    }

    async updateAuth(auth: Auth): Promise<void> {
        const { account } = this._requireAuth();

        if (account.email !== auth.email) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        await this.storage.save(auth);
    }

    async createSession({ account, A, M }: CreateSessionParams): Promise<Session> {
        const srp = pendingAuths.get(account);

        if (!srp) {
            throw new Err(ErrorCode.INVALID_CREDENTIALS);
        }

        await srp.setA(A);

        if (bytesToHex(M) !== bytesToHex(srp.M1!)) {
            throw new Err(ErrorCode.INVALID_CREDENTIALS);
        }

        const acc = await this.storage.get(Account, account);

        const session = new Session();
        session.id = await uuid();
        session.account = account;
        session.device = this.device;
        session.key = srp.K!;

        acc.sessions.push(session);

        await Promise.all([this.storage.save(session), this.storage.save(acc)]);

        pendingAuths.delete(account);

        // Delete key before returning session
        delete session.key;
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

        account.id = await uuid();
        account.revision = await uuid();
        auth.account = account.id;

        const vault = new Vault();
        vault.id = await uuid();
        vault.name = "My Vault";
        vault.owner = account.id;
        vault.created = new Date();
        vault.updated = new Date();
        account.mainVault = vault.id;

        await Promise.all([this.storage.save(account), this.storage.save(vault), this.storage.save(auth)]);

        return account;
    }

    async getAccount() {
        const { account } = this._requireAuth();
        return account;
    }

    async updateAccount({ name, email, publicKey, keyParams, encryptionParams, encryptedData, revision }: Account) {
        const { account } = this._requireAuth();

        if (revision !== account.revision) {
            throw new Err(ErrorCode.OUTDATED_REVISION);
        }
        account.revision = await uuid();

        const nameChanged = account.name !== name;

        Object.assign(account, { name, email, publicKey, keyParams, encryptionParams, encryptedData });
        account.updated = new Date();
        await this.storage.save(account);

        if (nameChanged) {
            for (const id of account.orgs) {
                const org = await this.storage.get(Org, id);
                org.getMember(account)!.name = name;
                await this.storage.save(org);
            }
        }

        return account;
    }

    async recoverAccount({
        account: { email, publicKey, keyParams, encryptionParams, encryptedData },
        auth,
        verify
    }: RecoverAccountParams) {
        await this._checkEmailVerificationToken(auth.email, verify);

        const existingAuth = await this.storage.get(Auth, auth.id);
        const account = await this.storage.get(Account, existingAuth.account);
        Object.assign(account, { email, publicKey, keyParams, encryptionParams, encryptedData });

        // reset main vault
        const mainVault = new Vault();
        mainVault.id = account.mainVault;
        mainVault.name = $l("My Vault");
        mainVault.owner = account.id;
        mainVault.created = new Date();
        mainVault.updated = new Date();

        auth.account = account.id;

        // Suspend memberships for all orgs that the account is not the owner of
        for (const id of account.orgs) {
            const org = await this.storage.get(Org, id);
            if (!org.isOwner(account)) {
                const member = org.getMember(account)!;
                member.role = OrgRole.Suspended;
                await this.storage.save(org);
            }
        }

        await Promise.all([this.storage.save(account), this.storage.save(auth), this.storage.save(mainVault)]);

        return account;
    }

    async createOrg(org: Org) {
        const { account } = this._requireAuth();

        org.id = await uuid();
        org.revision = await uuid();
        org.creator = account.id;

        await this.storage.save(org);

        return org;
    }

    async getOrg(id: OrgID) {
        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, id);

        if (org.creator !== account.id && !org.isMember(account)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

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
        revision
    }: Org) {
        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, id);

        const isOwner = org.creator === account.id || org.isOwner(account);
        const isAdmin = isOwner || org.isAdmin(account);

        if (!isAdmin) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Only admins can make changes to organizations!");
        }

        if (revision !== org.revision) {
            throw new Err(ErrorCode.OUTDATED_REVISION);
        }
        org.revision = await uuid();

        if (
            !isOwner &&
            (members.length !== org.members.length ||
                members.some(({ id, role }) => {
                    const member = org.getMember({ id });
                    return !member || member.role !== role;
                }))
        ) {
            throw new Err(
                ErrorCode.INSUFFICIENT_PERMISSIONS,
                "Only organization owners can add or remove members or change roles!"
            );
        }

        for (const invite of invites) {
            if (!org.invites.some(inv => inv.id === invite.id)) {
                // new invite

                if (!isOwner) {
                    throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Only organization owners can create invites!");
                }

                let link = `${this.config.clientUrl}/invite/${org.id}/${invite.id}`;

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
                    link += `?verify=${v.token}&email=${invite.email}`;
                }

                this.messenger.send(invite.email, new InviteCreatedMessage(invite, link));
            }
        }

        // Added members
        for (const member of members) {
            if (!org.isMember(member)) {
                const acc = await this.storage.get(Account, member.id);
                acc.orgs.push(org.id);
                await this.storage.save(acc);

                if (member.id !== account.id) {
                    console.log("send added message");
                    this.messenger.send(
                        member.email,
                        new MemberAddedMessage(org, `${this.config.clientUrl}/org/${org.id}`)
                    );
                }
            }
        }

        // Removed members
        for (const { id } of org.members) {
            if (!org.members.some(m => m.id === id)) {
                const acc = await this.storage.get(Account, id);
                acc.orgs = acc.orgs.filter(id => id !== org.id);
                await this.storage.save(acc);
            }
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

        if (isOwner) {
            Object.assign(org, {
                name,
                publicKey,
                keyParams,
                encryptionParams,
                encryptedData,
                signingParams,
                accessors,
                invites
            });
        }

        await this.storage.save(org);

        return org;
    }

    async getVault(id: VaultID) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        if ((org && !org.canRead(vault, account)) || (!org && vault.owner !== account.id)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        return vault;
    }

    async updateVault({ id, keyParams, encryptionParams, accessors, encryptedData, revision }: Vault) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        if ((org && !org.canRead(vault, account)) || (!org && vault.owner !== account.id)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        if (org && !org.canWrite(vault, account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        if (revision !== vault.revision) {
            throw new Err(ErrorCode.OUTDATED_REVISION);
        }
        vault.revision = await uuid();

        Object.assign(vault, { keyParams, encryptionParams, accessors, encryptedData });
        vault.updated = new Date();
        await this.storage.save(vault);

        return vault;
    }

    async createVault(vault: Vault) {
        const { account } = this._requireAuth();

        if (!vault.org) {
            throw new Err(ErrorCode.BAD_REQUEST, "Shared vaults have to be attached to an organization.");
        }

        const org = await this.storage.get(Org, vault.org.id);

        if (!org.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        vault.id = await uuid();
        vault.owner = account.id;
        vault.created = vault.updated = new Date();
        vault.revision = await uuid();

        org.vaults.push({ id: vault.id, name: vault.name });

        await Promise.all([this.storage.save(vault), this.storage.save(org)]);

        return vault;
    }

    async deleteVault(id: VaultID) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);

        // Only shared vaults can be deleted
        if (!vault.org) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const org = await this.storage.get(Org, vault.org.id);

        // Only org admins can delete vaults
        if (!org.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const promises = [this.storage.delete(vault)];
        promises.push(this.attachmentStorage.deleteAll(vault));

        // Remove vault from org
        org.vaults = org.vaults.filter(v => v.id !== vault.id);
        for (const group of org.getGroupsForVault(vault)) {
            group.vaults = group.vaults.filter(v => v.id !== vault.id);
        }

        promises.push(this.storage.save(org));

        await Promise.all(promises);
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

        return invite;
    }

    async acceptInvite(invite: Invite) {
        if (!invite.accepted) {
            throw new Err(ErrorCode.BAD_REQUEST);
        }

        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, invite.org.id);
        const existing = org.getInvite(invite.id);

        if (!existing) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        if (existing.email !== account.email) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        if (!existing.accepted && invite.invitedBy) {
            this.messenger.send(
                invite.invitedBy.email,
                new InviteAcceptedMessage(invite, `${this.config.clientUrl}/invite/${org.id}/${invite.id}`)
            );
        }

        org.invites[org.invites.indexOf(existing)] = invite;

        await this.storage.save(org);
    }
    //
    // async createAttachment(att: Attachment) {
    //     const { account } = this._requireAuth();
    //
    //     const vault = new Vault(att.vault);
    //     await this.storage.get(vault);
    //
    //     const permissions = vault.getPermissions(account);
    //
    //     if (!permissions.write) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //
    //     // att.id = await uuid();
    //
    //     const currentUsage = await this.attachmentStorage.getUsage(vault);
    //
    //     if (currentUsage + att.size > 5e7) {
    //         throw new Err(ErrorCode.STORAGE_QUOTA_EXCEEDED);
    //     }
    //
    //     await this.attachmentStorage.put(att);
    //
    //     return att;
    // }
    //
    // async getAttachment(att: Attachment) {
    //     const { account } = this._requireAuth();
    //
    //     const vault = new Vault(att.vault);
    //     await this.storage.get(vault);
    //
    //     const permissions = vault.getPermissions(account);
    //
    //     if (!permissions.read) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //
    //     await this.attachmentStorage.get(att);
    //
    //     return att;
    // }
    //
    // async deleteAttachment(att: Attachment) {
    //     const { account } = this._requireAuth();
    //
    //     const vault = new Vault(att.vault);
    //     await this.storage.get(vault);
    //
    //     const permissions = vault.getPermissions(account);
    //
    //     if (!permissions.write) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //
    //     await this.attachmentStorage.delete(att);
    // }

    private _requireAuth(): { account: Account; session: Session } {
        const { account, session } = this;

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
                throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Email verification required.");
            } else {
                throw e;
            }
        }

        if (ev.code !== code.toLowerCase()) {
            throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Invalid verification code. Please try again!");
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

        if (ev.token !== token) {
            throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Invalid verification token. Please try again!");
        }

        await this.storage.delete(ev);
    }
}

export class Server {
    constructor(
        public config: ServerConfig,
        private storage: Storage,
        private messenger: Messenger,
        private attachmentStorage: AttachmentStorage
    ) {}

    async handle(req: Request) {
        const res = { result: null };
        try {
            const context = new Context(this.config, this.storage, this.messenger, this.attachmentStorage);
            context.device = new DeviceInfo().fromRaw(req.device);
            await this._authenticate(req, context);
            await this._process(req, res, context);
            if (context.session) {
                await context.session.authenticate(res);
            }
        } catch (e) {
            this._handleError(e, res);
        }
        return res;
    }

    private async _process(req: Request, res: Response, ctx: Context): Promise<void> {
        const method = req.method;
        const params = req.params || [];

        switch (method) {
            case "requestEmailVerification":
                await ctx.requestEmailVerification(new RequestEmailVerificationParams().fromRaw(params[0]));
                break;

            case "completeEmailVerification":
                res.result = await ctx.completeEmailVerification(
                    new CompleteEmailVerificationParams().fromRaw(params[0])
                );
                break;

            case "initAuth":
                res.result = (await ctx.initAuth(new InitAuthParams().fromRaw(params[0]))).toRaw();
                break;

            case "updateAuth":
                await ctx.updateAuth(new Auth().fromRaw(params[0]));
                break;

            case "createSession":
                res.result = (await ctx.createSession(new CreateSessionParams().fromRaw(params[0]))).toRaw();
                break;

            case "revokeSession":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                await ctx.revokeSession(params[0]);
                break;

            case "getAccount":
                res.result = (await ctx.getAccount()).toRaw();
                break;

            case "createAccount":
                res.result = (await ctx.createAccount(new CreateAccountParams().fromRaw(params[0]))).toRaw();
                break;

            case "updateAccount":
                res.result = (await ctx.updateAccount(new Account().fromRaw(params[0]))).toRaw();
                break;

            case "recoverAccount":
                res.result = (await ctx.recoverAccount(new RecoverAccountParams().fromRaw(params[0]))).toRaw();
                break;

            case "createOrg":
                res.result = (await ctx.createOrg(new Org().fromRaw(params[0]))).toRaw();
                break;

            case "getOrg":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                res.result = (await ctx.getOrg(params[0])).toRaw();
                break;

            case "updateOrg":
                res.result = (await ctx.updateOrg(new Org().fromRaw(params[0]))).toRaw();
                break;

            case "getVault":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                res.result = (await ctx.getVault(params[0])).toRaw();
                break;

            case "updateVault":
                res.result = (await ctx.updateVault(new Vault().fromRaw(params[0]))).toRaw();
                break;

            case "createVault":
                res.result = (await ctx.createVault(new Vault().fromRaw(params[0]))).toRaw();
                break;

            case "deleteVault":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                await ctx.deleteVault(params[0]);
                break;

            case "getInvite":
                res.result = (await ctx.getInvite(new GetInviteParams().fromRaw(params[0]))).toRaw();
                break;

            case "acceptInvite":
                await ctx.acceptInvite(new Invite().fromRaw(params[0]));
                break;

            default:
                throw new Err(ErrorCode.INVALID_REQUEST);
        }
    }

    private async _authenticate(req: Request, ctx: Context) {
        if (!req.auth) {
            return;
        }

        let session: Session;

        try {
            session = await ctx.storage.get(Session, req.auth.session);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.INVALID_SESSION);
            } else {
                throw e;
            }
        }

        if (session.expires && session.expires < new Date()) {
            throw new Err(ErrorCode.SESSION_EXPIRED);
        }

        if (!(await session.verify(req))) {
            throw new Err(ErrorCode.INVALID_REQUEST);
        }

        const account = await ctx.storage.get(Account, session.account);

        ctx.session = session;
        ctx.account = account;

        session.lastUsed = new Date();
        session.device = ctx.device;
        session.updated = new Date();

        const i = account.sessions.findIndex(({ id }) => id === session.id);
        if (i !== -1) {
            account.sessions[i] = session.info;
        } else {
            account.sessions.push(session.info);
        }

        await Promise.all([ctx.storage.save(session), ctx.storage.save(account)]);
    }

    _handleError(e: Error, res: Response) {
        if (e instanceof Err) {
            res.error = {
                code: e.code,
                message: e.message
            };
        } else {
            console.error(e.stack);
            if (this.config.reportErrors) {
                this.messenger.send(this.config.reportErrors, {
                    title: "Padloc Error Notification",
                    text: `The following error occurred at ${new Date().toString()}:\n\n${e.stack}`,
                    html: ""
                });
            }
            res.error = {
                code: ErrorCode.SERVER_ERROR,
                message:
                    "Something went wrong while we were processing your request. " +
                    "Our team has been notified and will resolve the problem as soon as possible!"
            };
        }
    }
}
