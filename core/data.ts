import { Serializable, DateString, TimeStamp, marshal, unmarshal } from "./encoding";
import { PublicKey, PrivateKey, Container, PasswordBasedContainer, ContainerID } from "./crypto";

export interface Record {}

export type AccountID = string;
export type ClientID = string;

type EditInfo =
    | {
          account: AccountID;
          date: DateString;
      }
    | DateString
    | TimeStamp;

export class StoreData implements Serializable {
    created: EditInfo;
    updated: EditInfo;
    account?: Account;
    members?: PublicAccount[];
    trustedAccounts?: PublicAccount[];

    constructor(public records: Record[] = []) {}

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
}

export class Account implements PublicAccount, Storeable {
    id: AccountID;
    created: DateString;
    email: string;
    mainStore: ContainerID;
    sharedStores: ContainerID[];
    clients: ClientID[];
    publicKey: PublicKey;
    privateKey: PrivateKey;

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

export class SharedStore extends Container<StoreData> {
    constructor(public id: ContainerID) {
        super(new StoreData());
    }
}

export class MainStore extends PasswordBasedContainer<StoreData> {
    constructor(public id: ContainerID, public password: string) {
        super(new StoreData());
    }
}

export class Client {
    id: ClientID;
    account: Account;
    mainStore: MainStore;
    sharedStores: Map<ContainerID, SharedStore>;
    storage: Storage;

    constructor() {
        this.storage = new LocalStorage();
        this.account = new Account();
        this.account.id = "account";
    }

    async load() {
        try {
            await this.storage.get(this.account);
        } catch (e) {
            console.log("no account found, creating...");
            this.account.created = new Date().toISOString();
            await this.storage.set(this.account);
        }
    }

    async unlock(password: string) {
        if (!this.account.mainStore) {
            const id = "main";
            this.mainStore = new MainStore(id, password);
            await this.storage.set(this.mainStore);
            this.account.mainStore = id;
            await this.storage.set(this.account);
        } else {
            this.mainStore = new MainStore(this.account.mainStore, password);
        }

        await this.storage.get(this.mainStore);
    }
}

export interface Storeable extends Serializable {
    id: string;
}

export interface Storage {
    set(s: Storeable): Promise<void>;
    get(s: Storeable): Promise<void>;
}

export class MemoryStorage implements Storage {
    private _storage: Map<string, any>;

    constructor() {
        this._storage = new Map<string, any>();
    }

    async set(s: Storeable) {
        this._storage.set(s.id, await s.serialize());
    }

    async get(s: Storeable) {
        return s.deserialize(this._storage.get(s.id));
    }
}

export class LocalStorage implements Storage {
    async set(s: Storeable) {
        localStorage.setItem(s.id, marshal(await s.serialize()));
    }

    async get(s: Storeable) {
        const data = localStorage.getItem(s.id);
        if (!data) {
            throw "not_found";
        }
        return s.deserialize(unmarshal(data));
    }
}
