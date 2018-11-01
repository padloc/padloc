import { Storable, LocalStorage } from "./storage";
import { Record, Field, Tag } from "./data";
import { Vault } from "./vault";
import { Account, AccountInfo, Auth, Session, SessionInfo } from "./auth";
import { Invite } from "./invite";
import { DateString } from "./encoding";
import { API } from "./api";
import { Client } from "./client";
import { Sender } from "./transport";
import { localize as $l } from "./locale";
import { DeviceInfo, getDeviceInfo } from "./platform";
import { uuid } from "./util";
import { Client as SRPClient } from "./srp";
import { Err, ErrorCode } from "./error";

export interface Stats {
    lastSync?: DateString;
    [key: string]: string | number | boolean | DateString | undefined;
}

export interface Settings {
    autoLock: boolean;
    autoLockDelay: number;
    defaultFields: string[];
    customServer: boolean;
    customServerUrl: string;
    autoSync: boolean;
    hideVaults: string[];
}

const defaultSettings: Settings = {
    autoLock: true,
    autoLockDelay: 5,
    defaultFields: ["username", "password"],
    customServer: false,
    customServerUrl: "https://cloud.padlock.io/",
    autoSync: true,
    hideVaults: []
};

function filterByString(fs: string, rec: Record) {
    if (!fs) {
        return true;
    }
    const content = [rec.name, ...rec.fields.map(f => f.name)].join(" ").toLowerCase();
    return content.search(fs) !== -1;
}

export interface ListItem {
    record: Record;
    vault: Vault;
    section: string;
    firstInSection: boolean;
    lastInSection: boolean;
    warning?: boolean;
}

export interface FilterParams {
    vault?: Vault | null;
    tag?: Tag | null;
    text?: string;
}

export class App extends EventTarget implements Storable {
    kind = "padlock-app";
    pk = "";

    version = "3.0";
    storage = new LocalStorage();
    api: API;
    settings = defaultSettings;
    stats: Stats = {};
    device: DeviceInfo = {} as DeviceInfo;
    initialized: DateString = "";
    session: Session | null = null;
    account: Account | null = null;
    sessions: SessionInfo[] = [];
    loaded = this.load();

    constructor(sender: Sender) {
        super();
        this.api = new Client(this, sender);
    }

    get locked() {
        return !this.account || !!this.account.locked;
    }

    get loggedIn() {
        return !!this.session;
    }

    get tags() {
        if (!this.mainVault) {
            return [];
        }
        const tags = this.mainVault.collection.tags;
        for (const vault of this.vaults) {
            tags.push(...vault.collection.tags);
        }
        return [...new Set(tags)];
    }

    get mainVault() {
        return this.account && this._vaults.get(this.account.vault);
    }

    get vaults() {
        return Array.from(this._vaults.values()).sort((a, b) => {
            const nameA = a.parent ? `${a.parent.name}/a.name}` : a.name;
            const nameB = b.parent ? `${b.parent.name}/b.name}` : b.name;
            return b === this.mainVault || nameA > nameB ? 1 : a === this.mainVault || nameA < nameB ? -1 : 0;
        });
    }

    get filter() {
        return this._filter;
    }

    set filter(filter: FilterParams) {
        this._filter = filter;
        this.dispatch("filter-changed", filter);
    }

    private _vaults = new Map<string, Vault>();
    private _filter: FilterParams = {};

    async serialize() {
        return {
            account: this.account ? await this.account.serialize() : null,
            session: this.session ? await this.session.serialize() : null,
            initialized: this.initialized,
            stats: this.stats,
            settings: this.settings,
            device: this.device,
            sessions: this.sessions
        };
    }

    async deserialize(raw: any) {
        this.account = raw.account && (await new Account().deserialize(raw.account));
        this.session = raw.session && (await new Session().deserialize(raw.session));
        this.initialized = raw.initialized;
        this.setStats(raw.stats || {});
        this.setSettings(raw.settings);
        this.device = Object.assign(raw.device, await getDeviceInfo());
        this.sessions = raw.sessions || [];
        return this;
    }

    dispatch(eventName: string, detail?: any) {
        this.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
    }

    async load() {
        try {
            await this.storage.get(this);
        } catch (e) {}
        if (!this.device.id) {
            this.device.id = uuid();
        }
        await this.storage.set(this);
        this.dispatch("load");
    }

    get items(): ListItem[] {
        const recentCount = 3;

        const { vault, tag, text } = this.filter;

        if (!this.mainVault) {
            return [];
        }
        let items: ListItem[] = [];

        for (const s of vault ? [vault] : this.vaults) {
            for (const record of s.collection) {
                if (!record.removed && (!tag || record.tags.includes(tag)) && filterByString(text || "", record)) {
                    items.push({
                        vault: s,
                        record: record,
                        section: "",
                        firstInSection: false,
                        lastInSection: false
                        // TODO: reimplement
                        // warning: !!vault.getOldMembers(record).length
                    });
                }
            }
        }

        const recent = items
            .sort((a, b) => {
                return (
                    (b.record.lastUsed || b.record.updated).getTime() -
                    (a.record.lastUsed || a.record.updated).getTime()
                );
            })
            .slice(0, recentCount);

        items = items.slice(recentCount);

        items = recent.concat(
            items.sort((a, b) => {
                const x = a.record.name.toLowerCase();
                const y = b.record.name.toLowerCase();
                return x > y ? 1 : x < y ? -1 : 0;
            })
        );

        for (let i = 0, prev, curr; i < items.length; i++) {
            prev = items[i - 1];
            curr = items[i];

            curr.section =
                i < recentCount
                    ? $l("Recently Used")
                    : (curr.record && curr.record.name[0] && curr.record.name[0].toUpperCase()) || $l("No Name");

            curr.firstInSection = !prev || prev.section !== curr.section;
            prev && (prev.lastInSection = curr.section !== prev.section);
        }

        return items;
    }

    async setStats(obj: Partial<Stats>) {
        Object.assign(this.stats, obj);
        this.storage.set(this);
        this.dispatch("stats-changed", { stats: this.stats });
    }

    async setSettings(obj: Partial<Settings>) {
        Object.assign(this.settings, obj);
        this.storage.set(this);
        this.dispatch("settings-changed", { settings: this.settings });
    }

    async initialize(password: string) {
        await this.setPassword(password);
        this.initialized = new Date().toISOString();
        await this.storage.set(this);
        this.dispatch("initialize");
        this.unlock(password);
    }

    async unlock(password: string) {
        await this.account!.unlock(password);
        await this.loadVaults();
        this.dispatch("unlock");
    }

    async getVault({ id }: { id: string }, fetch = false): Promise<Vault | null> {
        let vault = this._vaults.get(id);

        if (!vault) {
            vault = new Vault(id);
            vault.access(this.account!);

            try {
                await this.storage.get(vault);
            } catch (e) {
                if (e.code !== ErrorCode.NOT_FOUND) {
                    throw e;
                }
                if (!fetch) {
                    return null;
                }
            }
        }

        if (fetch) {
            try {
                await this.api.getVault(vault);
            } catch (e) {
                if (e.code !== ErrorCode.NOT_FOUND) {
                    throw e;
                }
                return null;
            }
        }

        this._vaults.set(id, vault);

        return vault;
    }

    async loadVaults() {
        if (!this.account) {
            return;
        }

        this._vaults.clear();

        for (const vaultInfo of this.account.vaults) {
            await this.getVault(vaultInfo);
        }

        for (const vault of this._vaults.values()) {
            if (vault === this.mainVault) {
                continue;
            }
            const parent = vault.parent ? await this.getVault(vault.parent) : this.mainVault;
            if (!(await parent!.verifySubVault(vault))) {
                throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
            }
        }
    }

    async lock() {
        this.account!.lock();
        this._vaults.clear();
        this.dispatch("lock");
    }

    async setPassword(_password: string) {
        // TODO
        // this.password = password;
        // await this.storage.set(this.mainVault!);
        // this.dispatch("password-changed");
    }

    async save() {
        const promises = [this.storage.set(this)];
        promises.push(...this.vaults.map(s => this.storage.set(s)));
        return promises;
    }

    async reset() {
        this._vaults.clear();
        this.initialized = "";
        await this.storage.clear();
        this.dispatch("reset");
        this.loaded = this.load();
    }

    async addRecords(vault: Vault, records: Record[]) {
        vault.collection.add(records);
        await this.storage.set(vault);
        this.dispatch("records-added", { vault: vault, records: records });
    }

    async createRecord(name: string, vault_?: Vault, fields?: Field[], tags?: Tag[]): Promise<Record> {
        const vault = vault_ || this.mainVault!;
        fields = fields || [
            { name: $l("Username"), value: "", masked: false },
            { name: $l("Password"), value: "", masked: true }
        ];
        const record = vault.collection.create(name || "", fields, tags);
        if (this.account) {
            record.updatedBy = this.account.id;
        }
        await this.addRecords(vault, [record]);
        this.dispatch("record-created", { vault, record });
        return record;
    }

    async updateRecord(vault: Vault, record: Record, upd: { name?: string; fields?: Field[]; tags?: Tag[] }) {
        for (const prop of ["name", "fields", "tags"]) {
            if (typeof upd[prop] !== "undefined") {
                record[prop] = upd[prop];
            }
        }
        record.updated = new Date();
        if (this.account) {
            record.updatedBy = this.account.id;
        }
        await this.storage.set(vault);
        this.dispatch("record-changed", { vault: vault, record: record });
    }

    async deleteRecords(vault: Vault, records: Record[]) {
        vault.collection.remove(records);
        if (this.account) {
            for (const record of records) {
                record.updatedBy = this.account.id;
            }
        }
        await this.storage.set(vault);
        this.dispatch("records-deleted", { vault: vault, records: records });
    }

    toggleVault(vault: Vault) {
        const hideVaults = this.settings.hideVaults;
        const ind = hideVaults.indexOf(vault.id);
        if (ind === -1) {
            hideVaults.push(vault.id);
        } else {
            hideVaults.splice(ind, 1);
        }

        this.setSettings({ hideVaults });
    }

    async verifyEmail(email: string) {
        return this.api.verifyEmail({ email });
    }

    async signup(email: string, password: string, name: string, emailVerification: { id: string; code: string }) {
        const account = new Account();
        account.email = email;
        account.name = name;
        await account.initialize(password);

        const auth = new Auth(email);
        const authKey = await auth.getAuthKey(password);

        const srp = new SRPClient();
        await srp.initialize(authKey);

        auth.verifier = srp.v!;

        await this.api.createAccount({
            account,
            auth,
            emailVerification
        });

        await this.login(email, password);

        await Promise.all([
            this.api.updateVault(this.mainVault!),
            this.storage.set(this.mainVault!),
            this.storage.set(this)
        ]);

        this.dispatch("login");
        this.dispatch("unlock");
    }

    async login(email: string, password: string) {
        const { auth, B } = await this.api.initAuth({ email });
        const authKey = await auth.getAuthKey(password);

        const srp = new SRPClient();

        await srp.initialize(authKey);
        await srp.setB(B);

        this.session = await this.api.createSession({ account: auth.account, A: srp.A!, M: srp.M1! });
        this.session.key = srp.K!;

        this.account = await this.api.getAccount(new Account(auth.account));

        await this.account.unlock(password);

        const mainVault = new Vault(this.account.vault);
        await this.api.getVault(mainVault);
        if (!mainVault.initialized) {
            await mainVault.initialize(this.account);
        }

        await this.storage.set(mainVault);
        await this.api.updateVault(mainVault);

        await this.syncVaults();

        this.dispatch("login");
        this.dispatch("unlock");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async revokeSession(session: Session) {
        await this.api.revokeSession(session);
        await this.loadSessions();
        this.dispatch("account-changed", { account: this.account });
    }

    async syncAccount() {
        await this.api.getAccount(this.account!);
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
    }

    async logout() {
        try {
            await this.api.revokeSession(this.session!);
        } catch (e) {}

        this.session = null;
        this.account = null;
        this._vaults.clear();
        await this.storage.set(this);
        this.dispatch("lock");
        this.dispatch("logout");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async createVault(name: string, parent?: Vault): Promise<Vault> {
        const vault = await this.api.createVault({ name });
        await vault.initialize(this.account!);
        if (parent) {
            vault.parent = parent.info;
        }

        parent = parent || this.mainVault!;

        await parent.addVault(vault);

        await Promise.all([
            this.api.updateVault(vault),
            this.storage.set(vault),
            this.api.updateVault(parent),
            this.storage.set(parent)
        ]);
        this._vaults.set(vault.id, vault);
        this.dispatch("vault-created", { vault });
        return vault;
    }

    async createInvite(vault: Vault, email: string) {
        const invite = await vault.createInvite(email);
        await this.api.updateInvite(invite);
        await this.syncVault(vault);
        return invite;
    }

    async acceptInvite(invite: Invite, secret: string) {
        const success = await invite.accept(this.account!.info, secret);
        if (success) {
            await this.api.updateInvite(invite);
            await this.mainVault!.addVault(Object.assign({}, invite.vault!));
            await Promise.all([this.storage.set(this.mainVault!), this.api.updateVault(this.mainVault!)]);
        }
        return success;
    }

    async deleteInvite(invite: Invite) {
        await this.api.deleteInvite(invite);
        this.syncVault(invite.vault!);
    }

    //
    // async updateAccess(
    //     vault: SharedVault,
    //     acc: AccountInfo,
    //     permissions: Permissions = { read: true, write: true, manage: false },
    //     status: AccessorStatus
    // ) {
    //     await this.api.getSharedVault(vault);
    //     await vault.updateAccess(acc, permissions, status);
    //     await Promise.all([this.storage.set(vault), this.api.updateSharedVault(vault)]);
    //     this.dispatch("vault-changed", { vault });
    // }
    //
    // async revokeAccess(vault: SharedVault, account: AccountInfo) {
    //     if (!vault.permissions.manage) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //     await this.api.getSharedVault(vault);
    //     await vault.revokeAccess(account);
    //     await Promise.all([this.storage.set(vault), this.api.updateSharedVault(vault)]);
    //     this.dispatch("vault-changed", { vault });
    // }

    async synchronize() {
        await this.syncAccount();
        await this.syncVaults();
        await this.loadSessions();
        this.setStats({ lastSync: new Date().toISOString() });
        this.dispatch("synchronize");
    }

    async syncVaults() {
        await Promise.all(this.account!.vaults.map(g => this.syncVault(g)));
    }

    async syncVault(vaultInfo: { id: string }): Promise<void> {
        const vault = await this.getVault(vaultInfo, true);

        if (!vault) {
            return;
        }

        await this.storage.set(vault);

        await this.api.updateVault(vault);

        this.dispatch("vault-changed", { vault });
    }

    getItem(id: string): { record: Record; vault: Vault } | null {
        for (const vault of [this.mainVault!, ...this.vaults]) {
            const record = vault.collection.get(id);
            if (record) {
                return { record, vault };
            }
        }

        return null;
    }

    get knownAccounts(): AccountInfo[] {
        const accounts = new Map<string, AccountInfo>();
        for (const vault of this.vaults) {
            for (const { id, email, name, publicKey } of vault.members) {
                if (id !== this.account!.id) {
                    accounts.set(id, { id, email, name, publicKey });
                }
            }
        }

        return Array.from(accounts.values());
    }

    async loadSessions() {
        this.sessions = await this.api.getSessions();
        this.dispatch("account-changed");
    }
}
