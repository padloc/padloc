import { Storable, LocalStorage } from "./storage";
import { Record, Field, Tag } from "./data";
import { Group, GroupKind } from "./group";
import { Store } from "./store";
import { Org } from "./org";
import { Account, AccountInfo, Auth, Session, SessionInfo } from "./auth";
import { Invite } from "./invite";
import { DateString } from "./encoding";
import { API } from "./api";
import { Client } from "./client";
import { Messages } from "./messages";
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
    hideStores: string[];
}

const defaultSettings: Settings = {
    autoLock: true,
    autoLockDelay: 5,
    defaultFields: ["username", "password"],
    customServer: false,
    customServerUrl: "https://cloud.padlock.io/",
    autoSync: true,
    hideStores: []
};

function filterByString(fs: string, rec: Record) {
    if (!fs) {
        return true;
    }
    const words = fs.toLowerCase().split(" ");
    const content = [rec.name, ...rec.fields.map(f => f.name)];
    return words.some(
        word =>
            content
                .join(" ")
                .toLowerCase()
                .search(word) !== -1
    );
}

export interface ListItem {
    record: Record;
    store: Store;
    section: string;
    firstInSection: boolean;
    lastInSection: boolean;
    warning?: boolean;
}

export class App extends EventTarget implements Storable {
    kind = "padlock-app";
    pk = "";

    version = "3.0";
    storage = new LocalStorage();
    api: API = new Client(this);
    settings = defaultSettings;
    messages = new Messages("https://padlock.io/messages.json");
    stats: Stats = {};
    device: DeviceInfo = {} as DeviceInfo;
    initialized: DateString = "";
    session: Session | null = null;
    account: Account | null = null;
    sessions: SessionInfo[] = [];
    loaded = this.load();

    get locked() {
        return !this.account || !!this.account.locked;
    }

    get loggedIn() {
        return !!this.session;
    }

    get tags() {
        if (!this.mainStore) {
            return [];
        }
        const tags = this.mainStore.collection.tags;
        for (const store of this.stores) {
            tags.push(...store.collection.tags);
        }
        return [...new Set(tags)];
    }

    get mainStore() {
        return this.account && (this._groups.get(this.account!.store) as Store);
    }

    get stores() {
        return Array.from(this._groups.values()).filter(g => g instanceof Store) as Store[];
    }

    get orgs() {
        return Array.from(this._groups.values()).filter(g => g instanceof Org) as Org[];
    }

    private _groups = new Map<string, Store | Org>();

    async serialize() {
        return {
            account: this.account ? await this.account.serialize() : null,
            session: this.session ? await this.session.serialize() : null,
            initialized: this.initialized,
            stats: this.stats,
            messages: await this.messages.serialize(),
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
        await this.messages.deserialize(raw.messages);
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

    list({
        org,
        store,
        tag,
        filterString,
        recentCount
    }: {
        org: Org | null;
        store: Store | null;
        tag: Tag | null;
        filterString: string;
        recentCount?: number;
    }): ListItem[] {
        recentCount = recentCount || 3;
        if (!this.mainStore) {
            return [];
        }
        let items: ListItem[] = [];

        for (const s of store ? [store] : this.stores) {
            if ((org && (!s.parent || s.parent.id !== org.id)) || (!store && this.settings.hideStores.includes(s.id))) {
                continue;
            }

            for (const record of s.collection) {
                if (!record.removed && (!tag || record.tags.includes(tag)) && filterByString(filterString, record)) {
                    items.push({
                        store: s,
                        record: record,
                        section: "",
                        firstInSection: false,
                        lastInSection: false
                        // TODO: reimplement
                        // warning: !!store.getOldMembers(record).length
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
        await this.loadGroups();
        this.dispatch("unlock");
    }

    async getGroup({ kind, id }: { kind: GroupKind; id: string }, fetch = false): Promise<Store | Org | null> {
        let group = this._groups.get(id);

        if (!group) {
            group = kind === "store" ? new Store(id) : new Org(id);
            group.access(this.account!);

            try {
                await this.storage.get(group);
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
                if (group instanceof Store) {
                    await this.api.getStore(group);
                } else {
                    await this.api.getOrg(group);
                }
            } catch (e) {
                if (e.code !== ErrorCode.NOT_FOUND) {
                    throw e;
                }
                return null;
            }
        }

        this._groups.set(id, group);

        return group;
    }

    async loadGroups() {
        if (!this.account) {
            return;
        }

        this._groups.clear();

        for (const groupInfo of this.account.groups) {
            await this.getGroup(groupInfo);
        }

        for (const group of this._groups.values()) {
            if (group === this.mainStore) {
                continue;
            }
            const parent = group.parent ? await this.getGroup(group.parent) : this.mainStore;
            if (!(await parent!.verifySubGroup(group))) {
                throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
            }
        }
    }

    async lock() {
        this.account!.lock();
        this._groups.clear();
        this.dispatch("lock");
    }

    async setPassword(_password: string) {
        // TODO
        // this.password = password;
        // await this.storage.set(this.mainStore!);
        // this.dispatch("password-changed");
    }

    async save() {
        const promises = [this.storage.set(this)];
        promises.push(...this.stores.map(s => this.storage.set(s)));
        return promises;
    }

    async reset() {
        this._groups.clear();
        this.initialized = "";
        await this.storage.clear();
        this.dispatch("reset");
        this.loaded = this.load();
    }

    async addRecords(store: Store, records: Record[]) {
        store.collection.add(records);
        await this.storage.set(store);
        this.dispatch("records-added", { store: store, records: records });
    }

    async createRecord(name: string, store_?: Store, fields?: Field[], tags?: Tag[]): Promise<Record> {
        const store = store_ || this.mainStore!;
        fields = fields || [
            { name: $l("Username"), value: "", masked: false },
            { name: $l("Password"), value: "", masked: true }
        ];
        const record = store.collection.create(name || "", fields, tags);
        if (this.account) {
            record.updatedBy = this.account.id;
        }
        await this.addRecords(store, [record]);
        this.dispatch("record-created", { store, record });
        return record;
    }

    async updateRecord(store: Store, record: Record, upd: { name?: string; fields?: Field[]; tags?: Tag[] }) {
        for (const prop of ["name", "fields", "tags"]) {
            if (typeof upd[prop] !== "undefined") {
                record[prop] = upd[prop];
            }
        }
        record.updated = new Date();
        if (this.account) {
            record.updatedBy = this.account.id;
        }
        await this.storage.set(store);
        this.dispatch("record-changed", { store: store, record: record });
    }

    async deleteRecords(store: Store, records: Record[]) {
        store.collection.remove(records);
        if (this.account) {
            for (const record of records) {
                record.updatedBy = this.account.id;
            }
        }
        await this.storage.set(store);
        this.dispatch("records-deleted", { store: store, records: records });
    }

    toggleStore(store: Store) {
        const hideStores = this.settings.hideStores;
        const ind = hideStores.indexOf(store.id);
        if (ind === -1) {
            hideStores.push(store.id);
        } else {
            hideStores.splice(ind, 1);
        }

        this.setSettings({ hideStores });
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
            this.api.updateStore(this.mainStore!),
            this.storage.set(this.mainStore!),
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

        const mainStore = new Store(this.account.store);
        await this.api.getStore(mainStore);
        if (!mainStore.initialized) {
            await mainStore.initialize(this.account);
        }

        await this.storage.set(mainStore);
        await this.api.updateStore(mainStore);

        await this.syncGroups();

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
        this._groups.clear();
        await this.storage.set(this);
        this.dispatch("lock");
        this.dispatch("logout");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async createStore(name: string, parent?: Org): Promise<Store> {
        const store = await this.api.createStore({ name });
        await store.initialize(this.account!);
        if (parent) {
            store.parent = parent.info;
        }

        parent = parent || this.mainStore!;

        await parent.addGroup(store);

        await Promise.all([
            this.api.updateStore(store),
            this.storage.set(store),
            parent instanceof Store ? this.api.updateStore(parent) : this.api.updateOrg(parent),
            this.storage.set(parent)
        ]);
        this._groups.set(store.id, store);
        this.dispatch("store-created", { store });
        return store;
    }

    async createOrg(name: string): Promise<Org> {
        const org = await this.api.createOrg({ name });
        await org.initialize(this.account!);
        await this.mainStore!.addGroup(org);
        await Promise.all([
            this.api.updateOrg(org),
            this.storage.set(org),
            this.api.updateStore(this.mainStore!),
            this.storage.set(this.mainStore!)
        ]);
        this._groups.set(org.id, org);
        this.dispatch("org-created", { org });
        return org;
    }

    async createInvite(group: Group, email: string) {
        const invite = await group.createInvite(email);
        await this.api.updateInvite(invite);
        await this.syncGroup(group);
        return invite;
    }

    async acceptInvite(invite: Invite, secret: string) {
        const success = await invite.accept(this.account!.info, secret);
        if (success) {
            await this.api.updateInvite(invite);
            await this.mainStore!.addGroup(Object.assign({}, invite.group!));
            await Promise.all([this.storage.set(this.mainStore!), this.api.updateStore(this.mainStore!)]);
        }
        return success;
    }

    async deleteInvite(invite: Invite) {
        await this.api.deleteInvite(invite);
        this.syncGroup(invite.group!);
    }

    //
    // async updateAccess(
    //     store: SharedStore,
    //     acc: AccountInfo,
    //     permissions: Permissions = { read: true, write: true, manage: false },
    //     status: AccessorStatus
    // ) {
    //     await this.api.getSharedStore(store);
    //     await store.updateAccess(acc, permissions, status);
    //     await Promise.all([this.storage.set(store), this.api.updateSharedStore(store)]);
    //     this.dispatch("store-changed", { store });
    // }
    //
    // async revokeAccess(store: SharedStore, account: AccountInfo) {
    //     if (!store.permissions.manage) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //     await this.api.getSharedStore(store);
    //     await store.revokeAccess(account);
    //     await Promise.all([this.storage.set(store), this.api.updateSharedStore(store)]);
    //     this.dispatch("store-changed", { store });
    // }

    async synchronize() {
        await this.syncAccount();
        await this.syncGroups();
        await this.loadSessions();
        this.setStats({ lastSync: new Date().toISOString() });
        this.dispatch("synchronize");
    }

    async syncGroups() {
        await this.syncGroup({ kind: "store", id: this.account!.store });
        await Promise.all(this.mainStore!.groups.map(g => this.syncGroup(g)));
    }

    async syncGroup(groupInfo: { kind: GroupKind; id: string }): Promise<void> {
        const group = await this.getGroup(groupInfo, true);

        if (!group) {
            return;
        }

        await this.storage.set(group);

        if (group instanceof Store && group.getPermissions().write) {
            await this.api.updateStore(group);
        } else if (group instanceof Org && group.getPermissions().manage) {
            await this.api.updateOrg(group);
        }

        this.dispatch("group-changed", { group });
    }

    getRecord(id: string): { record: Record; store: Store } | null {
        for (const store of [this.mainStore!, ...this.stores]) {
            const record = store.collection.get(id);
            if (record) {
                return { record, store };
            }
        }

        return null;
    }

    async getStore(id: string): Promise<Store | null> {
        let store = this.stores.find(s => s.id === id);
        if (store) {
            return store;
        }

        try {
            return await this.api.getStore(new Store(id));
        } catch (e) {}

        return null;
    }

    get knownAccounts(): AccountInfo[] {
        const accounts = new Map<string, AccountInfo>();
        for (const store of this.stores) {
            for (const { id, email, name, publicKey } of store.members) {
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
