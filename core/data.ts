import { Serializable, DateString, TimeStamp } from "./encoding";
import { PublicKey, PrivateKey, Container, EncryptionScheme, provider } from "./crypto";
import { Storable, Storage, LocalStorage } from "./storage";
import { uuid } from "./util";

export interface Record {}

export type AccountID = string;
export type ClientID = string;
export type StoreID = string;

type EditInfo =
    | {
          account: AccountID;
          date: DateString;
      }
    | DateString
    | TimeStamp;

export class Store implements Serializable {
    created: EditInfo;
    updated: EditInfo;
    account: Account;
    privateKey: PrivateKey;
    protected container: Container;

    protected get scheme(): EncryptionScheme {
        return "simple";
    }

    constructor(public id: StoreID = uuid(), public records: Record[] = []) {
        this.container = new Container(this.scheme);
    }

    protected async _serialize() {
        return {
            created: this.created,
            updated: this.updated,
            records: this.records
        };
    }

    protected async _deserialize(raw: any) {
        Object.assign(this, raw);
    }

    get serializer() {
        return {
            id: this.id,
            serialize: async () => this._serialize(),
            deserialize: async (raw: any) => this._deserialize(raw)
        };
    }

    protected prepContainer() {
        if (this.account) {
            this.container.user = {
                id: this.account.id,
                publicKey: this.account.publicKey,
                privateKey: this.privateKey
            };
        }
    }

    async serialize() {
        this.prepContainer();
        await this.container.set(this.serializer);
        return this.container.serialize();
    }

    async deserialize(raw: any) {
        this.prepContainer();
        await this.container.deserialize(raw);
        await this.container.get(this.serializer);
    }
}

export class MainStore extends Store {
    protected get scheme(): EncryptionScheme {
        return "PBES2";
    }

    trustedAccounts: PublicAccount[];

    set password(pwd: string | undefined) {
        this.container.password = pwd;
    }

    get password(): string | undefined {
        return this.container.password;
    }

    protected async _serialize() {
        return Object.assign(await super._serialize(), {
            account: await this.account.serialize(),
            privateKey: this.privateKey,
            trustedAccounts: this.trustedAccounts
        });
    }

    protected async _deserialize(raw: any) {
        if (!this.account) {
            this.account = new Account();
        }
        await this.account.deserialize(raw.account);
        delete raw.account;
        await super._deserialize(raw);
    }
}

export class SharedStore extends Store {
    protected get scheme(): EncryptionScheme {
        return "shared";
    }
    members: PublicAccount[] = [];

    protected async _serialize() {
        return Object.assign(await super._serialize(), {
            members: this.members
        });
    }

    async addMember(member: Account) {
        this.members.push(member);
        this.prepContainer();
        await this.container.addParticipant(member);
    }
}

export interface PublicAccount {
    id: AccountID;
    email: string;
    publicKey: PublicKey;
    mainStore: StoreID;
}

export class Account implements PublicAccount, Storable {
    created: DateString;
    email: string;
    mainStore: StoreID;
    sharedStores: StoreID[] = [];
    clients: ClientID[] = [];
    publicKey: PublicKey;

    constructor(public id: AccountID = uuid()) {}

    get publicAccount(): PublicAccount {
        return {
            id: this.id,
            email: this.email,
            publicKey: this.publicKey,
            mainStore: this.mainStore
        };
    }

    async serialize() {
        return {
            id: this.id,
            created: this.created,
            email: this.email,
            mainStore: this.mainStore,
            sharedStores: this.sharedStores,
            clients: this.clients,
            publicKey: this.publicKey
        };
    }

    async deserialize(raw: any) {
        Object.assign(this, raw);
    }
}

export class ClientMeta implements Storable {
    id = "meta";
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
    }
}

export class Client {
    id: ClientID;
    meta: ClientMeta;
    storage: Storage;
    mainStore: MainStore;
    sharedStores: SharedStore[] = [];

    constructor() {
        this.storage = new LocalStorage();
        this.meta = new ClientMeta();
    }

    get account(): Account | undefined {
        return this.mainStore.account;
    }

    get privateKey(): PrivateKey {
        return this.mainStore.privateKey;
    }

    async load() {
        try {
            await this.storage.get(this.meta);
        } catch (e) {
            await this.storage.set(this.meta);
        }
    }

    async init(password: string) {
        const account = new Account(uuid());
        Object.assign(account, await provider.generateKeyPair());
        this.mainStore = new MainStore();
        this.mainStore.account = account;
        account.mainStore = this.mainStore.id;
        await this.setPassword(password);
        const pubAcc = account.publicAccount;
        this.meta.accounts.push(pubAcc);
        this.meta.currentAccount = pubAcc;
        await this.storage.set(this.meta);
    }

    async unlock(password: string) {
        this.mainStore = new MainStore(this.meta.currentAccount!.mainStore);
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
}
