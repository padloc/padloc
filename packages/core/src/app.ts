import { PrivateKey, getProvider } from "./crypto";
import { Storable, Storage, LocalStorage } from "./storage";
import { Account, PublicAccount, MainStore, SharedStore, Settings } from "./data";

const provider = getProvider();

export class AppMeta implements Storable {
    kind = "meta";
    id = "";
    public accounts: PublicAccount[] = [];
    public currentAccount?: PublicAccount;

    async serialize() {
        return {
            accounts: this.accounts,
            currentAccount: this.currentAccount
        };
    }

    async deserialize(raw: any) {
        Object.assign(this, raw);
        return this;
    }
}

export class App {
    meta: AppMeta;
    storage: Storage;
    mainStore: MainStore;
    sharedStores: SharedStore[] = [];
    loaded: Promise<void>;

    constructor() {
        this.storage = new LocalStorage();
        this.meta = new AppMeta();
        this.loaded = this.load();
        this.mainStore = new MainStore();
    }

    get account(): Account | undefined {
        return this.mainStore.account;
    }

    get privateKey(): PrivateKey {
        return this.mainStore.privateKey;
    }

    get settings(): Settings {
        return this.mainStore.settings;
    }

    async load() {
        try {
            await this.storage.get(this.meta);
        } catch (e) {
            await this.storage.set(this.meta);
        }
    }

    async isInitialized(): Promise<boolean> {
        await this.loaded;
        return !!this.meta.currentAccount;
    }

    async init(password: string) {
        const account = new Account();
        Object.assign(account, await provider.generateKeyPair());
        this.mainStore.account = account;
        account.mainStore = this.mainStore.id;
        await this.setPassword(password);
        const pubAcc = account.publicAccount;
        this.meta.accounts.push(pubAcc);
        this.meta.currentAccount = pubAcc;
        await this.storage.set(this.meta);
    }

    async unlock(password: string) {
        this.mainStore.id = this.meta.currentAccount!.mainStore;
        this.mainStore.password = password;
        await this.storage.get(this.mainStore);

        for (const id of this.account!.sharedStores) {
            const sharedStore = new SharedStore(id);
            sharedStore.account = this.account!;
            sharedStore.privateKey = this.privateKey!;
            try {
                await this.storage.get(sharedStore);
                this.sharedStores.push(sharedStore);
            } catch (e) {
                console.error("Failed to decrypt shared store with id", sharedStore.id, e);
            }
        }
    }

    async setPassword(password: string) {
        this.mainStore.password = password;
        await this.storage.set(this.mainStore);
    }

    async createSharedStore(): Promise<SharedStore> {
        const store = new SharedStore();
        store.account = this.account!;
        store.privateKey = this.privateKey;
        await store.addMember(this.account!);
        await this.storage.set(store);
        this.sharedStores.push(store);
        this.account!.sharedStores.push(store.id);
        await this.storage.set(this.mainStore);
        return store;
    }

    async save() {
        return Promise.all([
            this.storage.set(this.meta),
            this.storage.set(this.mainStore),
            ...this.sharedStores.map(s => this.storage.set(s))
        ]);
    }

    async lock() {
        await Promise.all([this.mainStore.clear(), ...this.sharedStores.map(s => s.clear())]);
        this.sharedStores = [];
    }

    async reset() {
        await this.lock();
        await this.storage.clear();
        this.meta = new AppMeta();
        this.loaded = this.load();
    }
}
