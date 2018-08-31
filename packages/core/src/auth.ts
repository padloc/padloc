import { DateString, Base64String, stringToBase64 } from "./encoding";
import {
    getProvider,
    RSAPublicKey,
    RSAPrivateKey,
    PBKDF2Params,
    defaultPBKDF2Params,
    defaultEncryptionParams,
    defaultHMACParams
} from "./crypto";
import { Storable } from "./storage";
import { DeviceInfo } from "./platform";

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

    async getAuthHeader() {
        const msg = new Date().toISOString();
        const signature = await this.sign(msg);
        return `${this.id}:${stringToBase64(msg)}:${signature}`;
    }

    async sign(message: string): Promise<Base64String> {
        return await getProvider().sign(this.key, stringToBase64(message), defaultHMACParams());
    }

    async verify(signature: Base64String, message: string): Promise<boolean> {
        return await getProvider().verify(this.key, signature, stringToBase64(message), defaultHMACParams());
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
}

export interface AccountInfo {
    id: AccountID;
    email: string;
    name: string;
    publicKey: RSAPublicKey;
}

export class Account implements Storable, AccountInfo {
    kind = "account";
    email = "";
    name = "";
    created: DateString = new Date().toISOString();
    updated: DateString = new Date().toISOString();
    publicKey: RSAPublicKey = "";
    privateKey: RSAPrivateKey = "";
    store = "";
    authKey: Base64String = "";
    sessions = new Set<SessionID>();
    keyParams = defaultPBKDF2Params();
    encryptionParams = defaultEncryptionParams();
    encPrivateKey: Base64String = "";
    masterKey: Base64String = "";

    get pk() {
        return this.id;
    }

    get info(): AccountInfo {
        return { id: this.id, email: this.email, publicKey: this.publicKey, name: this.name };
    }

    constructor(public id: AccountID = "") {}

    async initialize(password: string) {
        await this._generateKeyPair();
        await this.setPassword(password);
    }

    async setPassword(password: string) {
        this.keyParams.salt = await getProvider().randomBytes(16);
        await this.generateKeys(password);
        this.encryptionParams.iv = await getProvider().randomBytes(16);
        this.encryptionParams.additionalData = stringToBase64(this.email);
        this.encPrivateKey = await getProvider().encrypt(this.masterKey, this.privateKey, this.encryptionParams);
    }

    async unlock(password: string) {
        await this.generateKeys(password);
        this.privateKey = await getProvider().decrypt(this.masterKey, this.encPrivateKey, this.encryptionParams);
    }

    async generateKeys(password: string) {
        this.masterKey = await getProvider().deriveKey(password, this.keyParams);
        const p = Object.assign({}, this.keyParams, { iterations: 1 });
        // TODO: Use more secure method to derive auth key
        this.authKey = await getProvider().deriveKey(this.masterKey, p);
    }

    async serialize() {
        return {
            id: this.id,
            created: this.created,
            updated: this.updated,
            email: this.email,
            name: this.name,
            store: this.store,
            publicKey: this.publicKey,
            encPrivateKey: this.encPrivateKey,
            keyParams: this.keyParams,
            encryptionParams: this.encryptionParams,
            sessions: Array.from(this.sessions)
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.created = raw.created;
        this.updated = raw.updated;
        this.email = raw.email;
        this.name = raw.name;
        this.store = raw.store;
        this.publicKey = raw.publicKey;
        this.encPrivateKey = raw.encPrivateKey;
        this.keyParams = raw.keyParams;
        this.encryptionParams = raw.encryptionParams;
        this.sessions = new Set<SessionID>(raw.sessions);
        return this;
    }

    private async _generateKeyPair() {
        const { publicKey, privateKey } = await getProvider().generateKey({
            algorithm: "RSA",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: "SHA-1"
        });
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }
}

export class AuthInfo implements Storable {
    kind = "auth-info";
    account: AccountID = "";
    verifier: Base64String = "";
    keyParams: PBKDF2Params = defaultPBKDF2Params();

    constructor(public email: string) {}

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
}
