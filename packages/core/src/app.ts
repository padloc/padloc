import { LocalStorage, RemoteStorage } from "./storage";
import { Store, MainStore, SharedStore, Record, Field, Tag, StoreID } from "./data";
import { Account, Session, Device } from "./auth";
import { DateString } from "./encoding";
import { Client, AccountUpdateParams } from "./client";
import { Messages } from "./messages";
import { localize as $l } from "./locale";
import { ErrorCode } from "./error";
import { getDeviceInfo } from "./platform";
import { uuid } from "./util";
import { getProvider } from "./crypto";

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
}

const defaultSettings: Settings = {
    autoLock: true,
    autoLockDelay: 5,
    defaultFields: ["username", "password"],
    customServer: false,
    customServerUrl: "https://cloud.padlock.io/",
    autoSync: true
};

function filterByString(fs: string, rec: Record, store: Store) {
    if (!fs) {
        return true;
    }
    const words = fs.toLowerCase().split(" ");
    const content = [rec.name, store.name, ...rec.tags, ...rec.fields.map(f => f.name)].join(" ").toLowerCase();
    return words.some(word => content.search(word) !== -1);
}

export interface ListItem {
    record: Record;
    store: Store;
    section: string;
    firstInSection: boolean;
    lastInSection: boolean;
}

export class App extends EventTarget {
    storageKind = "padlock-app";
    storageKey = "";

    version = "3.0";
    storage = new LocalStorage();
    client = new Client(this);
    remoteStorage = new RemoteStorage(this.client);
    mainStore = new MainStore();
    sharedStores: SharedStore[] = [];
    settings = defaultSettings;
    messages = new Messages("https://padlock.io/messages.json");
    locked = true;
    stats: Stats = {};
    device: Device = new Device();

    initialized?: DateString;
    account?: Account;
    session?: Session;

    loaded = this.load();

    async serialize() {
        return {
            account: this.account,
            session: this.session,
            initialized: this.initialized,
            stats: this.stats,
            messages: await this.messages.serialize(),
            settings: this.settings,
            device: await this.device.serialize()
        };
    }

    async deserialize(raw: any) {
        this.account = raw.account && (await new Account().deserialize(raw.account));
        this.session = raw.session && (await new Session().deserialize(raw.session));
        this.initialized = raw.initialized;
        this.setStats(raw.stats || {});
        await this.messages.deserialize(raw.messages);
        this.setSettings(raw.settings);
        await this.device.deserialize(Object.assign(raw.device, await getDeviceInfo()));
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

    get loggedIn() {
        return this.session && this.session.active;
    }

    get password(): string | undefined {
        return this.mainStore.password;
    }

    set password(pwd: string | undefined) {
        this.mainStore.password = pwd;
    }

    get tags() {
        const tags = [...this.mainStore.tags];
        for (const store of this.sharedStores) {
            tags.push(...store.tags);
        }
        return [...new Set(tags)];
    }

    list(filter = "", recentCount = 3): ListItem[] {
        let items: ListItem[] = [];

        for (const store of [this.mainStore, ...this.sharedStores]) {
            items.push(
                ...store.records.filter((r: Record) => !r.removed && filterByString(filter, r, store)).map(r => {
                    return {
                        store: store,
                        record: r,
                        section: "",
                        firstInSection: false,
                        lastInSection: false
                    };
                })
            );
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

        for (let i = 0, prev, curr, next; i < items.length; i++) {
            prev = items[i - 1];
            curr = items[i];
            next = items[i + 1];

            curr.section =
                i < recentCount
                    ? $l("Recently Used")
                    : (curr.record && curr.record.name[0] && curr.record.name[0].toUpperCase()) || $l("No Name");

            curr.firstInSection = !prev || prev.section !== curr.section;
            curr.lastInSection = !next || next.section !== curr.section;
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
        this.dispatch("unlock");
    }

    async unlock(password: string) {
        this.mainStore.password = password;
        await this.storage.get(this.mainStore);
        this.locked = false;
        this.dispatch("unlock");

        if (this.account) {
            for (const id of this.account.sharedStores) {
                const sharedStore = new SharedStore(id);
                sharedStore.access = { accessorID: this.account.id, privateKey: this.mainStore.privateKey! };
                try {
                    await this.storage.get(sharedStore);
                    this.sharedStores.push(sharedStore);
                } catch (e) {
                    console.error("Failed to decrypt shared store with id", sharedStore.id, e);
                }
            }
        }
    }

    async lock() {
        await Promise.all([this.mainStore.clear(), ...this.sharedStores.map(s => s.clear())]);
        this.sharedStores = [];
        this.locked = true;
        this.dispatch("lock");
    }

    async setPassword(password: string) {
        this.password = password;
        await this.storage.set(this.mainStore);
        this.dispatch("password-changed");
    }

    async save() {
        return Promise.all([
            this.storage.set(this),
            this.storage.set(this.mainStore),
            ...this.sharedStores.map(s => this.storage.set(s))
        ]);
    }

    async reset() {
        await this.lock();
        await this.storage.clear();
        delete this.account;
        delete this.session;
        delete this.initialized;
        await this.storage.set(this);
        this.dispatch("reset");
        this.loaded = this.load();
    }

    async addRecords(store: Store, records: Record[]) {
        store.addRecords(records);
        await this.storage.set(store);
        this.dispatch("records-added", { store: store, records: records });
    }

    async createRecord(store: Store, name: string): Promise<Record> {
        const fields = [
            { name: $l("Username"), value: "", masked: false },
            { name: $l("Password"), value: "", masked: true }
        ];
        const record = store.createRecord(name || "", fields);
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
        await this.storage.set(store);
        this.dispatch("record-changed", { store: store, record: record });
    }

    async deleteRecords(store: Store, records: Record | Record[]) {
        store.removeRecords(records);
        await this.storage.set(store);
        this.dispatch("records-deleted", { store: store, records: records });
    }

    async login(email: string) {
        await this.client.createSession(email);
        await this.storage.set(this);
        this.dispatch("login");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async activateSession(code: string) {
        await this.client.activateSession(code);
        await this.client.getAccount();
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async revokeSession(id: string) {
        await this.client.revokeSession(id);
        await this.client.getAccount();
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
    }

    async refreshAccount() {
        await this.client.getAccount();
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
    }

    async updateAccount(params: AccountUpdateParams) {
        await this.client.updateAccount(params);
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
    }

    async logout() {
        await this.client.logout();
        delete this.session;
        delete this.account;
        await this.storage.set(this);
        this.dispatch("logout");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async hasRemoteData(): Promise<boolean> {
        try {
            await this.client.request("GET", "store/main/");
            return true;
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                return false;
            }
            throw e;
        }
    }

    async generateKeyPair() {
        if (!this.account) {
            throw "Not logged in!";
        }
        const { publicKey, privateKey } = await getProvider().generateKeyPair();
        this.account.publicKey = publicKey;
        this.mainStore.privateKey = privateKey;
        await Promise.all([this.updateAccount({ publicKey }), this.synchronize()]);
    }

    async createSharedStore(name: string): Promise<SharedStore> {
        if (!this.account) {
            throw "Need to be logged in to create a shared store!";
        }

        if (!this.account.publicKey || !this.mainStore.privateKey) {
            await this.generateKeyPair();
        }

        const store = new SharedStore("", [], name);
        store.access = { accessorID: this.account.id, privateKey: this.mainStore.privateKey! };
        await store.addAccount(this.account, { read: true, write: true, manage: true });
        await this.remoteStorage.set(store);
        await this.refreshAccount();
        await this.synchronize();
        return store;
    }

    async syncSharedStore(id: StoreID) {
        if (!this.account || !this.mainStore.privateKey) {
            throw "Not logged in";
        }

        let store = this.sharedStores.find(s => s.id === id);
        if (!store) {
            store = new SharedStore(id);
            this.sharedStores.push(store);
        }
        store.access = { accessorID: this.account.id, privateKey: this.mainStore.privateKey };
        await this.remoteStorage.get(store);
        await Promise.all([this.storage.set(store), this.remoteStorage.set(store)]);
    }

    async deleteSharedStore(id: StoreID) {
        const store = this.sharedStores.find(s => s.id === id) || new SharedStore(id);
        await this.remoteStorage.delete(store);
        await this.refreshAccount();
    }

    async synchronize() {
        try {
            await this.remoteStorage.get(this.mainStore);
        } catch (e) {
            console.log("error", e.code);
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        await Promise.all([this.storage.set(this.mainStore), this.remoteStorage.set(this.mainStore)]);

        for (const id of this.account!.sharedStores) {
            await this.syncSharedStore(id);
        }

        this.setStats({ lastSync: new Date().toISOString() });
        this.dispatch("synchronize");
    }

    async reactivateSubscription() {}

    buySubscription(_source: string) {}

    cancelSubscription() {}

    updatePaymentMethod(_source: String) {}
}
