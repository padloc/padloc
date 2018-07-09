import { LocalStorage, RemoteStorage } from "./storage";
import { Store, MainStore, SharedStore, Record, Field, Tag } from "./data";
import { Account, Session } from "./auth";
import { DateString } from "./encoding";
import { Client } from "./client";
import { Messages } from "./messages";
import { localize as $l } from "./locale";

export interface Stats {
    [key: string]: string | number | boolean;
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

export class App extends EventTarget {
    storageKind: "padlock-app";
    storageKey: "";

    storage = new LocalStorage();
    client = new Client(this);
    remoteStorage = new RemoteStorage(this.client);
    mainStore = new MainStore();
    sharedStores: SharedStore[] = [];
    settings = defaultSettings;
    messages = new Messages("https://padlock.io/messages.json");
    locked = true;
    stats: Stats = {};

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
            settings: this.settings
        };
    }

    async deserialize(raw: any) {
        this.account = raw.account;
        this.session = raw.session;
        this.initialized = raw.initialized;
        this.setStats(raw.stats || {});
        await this.messages.deserialize(raw.messages);
        this.setSettings(raw.settings);
        return this;
    }

    async load() {
        try {
            await this.storage.get(this);
        } catch (e) {
            await this.storage.set(this);
        }
    }

    get password(): string | undefined {
        return this.mainStore.password;
    }

    set password(pwd: string | undefined) {
        this.mainStore.password = pwd;
    }

    async setStats(obj: Partial<Stats>) {
        Object.assign(this.stats, obj);
        this.storage.set(this);
        this.dispatchEvent(new CustomEvent("stats-changed", { detail: { stats: this.stats } }));
    }

    async setSettings(obj: Partial<Settings>) {
        Object.assign(this.settings, obj);
        this.storage.set(this);
        this.dispatchEvent(new CustomEvent("settings-changed", { detail: { settings: this.settings } }));
    }

    async init(password: string) {
        await this.setPassword(password);
        this.initialized = new Date().toISOString();
        await this.storage.set(this);
        this.dispatchEvent(new CustomEvent("initialize"));
        this.dispatchEvent(new CustomEvent("unlock"));
    }

    async unlock(password: string) {
        this.mainStore.password = password;
        await this.storage.get(this.mainStore);
        this.locked = false;
        this.dispatchEvent(new CustomEvent("unlock"));

        // for (const id of this.account!.sharedStores) {
        //     const sharedStore = new SharedStore(id);
        //     sharedStore.account = this.account!;
        //     sharedStore.privateKey = this.privateKey!;
        //     try {
        //         await this.storage.get(sharedStore);
        //         this.sharedStores.push(sharedStore);
        //     } catch (e) {
        //         console.error("Failed to decrypt shared store with id", sharedStore.id, e);
        //     }
        // }
    }

    async lock() {
        await Promise.all([this.mainStore.clear(), ...this.sharedStores.map(s => s.clear())]);
        this.sharedStores = [];
        this.locked = true;
        this.dispatchEvent(new CustomEvent("lock"));
    }

    async setPassword(password: string) {
        this.password = password;
        await this.storage.set(this.mainStore);
        this.dispatchEvent(new CustomEvent("password-changed"));
    }
    //
    // async createSharedStore(): Promise<SharedStore> {
    //     const store = new SharedStore();
    //     store.account = this.account!;
    //     store.privateKey = this.privateKey;
    //     await store.addMember(this.account!);
    //     await this.storage.set(store);
    //     this.sharedStores.push(store);
    //     this.account!.sharedStores.push(store.id);
    //     await this.storage.set(this.mainStore);
    //     return store;
    // }

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
        this.dispatchEvent(new CustomEvent("reset"));
        this.loaded = this.load();
    }

    async login(email: string) {
        await this.client.createSession(email);
        await this.client.getAccount();
        await this.save();
        this.dispatchEvent(new CustomEvent("login"));
        this.dispatchEvent(new CustomEvent("account-changed", { detail: { account: this.account } }));
        this.dispatchEvent(new CustomEvent("session-changed", { detail: { session: this.session } }));
    }

    async activateSession(code: string) {
        await this.client.activateSession(code);
        await this.client.getAccount();
        await this.save();
        this.dispatchEvent(new CustomEvent("account-changed", { detail: { account: this.account } }));
        this.dispatchEvent(new CustomEvent("session-changed", { detail: { session: this.session } }));
    }

    async refreshAccount() {
        await this.client.getAccount();
        await this.save();
        this.dispatchEvent(new CustomEvent("account-changed", { detail: { account: this.account } }));
    }

    async logout() {
        await this.client.logout();
        delete this.session;
        delete this.account;
        await this.storage.set(this);
        this.dispatchEvent(new CustomEvent("logout"));
        this.dispatchEvent(new CustomEvent("account-changed", { detail: { account: this.account } }));
        this.dispatchEvent(new CustomEvent("session-changed", { detail: { session: this.session } }));
    }

    async addRecords(store: Store, records: Record[]) {
        store.addRecords(records);
        await this.storage.set(store);
        this.dispatchEvent(new CustomEvent("records-added", { detail: { store: store, records: records } }));
    }

    async createRecord(store: Store, name: string): Promise<Record> {
        const fields = [
            { name: $l("Username"), value: "", masked: false },
            { name: $l("Password"), value: "", masked: true }
        ];
        const record = store.createRecord(name || "", fields);
        await this.addRecords(store, [record]);
        this.dispatchEvent(new CustomEvent("record-created", { detail: { store: store, record: record } }));
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
        this.dispatchEvent(new CustomEvent("record-changed", { detail: { store: store, record: record } }));
    }

    async deleteRecords(store: Store, records: Record | Record[]) {
        store.removeRecords(records);
        await this.storage.set(store);
        this.dispatchEvent(new CustomEvent("records-deleted", { detail: { store: store, records: records } }));
    }
}
