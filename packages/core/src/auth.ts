import { DateString, Base64String, Serializable, stringToBase64 } from "./encoding";
import { getProvider, RSAPublicKey, RSAPrivateKey, defaultPBKDF2Params, defaultEncryptionParams } from "./crypto";
import { Storable } from "./storage";
import { DeviceInfo } from "./platform";

export type AccountID = string;
export type SessionID = string;
export type DeviceID = string;

export class Device implements Serializable, DeviceInfo {
    id: string = "";
    platform: string = "";
    osVersion: string = "";
    appVersion: string = "";
    manufacturer?: string;
    model?: string;
    browser?: string;
    userAgent: string = "";

    get description(): string {
        return this.browser ? `${this.browser} on ${this.platform}` : `${this.platform + " Device"}`;
    }

    async serialize() {
        return {
            id: this.id,
            platform: this.platform,
            osVersion: this.osVersion,
            appVersion: this.appVersion,
            manufacturer: this.manufacturer,
            model: this.model,
            browser: this.browser,
            userAgent: this.userAgent
        };
    }

    async deserialize(raw: any) {
        Object.assign(this, raw);
        return this;
    }
}

export class Session implements Serializable {
    id: string = "";
    token: string = "";
    email: string = "";
    created: DateString = new Date().toISOString();
    active: boolean = false;
    lastUsed?: DateString;
    expires?: DateString;
    device: Device = new Device();
    account?: Account;

    async serialize() {
        return {
            id: this.id,
            email: this.email,
            token: this.token,
            created: this.created,
            active: this.active,
            lastUsed: this.lastUsed,
            expires: this.expires,
            device: this.device && (await this.device.serialize())
        };
    }

    async deserialize(raw: any) {
        await this.device.deserialize(raw.device);
        delete raw.device;
        Object.assign(this, raw);
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
    id: AccountID = "";
    name = "";
    created: DateString = new Date().toISOString();
    updated: DateString = new Date().toISOString();
    publicKey: RSAPublicKey = "";
    privateKey: RSAPrivateKey = "";
    sessions: Session[] = [];
    store = "";
    authKey: Base64String = "";

    private _keyDerivationParams = defaultPBKDF2Params();
    private _encryptionParams = defaultEncryptionParams();

    private _encPrivateKey: Base64String = "";
    private _masterKey: Base64String = "";

    constructor(public email: string = "") {}

    get pk() {
        return this.email;
    }

    get info(): AccountInfo {
        return { id: this.id, email: this.email, publicKey: this.publicKey, name: this.name };
    }

    async initialize(password: string) {
        await this._generateKeyPair();
        await this.setPassword(password);
    }

    async setPassword(password: string) {
        this._keyDerivationParams.salt = await getProvider().randomBytes(16);
        await this._generateKeys(password);
        this._encryptionParams.iv = await getProvider().randomBytes(16);
        this._encryptionParams.additionalData = stringToBase64(this.email);
        this._encPrivateKey = await getProvider().encrypt(this._masterKey, this.privateKey, this._encryptionParams);
    }

    async unlock(password: string) {
        await this._generateKeys(password);
        this.privateKey = await getProvider().decrypt(this._masterKey, this._encPrivateKey, this._encryptionParams);
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
            encPrivateKey: this._encPrivateKey,
            sessions: await Promise.all(this.sessions.map(s => s.serialize()))
        };
    }

    async deserialize(raw: any) {
        this.id = this.id;
        this.created = raw.created;
        this.updated = raw.updated;
        this.email = raw.email;
        this.name = raw.name;
        this.store = raw.store;
        this.publicKey = raw.publicKey;
        this._encPrivateKey = raw.encPrivateKey;
        this.sessions = ((await Promise.all(
            raw.sessions.map((s: any) => new Session().deserialize(s))
        )) as any) as Session[];
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

    private async _generateKeys(password: string) {
        const interKey = await getProvider().deriveKey(password, this._keyDerivationParams);
        const p = Object.assign({}, this._keyDerivationParams, { iterations: 1 });
        this._masterKey = await getProvider().deriveKey(interKey, p);
        this.authKey = await getProvider().deriveKey(interKey, p);
    }
}
