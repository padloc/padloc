import { DateString, Serializable } from "./encoding";
import { PublicKey } from "./crypto";
import { Storable } from "./storage";
import { StoreID } from "./data";
import { uuid } from "./util";

export type AccountID = string;
export type SessionID = string;
export type DeviceID = string;

export class Device implements Serializable {
    id: DeviceID;
    userAgent: string;

    get description(): string {
        return this.userAgent;
    }

    async serialize() {
        return {
            id: this.id,
            userAgent: this.userAgent
        };
    }

    async deserialize(raw: any) {
        Object.assign(this, raw);
        return this;
    }
}

export interface PublicAccount {
    id: AccountID;
    email: string;
    publicKey: PublicKey;
    mainStore: StoreID;
}

export class Session implements Serializable {
    id: string;
    account: AccountID;
    token?: string;
    created: DateString;
    active: boolean;
    lastUsed?: DateString;
    expires?: DateString;
    device: Device;

    async serialize() {
        return {
            id: this.id,
            account: this.account,
            token: this.token,
            created: this.created,
            active: this.active,
            lastUsed: this.lastUsed,
            expires: this.expires,
            device: this.device && (await this.device.serialize())
        };
    }

    async deserialize(raw: any) {
        this.device = await new Device().deserialize(raw.device);
        delete raw.device;
        Object.assign(this, raw);
        return this;
    }
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
            sessions: await Promise.all(this.sessions.map(s => s.serialize()))
        };
    }

    async deserialize(raw: any) {
        this.sessions = ((await Promise.all(
            raw.sessions.map((s: any) => new Session().deserialize(s))
        )) as any) as Session[];
        delete raw.sessions;
        Object.assign(this, raw);
        return this;
    }
}
