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
    key!: Uint8Array;
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

    async serialize() {
        return {
            ...this.info,
            key: this.key
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.account = raw.account;
        this.created = new Date(raw.created);
        this.updated = new Date(raw.updated);
        this.lastUsed = new Date(raw.lastUsed);
        this.expires = raw.expires && new Date(raw.expires);
        this.device = raw.device;
        this.key = raw.key || "";
        return this;
    }

    private async _sign(message: string): Promise<string> {
        const bytes = await getProvider().sign(this.key, stringToBytes(message), new HMACParams());
        return bytesToBase64(bytes);
    }

    private async _verify(signature: string, message: string): Promise<boolean> {
        return await getProvider().verify(this.key, base64ToBytes(signature), stringToBytes(message), new HMACParams());
    }
}
