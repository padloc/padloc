import { Request, Response } from "./transport";
import { marshal, Serializable, stringToBytes, base64ToBytes, bytesToBase64 } from "./encoding";
import { getProvider, HMACParams } from "./crypto";
import { Storable } from "./storage";
import { DeviceInfo } from "./platform";
import { AccountID } from "./account";

export type SessionID = string;

export interface SessionInfo {
    id: string;
    account: AccountID;
    created: Date;
    updated: Date;
    lastUsed: Date;
    expires?: Date;
    device?: DeviceInfo;
}

export class Session extends Serializable implements SessionInfo, Storable {
    id: string = "";
    account: AccountID = "";
    created = new Date(0);
    updated = new Date(0);
    lastUsed = new Date(0);
    expires?: Date;
    key?: Uint8Array;
    device?: DeviceInfo;

    get info(): SessionInfo {
        return {
            id: this.id,
            account: this.account,
            created: this.created,
            updated: this.updated,
            lastUsed: this.lastUsed,
            expires: this.expires,
            device: this.device
        };
    }

    async authenticate(r: Request | Response): Promise<void> {
        const session = this.id;
        const time = new Date().toISOString();
        const data = (<Request>r).params || (<Response>r).result;
        const signature = await this._sign(session + "_" + time + "_" + marshal(data));
        r.auth = { session, time, signature };
    }

    async verify(r: Request | Response): Promise<boolean> {
        if (!r.auth) {
            return false;
        }
        const { signature, session, time } = r.auth;
        const data = (<Request>r).params || (<Response>r).result;

        // Make sure message isn't older than 1 minute to prevent replay attacks
        const age = Date.now() - new Date(time).getTime();
        if (age > 60 * 1000) {
            return false;
        }

        return this._verify(signature, session + "_" + time + "_" + marshal(data));
    }

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.account === "string" &&
            this.created instanceof Date &&
            this.updated instanceof Date &&
            this.lastUsed instanceof Date &&
            (!this.expires || this.expires instanceof Date) &&
            (!this.key || this.key instanceof Uint8Array)
        );
    }

    toRaw() {
        return {
            ...super.toRaw(),
            key: this.key ? bytesToBase64(this.key) : undefined
        };
    }

    fromRaw({ id, account, created, updated, lastUsed, expires, device, key }: any) {
        this.id = id;
        this.account = account;
        this.created = new Date(created);
        this.updated = new Date(updated);
        this.lastUsed = new Date(lastUsed);
        this.expires = expires && new Date(expires);
        this.device = device ? new DeviceInfo().fromRaw(device) : undefined;
        this.key = key ? base64ToBytes(key) : undefined;
        return super.fromRaw({});
    }

    private async _sign(message: string): Promise<string> {
        const bytes = await getProvider().sign(this.key!, stringToBytes(message), new HMACParams());
        return bytesToBase64(bytes);
    }

    private async _verify(signature: string, message: string): Promise<boolean> {
        return await getProvider().verify(
            this.key!,
            base64ToBytes(signature),
            stringToBytes(message),
            new HMACParams()
        );
    }
}
