import {
    Serializable,
    Base64String,
    stringToBase64,
    base64ToString,
    base64ToHex,
    marshal,
    unmarshal,
    DateString
} from "./encoding";
import { Err, ErrorCode } from "./error";
import { PublicAccount } from "./auth";

// Minimum number of pbkdf2 iterations
const PBKDF2_ITER_MIN = 1e4;
// Default number of pbkdf2 iterations
const PBKDF2_ITER_DEFAULT = 5e4;
// Maximum number of pbkdf2 iterations
const PBKDF2_ITER_MAX = 1e7;

export type AESKey = Base64String;
export type HMACKey = Base64String;
export type SymmetricKey = AESKey | HMACKey;
export type RSAPublicKey = Base64String;
export type RSAPrivateKey = Base64String;

export interface AESEncryptionParams {
    algorithm: "AES-GCM" | "AES-CCM";
    tagSize: 64 | 96 | 128;
    keySize: 256;
    iv: Base64String;
    additionalData: Base64String;
}

export interface AESKeyParams {
    algorithm: "AES";
    keySize: 256;
}

export interface HMACKeyParams {
    algorithm: "HMAC";
    keySize: 256;
}

export interface RSAKeyParams {
    algorithm: "RSA";
    modulusLength: 2048;
    publicExponent: Uint8Array;
    hash: "SHA-1";
}

export interface PBKDF2Params {
    algorithm: "PBKDF2";
    hash: "SHA-256";
    keySize: 256;
    iterations: number;
    salt: string;
}

export interface RSAEncryptionParams {
    algorithm: "RSA-OAEP";
    hash: "SHA-1";
}

export interface RSASigningParams {
    algorithm: "RSA-PSS";
    hash: "SHA-1";
    saltLength: 128;
}

export interface HMACParams {
    algorithm: "HMAC";
    hash: "SHA-256";
    keySize: 256;
}

export interface CryptoProvider {
    isAvailable(): boolean;
    randomBytes(n: number): Base64String;

    generateKey(params: AESKeyParams): Promise<AESKey>;
    generateKey(params: HMACKeyParams): Promise<HMACKey>;
    generateKey(params: RSAKeyParams): Promise<{ privateKey: RSAPrivateKey; publicKey: RSAPublicKey }>;

    deriveKey(password: string, params: PBKDF2Params): Promise<SymmetricKey>;

    encrypt(key: AESKey, data: Base64String, params: AESEncryptionParams): Promise<Base64String>;
    encrypt(publicKey: RSAPublicKey, data: Base64String, params: RSAEncryptionParams): Promise<Base64String>;

    decrypt(key: AESKey, data: Base64String, params: AESEncryptionParams): Promise<Base64String>;
    decrypt(privateKey: RSAPrivateKey, data: Base64String, params: RSAEncryptionParams): Promise<Base64String>;

    sign(key: HMACKey, data: Base64String, params: HMACParams): Promise<Base64String>;
    sign(key: RSAPrivateKey, data: Base64String, params: RSASigningParams): Promise<Base64String>;

    verify(key: HMACKey, signature: Base64String, data: Base64String, params: HMACParams): Promise<boolean>;
    verify(key: RSAPublicKey, signature: Base64String, data: Base64String, params: RSASigningParams): Promise<boolean>;

    fingerprint(key: RSAPublicKey): Promise<Base64String>;
}

export function validateAESEncryptionParams(params: any): AESEncryptionParams {
    if (
        !["AES-GCM", "AES-CCM"].includes(params.algorithm) ||
        // TODO: validate base64
        typeof params.iv !== "string" ||
        typeof params.additionalData !== "string" ||
        ![64, 96, 128].includes(params.tagSize)
    ) {
        throw new Err(ErrorCode.INVALID_ENCRYPTION_PARAMS);
    }

    return params as AESEncryptionParams;
}

export function validateRSAEncryptionParams(params: any): RSAEncryptionParams {
    if (params.algorithm !== "RSA-OAEP") {
        throw new Err(ErrorCode.INVALID_KEY_WRAP_PARAMS);
    }
    return params as RSAEncryptionParams;
}

export function defaultPBKDF2Params(): PBKDF2Params {
    return {
        algorithm: "PBKDF2",
        hash: "SHA-256",
        keySize: 256,
        iterations: PBKDF2_ITER_DEFAULT,
        salt: ""
    };
}

export function validatePBKDF2Params(params: any): PBKDF2Params {
    if (
        params.algorithm !== "PBKDF2" ||
        !params.salt ||
        typeof params.salt !== "string" ||
        !params.iterations ||
        params.iterations < PBKDF2_ITER_MIN ||
        params.iterations > PBKDF2_ITER_MAX ||
        ![192, 256, 512].includes(params.keySize) ||
        !["SHA-256", "SHA-512"].includes(params.hash)
    ) {
        throw new Err(ErrorCode.INVALID_KEY_PARAMS);
    }

    return params as PBKDF2Params;
}

export type EncryptionScheme = "simple" | "PBES2" | "shared";

export interface BaseRawContainer {
    version: 2;
    scheme: EncryptionScheme;
    encryptionParams: AESEncryptionParams;
    encryptedData: Base64String;
}

export interface SimpleRawContainer extends BaseRawContainer {
    scheme: "simple";
}

export interface PBES2RawContainer extends BaseRawContainer {
    scheme: "PBES2";
    keyParams: PBKDF2Params;
}

export interface SharedRawContainer extends BaseRawContainer {
    scheme: "shared";
    keyParams: RSAEncryptionParams;
    accessors: Accessor[];
}

export type RawContainer = SimpleRawContainer | PBES2RawContainer | SharedRawContainer;

export function defaultEncryptionParams(): AESEncryptionParams {
    return {
        algorithm: "AES-GCM",
        tagSize: 64,
        keySize: 256,
        iv: "",
        additionalData: ""
    };
}

export function defaultKeyWrapParams(): RSAEncryptionParams {
    return {
        algorithm: "RSA-OAEP",
        hash: "SHA-1"
    };
}

export abstract class Container implements Serializable {
    encryptedData: Base64String = "";
    constructor(public encryptionParams: AESEncryptionParams = defaultEncryptionParams()) {}

    protected abstract _getKey(): Promise<AESKey>;

    async set(data: Serializable) {
        this.encryptionParams.iv = provider.randomBytes(16);
        // TODO: useful additional authenticated data?
        this.encryptionParams.additionalData = provider.randomBytes(16);

        const key = await this._getKey();
        const pt = stringToBase64(marshal(await data.serialize()));
        this.encryptedData = await provider.encrypt(key, pt, this.encryptionParams);
    }

    async get(data: Serializable) {
        const key = await this._getKey();
        const pt = base64ToString(await provider.decrypt(key, this.encryptedData, this.encryptionParams));
        await data.deserialize(unmarshal(pt));
    }

    async serialize() {
        const raw = {
            version: 2,
            encryptionParams: this.encryptionParams,
            encryptedData: this.encryptedData
        };

        return raw as any;
    }

    async deserialize(raw: any) {
        validateAESEncryptionParams(raw.encryptionParams);
        this.encryptionParams = raw.encryptionParams;
        this.encryptedData = raw.encryptedData;
        return this;
    }
}

export class PBES2Container extends Container {
    password?: string;

    constructor(
        public encryptionParams: AESEncryptionParams = defaultEncryptionParams(),
        public keyParams: PBKDF2Params = defaultPBKDF2Params()
    ) {
        super(encryptionParams);
    }

    async _getKey() {
        if (!this.keyParams.salt) {
            this.keyParams.salt = provider.randomBytes(16);
        }
        if (!this.password) {
            throw new Err(ErrorCode.DECRYPTION_FAILED, "No password provided");
        }
        return await provider.deriveKey(this.password, this.keyParams);
    }

    async serialize() {
        const raw = await super.serialize();
        (raw as PBES2RawContainer).keyParams = this.keyParams;
        return raw;
    }

    async deserialize(raw: PBES2RawContainer) {
        validatePBKDF2Params(raw.keyParams);
        this.keyParams = raw.keyParams;
        await super.deserialize(raw);
        return this;
    }
}

export interface Permissions {
    read: boolean;
    write: boolean;
    manage: boolean;
}

export type AccessorStatus = "invited" | "active" | "left" | "removed" | "requested" | "rejected" | "none";

export interface Accessor extends PublicAccount {
    encryptedKey: Base64String;
    permissions: Permissions;
    updatedBy: string;
    updated: DateString;
    status: AccessorStatus;
}

export interface Access {
    id: string;
    privateKey: RSAPrivateKey;
}

export class SharedContainer extends Container {
    private _accessors = new Map<string, Accessor>();
    private _key: AESKey = "";

    constructor(
        public access: Access,
        public encryptionParams: AESEncryptionParams = defaultEncryptionParams(),
        public keyParams: RSAEncryptionParams = defaultKeyWrapParams()
    ) {
        super(encryptionParams);
    }

    async initialize(account: PublicAccount) {
        this._key = await provider.generateKey({
            algorithm: "AES",
            keySize: this.encryptionParams.keySize
        } as AESKeyParams);
        await this.updateAccessor(
            Object.assign({}, account, {
                status: "active" as AccessorStatus,
                permissions: { read: true, write: true, manage: true },
                encryptedKey: "",
                updated: "",
                updatedBy: ""
            })
        );
    }

    async _getKey() {
        if (!this._key) {
            const accessor = this._accessors.get(this.access.id);
            if (!accessor || !accessor.encryptedKey) {
                throw new Err(ErrorCode.MISSING_ACCESS, "Current accessor does not have access.");
            }
            this._key = await provider.decrypt(this.access.privateKey, accessor.encryptedKey, this.keyParams);
        }
        return this._key;
    }

    async serialize() {
        const raw = await super.serialize();
        (raw as SharedRawContainer).keyParams = this.keyParams;
        (raw as SharedRawContainer).accessors = this.accessors;
        return raw;
    }

    async deserialize(raw: SharedRawContainer) {
        await super.deserialize(raw);
        this.keyParams = raw.keyParams;
        this.mergeAccessors(raw.accessors);
        this._key = "";
        return this;
    }

    get accessors() {
        return Array.from(this._accessors.values());
    }

    get currentAccessor() {
        return this.getAccessor(this.access.id);
    }

    get accessorStatus(): AccessorStatus {
        const accessor = this.currentAccessor;
        return accessor ? accessor.status : "none";
    }

    get hasAccess() {
        return this.accessorStatus === "active" && !!this.access.privateKey;
    }

    getAccessor(id: string) {
        return this._accessors.get(id);
    }

    async updateAccessor(accessor: Accessor) {
        if (accessor.status === "active" || accessor.status === "invited") {
            accessor.encryptedKey = await provider.encrypt(accessor.publicKey, await this._getKey(), this.keyParams);
        } else {
            accessor.encryptedKey = "";
        }

        accessor.updated = new Date().toISOString();
        accessor.updatedBy = this.access.id;
        this._accessors.set(accessor.id, accessor);
    }

    mergeAccessors(accessors: Accessor[]) {
        const changed: Accessor[] = [];
        const added: Accessor[] = [];

        for (const acc of accessors) {
            const existing = this._accessors.get(acc.id);
            if (!existing) {
                this._accessors.set(acc.id, acc);
                added.push(acc);
            } else if (!existing.updated || new Date(existing.updated) < new Date(acc.updated)) {
                this._accessors.set(acc.id, acc);
                changed.push(acc);
            }
        }

        return { changed, added };
    }

    private async _reencrypt() {
        this._key = await provider.generateKey({
            algorithm: "AES",
            keySize: this.encryptionParams.keySize
        } as AESKeyParams);

        await Promise.all(this.accessors.map(async a => this.updateAccessor(a)));
    }

    async removeAccessor(id: string) {
        const acc = this._accessors.get(id);
        if (!acc) {
            throw "Accessor does not exist on this store";
        }

        acc.status = "removed";

        await this._reencrypt();
    }
}

export interface SignedAccount extends PublicAccount {
    signedPublicKey: Base64String;
}

export class KeyExchange implements Serializable {
    id: string = "";
    created: DateString = "";
    expires: DateString = "";

    keyParams: PBKDF2Params = {
        algorithm: "PBKDF2",
        hash: "SHA-256",
        keySize: 256,
        iterations: 1e6,
        salt: ""
    };

    signingParams: HMACParams = {
        algorithm: "HMAC",
        hash: "SHA-256",
        keySize: 256
    };

    email: string = "";

    sender?: SignedAccount;
    receiver?: SignedAccount;

    private _secret: string = "";
    set secret(s: string) {
        this._secret = s;
        this._key = "";
    }
    get secret() {
        return this._secret;
    }

    async initialize(email: string, sender: PublicAccount, duration = 1, secret?: string) {
        this.email = email;
        this.created = new Date().toISOString();
        this.expires = new Date(new Date().getTime() + 1000 * 60 * 60 * duration).toISOString();
        this.secret = secret || base64ToHex(await provider.randomBytes(4));
        this.keyParams.salt = provider.randomBytes(16);
        this.sender = await this._sign(sender);
    }

    private _key: HMACKey = "";
    private async _getKey() {
        if (!this._key) {
            this._key = (await provider.deriveKey(this.secret, this.keyParams)) as HMACKey;
        }
        return this._key;
    }

    private async _sign(p: PublicAccount): Promise<SignedAccount> {
        const signedPublicKey = await provider.sign(await this._getKey(), p.publicKey, this.signingParams);
        return Object.assign({ signedPublicKey }, p);
    }

    private async _verify(a: SignedAccount): Promise<boolean> {
        return await provider.verify(await this._getKey(), a.signedPublicKey, a.publicKey, this.signingParams);
    }

    async serialize() {
        return {
            created: this.created,
            expires: this.expires,
            keyParams: this.keyParams,
            signingParams: this.signingParams,
            sender: this.sender,
            receiver: this.receiver,
            email: this.email
        };
    }

    async deserialize(raw: any) {
        this.created = raw.created;
        this.expires = raw.expires;
        this.keyParams = raw.keyParams;
        this.signingParams = raw.signingParams;
        this.sender = raw.sender;
        this.receiver = raw.receiver;
        this.email = raw.email;
        return this;
    }

    async accept(receiver: PublicAccount, secret: string): Promise<boolean> {
        this.secret = secret;
        this.receiver = await this._sign(receiver);
        return await this.verify();
    }

    async verify(): Promise<boolean> {
        return (
            !!this.sender && !!this.receiver && (await this._verify(this.sender)) && (await this._verify(this.receiver))
        );
    }
}

let provider: CryptoProvider;

export function setProvider(p: CryptoProvider) {
    provider = p;
}

export function getProvider() {
    return provider;
}
