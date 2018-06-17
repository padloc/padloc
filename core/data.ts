import { Serializable, DateString, TimeStamp } from "./encoding";
import { PublicKey, PrivateKey, provider } from "./crypto";
import { Storable, Storage, LocalStorage, EncryptedStorage } from "./storage";
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
    account?: Account;
    members?: PublicAccount[];
    trustedAccounts?: PublicAccount[];

    constructor(public id: StoreID = uuid(), public records: Record[] = []) {}

    async serialize() {
        return {
            created: this.created,
            updated: this.updated,
            records: this.records,
            account: this.account,
            members: this.members,
            trustedAccounts: this.trustedAccounts
        };
    }

    async deserialize(raw: any) {
        Object.assign(this, raw);
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
    sharedStores: StoreID[];
    clients: ClientID[];
    publicKey: PublicKey;
    privateKey: PrivateKey;

    constructor(public id: AccountID) {}

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
            publicKey: this.publicKey,
            privateKey: this.privateKey
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
    localStorage: Storage;
    encryptedStorage: EncryptedStorage;
    mainStore: Store;
    sharedStores: Store[];

    constructor() {
        this.localStorage = new LocalStorage();
        this.encryptedStorage = new EncryptedStorage(this.localStorage);
        this.meta = new ClientMeta();
    }

    get account(): Account | undefined {
        return this.mainStore.account;
    }

    async load() {
        try {
            await this.localStorage.get(this.meta);
        } catch (e) {
            await this.localStorage.set(this.meta);
        }
    }

    async init(password: string) {
        const account = new Account(uuid());
        Object.assign(account, await provider.generateKeyPair());
        this.mainStore = new Store();
        this.mainStore.account = account;
        account.mainStore = this.mainStore.id;
        this.encryptedStorage.user = account;
        await this.setPassword(password);
        const pubAcc = account.publicAccount;
        this.meta.accounts.push(pubAcc);
        this.meta.currentAccount = pubAcc;
        await this.localStorage.set(this.meta);
    }

    async unlock(password: string) {
        this.encryptedStorage.password = password;
        this.mainStore = new Store(this.meta.currentAccount!.mainStore);
        await this.encryptedStorage.get(this.mainStore);
    }

    async setPassword(password: string) {
        this.encryptedStorage.password = password;
        this.encryptedStorage.setAs(this.mainStore, "PBES2");
    }

    async createSharedStore() {
        const store = new Store();
        await this.encryptedStorage.set(store);
    }
}
