import { DateString } from "./encoding";
import { PublicKey } from "./crypto";
import { Storable } from "./storage";
import { StoreID } from "./data";
import { uuid } from "./util";

export type AccountID = string;

export interface Device {
    description: string;
    tokenId: string;
}

export interface PublicAccount {
    id: AccountID;
    email: string;
    publicKey: PublicKey;
    mainStore: StoreID;
}

export interface Session {
    id: string;
    account: AccountID;
    token?: string;
    created: DateString;
    active: boolean;
    lastUsed?: DateString;
    expires?: DateString;
    device?: Device;
}

export class Account implements PublicAccount, Storable {
    storageKind = "account";
    id: AccountID;
    created: DateString;
    mainStore: StoreID;
    sharedStores: StoreID[] = [];
    publicKey: PublicKey;
    sessions: Session[] = [];
    // TODO
    subscription?: { status: string };
    promo?: any;
    paymentSource?: any;

    static create(email: string) {
        const account = new Account(email);
        account.id = uuid();
        account.created = new Date().toISOString();
        return account;
    }

    constructor(public email: string = "") {}

    get storageKey() {
        return this.email || "";
    }

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
            publicKey: this.publicKey,
            sessions: this.sessions
        };
    }

    async deserialize(raw: any) {
        Object.assign(this, raw);
        return this;
    }
}
