import { Request, Response } from "./transport";
import { marshal, Serializable, stringToBytes, base64ToBytes, bytesToBase64 } from "./encoding";
import { HMACParams } from "./crypto";
import { Storable } from "./storage";
import { DeviceInfo } from "./platform";
import { AccountID } from "./account";
import { getCryptoProvider as getProvider } from "./platform";

/** Unique identifier for [[Session]]s */
export type SessionID = string;

/** Public session info (used for display purposes) */
export interface SessionInfo {
    id: string;
    account: AccountID;
    created: Date;
    updated: Date;
    lastUsed: Date;
    expires?: Date;
    device?: DeviceInfo;
}

/**
 * A session represents a trusted connection between a [[Server]] and [[Client]]
 * which can be used to authenticate requests, allowing both parties to verify
 * the other parties identity and check the request/response bodies integrity.
 * The authentication flow usually works as follows:
 *
 * ```ts
 * // CLIENT
 *
 * const request = createRequest();
 * await this.session.authenticate(request);
 *
 * // SERVER
 *
 * if (!(await context.session.verify(request))) {
 *     throw "Failed to verify request!";
 * }
 *
 * const response = processRequest(request);
 * await context.session.authenticate(response);
 *
 * // CLIENT
 *
 * if (!(await context.session.verify(response))) {
 *     throw "Failed to verify response!";
 * }
 *
 * processResponse(response);
 * ```
 *
 * ```
 *                        ┌──────────┐     ┌──────────┐
 *                        │Client (C)│     │Server (S)│
 *                        └─────┬────┘     └────┬─────┘
 * ┌──────────────────────────┐ │               │
 * │req = [request body]      │ │   req, sid,   │
 * │t1 = [timestamp]          │ │   t1, sig1    │ ┌──────────────────────────┐
 * │sig1 = HMAC(K, sid|t1|req)│ │──────────────▶│ │=> verify sig1            │
 * └──────────────────────────┘ │               │ │res = [response body]     │
 *                              │               │ │t2 = [timestamp]          │
 *             ┌──────────────┐ │ res, t2, sig2 │ │sig2 = HMAC(K, sid|t2|res)│
 *             │=> verify sig2│ │◁ ─ ─ ─ ─ ─ ─ ─│ └──────────────────────────┘
 *             └──────────────┘ │               │
 *                              │               │
 *                              ▼               ▼
 * ```
 */
export class Session extends Serializable implements SessionInfo, Storable {
    /** Unique identifier */
    id: string = "";

    /** Associated [[Account]] */
    account: AccountID = "";

    /** Time of creation */
    created = new Date(0);

    /** Time of last update */
    updated = new Date(0);

    /** When this session was last used to authenticate a request */
    lastUsed = new Date(0);

    /** Expiration time */
    expires?: Date;

    /** Session key used to sign/verify requests and responses */
    key?: Uint8Array;

    /** Info about the device the client is running on */
    device?: DeviceInfo;

    /**
     * Public session info
     */
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

    /**
     * Authenticates a [[Request]] or [[Response]] by signing the session id,
     * timestamp and request/response body using the session [[key]].
     */
    async authenticate(r: Request | Response): Promise<void> {
        const session = this.id;
        const time = new Date().toISOString();
        const data = (<Request>r).params || (<Response>r).result;
        const signature = await this._sign(session + "_" + time + "_" + marshal(data));
        r.auth = { session, time, signature };
    }

    /**
     * Verifies session id, timestamp and request/response body of a given
     * [[Request]] or [[Response]] using the session [[key]].
     */
    async verify(r: Request | Response): Promise<boolean> {
        if (!r.auth) {
            return false;
        }
        const { signature, session, time } = r.auth;
        const data = (<Request>r).params || (<Response>r).result;

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
