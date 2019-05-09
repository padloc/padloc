import { Storage, Storable } from "./storage";
import { Serializable } from "./encoding";
import { Invite, InvitePurpose } from "./invite";
import { Vault, VaultID } from "./vault";
import { Org, OrgID, OrgMember, OrgRole, Group } from "./org";
import { VaultItem, VaultItemID, Field, Tag, createVaultItem } from "./item";
import { Account, AccountID } from "./account";
import { Auth } from "./auth";
import { EmailVerificationPurpose } from "./email-verification";
import { Session, SessionID } from "./session";
import {
    API,
    RequestEmailVerificationParams,
    CompleteEmailVerificationParams,
    CreateAccountParams,
    InitAuthParams,
    InitAuthResponse,
    CreateSessionParams,
    RecoverAccountParams,
    GetInviteParams
} from "./api";
import { Client } from "./client";
import { Sender } from "./transport";
import { localize as $l } from "./locale";
import { DeviceInfo, getDeviceInfo } from "./platform";
import { uuid } from "./util";
import { Client as SRPClient } from "./srp";
import { Err, ErrorCode } from "./error";
// import { Attachment, AttachmentInfo } from "./attachment";

/** Various usage stats */
export class Stats extends Serializable {
    /** Time of last sync */
    lastSync?: Date;

    fromRaw({ lastSync }: any) {
        Object.assign(this, {
            lastSync: new Date(lastSync)
        });
        return this;
    }
}

/** Various application settings */
export class Settings extends Serializable {
    /** Whether to lock app automatically after a certain period of inactivity */
    autoLock: boolean = true;
    /** Duration after which auto-lock is triggered, in minutes */
    autoLockDelay: number = 5;
    /** Interval for automatic sync, in minutes */
    syncInterval: number = 1;
}

/** Application state */
export class AppState extends Storable {
    id = "app-state";

    /** Application Settings */
    settings = new Settings();

    /** Usage datra */
    stats = new Stats();

    /** Info about current device */
    device = new DeviceInfo();

    /** Current [[Session]] */
    session: Session | null = null;

    /** Currently logged in [[Account]] */
    account: Account | null = null;

    /** All organizations the current [[account]] is a member of. */
    orgs: Org[] = [];

    /** All vaults the current [[account]] has access to. */
    vaults: Vault[] = [];

    /** Whether a sync is currently in process. */
    syncing = false;

    /** All [[Tag]]s found within the users [[Vault]]s */
    get tags() {
        const tags = [];
        for (const vault of this.vaults) {
            tags.push(...vault.items.tags);
        }
        return [...new Set(tags)];
    }

    /** Whether the app is in "locked" state */
    get locked() {
        return !this.account || this.account.locked;
    }

    /** Whether a user is logged in */
    get loggedIn() {
        return !!this.session;
    }

    fromRaw({ settings, stats, device, session, account, orgs, vaults }: any) {
        this.settings.fromRaw(settings);
        this.stats.fromRaw(stats);
        this.device.fromRaw(device);
        this.session = (session && new Session().fromRaw(session)) || null;
        this.account = (account && new Account().fromRaw(account)) || null;
        this.orgs = orgs.map((org: any) => new Org().fromRaw(org));
        this.vaults = vaults.map((vault: any) => new Vault().fromRaw(vault));
        return this;
    }
}

/**
 * The `App` class is *the* user-facing top level component encapsulating all
 * functionality of the Padloc client app. It is responsible for managing
 * state, client-side persistence and synchronization with the [[Server]] and
 * exposes methods for manipulating a users [[Account]], [[Org]]anizations and
 * [[Vault]]s.
 *
 * [[App]] is completely platform-agnostic and can be used in any environment
 * capable of running JavaScript. It does however rely on platform-specific
 * providers for a number of features like storage and encryption which can
 * be "plugged in" as needed.
 *
 * ### Encryption
 *
 * The `@padloc/core` module does not provide or depend on any specific
 * implementation of cryptographic primitives but instead relies on
 * the [[CryptoProvider]] interface to provide those.
 *
 * Users of the [[App]] class (and of the `@padloc/core` package in general)
 * are responsible for ensuring that a secure implemenation of the
 * [[CryptoProvider]] interface is available before using any methods that
 * require cryptographic functionality. This is done through the
 * `crypto.setProvider` function (see example below).
 *
 * ### Platform API
 *
 * Certain functionality requires access to some platform APIs. For this,
 * an implementation of the [[Platform]] interface can be provided via
 * `platform.setPlatform`.
 *
 * ### Persistent Storage
 *
 * Persistent storage is provided by an implementation of the [[Storage]]
 * interface.
 *
 * ### Data Transport
 *
 * The [[Sender]] interface handles communication with the [[Server]] instance
 * through a RPC [[Request]]-[[Response]] cycle. The implementation provided
 * should match the [[Receiver]] implementation used in the [[Server]]
 * instance.
 *
 * ### Initialization Example
 *
 * ```ts
 * @import { setProvider } from "@padloc/core/src/crypto";
 * @import { setPlatform } from "@padloc/core/src/platform";
 *
 * setProvider(new NodeCryptoProvider());
 * setPlatform(new NodePlatform());
 *
 * const app = new App(new LevelDBStorage(), new HTTPSender());
 *
 * app.loaded.then(() => console.log("app ready!");
 * ```
 */
export class App {
    /** App version */
    version = "3.0";

    /** API client for RPC calls */
    api: API;

    /** Application state */
    state = new AppState();

    /** Promise that is resolved when the app has been fully loaded */
    loaded = this.load();

    constructor(
        /** Persistent storage provider */
        public storage: Storage,
        /** Data transport provider */
        sender: Sender
    ) {
        this.api = new Client(this.state, sender);
    }

    /** Promise that resolves once all current synchronization processes are complete */
    get syncComplete() {
        return Promise.all([...this._activeSyncPromises.values(), ...this._queuedSyncPromises.values()]);
    }

    /** Current account */
    get account() {
        return this.state.account;
    }

    /** Current session */
    get session() {
        return this.state.session;
    }

    /** The current accounts organizations */
    get orgs() {
        return this.state.orgs;
    }

    /** The current accounts vaults */
    get vaults() {
        return this.state.vaults;
    }

    /** Application settings */
    get settings() {
        return this.state.settings;
    }

    /** The current users main, or "private" [[Vault]] */
    get mainVault(): Vault | null {
        return (this.account && this.getVault(this.account.mainVault)) || null;
    }

    // private _attachments = new Map<string, Attachment>();

    private _queuedSyncPromises = new Map<string, Promise<void>>();
    private _activeSyncPromises = new Map<string, Promise<void>>();

    private _subscriptions: Array<(state: AppState) => void> = [];

    private _cachedAuthInfo = new Map<string, InitAuthResponse>();

    /** Save application state to persistent storage */
    async save() {
        await this.loaded;
        await this.storage.save(this.state);
    }

    /** Load application state from persistent storage */
    async load() {
        // Try to load app state from persistent storage.
        try {
            this.setState(await this.storage.get(AppState, this.state.id));
        } catch (e) {}

        // Update device info
        const { id, ...rest } = await getDeviceInfo();
        Object.assign(this.state.device, rest);
        // If no device id has been set yet, generate a new one
        if (!this.state.device.id) {
            this.state.device.id = await uuid();
        }

        // Save back to storage
        await this.storage.save(this.state);

        // Try syncing account so user can unlock with new password in case it has changed
        if (this.account) {
            this.fetchAccount();
        }

        // Notify state change
        this.publish();
    }

    /**
     * Unlocks the current [[Account]] and all available [[Vaults]].
     */
    async unlock(password: string) {
        if (!this.account) {
            throw "Unlocking only works if the user is logged in!";
        }

        // Unlock account using the master password
        await this.account.unlock(password);

        // Unlock all vaults
        await Promise.all(this.state.vaults.map(vault => vault.unlock(this.account!)));

        // Notify state change
        this.publish();

        // Trigger sync
        this.synchronize();
    }

    /**
     * Locks the app and wipes all sensitive information from memory.
     */
    async lock() {
        [this.account!, ...this.state.orgs, ...this.state.vaults].forEach(each => each.lock());
        this.publish();
    }

    /**
     * Synchronizes the current account and all of the accounts organizations
     * and vaults
     */
    async synchronize() {
        await this.fetchAccount();
        await this.fetchOrgs();
        await this.syncVaults();
        await this.save();
        this.setStats({ lastSync: new Date() });
        this.publish();
    }

    /**
     * Notifies of changes to the app [[state]] via the provided function
     *
     * @returns A unsubscribe function
     */
    subscribe(fn: (state: AppState) => void) {
        this._subscriptions.push(fn);
        return () => this.unsubscribe(fn);
    }

    /**
     * Unsubscribes a function previously subscribed through [[subscribe]].
     */
    unsubscribe(fn: (state: AppState) => void) {
        this._subscriptions = this._subscriptions.filter(f => f === fn);
    }

    /**
     * Notifies all subscribers of a [[state]] change
     */
    publish() {
        for (const fn of this._subscriptions) {
            fn(this.state);
        }
    }

    /**
     * Updates the app [[state]]
     */
    setState(state: Partial<AppState>) {
        Object.assign(this.state, state);
        this.publish();
    }

    /** Update usage data */
    async setStats(obj: Partial<Stats>) {
        Object.assign(this.state.stats, obj);
        await this.save();
        this.publish();
    }

    /** Update application settings */
    async setSettings(obj: Partial<Settings>) {
        Object.assign(this.state.settings, obj);
        await this.save();
        this.publish();
    }

    /*
     * ===============================
     *  ACCOUNT & SESSION MANGAGEMENT
     * ===============================
     */

    /** Request email verification for a given `email`. */
    async requestEmailVerification(email: string, purpose: EmailVerificationPurpose = EmailVerificationPurpose.Signup) {
        return this.api.requestEmailVerification(new RequestEmailVerificationParams({ email, purpose }));
    }

    /** Complete email with the given `code` */
    async completeEmailVerification(email: string, code: string) {
        return this.api.completeEmailVerification(new CompleteEmailVerificationParams({ email, code }));
    }

    /**
     * Creates a new Padloc [[Account]] and signs in the user.
     */
    async signup({
        /** The desired email address */
        email,
        /** The users master password */
        password,
        /** The desired display name */
        name,
        /** Verification token obtained trough [[completeEmailVerification]] */
        verify,
        /** Information about the [[Invite]] object if signup was initiated through invite link */
        invite
    }: {
        email: string;
        password: string;
        name: string;
        verify: string;
        invite?: { id: string; org: string };
    }) {
        // Inialize account object
        const account = new Account();
        account.email = email;
        account.name = name;
        await account.initialize(password);

        // Initialize auth object
        const auth = new Auth(email);
        const authKey = await auth.getAuthKey(password);

        // Calculate verifier
        const srp = new SRPClient();
        await srp.initialize(authKey);
        auth.verifier = srp.v!;

        // Send off request to server
        await this.api.createAccount(
            new CreateAccountParams({
                account,
                auth,
                verify,
                invite
            })
        );

        // Sign into new account
        await this.login(email, password);
    }

    /**
     * Log in user, creating a new [[Session]], loading [[Account]] info and
     * fetching all of the users [[Org]]anizations and [[Vault]]s.
     */
    async login(email: string, password: string, verify?: string) {
        if (!this._cachedAuthInfo.has(email)) {
            // Fetch authentication info
            this._cachedAuthInfo.set(email, await this.api.initAuth(new InitAuthParams({ email, verify })));
        }

        const { account: accId, keyParams, B } = this._cachedAuthInfo.get(email)!;

        const auth = new Auth(email);
        auth.keyParams = keyParams;

        // Generate auth secret
        const authKey = await auth.getAuthKey(password);

        // Initialize SRP object
        const srp = new SRPClient();
        await srp.initialize(authKey);
        await srp.setB(B);

        // Create session object
        const session = await this.api.createSession(
            new CreateSessionParams({ account: accId, A: srp.A!, M: srp.M1! })
        );

        // Apply session key and update state
        session.key = srp.K!;
        this.setState({ session });

        // Fetch and unlock account object
        const account = await this.api.getAccount();
        await account.unlock(password);
        this.setState({ account });

        // Save application state
        await this.save();

        // Load organizations and vaults
        await this.synchronize();
    }

    /**
     * Logs out user and clears all sensitive information
     */
    async logout() {
        await this._logout();
        this.publish();
    }

    private async _logout() {
        // Revoke session
        try {
            await this.api.revokeSession(this.state.session!.id);
        } catch (e) {}

        // Reset application state
        this.setState({
            account: null,
            session: null,
            vaults: [],
            orgs: []
        });
        await this.save();
    }

    /**
     * Updates the users master password
     */
    async changePassword(password: string) {
        // TODO: Add option to rotate keys

        await this.updateAccount(async account => {
            // Update account object
            await account.setPassword(password);

            // Update auth object
            const auth = new Auth(account.email);
            auth.account = account.id;
            const authKey = await auth.getAuthKey(password);
            const srp = new SRPClient();
            await srp.initialize(authKey);
            auth.verifier = srp.v!;
            await this.api.updateAuth(auth);
        });
    }

    /**
     * Fetches the users [[Account]] info from the [[Server]]
     */
    async fetchAccount() {
        const account = await this.api.getAccount();

        // Copy over secret properties so we don't have to
        // unlock the account object again.
        if (this.account) {
            account.privateKey = this.account.privateKey;
            account.signingKey = this.account.signingKey;
        }

        // Update and save state
        this.setState({ account });
        await this.save();
    }

    /**
     * Updates the users [[Account]] information
     * @param transform A function applying the changes to the account
     */
    async updateAccount(transform: (account: Account) => Promise<any>) {
        if (!this.account) {
            throw "User needs to be logged in in order to update their account!";
        }

        // Create a clone of the current account to prevent inconsistencies in
        // case something goes wrong.
        let account = this.account.clone();

        // Apply changes
        await transform(account);

        // Send request to server
        try {
            account = await this.api.updateAccount(account);
        } catch (e) {
            // If account has been updated since last fetch,
            // get the current version and then retry
            if (e.code === ErrorCode.OUTDATED_REVISION) {
                await this.fetchAccount();
                await this.updateAccount(transform);
            } else {
                throw e;
            }
        }

        // Copy over secret properties so we don't have to unlock the
        // account object again.
        account.privateKey = this.account!.privateKey;
        account.signingKey = this.account!.signingKey;

        // Update and save state
        this.setState({ account });
        await this.save();
    }

    /**
     * Revokes the given [[Session]]
     */
    async revokeSession({ id }: { id: SessionID }) {
        await this.api.revokeSession(id);
        await this.fetchAccount();
    }

    /**
     * Initiates account recovery allowing a user to regain control of their
     * account in case they forget their master password. This results in the
     * following:
     *
     * - All of the accounts cryptographic keys are rotated.
     * - The accounts sensitive data is encrypted with the new master password.
     * - The accounts authentication info is updated to reflect the password change.
     * - The accounts private vault is reset (and the data within it lost).
     * - The cryptographic keys of all [[Org]]anizations owned by the account will be
     *   rotated and all members suspended until reconfirmed.
     * - The accounts memberships to any [[Org]]ganizations not owned by it will be
     *   suspended until reconfirmed.
     *
     * The user will automatically get logged in during this process
     * so a separate login is not necessary.
     */
    async recoverAccount({
        /** Account email */
        email,
        /** New master password */
        password,
        /** Verification token obtained trough [[completeEmailVerification]] */
        verify
    }: {
        email: string;
        password: string;
        verify: string;
    }) {
        // Log out user (if logged in)
        await this._logout();

        // Initialize account with new password
        let account = new Account();
        account.email = email;
        await account.initialize(password);

        // Initialize auth object with new password
        const auth = new Auth(email);
        const authKey = await auth.getAuthKey(password);
        const srp = new SRPClient();
        await srp.initialize(authKey);
        auth.verifier = srp.v!;

        // Send account recovery request to the server, updating account and
        // authentication info. This will also suspend the accounts membership
        // to any organizations not owned by them.
        await this.api.recoverAccount(
            new RecoverAccountParams({
                account,
                auth,
                verify
            })
        );

        // Sign in user using the new password
        await this.login(email, password);
        account = this.account!;

        // Rotate keys of all owned organizations. Suspend all other members
        // and create invites to reconfirm the membership.
        for (const org of this.state.orgs.filter(o => o.isOwner(account))) {
            await this.updateOrg(org.id, async org => {
                // Rotate org encryption key
                delete org.encryptedData;
                await org.updateAccessors([account]);

                // Rotate other cryptographic keys
                await org.generateKeys();

                // Suspend members and create confirmation invites
                for (const member of org.members.filter(m => m.id !== account.id)) {
                    member.role = OrgRole.Suspended;
                    const invite = new Invite(member.email, "confirm_membership");
                    await invite.initialize(org, this.account!);
                    org.invites.push(invite);
                }

                // Update own membership
                await org.addOrUpdateMember({
                    id: account.id,
                    email: account.email,
                    name: account.name,
                    publicKey: account.publicKey,
                    orgSignature: await account.signOrg(org),
                    role: OrgRole.Owner
                });
            });
        }
    }

    /**
     * ==================
     *  VAULT MANAGEMENT
     * ==================
     */

    /** Get the [[Vault]] with the given `id` */
    getVault(id: VaultID) {
        return this.state.vaults.find(vault => vault.id === id);
    }

    /** Locally update the given `vault` object */
    putVault(vault: Vault) {
        this.setState({
            vaults: [...this.state.vaults.filter(v => v.id !== vault.id), vault]
        });
    }

    /** Create a new [[Vault]] */
    async createVault(
        name: string,
        org: Org,
        members: { id: AccountID; readonly: boolean }[] = [],
        groups: { name: string; readonly: boolean }[] = []
    ): Promise<Vault> {
        let vault = new Vault();
        vault.name = name;
        vault.org = { id: org.id, name: org.name };
        vault = await this.api.createVault(vault);

        await this.fetchOrg(org.id);
        await this.updateOrg(org.id, async (org: Org) => {
            groups.forEach(({ name, readonly }) => org.getGroup(name)!.vaults.push({ id: vault.id, readonly }));
            members.forEach(({ id, readonly }) => org.getMember({ id })!.vaults.push({ id: vault.id, readonly }));
        });

        await this.synchronize();
        return vault;
    }

    /** Update [[Vault]] name and access (not the vaults contents) */
    async updateVault(
        /** Organization owning the vault */
        orgId: OrgID,
        /** The vault id */
        id: VaultID,
        /** The new vault name */
        name: string,
        /** Organization members that should have access to the vault */
        members: { id: AccountID; readonly: boolean }[] = [],
        /** Groups that should have access to the vault */
        groups: { name: string; readonly: boolean }[] = []
    ) {
        await this.updateOrg(orgId, async (org: Org) => {
            // Update name (the name of the actual [[Vault]] name will be
            // updated in the background)
            org.vaults.find(v => v.id === id)!.name = name;

            // Update group access
            for (const group of org.groups) {
                // remove previous vault entry
                group.vaults = group.vaults.filter(v => v.id !== id);
                // update vault entry
                const selection = groups.find(g => g.name === group.name);
                if (selection) {
                    group.vaults.push({ id, readonly: selection.readonly });
                }
            }

            // Update member access
            for (const member of org.members) {
                // remove previous vault entry
                member.vaults = member.vaults.filter(v => v.id !== id);
                // update vault entry
                const selection = members.find(m => m.id === member.id);
                if (selection) {
                    member.vaults.push({ id, readonly: selection.readonly });
                }
            }
        });
    }

    /** Commit changes to vault object and save locally */
    async saveVault(vault: Vault): Promise<void> {
        await vault.commit();
        this.putVault(vault);
        await this.save();
    }

    /** Delete [[Vault]] */
    async deleteVault(id: VaultID) {
        await this.api.deleteVault(id);
        await this.synchronize();
    }

    /** Synchronize the given [[Vault]] */
    async syncVault(vault: { id: VaultID }, transform?: (vault: Vault) => any): Promise<Vault> {
        return this._queueSync(vault, (vault: { id: VaultID }) => this._syncVault(vault, transform));
    }

    /** Synchronize all vaults the current user has access to. */
    async syncVaults() {
        if (!this.account) {
            return;
        }

        // Sync private vault
        const promises = [this.syncVault({ id: this.account.mainVault })] as Promise<any>[];

        // Sync vaults assigned to through organizations
        for (const org of this.state.orgs) {
            // clean up vaults the user no longer has access to
            for (const vault of this.state.vaults) {
                if (vault.org && vault.org.id === org.id && !org.canRead(vault, this.account)) {
                    this.state.vaults = this.state.vaults.filter(v => v.id !== vault.id);
                }
            }

            // Sync all vaults for this organization
            for (const id of org.getVaultsForMember(this.account)) {
                promises.push(this.syncVault({ id }));
            }
        }

        await Promise.all(promises);
    }

    /** Whether the current user has write permissions to the given `vault`. */
    hasWritePermissions(vault: Vault) {
        // No organization means its the users private vault so they naturally have write access
        if (!vault.org) {
            return true;
        }

        const org = this.getOrg(vault.org.id)!;
        return org.canWrite(vault, this.account!);
    }

    private async _syncVault({ id }: { id: VaultID }, transform?: (vault: Vault) => any): Promise<Vault | null> {
        if (!this.account || this.account.locked) {
            throw "Need to be logged in to sync vault";
        }

        const localVault = this.getVault(id);
        let remoteVault: Vault;
        let result: Vault;

        try {
            // Fetch and unlock remote vault
            remoteVault = await this.api.getVault(id);
            if (remoteVault.encryptedData) {
                await remoteVault.unlock(this.account);
            }
        } catch (e) {
            return null;
        }

        // Merge changes
        if (localVault) {
            result = localVault.clone();
            await result.unlock(this.account);
            result.merge(remoteVault);
        } else {
            result = remoteVault;
        }

        const org = result.org && this.getOrg(result.org.id);

        // Skip update if
        // - Member does not have write access to vault
        // - Vault belongs to an org and account membership is suspended
        if (!org || (org.getMember(this.account)!.role !== OrgRole.Suspended && org.canWrite(result, this.account))) {
            // Update vault accessors
            if (org) {
                // Look up which members should have access to this vault
                const accessors = org.getAccessors(result);

                // Verify member details
                await this.account.verifyOrg(org);
                await org.verifyAll(accessors);

                // Update accessors
                await result.updateAccessors(accessors);
            } else {
                await result.updateAccessors([this.account]);
            }

            // Commit changes done during merge
            await result.commit();

            // Apply any additional changes
            if (transform) {
                transform(result);
            }

            // Push updated vault object to [[Server]]
            try {
                await this.api.updateVault(result);
            } catch (e) {
                // The server will reject the update if the vault revision does
                // not match the current revision on the server, in which case we'll
                // have to fetch the current vault version and try again.
                if (e.code === ErrorCode.OUTDATED_REVISION) {
                    return this._syncVault({ id });
                }
                throw e;
            }
        }

        // Save vault locally
        await this.saveVault(result);

        return result;
    }

    /**
     * =======================
     *  Vault Item Management
     * =======================
     */

    /** Get the [[VaultItem]] and [[Vault]] for the given item `id` */
    getItem(id: VaultItemID): { item: VaultItem; vault: Vault } | null {
        for (const vault of this.state.vaults) {
            const item = vault.items.get(id);
            if (item) {
                return { item, vault };
            }
        }

        return null;
    }

    /** Adds a number of `items` to the given `vault` */
    async addItems(items: VaultItem[], vault: Vault = this.mainVault!) {
        vault.items.update(...items);
        await this.saveVault(vault);
        this.syncVault(vault);
    }

    /** Creates a new [[VaultItem]] */
    async createItem(name: string, vault: Vault = this.mainVault!, fields?: Field[], tags?: Tag[]): Promise<VaultItem> {
        fields = fields || [
            { name: $l("Username"), value: "", type: "username" },
            { name: $l("Password"), value: "", type: "password" },
            { name: $l("URL"), value: "", type: "url" }
        ];
        const item = await createVaultItem(name || "", fields, tags);
        if (this.account) {
            item.updatedBy = this.account.id;
        }
        await this.addItems([item], vault);
        return item;
    }

    /** Update a given [[VaultItem]]s name, fields and tags */
    async updateItem(vault: Vault, item: VaultItem, upd: { name?: string; fields?: Field[]; tags?: Tag[] }) {
        vault.items.update({ ...item, ...upd, updatedBy: this.account!.id });
        this.saveVault(vault);
        await this.syncVault(vault);
    }

    /** Delete a number of `items` */
    async deleteItems(items: { item: VaultItem; vault: Vault }[]) {
        const attachments = [];

        // Group items by vault
        const grouped = new Map<Vault, VaultItem[]>();
        for (const item of items) {
            if (!grouped.has(item.vault)) {
                grouped.set(item.vault, []);
            }
            grouped.get(item.vault)!.push(item.item);
            attachments.push(...(item.item.attachments || []));
        }

        // await Promise.all(attachments.map(att => this.deleteAttachment(att)));

        // Remove items from their respective vaults
        for (const [vault, items] of grouped.entries()) {
            vault.items.remove(...items);
            this.saveVault(vault);
            await this.syncVault(vault);
        }
    }

    /** Move `items` from their current vault to the `target` vault */
    async moveItems(items: { item: VaultItem; vault: Vault }[], target: Vault) {
        const newItems = await Promise.all(items.map(async i => ({ ...i.item, id: await uuid() })));
        await this.addItems(newItems, target);
        await this.deleteItems(items);
        return newItems;
    }

    /*
     * =========================
     *  ORGANIZATION MANAGEMENT
     * =========================
     */

    /** Get the organization with the given `id` */
    getOrg(id: OrgID) {
        return this.state.orgs.find(org => org.id === id);
    }

    /** Update the given organization locally */
    putOrg(org: Org) {
        this.setState({
            orgs: [...this.state.orgs.filter(v => v.id !== org.id), org]
        });
    }

    /** Create a new [[Org]]ganization */
    async createOrg(name: string): Promise<Org> {
        let org = new Org();
        org.name = name;
        org = await this.api.createOrg(org);
        await org.initialize(this.account!);
        org = await this.api.updateOrg(org);
        await this.fetchAccount();
        await this.fetchOrg(org.id);
        return this.getOrg(org.id)!;
    }

    /** Fetch all organizations the current account is a member of */
    async fetchOrgs() {
        if (!this.account) {
            return;
        }
        try {
            await Promise.all(this.account.orgs.map(id => this.fetchOrg(id)));
        } catch (e) {}
    }

    /** Fetch the [[Org]]anization object with the given `id` */
    async fetchOrg(id: OrgID) {
        const org = await this.api.getOrg(id);
        const existing = this.getOrg(id);

        // Verify that the updated organization object has a `minMemberUpdated`
        // property equal to or higher than the previous (local) one.
        if (existing && org.minMemberUpdated < existing.minMemberUpdated) {
            throw new Err(ErrorCode.VERIFICATION_ERROR, "'minMemberUpdated' property may not decrease!");
        }

        this.putOrg(org);
        await this.save();
        return org;
    }

    /**
     * Update the organization with the given `id`.
     *
     * @param transform Function applying the changes
     */
    async updateOrg(id: OrgID, transform: (org: Org) => Promise<any>): Promise<Org> {
        // Create a clone of the existing org object
        let org = this.getOrg(id)!.clone();

        // Apply changes
        await transform(org);

        try {
            org = await this.api.updateOrg(org);
        } catch (e) {
            // If organizaton has been updated since last fetch,
            // get the current version and then retry
            if (e.code === ErrorCode.OUTDATED_REVISION) {
                await this.fetchOrg(id);
                return this.updateOrg(id, transform);
            } else {
                throw e;
            }
        }

        // Update and save app state
        this.putOrg(org);
        await this.save();
        return org;
    }

    /** Creates a new [[Group]] in the given `org` */
    async createGroup(org: Org, name: string, members: OrgMember[]) {
        const group = new Group();
        group.name = name;
        group.members = members.map(({ id }) => ({ id }));
        await this.updateOrg(org.id, async (org: Org) => {
            if (org.getGroup(name)) {
                throw "A group with this name already exists!";
            }
            org.groups.push(group);
        });
        return group;
    }

    /**
     * Updates a [[Group]]s name and members
     */
    async updateGroup(org: Org, { name }: Group, members: OrgMember[], newName?: string) {
        await this.updateOrg(org.id, async org => {
            const group = org.getGroup(name);
            if (!group) {
                throw "Group not found!";
            }
            if (newName && newName !== name && org.getGroup(newName)) {
                throw "Another group with this name already exists!";
            }
            if (newName) {
                group.name = newName;
            }
            group.members = members.map(({ id }) => ({ id }));
        });
    }

    /**
     * Update a members assigned [[Vault]]s, [[Group]]s and [[OrgRole]].
     */
    async updateMember(
        org: Org,
        { id }: OrgMember,
        {
            vaults,
            groups,
            role
        }: {
            vaults?: { id: VaultID; readonly: boolean }[];
            groups?: string[];
            role?: OrgRole;
        }
    ): Promise<OrgMember> {
        await this.updateOrg(org.id, async org => {
            const member = org.getMember({ id })!;

            // Update assigned vaults
            if (vaults) {
                member.vaults = vaults;
            }

            // Update assigned groups
            if (groups) {
                // Remove member from all groups
                for (const group of org.groups) {
                    group.members = group.members.filter(m => m.id !== id);
                }

                // Add them back to the assigned groups
                for (const name of groups) {
                    const group = org.getGroup(name)!;
                    group.members.push({ id });
                }
            }

            // Update member role
            if (role) {
                member.role = role;
            }
        });

        return this.getOrg(org.id)!.getMember({ id })!;
    }

    /**
     * Removes a member from the given `org`
     */
    async removeMember(org: Org, member: OrgMember) {
        await this.updateOrg(org.id, async org => {
            await org.unlock(this.account!);
            await org.removeMember(member);
        });
    }

    /*
     * ===================
     *  INVITE MANAGEMENT
     * ===================
     */

    /**
     * Create a new [[Invite]]
     */
    async createInvite({ id }: Org, email: string, purpose?: InvitePurpose) {
        let invite: Invite;
        await this.updateOrg(id, async (org: Org) => {
            await org.unlock(this.account!);
            invite = new Invite(email, purpose);
            await invite.initialize(org, this.account!);
            org.invites.push(invite);
        });
        return invite!;
    }

    /**
     * Get an [[Invite]] based on the organization id and invite id.
     */
    async getInvite(orgId: string, id: string) {
        let invite = null;
        try {
            invite = await this.api.getInvite(new GetInviteParams({ org: orgId, id }));
        } catch (e) {}
        return invite;
    }

    /**
     * Accept an [[Invite]]
     *
     * @param secret The secret confirmation code, provided to the user by the organization owner
     */
    async acceptInvite(invite: Invite, secret: string) {
        const success = await invite.accept(this.account!, secret);
        if (success) {
            await this.api.acceptInvite(invite);
        }
        return success;
    }

    /**
     * Confirm an [[Invite]] after it has been accepted by the invitee.
     * This will verify the invitees information and then add them to
     * the organization.
     *
     * @returns The newly created member object.
     */
    async confirmInvite(invite: Invite): Promise<OrgMember> {
        // Verify invitee information
        if (!(await invite.verifyInvitee())) {
            throw new Err(ErrorCode.VERIFICATION_ERROR, "Failed to verify invitee information!");
        }

        // Add member and update organization
        await this.updateOrg(invite.org!.id, async (org: Org) => {
            await org.unlock(this.account!);
            await org.addOrUpdateMember(invite.invitee!);
            org.removeInvite(invite);
        });

        return this.getOrg(invite.org!.id)!.getMember({ id: invite.invitee!.id })!;
    }

    /**
     * Deletes an [[Invite]]
     */
    async deleteInvite(invite: Invite): Promise<void> {
        await this.updateOrg(
            invite.org!.id,
            async org => (org.invites = org.invites.filter(inv => inv.id !== invite.id))
        );
    }

    // ATTACHMENTS

    // getAttachment(attInfo: AttachmentInfo): Attachment {
    //     let att = this._attachments.get(attInfo.id);
    //
    //     if (!att) {
    //         att = new Attachment(attInfo);
    //         this._attachments.set(`${attInfo.id}`, att);
    //     }
    //
    //     return att;
    // }

    // async createAttachment(vault: Vault, file: File): Promise<Attachment> {
    //     const att = new Attachment({ id: uuid(), vault: vault.id });
    //     await att.fromFile(file);
    //     this._attachments.set(att.id, att);
    //     this.api.createAttachment(att);
    //     return att;
    // }
    //
    // async downloadAttachment(att: Attachment | AttachmentInfo) {
    //     if (!(att instanceof Attachment)) {
    //         att = this.getAttachment(att);
    //     }
    //     return this.api.getAttachment(att as Attachment);
    // }
    //
    // async deleteAttachment(att: Attachment | AttachmentInfo): Promise<void> {
    //     if (!(att instanceof Attachment)) {
    //         att = this.getAttachment(att);
    //     }
    //     this._attachments.delete(att.id);
    //     await this.api.deleteAttachment(att as Attachment);
    // }

    private async _queueSync(obj: { id: string }, fn: (obj: { id: string }) => Promise<any>): Promise<any> {
        let queued = this._queuedSyncPromises.get(obj.id);
        let active = this._activeSyncPromises.get(obj.id);

        if (queued) {
            // There is already a queued sync promise, so just return that one
            return queued;
        }

        if (active) {
            // There is already a synchronization in process. wait for the current sync to finish
            // before starting a new one.
            const next = () => {
                this._queuedSyncPromises.delete(obj.id);
                return this._queueSync(obj, fn);
            };
            queued = active.then(next, next);
            this._queuedSyncPromises.set(obj.id, queued);
            return queued;
        }

        this.setState({ syncing: !!this._activeSyncPromises.size });

        active = fn(obj).then(
            (result: any) => {
                this._activeSyncPromises.delete(obj.id);
                this.setState({ syncing: !!this._activeSyncPromises.size });
                return result;
            },
            e => {
                this._activeSyncPromises.delete(obj.id);
                this.setState({ syncing: !!this._activeSyncPromises.size });
                throw e;
            }
        );
        this._activeSyncPromises.set(obj.id, active);
        return active;
    }
}
