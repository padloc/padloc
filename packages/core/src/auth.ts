import { Request, Response } from "./transport";
import { marshal, Base64String, stringToBase64 } from "./encoding";
import {
    PBES2Container,
    getProvider,
    RSAPublicKey,
    RSAPrivateKey,
    PBKDF2Params,
    defaultPBKDF2Params,
    defaultHMACParams,
    defaultRSAKeyParams
} from "./crypto";
import { Storable } from "./storage";
import { DeviceInfo } from "./platform";
import { Err, ErrorCode } from "./error";
import { VaultInfo } from "./vault";
import { Collection, CollectionItem } from "./collection";

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
    created: Date;
    updated: Date;
    lastUsed: Date;
    expires?: Date;
    device?: DeviceInfo;
}

export class Session implements SessionInfo, Storable {
    kind = "session";
    account: AccountID = "";
    created = new Date();
    updated = new Date();
    lastUsed = new Date();
    expires?: Date;
    key: Base64String = "";
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

export class Account extends PBES2Container implements Storable, AccountInfo {
    kind = "account";
    email = "";
    name = "";
    created = new Date();
    updated = new Date();
    publicKey: RSAPublicKey = "";
    privateKey: RSAPrivateKey = "";
    mainVault = "";
    sessions = new Collection<SessionInfo>();
    vaults = new Collection<VaultInfo & CollectionItem>();

    get pk() {
        return this.id;
    }

    get info(): AccountInfo {
        return { id: this.id, email: this.email, publicKey: this.publicKey, name: this.name };
    }

    get locked(): boolean {
        return !this.privateKey;
    }

    private get _encSerializer() {
        return {
            serialize: async () => {
                return { privateKey: this.privateKey };
            },
            deserialize: async ({ privateKey }: { privateKey: string }) => {
                this.privateKey = privateKey;
                return this;
            }
        };
    }

    constructor(public id: AccountID = "") {
        super();
    }

    async initialize(password: string) {
        await this._generateKeyPair();
        await this.setPassword(password);
    }

    async setPassword(password: string) {
        this.password = password;
        await this.set(this._encSerializer);
    }

    async unlock(password: string) {
        this.password = password;
        await this.get(this._encSerializer);
    }

    lock() {
        this.password = "";
        this.privateKey = "";
    }

    merge(account: Account) {
        if (account.updated > this.updated) {
            this.name = account.name;
            this.mainVault = account.mainVault;
            this.keyParams = account.keyParams;
            this.encryptionParams = account.encryptionParams;
            this.encryptedData = account.encryptedData;
            this.updated = account.updated;
            this.created = account.created;
            this.publicKey = account.publicKey;
        }

        return {
            vaults: this.vaults.merge(account.vaults),
            sessions: this.sessions.merge(account.sessions)
        };
    }

    async serialize() {
        return {
            ...(await super.serialize()),
            id: this.id,
            created: this.created,
            updated: this.updated,
            email: this.email,
            name: this.name,
            mainVault: this.mainVault,
            publicKey: this.publicKey,
            vaults: await this.vaults.serialize(),
            sessions: await this.sessions.serialize()
        };
    }

    async deserialize(raw: any) {
        await super.deserialize(raw);
        this.id = raw.id;
        this.created = new Date(raw.created);
        this.updated = new Date(raw.updated);
        this.email = raw.email;
        this.name = raw.name;
        this.mainVault = raw.mainVault;
        this.publicKey = raw.publicKey;
        this.vaults = await new Collection<VaultInfo & CollectionItem>().deserialize(raw.vaults);
        this.sessions = await new Collection<SessionInfo>().deserialize(raw.sessions);
        return this;
    }

    private async _generateKeyPair() {
        const { publicKey, privateKey } = await getProvider().generateKey(defaultRSAKeyParams());
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }

    toString() {
        return this.name || this.email;
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
    created = new Date();

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
        this.created = new Date(raw.created);
        return this;
    }
}
