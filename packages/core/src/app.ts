import { Storable, LocalStorage } from "./storage";
import { Record, Field, Tag, StoreID } from "./data";
import { Group } from "./group";
import { Store } from "./store";
import { Account, AccountInfo, Session } from "./auth";
import { Invite } from "./invite";
import { DateString } from "./encoding";
import { API } from "./api";
import { Client } from "./client";
import { Messages } from "./messages";
import { localize as $l } from "./locale";
import { DeviceInfo, getDeviceInfo } from "./platform";
import { uuid } from "./util";
import { Client as SRPClient } from "./srp";
import { ErrorCode } from "./error";

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

function filterByString(fs: string, rec: Record, store: Store) {
    if (!fs) {
        return true;
    }
    const words = fs.toLowerCase().split(" ");
    const content = [rec.name, ...rec.tags, ...rec.fields.map(f => f.name)];
    // TODO: Don't filter for main store name
    content.push(store.name);
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
    loaded = this.load();
    mainStore = new Store();

    get locked() {
        return !this.account || !!this.account.locked;
    }

    get loggedIn() {
        return !!this.session;
    }

    get tags() {
        const tags = this.mainStore.collection.tags;
        for (const store of this.stores) {
            tags.push(...store.collection.tags);
        }
        return [...new Set(tags)];
    }

    get stores() {
        return Array.from(this._stores.values());
    }

    private _stores = new Map<string, Store>();

    async serialize() {
        return {
            account: this.account ? await this.account.serialize() : null,
            session: this.session ? await this.session.serialize() : null,
            initialized: this.initialized,
            stats: this.stats,
            messages: await this.messages.serialize(),
            settings: this.settings,
            device: this.device
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
        return this;
    }

    dispatch(eventName: string, detail?: any) {
        this.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
    }

    async load() {
        try {
            await this.storage.get(this);
        } catch (e) {
            await this.storage.set(this);
        }
        if (!this.device.id) {
            this.device.id = uuid();
            await this.storage.set(this);
        }
        this.dispatch("load");
    }

    list(filter = "", recentCount = 3): ListItem[] {
        let items: ListItem[] = [];

        for (const store of [this.mainStore, ...this.stores]) {
            if (this.settings.hideStores.includes(store.id)) {
                continue;
            }

            for (const record of store.collection) {
                if (!record.removed && filterByString(filter, record, store)) {
                    items.push({
                        store: store,
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
        await this.loadStores();
        this.dispatch("unlock");
    }

    async loadStores() {
        this._stores.clear();

        this.mainStore.id = this.account!.store;
        try {
            await this.storage.get(this.mainStore);
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }
        if (this.mainStore.initialized) {
            this.mainStore.access(this.account!);
        } else {
            await this.mainStore.initialize(this.account!);
            await this.storage.set(this.mainStore);
        }

        for (const { id } of this.mainStore.groups) {
            const store = new Store(id);
            store.access(this.account!);
            await this.storage.get(store);
            this._stores.set(id, store);
        }
    }

    async lock() {
        this.mainStore = new Store(this.account!.store);
        this._stores.clear();
        this.dispatch("lock");
    }

    async setPassword(_password: string) {
        // TODO
        // this.password = password;
        // await this.storage.set(this.mainStore);
        // this.dispatch("password-changed");
    }

    async save() {
        return Promise.all([
            this.storage.set(this),
            this.storage.set(this.mainStore),
            ...this.stores.map(s => this.storage.set(s))
        ]);
    }

    async reset() {
        this.mainStore = new Store(this.account!.store!);
        this._stores.clear();
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

    async createRecord(store: Store, name: string, fields?: Field[], tags?: Tag[]): Promise<Record> {
        fields = fields || [
            { name: $l("Username"), value: "", masked: false },
            { name: $l("Password"), value: "", masked: true }
        ];
        const record = store.collection.create(name || "", fields, tags);
        if (this.account) {
            record.updatedBy = this.account.id;
        }
        await this.addRecords(store, [record]);
        this.dispatch("record-created", { store: store, record: record });
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

    async register(email: string, password: string, emailVerification: { id: string; code: string }) {
        const acc = new Account();
        acc.email = email;
        await acc.initialize(password);

        const srp = new SRPClient();
        await srp.initialize(acc.authKey);

        await this.api.createAccount({
            email: email,
            name: acc.name,
            publicKey: acc.publicKey,
            encPrivateKey: acc.encPrivateKey,
            keyParams: acc.keyParams,
            encryptionParams: acc.encryptionParams,
            verifier: srp.v!,
            emailVerification
        });

        await this.login(email, password);

        await Promise.all([
            this.api.updateStore(this.mainStore),
            this.storage.set(this.mainStore),
            this.storage.set(this)
        ]);
    }

    async login(email: string, password: string) {
        const { account, keyParams, B } = await this.api.initAuth({ email });
        this.account = new Account(account);
        this.account.keyParams = keyParams;
        await this.account.generateKeys(password);

        const srp = new SRPClient();

        await srp.initialize(this.account.authKey);
        await srp.setB(B);

        this.session = await this.api.createSession({ account: this.account.id, A: srp.A!, M: srp.M1! });
        this.session.key = srp.K!;

        await this.syncAccount();
        await this.loadStores();

        this.dispatch("login");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async revokeSession(session: Session) {
        await this.api.revokeSession(session);
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
        this._stores.clear();
        await this.storage.set(this);
        this.dispatch("logout");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async createStore(name: string): Promise<Store> {
        const store = await this.api.createStore({ name });
        await store.initialize(this.account!);
        await this.mainStore.addGroup(store);
        await Promise.all([
            this.api.updateStore(store),
            this.storage.set(store),
            this.api.updateStore(this.mainStore),
            this.storage.set(this.mainStore)
        ]);
        this._stores.set(store.id, store);
        this.dispatch("store-created", { store });
        return store;
    }

    async createInvite(group: Group, email: string) {
        await group.createInvite(email);
        if (group instanceof Store) {
            await this.api.updateStore(group);
        }
    }

    async acceptInvite(invite: Invite, secret: string) {
        await invite.accept(this.account!.info, secret);
        await this.mainStore.addGroup(invite.group!);
    }

    async rejectInvite(invite: Invite) {
        invite.status = "rejected";
        await this.api.updateInvite(invite);
    }

    async cancelInvite(invite: Invite) {
        invite.status = "canceled";
        await this.api.updateInvite(invite);
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
        await this.syncStores();
        this.setStats({ lastSync: new Date().toISOString() });
        this.dispatch("synchronize");
    }

    async syncStores() {
        await this.syncStore(this.mainStore.id);
        await Promise.all(this.mainStore.groups.map(({ id }) => this.syncStore(id)));
    }

    async syncStore(id: StoreID): Promise<void> {
        let store = this._stores.get(id);
        if (!store) {
            store = new Store(id);
            store.access(this.account!);
            this._stores.set(id, store);
        }

        try {
            await this.api.getStore(store);
        } catch (e) {
            console.error(e, store.name, store.id);
            // switch (e.code) {
            //     case ErrorCode.NOT_FOUND:
            //     case ErrorCode.MISSING_ACCESS:
            //         this.sharedStores.splice(this.sharedStores.indexOf(store), 1);
            //
            //         break;
            //     default:
            //         throw e;
            // }
            return;
        }

        await this.storage.set(store);

        if (store.getPermissions().write) {
            await this.api.updateStore(store);
        }

        this.dispatch("store-changed", { store });
    }

    getRecord(id: string): { record: Record; store: Store } | null {
        for (const store of [this.mainStore, ...this.stores]) {
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
}
