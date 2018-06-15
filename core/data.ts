import { Serializable } from "./encoding";
import { PublicKey, PrivateKey, Participant, PasswordBasedContainer } from "./crypto";

export interface Record {}

export class StoreData implements Serializable {
    constructor(public records: Record[], public privateKey?: PrivateKey) {}

    async serialize() {
        return {
            records: this.records,
            privateKey: this.privateKey
        };
    }

    async deserialize(raw: any) {
        this.records = raw.records;
        this.privateKey = raw.privateKey;
    }
}

export type AccountID = string;
export type StoreID = string;
export type ClientID = string;

export class Account implements Serializable, Participant {
    id: AccountID;
    email: string;
    cipherType: "asymmetric";
    algorithm: Algorithm;
    defaultStore: StoreID;
    stores: StoreID[];
    clients: ClientID[];
    publicKey: PublicKey;
    privateKey: PrivateKey;

    serialize() {
        return Promise.resolve({
            id: this.id,
            email: this.email
        });
    }

    deserialize(raw: any) {
        this.id = raw.id;
        this.email = raw.email;
        return Promise.resolve();
    }
}

export class Store extends PasswordBasedContainer<StoreData> {
    id: StoreID;
    creator: Account;

    constructor(data: StoreData = new StoreData([])) {
        super(data);
        this.password = "asdf";
    }
}

export class Client {
    id: ClientID;
    account: Account;
    store: Store;
}
