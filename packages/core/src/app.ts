import { loadLanguage } from "@padloc/locale/src/translate";
import { Storage, Storable } from "./storage";
import { Serializable, bytesToBase64, base64ToBytes, stringToBytes } from "./encoding";
import { Invite, InvitePurpose } from "./invite";
import { Vault, VaultID } from "./vault";
import { Org, OrgID, OrgType, OrgMember, OrgRole, Group } from "./org";
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
    GetInviteParams,
    GetAttachmentParams,
    DeleteAttachmentParams
} from "./api";
import { Client } from "./client";
import { Sender } from "./transport";
import { translate as $l } from "@padloc/locale/src/translate";
import {
    DeviceInfo,
    getDeviceInfo,
    isKeyStoreAvailable,
    keyStoreSet,
    keyStoreGet,
    keyStoreDelete,
    getCryptoProvider,
    getStorage
} from "./platform";
import { uuid } from "./util";
import { Client as SRPClient } from "./srp";
import { Err, ErrorCode } from "./error";
import { Attachment, AttachmentInfo } from "./attachment";
import { BillingProviderInfo, UpdateBillingParams } from "./billing";
import { SimpleContainer } from "./container";
import { AESKeyParams, PBKDF2Params } from "./crypto";

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
    /** Time threshold used for filtering "recent" items, in days */
    recentLimit: number = 7;
}

export interface HashedItem {
    hosts: string[];
}

export class Index extends Serializable {
    hashParams = new PBKDF2Params({ iterations: 1 });
    items: HashedItem[] = [];

    fromRaw({ hashParams, items }: any) {
        this.hashParams.fromRaw(hashParams);
        this.items = items;
        return this;
    }

    async fromItems(items: VaultItem[]) {
        const crypto = getCryptoProvider();

        if (!this.hashParams.salt.length) {
            this.hashParams.salt = await crypto.randomBytes(16);
        }

        this.items = (
            await Promise.all(
                items.map(async item => ({
                    hosts: (
                        await Promise.all(
                            item.fields
                                .filter(f => f.type === "url")
                                .map(async f => {
                                    // try to parse host from url. if url is not valid,
                                    // assume the url field contains just the domain.
                                    let host = f.value;
                                    try {
                                        host = new URL(f.value).host;
                                    } catch (e) {}
                                    const hashedHost = await crypto.deriveKey(stringToBytes(host), this.hashParams);
                                    return bytesToBase64(hashedHost);
                                })
                        )
                    ).filter(h => h !== null) as string[]
                }))
            )
        ).filter(item => item.hosts.length);
    }

    async matchHost(host: string) {
        const hashedHost = bytesToBase64(await getCryptoProvider().deriveKey(stringToBytes(host), this.hashParams));
        return this.items.filter(item => item.hosts.some(h => h === hashedHost)).length;
    }

    async fuzzyMatchHost(host: string) {
        // Try exact match first, then try to add/remove "www."
        return (
            (await this.matchHost(host)) ||
            (host.startsWith("www.") ? this.matchHost(host.slice(4)) : this.matchHost("www." + host))
        );
    }

    async matchUrl(url: string) {
        try {
            const { host } = new URL(url);
            return this.fuzzyMatchHost(host);
        } catch (e) {
            return 0;
        }
    }
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

    /** Whether the app has an internet connection at the moment */
    online = true;

    rememberedMasterKey: SimpleContainer | null = null;

    billingProvider: BillingProviderInfo | null = null;

    currentHost: string = "";

    index = new Index();

    _errors: Err[] = [];

    /** All [[Tag]]s found within the users [[Vault]]s */
    get tags() {
        const tags = new Map<string, number>();

        for (const vault of this.vaults) {
            for (const item of vault.items) {
                for (const tag of item.tags) {
                    if (!tags.has(tag)) {
                        tags.set(tag, 0);
                    }

                    tags.set(tag, tags.get(tag)! + 1);
                }
            }
        }

        return [...tags.entries()];
    }

    /** Whether the app is in "locked" state */
    get locked() {
        return !this.account || this.account.locked;
    }

    /** Whether a user is logged in */
    get loggedIn() {
        return !!this.session;
    }

    fromRaw({
        settings,
        stats,
        device,
        session,
        account,
        orgs,
        vaults,
        rememberedMasterKey,
        billingProvider,
        index
    }: any) {
        this.settings.fromRaw(settings);
        this.stats.fromRaw(stats);
        this.device.fromRaw(device);
        this.session = (session && new Session().fromRaw(session)) || null;
        this.account = (account && new Account().fromRaw(account)) || null;
        this.orgs = orgs.map((org: any) => new Org().fromRaw(org));
        this.vaults = vaults.map((vault: any) => new Vault().fromRaw(vault));
        this.rememberedMasterKey = rememberedMasterKey && new SimpleContainer().fromRaw(rememberedMasterKey);
        this.billingProvider = billingProvider && new BillingProviderInfo().fromRaw(billingProvider);
        if (index) {
            this.index.fromRaw(index);
        }
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
    loaded: Promise<void>;

    storage: Storage;

    constructor(
        /** Data transport provider */
        sender: Sender,
        storage = getStorage()
    ) {
        this.storage = storage;
        this.api = new Client(this.state, sender, (_req, _res, err) => {
            const online = !err || err.code !== ErrorCode.FAILED_CONNECTION;
            if (online !== this.state.online) {
                this.setState({ online });
            }
        });
        this.loaded = this.load();
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
        return this.state.orgs.sort();
    }

    /** The current accounts vaults */
    get vaults() {
        return this.state.vaults.sort();
    }

    /** Application settings */
    get settings() {
        return this.state.settings;
    }

    /** The current users main, or "private" [[Vault]] */
    get mainVault(): Vault | null {
        return (this.account && this.getVault(this.account.mainVault)) || null;
    }

    get online() {
        return this.state.online;
    }

    get supportsBiometricUnlock() {
        return this.state.device.supportsBioAuth && this.state.device.supportsKeyStore;
    }

    get remembersMasterKey() {
        return !!this.state.rememberedMasterKey;
    }

    get billingEnabled() {
        return !!this.state.billingProvider && !(this.state.account && this.state.account.billingDisabled);
    }

    private _queuedSyncPromises = new Map<string, Promise<void>>();
    private _activeSyncPromises = new Map<string, Promise<void>>();

    private _subscriptions: Array<(state: AppState) => void> = [];

    private _cachedAuthInfo = new Map<string, InitAuthResponse>();

    /** Save application state to persistent storage */
    async save() {
        await this.loaded;
        if (!this.state.locked) {
            await this.state.index.fromItems(this.state.vaults.flatMap(v => [...v.items]));
        }

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

        try {
            await loadLanguage(this.state.device.locale);
        } catch (e) {
            // Failed to load language, so we'll fallback to default (English)
        }

        // If no device id has been set yet, generate a new one
        if (!this.state.device.id) {
            this.state.device.id = await uuid();
        }

        // Save back to storage
        await this.storage.save(this.state);

        this.loadBillingProvider();

        // Notify state change
        this.publish();
    }

    async reload() {
        const masterKey = this.account && this.account.masterKey;
        await this.load();
        if (masterKey) {
            await this.unlockWithMasterKey(masterKey);
        }
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

        await this._unlocked();
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

    async deleteAccount() {
        await this.api.deleteAccount();
        await this._logout();
    }

    private async _logout() {
        this._cachedAuthInfo.clear();

        if (await this.canRememberMasterKey()) {
            await this.forgetMasterKey();
        }

        // Revoke session
        try {
            await this.api.revokeSession(this.state.session!.id);
        } catch (e) {}

        // Reset application state
        this.setState({
            account: null,
            session: null,
            vaults: [],
            orgs: [],
            index: new Index()
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

        if (await this.canRememberMasterKey()) {
            await this.forgetMasterKey();
        }
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
            account.masterKey = this.account.masterKey;
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

        // Rotate keys of all owned organizations. Suspend all other members
        // and create invites to reconfirm the membership.
        for (const org of this.state.orgs.filter(o => o.isOwner(account))) {
            await this.rotateOrgKeys(org);
        }
    }

    async rotateOrgKeys(org: Org) {
        const account = this.account!;

        return this.updateOrg(org.id, async org => {
            // Rotate org encryption key
            delete org.encryptedData;
            await org.updateAccessors([account]);

            // Rotate other cryptographic keys
            await org.generateKeys();

            org.invites = [];

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

    canRememberMasterKey() {
        return isKeyStoreAvailable();
    }

    async rememberMasterKey() {
        if (!this.account || this.account.locked) {
            throw "App needs to be unlocked first";
        }
        const key = await getCryptoProvider().generateKey(new AESKeyParams());
        await keyStoreSet("master_key_encryption_key", bytesToBase64(key));
        const container = new SimpleContainer();
        await container.unlock(key);
        await container.setData(this.account.masterKey!);
        this.setState({ rememberedMasterKey: container });
        await this.save();
    }

    async forgetMasterKey() {
        try {
            await keyStoreDelete("master_key_encryption_key");
        } catch (e) {}
        this.setState({ rememberedMasterKey: null });
        await this.save();
    }

    async unlockWithRememberedMasterKey() {
        const encryptedMasterKey = this.state.rememberedMasterKey!;
        const key = base64ToBytes(await keyStoreGet("master_key_encryption_key"));
        await encryptedMasterKey.unlock(key);
        const masterKey = await encryptedMasterKey.getData();
        await this.unlockWithMasterKey(masterKey);
    }

    async unlockWithMasterKey(key: Uint8Array) {
        await this.account!.unlockWithMasterKey(key);
        await this._unlocked();
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

    isMainVault(vault: Vault) {
        return vault && this.account && this.account.mainVault === vault.id;
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

        await this.updateOrg(org.id, async (org: Org) => {
            groups.forEach(({ name, readonly }) => {
                const group = org.getGroup(name);
                if (!group) {
                    setTimeout(() => {
                        throw `Group not found: ${name}`;
                    });
                    return;
                }
                group.vaults.push({ id: vault.id, readonly });
            });
            members.forEach(({ id, readonly }) => {
                const member = org.getMember({ id });
                if (!member) {
                    setTimeout(() => {
                        throw `Member not found: ${id}`;
                    });
                    return;
                }
                member.vaults.push({ id: vault.id, readonly });
            });
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
            // Sync all vaults for this organization
            for (const id of org.getVaultsForMember(this.account)) {
                promises.push(this.syncVault({ id }));
            }
        }

        // clean up vaults the user no longer has access to
        const removeVaults: string[] = [];
        for (const vault of this.state.vaults) {
            const org = vault.org && this.getOrg(vault.org.id);
            if (vault.id !== this.account.mainVault && (!org || !org.canRead(vault, this.account))) {
                removeVaults.push(vault.id);
            }
        }

        await this.setState({
            vaults: this.state.vaults.filter(v => !removeVaults.includes(v.id))
        });

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
            return null;
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
        // - Vault belongs to an org with "frozen" status
        if (
            !org ||
            (!org.frozen &&
                org.getMember(this.account)!.role !== OrgRole.Suspended &&
                org.canWrite(result, this.account))
        ) {
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
        this.addItems([item], vault);
        return item;
    }

    /** Update a given [[VaultItem]]s name, fields, tags and attachments */
    async updateItem(
        vault: Vault,
        item: VaultItem,
        upd: {
            name?: string;
            fields?: Field[];
            tags?: Tag[];
            attachments?: AttachmentInfo[];
            favorite?: boolean;
            lastUsed?: Date;
        }
    ) {
        const account = this.account!;

        let favorited = new Set(item.favorited);

        if (typeof upd.favorite === "boolean") {
            upd.favorite ? favorited.add(account.id) : favorited.delete(account.id);
        }

        vault.items.update({ ...item, ...upd, updatedBy: this.account!.id, favorited: [...favorited] });
        this.saveVault(vault);
        await this.syncVault(vault);
    }

    /** Delete a number of `items` */
    async deleteItems(items: { item: VaultItem; vault: Vault }[]) {
        const attachments: AttachmentInfo[] = [];

        // Group items by vault
        const grouped = new Map<Vault, VaultItem[]>();
        for (const item of items) {
            if (!grouped.has(item.vault)) {
                grouped.set(item.vault, []);
            }
            grouped.get(item.vault)!.push(item.item);
            attachments.push(...item.item.attachments);
        }

        // Delete all attachments for this item
        await Promise.all(attachments.map(att => this.api.deleteAttachment(new DeleteAttachmentParams(att))));

        // Remove items from their respective vaults
        for (const [vault, items] of grouped.entries()) {
            vault.items.remove(...items);
            this.saveVault(vault);
            await this.syncVault(vault);
        }
    }

    /** Move `items` from their current vault to the `target` vault */
    async moveItems(items: { item: VaultItem; vault: Vault }[], target: Vault) {
        if (items.some(item => !!item.item.attachments.length)) {
            throw "Items with attachments cannot be moved!";
        }
        const newItems = await Promise.all(items.map(async i => ({ ...i.item, id: await uuid() })));
        await this.addItems(newItems, target);
        await this.deleteItems(items);
        return newItems;
    }

    getItemsForHost(host: string) {
        const items: { vault: Vault; item: VaultItem }[] = [];
        for (const vault of this.vaults) {
            for (const item of vault.items) {
                if (
                    item.fields.some(field => {
                        if (field.type !== "url") {
                            return false;
                        }

                        // Try to parse host from url. If field value is not a valid URL,
                        // assume its the bare host name
                        let h = field.value;
                        try {
                            h = new URL(field.value).host;
                        } catch (e) {}

                        // If host doesn't match exactly, try with/without "www."
                        return h === host || (host.startsWith("www.") ? host.slice(4) === h : "www." + host === h);
                    })
                ) {
                    items.push({ vault, item });
                }
            }
        }
        return items;
    }

    getItemsForUrl(url: string) {
        try {
            const { host } = new URL(url);
            return this.getItemsForHost(host);
        } catch (e) {
            return [];
        }
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
    async createOrg(name: string, type: OrgType = OrgType.Business): Promise<Org> {
        let org = new Org();
        org.name = name;
        org.type = type;
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

        // Remove orgs that the account is no longer a member of
        this.setState({ orgs: this.state.orgs.filter(org => this.account!.orgs.includes(org.id)) });
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

    async deleteOrg(id: OrgID) {
        await this.api.deleteOrg(id);
        await this.synchronize();
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
            if (role && member.role !== role) {
                await org.unlock(this.account!);
                await org.addOrUpdateMember({ ...member, role });
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
    async createInvites({ id }: Org, emails: string[], purpose?: InvitePurpose) {
        const invites: Invite[] = [];
        await this.updateOrg(id, async (org: Org) => {
            await org.unlock(this.account!);
            for (const email of emails) {
                const invite = new Invite(email, purpose);
                await invite.initialize(org, this.account!);
                invites.push(invite);
            }
            org.invites = [...org.invites.filter(a => !invites.some(b => a.email === b.email)), ...invites];
        });
        return invites!;
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

    /**
     * =============
     *  ATTACHMENTS
     * =============
     */

    async createAttachment(itemId: VaultItemID, file: File, name?: string): Promise<Attachment> {
        const { vault, item } = this.getItem(itemId)!;

        let att = new Attachment({ vault: vault.id });
        await att.fromFile(file);
        if (name) {
            att.name = name;
        }
        att = await this.api.createAttachment(att);

        (async () => {
            await att.uploadProgress!.completed;
            this.updateItem(vault, item, { attachments: [...item.attachments, att.info] });
        })();

        return att;
    }

    async downloadAttachment(att: AttachmentInfo) {
        return this.api.getAttachment(new GetAttachmentParams(att));
    }

    async deleteAttachment(itemId: VaultItemID, att: Attachment | AttachmentInfo): Promise<void> {
        const { vault, item } = this.getItem(itemId)!;
        try {
            await this.api.deleteAttachment(new DeleteAttachmentParams(att));
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }
        await this.updateItem(vault, item, { attachments: item.attachments.filter(a => a.id !== att.id) });
    }

    /**
     * =========
     *  BILLING
     * =========
     */

    async updateBilling(params: UpdateBillingParams) {
        params.provider = (this.state.billingProvider && this.state.billingProvider.type) || "";
        await this.api.updateBilling(params);
        params.org ? await this.fetchOrg(params.org) : await this.fetchAccount();
    }

    async loadBillingProvider() {
        const providers = await this.api.getBillingProviders();
        this.setState({ billingProvider: providers[0] || null });
    }

    getItemsQuota(vault: Vault = this.mainVault!) {
        return this.isMainVault(vault) && !this.orgs.some(org => !org.frozen) ? this.account!.quota.items : -1;
    }

    /**
     * ================
     *  HELPER METHODS
     * ================
     */

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
        this.setState({ syncing: !!this._activeSyncPromises.size });

        return active;
    }

    private async _unlocked() {
        // Unlock all vaults
        await Promise.all(this.state.vaults.map(vault => vault.unlock(this.account!)));

        // Notify state change
        this.publish();

        // Trigger sync
        this.synchronize();
    }
}
