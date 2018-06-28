import { Storable, Storage, LocalStorage, RemoteStorage } from "./storage";
import { MainStore, SharedStore, Settings, Store, Record } from "./data";
import { Account, Session } from "./auth";
import { DateString } from "./encoding";
import { Client } from "./client";
import { Messages } from "./messages";
import { localize as $l } from "./locale";

export interface Stats {
    [key: string]: string | number | boolean;
}

export class State implements Storable {
    storageKind = "state";
    storageKey = "";

    // Persistent state
    stats: Stats;
    initialized?: DateString;
    locked = true;
    account?: Account;
    session?: Session;
    messages = new Messages("https://padlock.io/messages.json");
    settings = new Settings();

    currentStore: Store | null;
    selectedRecords: Record[];
    currentRecord: Record | null;
    multiSelect = false;

    async serialize() {
        return {
            account: this.account,
            session: this.session,
            initialized: this.initialized,
            stats: this.stats,
            messages: await this.messages.serialize(),
            settings: await this.settings.serialize()
        };
    }

    async deserialize(raw: any) {
        this.account = raw.account;
        this.session = raw.session;
        this.initialized = raw.initialized;
        this.stats = raw.stats || {};
        await this.messages.deserialize(raw.messages);
        await this.settings.deserialize(raw.settings);
        return this;
    }
}

export class App extends EventTarget {
    state: State;
    storage: Storage;
    remoteStorage: Storage;
    client: Client;
    mainStore: MainStore;
    sharedStores: SharedStore[] = [];
    loaded: Promise<void>;

    constructor() {
        super();
        this.storage = new LocalStorage();
        this.state = new State();
        this.mainStore = new MainStore();
        this.client = new Client(this.state);
        this.remoteStorage = new RemoteStorage(this.client);
        this.loaded = this.load();

        // this.debouncedSave = debounce(() => app.save(), 500);
    }

    private notifyStateChanged(...paths: string[]) {
        this.dispatchEvent(new CustomEvent("state-changed", { detail: { paths: paths } }));
    }

    get password(): string | undefined {
        return this.mainStore.password;
    }

    set password(pwd: string | undefined) {
        this.mainStore.password = pwd;
    }

    async setStats(obj: Partial<Stats>) {
        Object.assign(this.state.stats, obj);
        this.storage.set(this.state);
        this.notifyStateChanged("stats");
    }

    async load() {
        try {
            await this.storage.get(this.state);
        } catch (e) {
            await this.storage.set(this.state);
        }
        this.notifyStateChanged();
    }

    async init(password: string) {
        await this.setPassword(password);
        this.state.initialized = new Date().toISOString();
        await this.storage.set(this.state);
    }

    async unlock(password: string) {
        this.mainStore.password = password;
        await this.storage.get(this.mainStore);
        this.state.currentStore = this.mainStore;
        this.state.locked = false;
        this.notifyStateChanged("currentStore");
        this.notifyStateChanged("locked");

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

    async setPassword(password: string) {
        this.password = password;
        await this.storage.set(this.mainStore);
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
            this.storage.set(this.state),
            this.storage.set(this.mainStore),
            ...this.sharedStores.map(s => this.storage.set(s))
        ]);
    }

    async lock() {
        await Promise.all([this.mainStore.clear(), ...this.sharedStores.map(s => s.clear())]);
        this.sharedStores = [];
        this.state.currentStore = null;
        this.state.locked = true;
        this.notifyStateChanged("currentStore", "locked");
    }

    async reset() {
        await this.lock();
        await this.storage.clear();
        this.state = new State();
        this.loaded = this.load();
        this.notifyStateChanged();
    }

    async login(email: string) {
        await this.client.createSession(email);
        await this.client.getAccount();
        await this.save();
        this.notifyStateChanged("session", "account");
    }

    async activateSession(code: string) {
        await this.client.activateSession(code);
        await this.client.getAccount();
        await this.save();
        this.notifyStateChanged("session", "account");
    }

    async refreshAccount() {
        this.state.account = await this.client.getAccount();
        await this.save();
        this.notifyStateChanged("account");
    }

    async logout() {
        await this.client.logout();
        delete this.state.session;
        delete this.state.account;
        await this.save();
        this.notifyStateChanged("account", "session");
    }

    addRecords(records: Record[]) {
        if (!this.state.currentStore) {
            return;
        }
        this.state.currentStore.addRecords(records);
        this.notifyStateChanged("currentStore.records");
        this.save();
    }

    createRecord(name: string): Record {
        const fields = [
            { name: $l("Username"), value: "", masked: false },
            { name: $l("Password"), value: "", masked: true }
        ];
        const record = new Record(name || "", fields);
        this.addRecords([record]);
        return record;
    }

    selectRecord(record: Record | null) {
        this.state.currentRecord = record;
        this.notifyStateChanged("currentRecord");
    }

    updateRecord(record: Record) {
        record.updated = new Date();
        this.save();
        this.notifyStateChanged("currentRecord", "currentStore");
    }

    deleteRecord(record: Record) {
        this.deleteRecords([record]);
    }

    deleteRecords(records: Record[]) {
        records.forEach(r => {
            r.remove();
            r.updated = new Date();
        });
        this.notifyStateChanged("currentStore.records");
        this.save();
    }
}
