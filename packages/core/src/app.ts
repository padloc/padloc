import { LocalStorage, RemoteStorage } from "./storage";
import { Store, MainStore, SharedStore, Record, Field, Tag, StoreID } from "./data";
import { Account, PublicAccount, Session, Device } from "./auth";
import { DateString } from "./encoding";
import { Client, AccountUpdateParams } from "./client";
import { Messages } from "./messages";
import { localize as $l } from "./locale";
import { Err, ErrorCode } from "./error";
import { getDeviceInfo } from "./platform";
import { uuid } from "./util";
import { getProvider, Permissions, AccessorStatus } from "./crypto";

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

    get access() {
        return this.account
            ? Object.assign({ privateKey: this.mainStore.privateKey! }, this.account.publicAccount)
            : null;
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

        for (const store of [
            this.mainStore,
            ...this.sharedStores.filter(s => !this.settings.hideStores.includes(s.id))
        ]) {
            items.push(
                ...store.records.filter((r: Record) => !r.removed && filterByString(filter, r, store)).map(r => {
                    return {
                        store: store,
                        record: r,
                        section: "",
                        firstInSection: false,
                        lastInSection: false,
                        warning: store instanceof SharedStore && !!store.getOldAccessors(r).length
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
        this.dispatch("unlock");
    }

    async unlock(password: string) {
        this.mainStore.password = password;
        await this.storage.get(this.mainStore);

        if (this.account) {
            for (const id of this.account.sharedStores) {
                const sharedStore = new SharedStore(id);
                sharedStore.access = this.access;
                try {
                    await this.storage.get(sharedStore);
                    this.sharedStores.push(sharedStore);
                } catch (e) {
                    console.error("Failed to decrypt shared store with id", sharedStore.id, e);
                }
            }
        }

        this.locked = false;
        this.dispatch("unlock");
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
        if (store instanceof SharedStore && !store.permissions.write) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
        store.addRecords(records);
        await this.storage.set(store);
        this.dispatch("records-added", { store: store, records: records });
    }

    async createRecord(store: Store, name: string, fields?: Field[], tags?: Tag[]): Promise<Record> {
        if (store instanceof SharedStore && !store.permissions.write) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
        fields = fields || [
            { name: $l("Username"), value: "", masked: false },
            { name: $l("Password"), value: "", masked: true }
        ];
        const record = store.createRecord(name || "", fields, tags);
        if (this.account) {
            record.updatedBy = this.account.publicAccount;
        }
        await this.addRecords(store, [record]);
        this.dispatch("record-created", { store: store, record: record });
        return record;
    }

    async updateRecord(store: Store, record: Record, upd: { name?: string; fields?: Field[]; tags?: Tag[] }) {
        if (store instanceof SharedStore && !store.permissions.write) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        for (const prop of ["name", "fields", "tags"]) {
            if (typeof upd[prop] !== "undefined") {
                record[prop] = upd[prop];
            }
        }
        record.updated = new Date();
        if (this.account) {
            record.updatedBy = this.account.publicAccount;
        }
        await this.storage.set(store);
        this.dispatch("record-changed", { store: store, record: record });
    }

    async deleteRecords(store: Store, records: Record[]) {
        if (store instanceof SharedStore && !store.permissions.write) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
        store.removeRecords(records);
        if (this.account) {
            for (const record of records) {
                record.updatedBy = this.account.publicAccount;
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

    async login(email: string) {
        await this.client.createSession(email);
        await this.storage.set(this);
        this.dispatch("login");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async activateSession(code: string) {
        await this.client.activateSession(code);
        this.dispatch("session-changed", { session: this.session });
        this.syncAccount();
    }

    async revokeSession(id: string) {
        await this.client.revokeSession(id);
        await this.client.getOwnAccount();
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
    }

    async syncAccount() {
        if (!this.loggedIn) {
            throw "Not logged in!";
        }
        await this.client.getOwnAccount();
        await this.storage.set(this);
        if (!this.account!.publicKey) {
            await this.generateKeyPair();
        }
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
        this.sharedStores = [];
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
            throw "Need to create account first!";
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
        store.access = Object.assign({ privateKey: this.mainStore.privateKey! }, this.account.publicAccount);
        await store.setAccount(this.account.publicAccount, { read: true, write: true, manage: true }, "active");
        await this.remoteStorage.set(store);
        this.sharedStores.push(store);
        await this.syncAccount();
        this.dispatch("store-created", { store });
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
        store.access = this.access;

        try {
            await this.remoteStorage.get(store);
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

        if (store.permissions.write) {
            await this.remoteStorage.set(store);
        }

        this.dispatch("store-changed", { store });
    }

    async deleteSharedStore(id: StoreID) {
        const store = this.sharedStores.find(s => s.id === id) || new SharedStore(id);
        if (!store.permissions.manage) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
        await this.remoteStorage.delete(store);
        await this.synchronize();
    }

    isTrusted(account: PublicAccount) {
        const trusted = this.mainStore.trustedAccounts.find(acc => acc.id === account.id);
        if (trusted && trusted.publicKey !== account.publicKey) {
            throw new Err(
                ErrorCode.PUBLIC_KEY_MISMATCH,
                `The public key for the account ${account.email}, has changed unexpectedly! ` +
                    `This can be a sign of tempering and should be reported immediately!`
            );
        }
        return !!trusted;
    }

    async addTrustedAccount(account: PublicAccount) {
        if (!this.isTrusted(account)) {
            this.mainStore.trustedAccounts.push({
                id: account.id,
                email: account.email,
                name: account.name,
                publicKey: account.publicKey
            });
        }
        await this.synchronize();
        this.dispatch("account-changed");
    }

    async createInvite(
        store: SharedStore,
        account: PublicAccount,
        permissions: Permissions = { read: true, write: false, manage: false }
    ) {
        if (!store.permissions.manage) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        if (!this.isTrusted(account)) {
            throw "Invites can only be created for trusted accounts.";
        }

        if (store.accessors.some(a => a.email === account.email && a.status === "active")) {
            throw "This account is already in this group.";
        }

        await this.remoteStorage.get(store);
        await store.setAccount(account, permissions, "invited");
        await Promise.all([this.storage.set(store), this.remoteStorage.set(store)]);
    }

    async setAccount(
        store: SharedStore,
        acc: PublicAccount,
        permissions: Permissions = { read: true, write: true, manage: false },
        status: AccessorStatus
    ) {
        await this.remoteStorage.get(store);
        await store.setAccount(acc, permissions, status);
        await Promise.all([this.storage.set(store), this.remoteStorage.set(store)]);
        this.dispatch("store-changed", { store });
    }

    async removeAccount(store: SharedStore, account: PublicAccount) {
        if (!store.permissions.manage) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
        await this.remoteStorage.get(store);
        await store.removeAccount(account);
        await Promise.all([this.storage.set(store), this.remoteStorage.set(store)]);
        this.dispatch("store-changed", { store });
    }

    async acceptInvite(store: SharedStore) {
        await this.client.acceptInvite(store);
        this.dispatch("store-changed", { store });
    }

    async requestAccess(store: SharedStore) {
        await this.client.requestAccess(store);
        this.dispatch("store-changed", { store });
    }

    async synchronize() {
        await this.syncAccount();

        try {
            await this.remoteStorage.get(this.mainStore);
        } catch (e) {
            console.log("error", e.code);
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        await Promise.all([this.storage.set(this.mainStore), this.remoteStorage.set(this.mainStore)]);

        const sharedStores = [...this.account!.sharedStores];

        await Promise.all(sharedStores.map(id => this.syncSharedStore(id)));

        this.setStats({ lastSync: new Date().toISOString() });
        this.dispatch("synchronize");
    }

    getRecord(id: string): { record: Record; store: Store } | null {
        for (const store of [this.mainStore, ...this.sharedStores]) {
            const record = store.getRecord(id);
            if (record) {
                return { record, store };
            }
        }

        return null;
    }

    async getStore(id: string): Promise<SharedStore | null> {
        let store = this.sharedStores.find(s => s.id === id);
        if (store) {
            return store;
        }

        store = new SharedStore(id);
        try {
            store.access = this.access;
            await this.remoteStorage.get(store);
            return store;
        } catch (e) {}

        return null;
    }

    async reactivateSubscription() {}

    buySubscription(_source: string) {}

    cancelSubscription() {}

    updatePaymentMethod(_source: String) {}
}
