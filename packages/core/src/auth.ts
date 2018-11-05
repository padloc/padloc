import { Request, Response } from "./transport";
import { marshal, DateString, Base64String, stringToBase64 } from "./encoding";
import {
    getProvider,
    RSAPublicKey,
    RSAPrivateKey,
    PBKDF2Params,
    defaultPBKDF2Params,
    defaultEncryptionParams,
    defaultHMACParams,
    defaultRSAKeyParams
} from "./crypto";
import { Storable } from "./storage";
import { DeviceInfo } from "./platform";
import { Err, ErrorCode } from "./error";
import { VaultInfo } from "./vault";

export function parseAuthHeader(header: string) {
    const creds = header.match(/^SRP-HMAC sid=(.+),msg=(.+),sig=(.+)$/);

    if (!creds) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const [sid, msg, sig] = creds.slice(1);

    return { sid, msg, sig };
}

export type AccountID = string;
export type SessionID = string;
export type DeviceID = string;

export interface SessionInfo {
    id: string;
    account: AccountID;
    created: DateString;
    lastUsed: DateString;
    expires: DateString;
    device?: DeviceInfo;
}

export class Session implements SessionInfo, Storable {
    kind = "session";
    account: AccountID = "";
    created: DateString = new Date().toISOString();
    lastUsed: DateString = new Date().toISOString();
    expires: DateString = "";
    key: Base64String = "";
    device?: DeviceInfo;

    get info(): SessionInfo {
        return {
            id: this.id,
            account: this.account,
            created: this.created,
            lastUsed: this.lastUsed,
            expires: this.expires,
            device: this.device
        };
    }

    get pk() {
        return this.id;
    }

    constructor(public id = "") {}

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
        const raw = this.info as any;
        raw.key = this.key;
        return raw;
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.account = raw.account;
        this.created = raw.created;
        this.lastUsed = raw.lastUsed;
        this.expires = raw.expires;
        this.device = raw.device;
        this.key = raw.key || "";
        return this;
    }

    private async _sign(message: string): Promise<Base64String> {
        return await getProvider().sign(this.key, stringToBase64(message), defaultHMACParams());
    }

    private async _verify(signature: Base64String, message: string): Promise<boolean> {
        return await getProvider().verify(this.key, signature, stringToBase64(message), defaultHMACParams());
    }
}

export interface AccountInfo {
    id: AccountID;
    email: string;
    name: string;
    publicKey: RSAPublicKey;
}

export interface SignedAccountInfo extends AccountInfo {
    signedPublicKey: Base64String;
}

export class Account implements Storable, AccountInfo {
    kind = "account";
    email = "";
    name = "";
    created = new Date();
    updated = new Date();
    publicKey: RSAPublicKey = "";
    privateKey: RSAPrivateKey = "";
    mainVault = "";
    sessions = new Set<SessionID>();
    keyParams = defaultPBKDF2Params();
    encryptionParams = defaultEncryptionParams();
    encPrivateKey: Base64String = "";
    masterKey: Base64String = "";
    vaults: VaultInfo[] = [];

    get pk() {
        return this.id;
    }

    get info(): AccountInfo {
        return { id: this.id, email: this.email, publicKey: this.publicKey, name: this.name };
    }

    get locked(): boolean {
        return !this.privateKey;
    }

    constructor(public id: AccountID = "") {}

    async initialize(password: string) {
        await this._generateKeyPair();
        await this.setPassword(password);
    }

    async setPassword(password: string) {
        this.keyParams.salt = await getProvider().randomBytes(16);
        const key = await this._getMasterKey(password);
        this.encryptionParams.iv = await getProvider().randomBytes(16);
        this.encryptionParams.additionalData = stringToBase64(this.email);
        this.encPrivateKey = await getProvider().encrypt(key, this.privateKey, this.encryptionParams);
    }

    async unlock(password: string) {
        const key = await this._getMasterKey(password);
        this.privateKey = await getProvider().decrypt(key, this.encPrivateKey, this.encryptionParams);
    }

    lock() {
        this.privateKey = "";
    }

    update(account: Account) {
        this.name = account.name;
        this.mainVault = account.mainVault;
        this.keyParams = account.keyParams;
        this.updated = new Date();
    }

    async serialize() {
        return {
            id: this.id,
            created: this.created,
            updated: this.updated,
            email: this.email,
            name: this.name,
            mainVault: this.mainVault,
            publicKey: this.publicKey,
            encPrivateKey: this.encPrivateKey,
            keyParams: this.keyParams,
            encryptionParams: this.encryptionParams,
            vaults: this.vaults,
            sessions: Array.from(this.sessions)
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.created = new Date(raw.created);
        this.updated = new Date(raw.updated);
        this.email = raw.email;
        this.name = raw.name;
        this.mainVault = raw.mainVault;
        this.publicKey = raw.publicKey;
        this.encPrivateKey = raw.encPrivateKey;
        this.keyParams = raw.keyParams;
        this.encryptionParams = raw.encryptionParams;
        this.vaults = raw.vaults || [];
        this.sessions = new Set<SessionID>(raw.sessions);
        return this;
    }

    private async _getMasterKey(password: string) {
        return getProvider().deriveKey(password, this.keyParams);
    }

    private async _generateKeyPair() {
        const { publicKey, privateKey } = await getProvider().generateKey(defaultRSAKeyParams());
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }
}

export class Auth implements Storable {
    kind = "auth";
    account: AccountID = "";
    verifier: Base64String = "";
    keyParams: PBKDF2Params = defaultPBKDF2Params();

    constructor(public email: string = "") {}

    get pk() {
        return this.email;
    }

    async serialize() {
        return {
            email: this.email,
            account: this.account,
            verifier: this.verifier,
            keyParams: this.keyParams
        };
    }

    async deserialize(raw: any) {
        this.email = raw.email;
        this.account = raw.account;
        this.verifier = raw.verifier;
        this.keyParams = raw.keyParams;
        return this;
    }

    async getAuthKey(password: string) {
        if (!this.keyParams.salt) {
            this.keyParams.salt = await getProvider().randomBytes(16);
        }
        return getProvider().deriveKey(password, this.keyParams);
    }
}

export class EmailVerification implements Storable {
    kind = "email-verification";
    created: DateString = new Date().toISOString();

    get pk() {
        return this.email;
    }

    constructor(public email: string, public code: string = "", public id: string = "") {}

    async serialize() {
        return {
            id: this.id,
            email: this.email,
            code: this.code,
            created: this.created
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.email = raw.email;
        this.code = raw.code;
        this.created = raw.created;
        return this;
    }
}
