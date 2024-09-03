import { loadLanguage, translate as $l } from "@padloc/locale/src/translate";
import { Storable } from "./storage";
import { Serializable, Serialize, AsDate, AsSerializable, bytesToBase64, stringToBytes, equalBytes } from "./encoding";
import { Invite, InvitePurpose } from "./invite";
import { Vault, VaultID } from "./vault";
import { Org, OrgID, OrgMember, OrgRole, Group, UnlockedOrg, OrgInfo, ActiveOrgMember, OrgMemberStatus } from "./org";
import {
    VaultItem,
    VaultItemID,
    Field,
    Tag,
    createVaultItem,
    AuditResult,
    ItemHistoryEntry,
    ITEM_HISTORY_ENTRIES_LIMIT,
    TagInfo,
} from "./item";
import { Account, AccountID, UnlockedAccount } from "./account";
import { Auth, AuthPurpose, AuthType } from "./auth";
import { Session, SessionID } from "./session";
import {
    API,
    CreateAccountParams,
    RecoverAccountParams,
    GetInviteParams,
    GetAttachmentParams,
    DeleteAttachmentParams,
    CreateKeyStoreEntryParams,
    GetKeyStoreEntryParams,
    UpdateAuthParams,
    AuthInfo,
    CompleteCreateSessionParams,
    StartCreateSessionParams,
    StartCreateSessionResponse,
    ChangeEmailParams,
} from "./api";
import { Client } from "./client";
import { Sender } from "./transport";
import { DeviceInfo, getDeviceInfo, getCryptoProvider, getStorage, authenticate } from "./platform";
import { uuid, throttle } from "./util";
import { Client as SRPClient } from "./srp";
import { Err, ErrorCode } from "./error";
import { Attachment, AttachmentInfo } from "./attachment";
import { SimpleContainer } from "./container";
import { AESKeyParams, PBKDF2Params } from "./crypto";
import { AccountFeatures, AccountProvisioning, OrgFeatures, OrgProvisioning, ProvisioningStatus } from "./provisioning";

/** Various usage stats */
export class Stats extends Serializable {
    /** Time of last sync */
    @AsDate()
    lastSync?: Date;
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
    /** Color theme **/
    theme: "dark" | "light" | "auto" = "auto";
    /** Toggle favicons */
    favicons = true;
    /** Enable badge on web extension icon */
    extensionBadge = true;
    /** Unmask Fields on hover */
    unmaskFieldsOnHover = true;
}

export interface HashedItem {
    hosts: string[];
}

export class Index extends Serializable {
    @AsSerializable(PBKDF2Params)
    hashParams = new PBKDF2Params({ iterations: 1 });

    items: HashedItem[] = [];

    async fromItems(items: VaultItem[]) {
        const crypto = getCryptoProvider();

        if (!this.hashParams.salt.length) {
            this.hashParams.salt = await crypto.randomBytes(16);
        }

        this.items = (
            await Promise.all(
                items.map(async (item) => ({
                    hosts: (
                        await Promise.all(
                            item.fields
                                .filter((f) => f.type === "url")
                                .map(async (f) => {
                                    // try to parse host from url. if url is not valid,
                                    // assume the url field contains just the domain.
                                    let host = f.value;
                                    try {
                                        host = new URL(f.value).host;
                                    } catch (e) {}

                                    if (!host) {
                                        return null;
                                    }

                                    const hashedHost = await crypto.deriveKey(stringToBytes(host), this.hashParams);

                                    return bytesToBase64(hashedHost);
                                })
                        )
                    ).filter((h) => h !== null) as string[],
                }))
            )
        ).filter((item) => item.hosts.length);
    }

    async matchHost(host: string) {
        const hashedHost = bytesToBase64(await getCryptoProvider().deriveKey(stringToBytes(host), this.hashParams));
        return this.items.filter((item) => item.hosts.some((h) => h === hashedHost)).length;
    }

    getHostnameVariants(host: string) {
        const parts = host.split(".");

        // Ignore single domains
        if (parts.length <= 2) {
            return [host, `*.${host}`];
        }

        // Remove the tld and domain from the parts, build it separately
        const domain: string[] = [];

        domain.unshift(parts.pop()!);
        domain.unshift(parts.pop()!);

        // Build list of subdomains to match, so given 'login.accounts.google.com', we'd see ['login', 'accounts'] as parts and ['google', 'com'] as domain, which should return ['google.com', 'accounts.google.com', and 'login.accounts.google.com']
        const subdomains = parts
            .reverse()
            .reduce(
                (currentDomainParts: string[], subdomain: string) => {
                    currentDomainParts.push(`${subdomain}.${currentDomainParts[currentDomainParts.length - 1]}`);

                    return currentDomainParts;
                },
                [domain.join(".")]
            )
            .map((subdomain) => `*.${subdomain}`); // prefix all subdomains with `*.` (can't be done above otherwise you get things like *.login.*.accounts.*.google.com)

        // Add regular domain/host
        subdomains.unshift(host);

        // Add/remove common "www." matching
        if (host.startsWith("www.")) {
            subdomains.push(host.slice(4));
        } else {
            subdomains.push(`www.${host}`);
        }

        return subdomains;
    }

    async fuzzyMatchHost(host: string) {
        const domains = this.getHostnameVariants(host);

        const domainsMatches = (await Promise.all(domains.map(async (domain) => await this.matchHost(domain)))).reduce(
            (previousCount, currentCount) => previousCount + currentCount,
            0
        );

        return domainsMatches;
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

export class StoredMasterKey extends SimpleContainer {
    authenticatorId: string = "";
    keyStoreId: string = "";
}

export interface AppContext {
    browser?: {
        title?: string;
        url?: string;
        favIconUrl?: string;
    };
}

/** Application state */
export class AppState extends Storable {
    id = "app-state";

    /** Application Settings */
    @AsSerializable(Settings)
    settings = new Settings();

    /** Usage data */
    @AsSerializable(Stats)
    stats = new Stats();

    /** Info about current device */
    @AsSerializable(DeviceInfo)
    device = new DeviceInfo();

    /** Current [[Session]] */
    @AsSerializable(Session)
    session: Session | null = null;

    /** Currently logged in [[Account]] */
    @AsSerializable(Account)
    account: Account | null = null;

    /** Authentication Information, such as active sessions, trusted devices etc. */
    @AsSerializable(AuthInfo)
    authInfo: AuthInfo | null = null;

    /** All organizations the current [[account]] is a member of. */
    @AsSerializable(Org)
    orgs: Org[] = [];

    /** All vaults the current [[account]] has access to. */
    @AsSerializable(Vault)
    vaults: Vault[] = [];

    /** Whether a sync is currently in process. */
    syncing = false;

    /** Whether the app doesn't have an internet connection at the moment */
    offline = false;

    @AsSerializable(StoredMasterKey)
    rememberedMasterKey: StoredMasterKey | null = null;

    context: AppContext = {};

    @AsSerializable(Index)
    index: Index = new Index();

    /** IDs of most recently used items. The most recently used item is last */
    @Serialize({
        arrayDeserializeIndividually: false,
        fromRaw: (raw: [string, string][]) => new Map<string, Date>(raw.map(([id, date]) => [id, new Date(date)])),
        toRaw: (val: any) => [...val],
    })
    lastUsed = new Map<string, Date>();

    _errors: Err[] = [];

    /** Whether the app is in "locked" state */
    get locked() {
        return !this.account || this.account.locked;
    }

    /** Whether a user is logged in */
    get loggedIn() {
        return !!this.session;
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

    private _resolveLoad!: () => void;

    /** Promise that is resolved when the app has been fully loaded */
    loaded = new Promise<void>((resolve) => (this._resolveLoad = resolve));

    constructor(
        /** Data transport provider */
        sender: Sender
    ) {
        this.api = new Client(this.state, sender, (_req, _res, err) => {
            const offline = err?.code === ErrorCode.FAILED_CONNECTION;
            if (offline !== this.state.offline) {
                this.setState({ offline });
            }
        });
    }

    get storage() {
        return getStorage();
    }

    /** Promise that resolves once all current synchronization processes are complete */
    get syncComplete() {
        return Promise.all([...this._activeSyncPromises.values(), ...this._queuedSyncPromises.values()]);
    }

    /** Current account */
    get account() {
        return this.state.account;
    }

    /** Authentication Information, such as active sessions, trusted devices etc. */
    get authInfo() {
        return this.state.authInfo;
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
        return (this.account && this.getVault(this.account.mainVault.id)) || null;
    }

    get offline() {
        return this.state.offline;
    }

    get remembersMasterKey() {
        return !!this.state.rememberedMasterKey;
    }

    get auditedItems() {
        let items: { item: VaultItem; vault: Vault }[] = [];
        for (const vault of this.vaults) {
            for (const item of vault.items) {
                if (item.auditResults?.length) {
                    items.push({ item, vault });
                }
            }
        }
        return items;
    }

    get count() {
        const count = {
            favorites: 0,
            attachments: 0,
            recent: 0,
            total: 0,
            currentHost: this.state.context.browser?.url
                ? this.getItemsForUrl(this.state.context.browser.url).length
                : 0,
            report: 0,
        };

        const recentThreshold = new Date(Date.now() - this.settings.recentLimit * 24 * 60 * 60 * 1000);
        for (const vault of this.vaults) {
            for (const item of vault.items) {
                count.total++;
                if (this.account && this.account.favorites.has(item.id)) {
                    count.favorites++;
                }
                if (item.attachments.length) {
                    count.attachments++;
                }
                if (this.state.lastUsed.has(item.id) && this.state.lastUsed.get(item.id)! > recentThreshold) {
                    count.recent++;
                }
                if (item.auditResults?.length) {
                    count.report++;
                }
            }
        }

        return count;
    }

    /** All [[Tag]]s found within the users [[Vault]]s */
    get tags(): TagInfo[] {
        const tagNames = new Map<string, { count: number; readonly: number }>();

        for (const vault of this.state.vaults) {
            const editable = this.isEditable(vault);
            for (const item of vault.items) {
                for (const tag of item.tags) {
                    if (!tagNames.has(tag)) {
                        tagNames.set(tag, { count: 0, readonly: 0 });
                    }

                    tagNames.get(tag)!.count++;

                    if (!editable) {
                        tagNames.get(tag)!.readonly++;
                    }
                }
            }
        }

        const sortedTagnames = [...tagNames.entries()].sort(([, a], [, b]) => b.count - a.count);
        const tags = this.account?.tags ? [...this.account.tags] : [];

        for (const [name, { count, readonly }] of sortedTagnames) {
            let tagInfo = tags.find((t) => t.name === name);
            if (!tagInfo) {
                tagInfo = { name };
                tags.push(tagInfo);
            }
            tagInfo.count = count;
            tagInfo.readonly = readonly;
        }

        return tags;
    }

    private _queuedSyncPromises = new Map<string, Promise<void>>();
    private _activeSyncPromises = new Map<string, Promise<void>>();

    private _subscriptions: Array<(state: AppState) => void> = [];

    private _cachedStartCreateSessionResponses = new Map<string, StartCreateSessionResponse>();

    /** Save application state to persistent storage */
    async save() {
        await this.loaded;
        if (!this.state.locked) {
            await this.state.index.fromItems(
                this.state.vaults.reduce((items, v) => [...items, ...v.items], [] as VaultItem[])
            );
        }

        await this.storage.save(this.state);
    }

    /** Load application state from persistent storage */
    async load() {
        // Try to load app state from persistent storage.
        try {
            this.setState(await this.storage.get(AppState, this.state.id));
        } catch (e) {
            // console.error("failed to load state", e);
        }

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

        this._resolveLoad();

        // Notify state change
        this.publish();

        return this.loaded;
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
        [this.account!, ...this.state.orgs, ...this.state.vaults].forEach((each) => each?.lock());
        this.publish();
    }

    /**
     * Synchronizes the current account and all of the accounts organizations
     * and vaults
     */
    async synchronize() {
        this.setState({ syncing: true });
        await this.fetchAuthInfo();
        await this.fetchAccount();
        await this.fetchOrgs();
        await this.autoHandleInvites();
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
        this._subscriptions = this._subscriptions.filter((f) => f !== fn);
    }

    /**
     * Notifies all subscribers of a [[state]] change
     */
    publish = throttle(() => {
        for (const fn of this._subscriptions) {
            fn(this.state);
        }
    }, 1000);

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
        authToken,
        /** Information about the [[Invite]] object if signup was initiated through invite link */
        invite,
    }: {
        email: string;
        password: string;
        name: string;
        authToken: string;
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
                authToken,
                invite,
            })
        );

        // Sign into new account
        await this.login({ email, password });
    }

    /**
     * Log in user, creating a new [[Session]], loading [[Account]] info and
     * fetching all of the users [[Org]]anizations and [[Vault]]s.
     */
    async login({
        email,
        password,
        authToken,
        addTrustedDevice,
        asAdmin,
    }: {
        email: string;
        password: string;
        authToken?: string;
        addTrustedDevice?: boolean;
        asAdmin?: boolean;
    }) {
        if (!this._cachedStartCreateSessionResponses.has(email)) {
            // Fetch authentication info
            this._cachedStartCreateSessionResponses.set(
                email,
                await this.api.startCreateSession(new StartCreateSessionParams({ email, authToken, asAdmin }))
            );
        }

        const { accountId: accId, keyParams, srpId, B } = this._cachedStartCreateSessionResponses.get(email)!;

        const auth = new Auth(email);
        auth.keyParams = keyParams;

        // Generate auth secret
        const authKey = await auth.getAuthKey(password);

        // Initialize SRP object
        const srp = new SRPClient();
        await srp.initialize(authKey);
        await srp.setB(B);

        // Create session object
        const session = await this.api.completeCreateSession(
            new CompleteCreateSessionParams({ accountId: accId, A: srp.A!, M: srp.M1!, addTrustedDevice, srpId })
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
        this._cachedStartCreateSessionResponses.clear();

        // Revoke session
        try {
            await this.forgetMasterKey();
            await this.api.revokeSession(this.state.session!.id);
        } catch (e) {}

        // Reset application state
        this.setState({
            account: null,
            session: null,
            authInfo: null,
            vaults: [],
            orgs: [],
            index: new Index(),
        });
        await this.save();
    }

    /**
     * Updates the users master password
     */
    async changePassword(oldPassword: string, newPassword: string) {
        // TODO: Add option to rotate keys

        await this.updateAccount(async (account) => {
            // Update account object
            await account.unlock(oldPassword);
            await account.setPassword(newPassword);

            // Update auth object
            const auth = new Auth(account.email);
            auth.account = account.id;
            const authKey = await auth.getAuthKey(newPassword);
            const srp = new SRPClient();
            await srp.initialize(authKey);
            auth.verifier = srp.v!;
            await this.api.updateAuth(
                new UpdateAuthParams({
                    verifier: auth.verifier,
                    keyParams: auth.keyParams,
                })
            );
        });

        await this.forgetMasterKey();
    }

    async changeEmail(email: string) {
        if (!this.account) {
            throw "You must be logged in to change your email!";
        }

        const { token } = await authenticate({ email, type: AuthType.Email, purpose: AuthPurpose.ChangeEmail });

        const account = await this.api.changeEmail(new ChangeEmailParams({ authToken: token, email }));

        account.copySecrets(this.account);

        // Update and save state
        this.setState({ account });
        await this.save();

        await this.fetchOrgs();
    }

    /**
     * Fetches the users [[Account]] info from the [[Server]]
     */
    async fetchAccount() {
        const account = await this.api.getAccount();

        // Copy over secret properties so we don't have to
        // unlock the account object again.
        if (this.account) {
            account.copySecrets(this.account);
        }

        // Update and save state
        this.setState({ account });
        await this.save();
    }

    /**
     * Fetches the users [[Account]] info from the [[Server]]
     */
    async fetchAuthInfo() {
        const authInfo = await this.api.getAuthInfo();

        // Update and save state
        this.setState({ authInfo });
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
        const masterKey = account.masterKey;

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

        if (masterKey) {
            await account.unlockWithMasterKey(masterKey);
        }

        // Update and save state
        this.setState({ account });
        await this.save();
    }

    /**
     * Revokes the given [[Session]]
     */
    async revokeSession(id: SessionID) {
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
        verify,
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
                verify,
            })
        );

        // Sign in user using the new password
        await this.login({ email, password });

        // Rotate keys of all owned organizations. Suspend all other members
        // and create invites to reconfirm the membership.
        for (const org of this.state.orgs.filter((o) => o.isOwner(account))) {
            await this.rotateOrgKeys(org);
        }
    }

    async rotateOrgKeys(org: Org) {
        const account = this.account!;

        return this.updateOrg(org.id, async (org) => {
            // Rotate org encryption key
            delete org.encryptedData;
            await org.updateAccessors([account]);

            // Rotate other cryptographic keys
            await org.generateKeys();

            org.invites = [];

            // Suspend members and create confirmation invites
            for (const member of org.members.filter((m) => m.id !== account.id)) {
                member.status = OrgMemberStatus.Suspended;
                const invite = new Invite(member.email, "confirm_membership");
                await invite.initialize(org, this.account!);
                org.invites.push(invite);
            }

            // Update own membership
            await org.addOrUpdateMember({
                accountId: account.id,
                email: account.email,
                name: account.name,
                publicKey: account.publicKey,
                orgSignature: await account.signOrg({ id: org.id, publicKey: org.publicKey! }),
                role: OrgRole.Owner,
            });
        });
    }

    async rememberMasterKey(authenticatorId: string) {
        if (!this.account || this.account.locked) {
            throw "App needs to be unlocked first";
        }
        const key = await getCryptoProvider().generateKey(new AESKeyParams());

        const container = new StoredMasterKey();
        await container.unlock(key);
        await container.setData(this.account.masterKey!);

        const keyStoreEntry = await this.api.createKeyStoreEntry(
            new CreateKeyStoreEntryParams({ authenticatorId, data: key })
        );

        container.authenticatorId = authenticatorId;
        container.keyStoreId = keyStoreEntry.id;

        this.setState({ rememberedMasterKey: container });
        await this.save();
    }

    async forgetMasterKey() {
        if (!this.state.rememberedMasterKey) {
            return;
        }
        try {
            await this.api.deleteKeyStoreEntry(this.state.rememberedMasterKey.keyStoreId);
            await this.api.deleteAuthenticator(this.state.rememberedMasterKey.authenticatorId);
        } catch (e) {}
        this.setState({ rememberedMasterKey: null });
        await this.save();
    }

    async unlockWithRememberedMasterKey(authToken: string) {
        if (!this.state.rememberedMasterKey) {
            throw "No remembered master key available!";
        }

        const encryptedMasterKey = this.state.rememberedMasterKey;
        const { data: key } = await this.api.getKeyStoreEntry(
            new GetKeyStoreEntryParams({ id: this.state.rememberedMasterKey?.keyStoreId, authToken })
        );
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
        return this.state.vaults.find((vault) => vault.id === id);
    }

    /** Locally update the given `vault` object */
    putVault(vault: Vault) {
        this.setState({
            vaults: [...this.state.vaults.filter((v) => v.id !== vault.id), vault],
        });
    }

    isMainVault(vault: Vault) {
        return vault && this.account && this.account.mainVault.id === vault.id;
    }

    /** Create a new [[Vault]] */
    async createVault(
        name: string,
        org: Org,
        members: { email: string; accountId?: AccountID; readonly: boolean }[] = [],
        groups: { name: string; readonly: boolean }[] = []
    ): Promise<Vault> {
        if (!members.length && !groups.length) {
            throw new Error("You have to assign at least one member or group!");
        }

        let vault = new Vault();
        vault.name = name;
        vault.org = org.info;
        vault = await this.api.createVault(vault);

        await this.fetchOrg(org);

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
            members.forEach(({ accountId, email, readonly }) => {
                const member = org.getMember({ accountId, email });
                if (!member) {
                    setTimeout(() => {
                        throw `Member not found: ${email}`;
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
    async updateVaultAccess(
        /** Organization owning the vault */
        orgId: OrgID,
        /** The vault id */
        id: VaultID,
        /** The new vault name */
        name: string,
        /** Organization members that should have access to the vault */
        members: { email: string; id?: AccountID; readonly: boolean }[] = [],
        /** Groups that should have access to the vault */
        groups: { name: string; readonly: boolean }[] = []
    ) {
        if (!members.length && !groups.length) {
            throw new Error("You have to assign at least one member or group!");
        }

        await this.updateOrg(orgId, async (org: Org) => {
            // Update name (the name of the actual [[Vault]] name will be
            // updated in the background)
            org.vaults.find((v) => v.id === id)!.name = name;

            // Update group access
            for (const group of org.groups) {
                // remove previous vault entry
                group.vaults = group.vaults.filter((v) => v.id !== id);
                // update vault entry
                const selection = groups.find((g) => g.name === group.name);
                if (selection) {
                    group.vaults.push({ id, readonly: selection.readonly });
                }
            }

            // Update member access
            for (const member of org.members) {
                // remove previous vault entry
                member.vaults = member.vaults.filter((v) => v.id !== id);
                // update vault entry
                const selection = members.find((m) => m.email === member.email);
                if (selection) {
                    member.vaults.push({ id, readonly: selection.readonly });
                }
            }
        });

        this.synchronize();
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
    async syncVault(vault: { id: VaultID; name?: string; revision?: string }): Promise<Vault> {
        return this._queueSync(vault, (vault: { id: VaultID }) => this._syncVault(vault));
    }

    /** Synchronize all vaults the current user has access to. */
    async syncVaults() {
        if (!this.account) {
            return;
        }

        // Sync private vault
        const promises = [this.syncVault(this.account.mainVault)] as Promise<any>[];

        // Sync vaults assigned to through organizations
        for (const org of this.state.orgs) {
            // Sync all vaults for this organization
            for (const vault of org.getVaultsForMember(this.account)) {
                promises.push(this.syncVault(vault));
            }
        }

        // clean up vaults the user no longer has access to
        const removeVaults = new Set<VaultID>();
        for (const vault of this.state.vaults) {
            const org = vault.org && this.getOrg(vault.org.id);
            if (
                vault.id !== this.account.mainVault.id &&
                (!org || !org.vaults.find((v) => v.id === vault.id) || !org.canRead(vault, this.account))
            ) {
                removeVaults.add(vault.id);
            }
        }

        this.setState({
            vaults: this.state.vaults.filter((v) => !removeVaults.has(v.id)),
        });

        await Promise.all(promises);
    }

    async fetchVault({ id, revision }: { id: VaultID; revision?: string }): Promise<Vault | null> {
        if (!this.account) {
            console.error("need to be logged in to fetch vault!");
            return null;
        }

        if (this.account.locked) {
            console.error("Account needs to be unlocked to fetch vault!");
            return null;
        }

        let localVault = this.getVault(id);

        // If the revision to be fetched matches the revision stored locally,
        // we don't need to fetch anything
        if (localVault && revision && localVault.revision === revision && !localVault.error) {
            return localVault;
        }

        let remoteVault: Vault | null = null;
        let result: Vault;

        try {
            // Fetch remote vault
            remoteVault = await this.api.getVault(id);
        } catch (e) {
            if (localVault && e.code !== ErrorCode.FAILED_CONNECTION) {
                localVault.error = e;
            }
        }

        // Bail out if fetching the remote vault failed forever reason
        if (!remoteVault) {
            return null;
        }

        // Try to unlock the vault. Bail out if this fails for whatever
        // reason (probably because the user no longer has access).
        try {
            await remoteVault.unlock(this.account as UnlockedAccount);
        } catch (e) {
            const vault = localVault || remoteVault;
            const org = vault.org && this.getOrg(vault.org.id);

            if (e.code === ErrorCode.MISSING_ACCESS) {
                e = new Err(
                    e.code,
                    org?.canRead(vault, this.account)
                        ? $l(
                              "You have been granted access to this vault, but before you can see its contents somebody else with access to it has to log into their account first. Once you have full access, this warning will disappear automatically."
                          )
                        : $l("This vault could not be synchronized because you no longer have access to it.")
                );
            }

            vault.error = e;
            this.putVault(vault);
            return vault;
        }

        // Merge changes
        if (localVault) {
            result = this.getVault(id)!;
            try {
                await result.unlock(this.account as UnlockedAccount);
                result.merge(remoteVault);
            } catch (e) {
                result = remoteVault;
            }
        } else {
            result = remoteVault;
        }

        this._migrateFavorites(result);

        result.error = undefined;

        await this.saveVault(result);

        return result;
    }

    /**
     * Migrate favorites from "old" favoriting mechanism
     * @deprecated
     */
    private _migrateFavorites(vault: Vault) {
        if (!this.account) {
            return;
        }
        for (const item of vault.items) {
            if (item.favorited && item.favorited.includes(this.account.id)) {
                this.account.favorites.add(item.id);
                item.favorited = item.favorited.filter((acc) => acc !== this.account!.id);
                vault.items.update(item);
            }
        }
    }

    async updateVault({ id }: { id: VaultID }, tries = 0): Promise<Vault | null> {
        if (!this.account) {
            throw "need to be logged in to update vault!";
        }

        if (this.account.locked) {
            throw "Account needs to be unlocked to update vault!";
        }

        const account = this.account as UnlockedAccount;

        let vault = this.getVault(id);

        if (!vault) {
            return null;
        }

        const org = vault.org && this.getOrg(vault.org.id);

        // Unlock the vault in case it hasn't been yet
        try {
            await vault.unlock(account);
        } catch (e) {
            if (e.code === ErrorCode.MISSING_ACCESS) {
                e = new Err(
                    e.code,
                    org?.canRead(vault, account)
                        ? $l(
                              "You have been granted access to this vault, but before you can see its contents somebody else with access to it has to log into their account first. Once you have full access, this warning will disappear automatically."
                          )
                        : $l("This vault could not be synchronized because you no longer have access to it.")
                );
            }
            vault.error = e;

            return vault;
        }

        const accessors = (org ? org.getAccessors(vault) : [account]) as ActiveOrgMember[];
        const accessorsChanged =
            vault.accessors.length !== accessors.length ||
            accessors.some((a) => {
                const b = vault!.accessors.find((v) => a.id === v.id);
                return !b?.publicKey || !equalBytes(a.publicKey, b.publicKey);
            });

        if ((org && org.isSuspended(account)) || (!vault.items.hasChanges && !accessorsChanged)) {
            // No changes - skipping update
            return vault;
        }

        if (org && !org.canWrite(vault, account)) {
            // User does'nt have write access; dismiss changes and bail out;
            vault.items.clearChanges();
            return vault;
        }

        // Mark the point in time where we started the update, so that if we make
        // any further changes before the update completes we don't inadvetedly
        // dismiss them
        const updateStarted = new Date();

        // Clone the vault so we can revert to the original state if the update fails
        vault = vault.clone();

        // Clear the marked changes since they're about to be synced
        vault.items.clearChanges();
        await vault.commit();

        try {
            // // Make sure the organization revision matches the one the vault is based on
            if (vault.org && (!org || org.revision !== vault.org.revision)) {
                if (tries > 3) {
                    throw new Err(
                        ErrorCode.OUTDATED_REVISION,
                        $l(
                            `Local changes to this vault could not be synchronized because there was a problem retrieving information for this vault's organization. If this problem persists please contact customer support!`
                        )
                    );
                }

                // Get the latest organization and vault info, then try again
                await this.fetchOrg({ id: vault.org.id });
                await this.fetchVault({ id });
                return this.updateVault(vault, tries + 1);
            }
        } catch (e) {
            this.getVault(vault.id)!.error = e;
            return null;
        }

        // Update accessors
        if (org) {
            try {
                const provisioning = this.getOrgProvisioning(org);
                if (provisioning?.status === ProvisioningStatus.Frozen) {
                    throw new Err(
                        ErrorCode.PROVISIONING_NOT_ALLOWED,
                        $l("Syncing local changes failed because the organization this vault belongs to is frozen.")
                    );
                }

                if (!org.canWrite(vault, account)) {
                    throw new Err(
                        ErrorCode.INSUFFICIENT_PERMISSIONS,
                        $l("Syncing local changes failed because you don't have write permissions for this vault.")
                    );
                }

                // Look up which members should have access to this vault
                const accessors = org.getAccessors(vault);

                // Verify member details
                await account.verifyOrg(org);
                await org.verifyAll(accessors);

                // Update accessors
                await vault.updateAccessors(accessors);
            } catch (e) {
                this.getVault(vault.id)!.error = e;
                return null;
            }
        } else {
            await vault.updateAccessors([account]);
        }

        // Push updated vault object to [[Server]]
        try {
            vault = await this.api.updateVault(vault);
            await vault.unlock(account as UnlockedAccount);

            const existing = this.getVault(vault.id)!;

            // Clear changes that happened before the sync started (retaining any changes made while
            // the sync was in progress)
            existing.items.clearChanges(updateStarted);

            // Merge changes back into existing vault (also updating revisision etc.)
            existing.merge(vault);

            // Commit changes and update local state
            await existing.commit();
            this.putVault(existing);

            if (org) {
                org.revision = vault.org!.revision!;
                org.vaults.find((v) => v.id === vault!.id)!.revision = vault.revision;
                this.putOrg(org);
                account.orgs.find((o) => o.id === org.id)!.revision = org.revision;
            } else {
                account.mainVault.revision = vault.revision;
            }

            await this.save();

            return existing;
        } catch (e) {
            // The server will reject the update if the vault revision does
            // not match the current revision on the server, in which case we'll
            // have to fetch the current vault version and try again.
            if (e.code === ErrorCode.OUTDATED_REVISION) {
                await this.fetchVault({ id });
                return this.updateVault({ id });
            }

            if (e.code !== ErrorCode.FAILED_CONNECTION) {
                this.getVault(vault.id)!.error = e;
            }

            return vault;
        }
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

    isEditable(vault: Vault) {
        const provisioning = vault.org ? this.getOrgProvisioning(vault.org) : this.getAccountProvisioning();
        return this.hasWritePermissions(vault) && provisioning?.status === ProvisioningStatus.Active;
    }

    private async _syncVault(vault: { id: VaultID; revision?: string }): Promise<Vault | null> {
        const fetched = await this.fetchVault(vault);
        return fetched && !fetched.error ? this.updateVault(vault) : fetched;
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
    async addItems(items: VaultItem[], { id }: { id: VaultID }) {
        const vault = this.getVault(id)!;
        vault.items.update(...items);

        await this.saveVault(vault);
        this.syncVault(vault);
    }

    /** Creates a new [[VaultItem]] */
    async createItem({
        name = "",
        vault,
        fields,
        tags,
        icon,
    }: {
        name: string;
        vault: { id: VaultID };
        fields?: Field[];
        tags?: Tag[];
        icon?: string;
    }): Promise<VaultItem> {
        const item = await createVaultItem({ name, fields, tags, icon });
        if (this.account) {
            item.updatedBy = this.account.id;
        }

        await this.addItems([item], vault);

        return item;
    }

    /** Update a given [[VaultItem]]s name, fields, tags and attachments */
    async updateItem(
        item: VaultItem,
        upd: {
            name?: string;
            fields?: Field[];
            tags?: Tag[];
            attachments?: AttachmentInfo[];
            auditResults?: AuditResult[];
            lastAudited?: Date;
            expiresAfter?: number;
        },
        save = true,
        sync = true
    ) {
        const { vault } = this.getItem(item.id)!;
        const newItem = new VaultItem({
            ...item,
            ...upd,
            updatedBy: this.account!.id,
        });

        if (
            item.name !== newItem.name ||
            JSON.stringify(item.tags) !== JSON.stringify(newItem.tags) ||
            JSON.stringify(item.fields) !== JSON.stringify(newItem.fields)
        ) {
            newItem.history = [new ItemHistoryEntry(item), ...item.history].slice(0, ITEM_HISTORY_ENTRIES_LIMIT);
        }

        vault.items.update(newItem);
        if (save) {
            await this.saveVault(vault);
            if (sync) {
                this.syncVault(vault);
            }
        }
    }

    async toggleFavorite(id: VaultItemID, favorite: boolean) {
        await this.updateAccount((acc) => acc.toggleFavorite(id, favorite));
    }

    async updateLastUsed(item: VaultItem) {
        this.state.lastUsed.set(item.id, new Date());
        this.publish();
    }

    /** Delete a number of `items` */
    async deleteItems(items: VaultItem[]) {
        const attachments: AttachmentInfo[] = [];

        // Group items by vault
        const grouped = new Map<Vault, VaultItem[]>();
        for (const item of items) {
            const { vault } = this.getItem(item.id)!;

            if (!grouped.has(vault)) {
                grouped.set(vault, []);
            }

            grouped.get(vault)!.push(item);
            attachments.push(...item.attachments);
        }

        const promises: Promise<void>[] = [];

        // Delete all attachments for this item
        promises.push(...attachments.map((att) => this.api.deleteAttachment(new DeleteAttachmentParams(att))));

        // Remove items from their respective vaults
        for (const [vault, items] of grouped.entries()) {
            promises.push(
                (async () => {
                    vault.items.remove(...items);
                    await this.saveVault(vault);
                    this.syncVault(vault);
                })()
            );
        }

        await Promise.all(promises);
    }

    /** Move `items` from their current vault to the `target` vault */
    async moveItems(items: VaultItem[], target: Vault) {
        if (items.some((item) => !!item.attachments.length)) {
            throw "Items with attachments cannot be moved!";
        }
        const newItems = await Promise.all(items.map(async (item) => new VaultItem({ ...item, id: await uuid() })));
        await this.addItems(newItems, target);
        await this.deleteItems(items);
        return newItems;
    }

    getItemsForHost(host: string) {
        const items: { vault: Vault; item: VaultItem }[] = [];
        for (const vault of this.vaults) {
            for (const item of vault.items) {
                if (
                    item.fields.some((field) => {
                        if (field.type !== "url") {
                            return false;
                        }

                        // Try to parse host from url. If field value is not a valid URL,
                        // assume its the bare host name
                        let h = field.value;
                        try {
                            h = new URL(field.value).host;
                        } catch (e) {}

                        return this.state.index.getHostnameVariants(host).includes(h);
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

    getTagInfo(name: Tag): TagInfo {
        return this.tags.find((t) => t.name === name) || { name };
    }

    async deleteTag(tag: Tag) {
        const changedVaults = new Set<Vault>();

        for (const vault of this.vaults) {
            if (!this.isEditable(vault)) {
                continue;
            }
            for (const item of vault.items) {
                if (item.tags.includes(tag)) {
                    this.updateItem(item, { tags: item.tags.filter((t) => t !== tag) }, false, false);
                    changedVaults.add(vault);
                }
            }
        }

        for (const vault of changedVaults) {
            await this.saveVault(vault);
            await this.syncVault(vault);
        }

        await this.updateAccount(async (account) => {
            account.tags = account.tags.filter((t) => t.name !== tag);
            await account.commitSecrets();
        });
    }

    async renameTag(tag: Tag, newName: string) {
        const changedVaults = new Set<Vault>();

        for (const vault of this.vaults) {
            if (!this.isEditable(vault)) {
                continue;
            }
            for (const item of vault.items) {
                if (item.tags.includes(tag)) {
                    this.updateItem(item, { tags: [...item.tags.filter((t) => t !== tag), newName] }, false, false);
                    changedVaults.add(vault);
                }
            }
        }

        for (const vault of changedVaults) {
            await this.saveVault(vault);
            await this.syncVault(vault);
        }

        await this.updateAccount(async (account) => {
            const existing = account.tags.find((t) => t.name === tag);
            if (existing) {
                existing.name = newName;
            }
            await account.commitSecrets();
        });
    }

    /*
     * =========================
     *  ORGANIZATION MANAGEMENT
     * =========================
     */

    /** Get the organization with the given `id` */
    getOrg(id: OrgID) {
        return this.state.orgs.find((org) => org.id === id);
    }

    /** Update the given organization locally */
    putOrg(org: Org) {
        this.setState({
            orgs: [...this.state.orgs.filter((v) => v.id !== org.id), org],
        });
    }

    /** Create a new [[Org]]ganization */
    async createOrg(name: string): Promise<Org> {
        let org = new Org();
        org.name = name;
        org = await this.api.createOrg(org);
        await this.fetchAccount();
        return this.fetchOrg(org);
    }

    /** Fetch all organizations the current account is a member of */
    async fetchOrgs() {
        if (!this.account) {
            return;
        }

        try {
            await Promise.all(this.account.orgs.map((org) => this.fetchOrg(org)));
        } catch (e) {}

        // Remove orgs that the account is no longer a member of
        this.setState({ orgs: this.state.orgs.filter((org) => this.account!.orgs.some((o) => o.id === org.id)) });
    }

    /** Fetch the [[Org]]anization object with the given `id` */
    async fetchOrg({ id, revision }: { id: OrgID; revision?: string }) {
        const existing = this.getOrg(id);

        if (existing && existing.revision === revision && existing.publicKey) {
            return existing;
        }

        let org = await this.api.getOrg(id);

        // Verify that the updated organization object has a `minMemberUpdated`
        // property equal to or higher than the previous (local) one.
        if (existing && org.minMemberUpdated < existing.minMemberUpdated) {
            throw new Err(ErrorCode.VERIFICATION_ERROR, "'minMemberUpdated' property may not decrease!");
        }

        const account = this.account;

        if (account && !account.locked && org.isOwner(account) && !org.publicKey) {
            await org.initialize(account);
            org = await this.api.updateOrg(org);
        }

        // If for whatever reason (like changing the email address), an org
        // owner gets suspended from their own org, we can simply unsuspend
        // them.
        if (account && org.isOwner(account) && org.isSuspended(account)) {
            await org.unlock(account as UnlockedAccount);
            // Unsuspend self
            await org.addOrUpdateMember({
                accountId: account.id,
                email: account.email,
                name: account.name,
                publicKey: account.publicKey,
                orgSignature: await account.signOrg({ id: org.id, publicKey: org.publicKey! }),
                role: OrgRole.Owner,
                status: OrgMemberStatus.Active,
            });
            org = await this.api.updateOrg(org);
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
                await this.fetchOrg({ id });
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
    async createGroup(
        org: Org,
        name: string,
        members: { email: string }[],
        vaults: { id: VaultID; readonly: boolean }[]
    ) {
        if (name.toLowerCase() === "new") {
            throw $l("This group name is not available!");
        }

        const group = new Group();
        group.name = name;
        group.members = members;
        group.vaults = vaults;
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
    async updateGroup(
        org: Org,
        { name }: { name: string },
        {
            members,
            vaults,
            name: newName,
        }: { members?: { email: string }[]; vaults?: { id: VaultID; readonly: boolean }[]; name?: string }
    ) {
        await this.updateOrg(org.id, async (org) => {
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

            if (members) {
                group.members = members;
            }

            if (vaults) {
                group.vaults = vaults;
            }
        });
        return this.getOrg(org.id)!.groups.find((g) => g.name === (newName || name))!;
    }

    /**
     * Update a members assigned [[Vault]]s, [[Group]]s and [[OrgRole]].
     */
    async updateMember(
        org: Org,
        { email, accountId }: OrgMember,
        {
            vaults,
            groups,
            role,
            status,
        }: {
            vaults?: { id: VaultID; readonly: boolean }[];
            groups?: string[];
            role?: OrgRole;
            status?: OrgMemberStatus;
        }
    ): Promise<OrgMember> {
        if (!this.account || this.account.locked) {
            throw "App needs to be logged in and unlocked to update an organization member!";
        }
        await this.updateOrg(org.id, async (org) => {
            const member = org.getMember({ email, accountId })!;

            // Update assigned vaults
            if (vaults) {
                member.vaults = vaults;
            }

            // Update assigned groups
            if (groups) {
                // Remove member from all groups
                for (const group of org.groups) {
                    group.members = group.members.filter((m) => m.email !== email);
                }

                // Add them back to the assigned groups
                for (const name of groups) {
                    const group = org.getGroup(name)!;
                    group.members.push({ email, accountId });
                }
            }

            // Update member role
            if ((role && member.role !== role) || (status && member.status !== status)) {
                await org.unlock(this.account as UnlockedAccount);
                await org.addOrUpdateMember({ ...member, role, status });
            }
        });

        return this.getOrg(org.id)!.getMember({ email, accountId })!;
    }

    /**
     * Removes a member from the given `org`
     */
    async removeMember(org: Org, member: OrgMember) {
        if (!this.account || this.account.locked) {
            throw "App needs to be logged in and unlocked to remove a organization member!";
        }
        await this.updateOrg(org.id, async (org) => {
            await org.unlock(this.account as UnlockedAccount);
            await org.removeMember(member);
        });
    }

    /**
     * Transfers an organizations ownership to a different member
     */
    async transferOwnership(org: Org, member: OrgMember) {
        if (!this.account || this.account.locked) {
            throw "App needs to be logged in and unlocked to transfer an organizations ownership!";
        }
        await this.updateOrg(org.id, async (org) => {
            await org.unlock(this.account as UnlockedAccount);
            await org.makeOwner(member);
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
        if (!this.account || this.account.locked) {
            throw "App needs to be logged in and unlocked to create an invite!";
        }
        let invites: Invite[] = [];
        await this.updateOrg(id, async (org: Org) => {
            await org.unlock(this.account as UnlockedAccount);
            invites = [];
            for (const email of emails) {
                const invite = new Invite(email, purpose);
                await invite.initialize(org, this.account!);
                invites.push(invite);
            }
            org.invites = [...org.invites.filter((a) => !invites.some((b) => a.email === b.email)), ...invites];
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
        if (!this.account || this.account.locked) {
            throw "App needs to be logged in and unlocked to confirm an invite!";
        }

        const org = this.getOrg(invite.org!.id)!;
        await org.unlock(this.account as UnlockedAccount);
        await invite.unlock((org as UnlockedOrg).invitesKey);

        // Verify invitee information
        if (!(await invite.verifyInvitee())) {
            throw new Err(ErrorCode.VERIFICATION_ERROR, "Failed to verify invitee information!");
        }

        // Add member and update organization
        await this.updateOrg(invite.org!.id, async (org: Org) => {
            await org.unlock(this.account as UnlockedAccount);
            await org.addOrUpdateMember(invite.invitee!);
            org.removeInvite(invite);
        });

        return this.getOrg(invite.org!.id)!.getMember({ email: invite.invitee!.email })!;
    }

    /**
     * Deletes an [[Invite]]
     */
    async deleteInvite(invite: Invite): Promise<void> {
        await this.updateOrg(
            invite.org!.id,
            async (org) => (org.invites = org.invites.filter((inv) => inv.id !== invite.id))
        );
    }

    async autoHandleInvites(): Promise<void> {
        if (!this.account || this.account.locked) {
            return;
        }

        for (const org of this.orgs.filter((org) => org.isOwner(this.account!))) {
            let newMembers: string[] = [];

            for (const member of org.members) {
                if (
                    member.status === OrgMemberStatus.Provisioned &&
                    !org.invites.some((inv) => inv.email === member.email)
                ) {
                    newMembers.push(member.email);
                }
            }

            if (newMembers.length) {
                await this.createInvites(org, newMembers);
            }
        }
    }

    /**
     * =============
     *  ATTACHMENTS
     * =============
     */

    async createAttachment(itemId: VaultItemID, file: File, name?: string): Promise<Attachment> {
        const { vault, item } = this.getItem(itemId)!;

        const att = new Attachment({ vault: vault.id });
        await att.fromFile(file);
        if (name) {
            att.name = name;
        }

        const promise = this.api.createAttachment(att);

        att.uploadProgress = promise.progress;

        promise.then((id) => {
            att.id = id;
            this.updateItem(item, { attachments: [...item.attachments, att.info] });
            promise.progress!.complete();
        });

        return att;
    }

    async downloadAttachment(att: AttachmentInfo) {
        const attachment = new Attachment(att);

        const promise = this.api.getAttachment(new GetAttachmentParams({ id: att.id, vault: att.vault }));

        attachment.downloadProgress = promise.progress;

        promise.then((att) => {
            attachment.fromRaw(att.toRaw());
            attachment.type = att.type;
            attachment.name = att.name;
            promise.progress!.complete();
        });

        return attachment;
    }

    async deleteAttachment(itemId: VaultItemID, att: Attachment | AttachmentInfo): Promise<void> {
        const { item } = this.getItem(itemId)!;
        try {
            await this.api.deleteAttachment(new DeleteAttachmentParams(att));
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }
        await this.updateItem(item, { attachments: item.attachments.filter((a) => a.id !== att.id) });
    }

    /**
     * =========
     *  PROVISIONING
     * =========
     */

    getAccountProvisioning() {
        return this.authInfo?.provisioning?.account || new AccountProvisioning();
    }

    getOrgProvisioning({ id }: { id: string }) {
        return this.authInfo?.provisioning?.orgs.find((p) => p.orgId === id) || new OrgProvisioning();
    }

    getAccountFeatures() {
        return this.getAccountProvisioning()?.features || new AccountFeatures();
    }

    getOrgFeatures(org: OrgInfo) {
        return this.getOrgProvisioning(org)?.features || new OrgFeatures();
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
            (e) => {
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
        await Promise.all(
            this.state.vaults.map(async (vault) => {
                try {
                    await vault.unlock(this.account as UnlockedAccount);
                } catch (e) {
                    vault.error = e;
                }
            })
        );

        // Notify state change
        this.publish();

        // Trigger sync
        this.synchronize();
    }
}
