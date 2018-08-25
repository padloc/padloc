import { Storable, LocalStorage } from "./storage";
import { Store, AccountStore, SharedStore, Record, Field, Tag, StoreID } from "./data";
import { Account, PublicAccount, Session, Device, Organization } from "./auth";
import { DateString } from "./encoding";
import { Client } from "./client";
import { Messages } from "./messages";
import { localize as $l } from "./locale";
import { Err, ErrorCode } from "./error";
import { getDeviceInfo } from "./platform";
import { uuid } from "./util";
import { Permissions, AccessorStatus } from "./crypto";

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
    if (store instanceof SharedStore) {
        content.push(store.name);
    }
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
    api = new Client(this);
    mainStore = new AccountStore(new Account(), true);
    sharedStores: SharedStore[] = [];
    organizations: Organization[] = [];
    settings = defaultSettings;
    messages = new Messages("https://padlock.io/messages.json");
    locked = true;
    stats: Stats = {};
    device: Device = new Device();
    initialized: DateString = "";
    session: Session | null = null;

    loaded = this.load();

    get account(): Account {
        return this.mainStore.account;
    }

    set account(account: Account) {
        this.mainStore.account = account;
    }

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
        this.unlock(password);
    }

    async unlock(password: string) {
        this.mainStore.password = password;
        await this.storage.get(this.mainStore);

        if (this.account) {
            for (const id of this.account.sharedStores) {
                const sharedStore = new SharedStore(id, this.account);
                try {
                    await this.storage.get(sharedStore);
                    this.sharedStores.push(sharedStore);
                } catch (e) {
                    console.error("Failed to decrypt shared store with id", sharedStore.id, e);
                }
            }

            for (const id of this.account.organizations) {
                const org = new Organization(id, this.account);
                try {
                    await this.storage.get(org);
                    this.organizations.push(org);
                } catch (e) {
                    console.error("Failed to load organization with id", org.id, e);
                }
            }
        }

        this.locked = false;
        this.dispatch("unlock");
    }

    async lock() {
        this.mainStore = new AccountStore(this.account, true);
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
        this.mainStore = new AccountStore(new Account(), true);
        this.sharedStores = [];
        this.initialized = "";
        await this.storage.clear();
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

    toggleStore(store: SharedStore) {
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
        await this.api.createSession(email);
        await this.storage.set(this);
        this.dispatch("login");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async activateSession(code: string) {
        await this.api.activateSession(this.session!.id, code);
        this.dispatch("session-changed", { session: this.session });
        await this.syncAccount();
    }

    async revokeSession(id: string) {
        await this.api.revokeSession(id);
        await this.api.getAccount(this.account);
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
    }

    async syncAccount() {
        if (!this.loggedIn) {
            throw "Not logged in!";
        }
        const account = this.account!;
        await this.api.getAccount(this.account);
        if (this.initialized && (!account.publicKey || !account.privateKey)) {
            await account.generateKeyPair();
            await Promise.all([
                this.api.updateAccount(account),
                this.api.updateAccountStore(this.mainStore),
                this.storage.set(this.mainStore)
            ]);
        }
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
    }

    async logout() {
        try {
            await this.api.revokeSession(this.session!.id);
        } catch (e) {}
        this.session = null;
        this.account = new Account();
        this.sharedStores = [];
        await this.storage.set(this);
        this.dispatch("logout");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async hasRemoteData(): Promise<boolean> {
        try {
            await this.api.getAccountStore(this.mainStore);
            return true;
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                return false;
            }
            throw e;
        }
    }

    async createSharedStore(name: string): Promise<SharedStore> {
        if (!this.account) {
            throw "Need to be logged in to create a shared store!";
        }

        await this.syncAccount();
        const store = await this.api.createSharedStore({ name });
        await store.initialize();
        await Promise.all([this.api.updateSharedStore(store), this.storage.set(store)]);
        this.sharedStores.push(store);
        await this.syncAccount();
        this.dispatch("store-created", { store });
        return store;
    }

    async syncSharedStore(id: StoreID) {
        if (!this.account || !this.account.privateKey) {
            throw "Not logged in";
        }

        let store = this.sharedStores.find(s => s.id === id);
        if (!store) {
            store = new SharedStore(id, this.account);
            this.sharedStores.push(store);
        }

        try {
            await this.api.getSharedStore(store);
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
            await this.api.updateSharedStore(store);
        }

        this.dispatch("store-changed", { store });
    }

    isTrusted(account: PublicAccount) {
        const trusted = this.account && this.account.trustedAccounts.find(acc => acc.id === account.id);
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
        if (!this.account) {
            throw "not logged in";
        }

        if (!this.isTrusted(account)) {
            this.account.trustedAccounts.push({
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

        if (store.accessors.some(a => a.id === account.id && a.status === "active")) {
            throw "This account is already in this group.";
        }

        await this.api.getSharedStore(store);
        await store.updateAccess(account, permissions, "invited");
        await Promise.all([this.storage.set(store), this.api.updateSharedStore(store)]);
    }

    async updateAccess(
        store: SharedStore,
        acc: PublicAccount,
        permissions: Permissions = { read: true, write: true, manage: false },
        status: AccessorStatus
    ) {
        await this.api.getSharedStore(store);
        await store.updateAccess(acc, permissions, status);
        await Promise.all([this.storage.set(store), this.api.updateSharedStore(store)]);
        this.dispatch("store-changed", { store });
    }

    async revokeAccess(store: SharedStore, account: PublicAccount) {
        if (!store.permissions.manage) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
        await this.api.getSharedStore(store);
        await store.revokeAccess(account);
        await Promise.all([this.storage.set(store), this.api.updateSharedStore(store)]);
        this.dispatch("store-changed", { store });
    }

    async synchronize() {
        await this.syncAccount();

        try {
            await this.api.getAccountStore(this.mainStore);
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        await Promise.all([this.storage.set(this.mainStore), this.api.updateAccountStore(this.mainStore)]);

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
        if (!this.account) {
            throw "not logged in";
        }
        let store = this.sharedStores.find(s => s.id === id);
        if (store) {
            return store;
        }

        store = new SharedStore(id, this.account);
        try {
            await this.api.getSharedStore(store);
            return store;
        } catch (e) {}

        return null;
    }

    async reactivateSubscription() {}

    get knownAccounts(): PublicAccount[] {
        const accounts = new Map<string, PublicAccount>();
        for (const store of this.sharedStores) {
            for (const { id, email, name, publicKey } of store.accessors) {
                if (id !== this.account!.id) {
                    accounts.set(id, { id, email, name, publicKey });
                }
            }
        }

        return Array.from(accounts.values());
    }

    async createOrganization(name: string): Promise<Organization> {
        if (!this.account) {
            throw "Need to be logged in to create an organization!";
        }

        await this.syncAccount();

        const org = await this.api.createOrganization({ name });
        await org.initialize();
        await Promise.all([this.api.updateOrganization(org), this.storage.set(org)]);
        this.organizations.push(org);
        await this.syncAccount();
        this.dispatch("organization-created", { organization: org });
        return org;
    }

    buySubscription(_source: string) {}

    cancelSubscription() {}

    updatePaymentMethod(_source: String) {}
}
