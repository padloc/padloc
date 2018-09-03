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
    hash: "SHA-256";
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
    hash: "SHA-256";
}

export interface RSASigningParams {
    algorithm: "RSA-PSS";
    hash: "SHA-256";
    saltLength: 128;
}

export interface HMACParams {
    algorithm: "HMAC";
    hash: "SHA-256";
    keySize: 256;
}

export interface HashParams {
    algorithm: "SHA-1" | "SHA-256";
}

export interface CryptoProvider {
    randomBytes(n: number): Promise<Base64String>;

    hash(input: Base64String, params: HashParams): Promise<Base64String>;

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
        params.iterations > PBKDF2_ITER_MAX ||
        ![192, 256, 512].includes(params.keySize) ||
        !["SHA-256", "SHA-512"].includes(params.hash)
    ) {
        throw new Err(ErrorCode.INVALID_KEY_PARAMS);
    }

    return params as PBKDF2Params;
}

export function defaultHMACParams(): HMACParams {
    return {
        algorithm: "HMAC",
        hash: "SHA-256",
        keySize: 256
    };
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
        hash: "SHA-256"
    };
}

export function defaultRSAKeyParams(): RSAKeyParams {
    return {
        algorithm: "RSA",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-256"
    };
}

export function defaultRSASigningParams(): RSASigningParams {
    return {
        algorithm: "RSA-PSS",
        hash: "SHA-256",
        saltLength: 128
    };
}

export abstract class Container implements Serializable {
    encryptedData: Base64String = "";
    constructor(public encryptionParams: AESEncryptionParams = defaultEncryptionParams()) {}

    protected abstract _getKey(): Promise<AESKey>;

    async set(data: Serializable) {
        this.encryptionParams.iv = await provider.randomBytes(16);
        // TODO: useful additional authenticated data?
        this.encryptionParams.additionalData = await provider.randomBytes(16);

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
            this.keyParams.salt = await provider.randomBytes(16);
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

export interface Accessor {
    id: string;
    publicKey: RSAPublicKey;
    encryptedKey: Base64String;
}

export interface Access {
    id: string;
    privateKey: RSAPrivateKey;
}

export class SharedContainer extends Container {
    private _accessors = new Map<string, Accessor>();
    private _key: AESKey = "";
    private _access: Access | null = null;

    constructor(
        public encryptionParams: AESEncryptionParams = defaultEncryptionParams(),
        public keyParams: RSAEncryptionParams = defaultKeyWrapParams()
    ) {
        super(encryptionParams);
    }

    access({ id, privateKey }: Access) {
        this._access = { id, privateKey };
    }

    hasAccess({ id }: { id: string }) {
        return !!this._accessors.get(id);
    }

    async setAccessors(accessors: Accessor[]) {
        this._accessors.clear();
        this._key = await provider.generateKey({
            algorithm: "AES",
            keySize: this.encryptionParams.keySize
        } as AESKeyParams);

        await Promise.all(
            accessors.map(async a => {
                a.encryptedKey = await provider.encrypt(a.publicKey, await this._getKey(), this.keyParams);
                this._accessors.set(a.id, a);
            })
        );
    }

    async serialize() {
        const raw = await super.serialize();
        (raw as SharedRawContainer).keyParams = this.keyParams;
        (raw as SharedRawContainer).accessors = Array.from(this._accessors.values());
        return raw;
    }

    async deserialize(raw: SharedRawContainer) {
        await super.deserialize(raw);
        this.keyParams = raw.keyParams;
        this._accessors.clear();
        for (const a of raw.accessors) {
            this._accessors.set(a.id, a);
        }
        this._key = "";
        return this;
    }

    protected async _getKey() {
        if (!this._access) {
            throw new Err(ErrorCode.MISSING_ACCESS);
        }
        if (!this._key) {
            const accessor = this._accessors.get(this._access.id);
            if (!accessor || !accessor.encryptedKey) {
                throw new Err(ErrorCode.MISSING_ACCESS);
            }
            this._key = await provider.decrypt(this._access.privateKey, accessor.encryptedKey, this.keyParams);
        }
        return this._key;
    }
}

let provider: CryptoProvider;

export function setProvider(p: CryptoProvider) {
    provider = p;
}

export function getProvider() {
    return provider;
}
