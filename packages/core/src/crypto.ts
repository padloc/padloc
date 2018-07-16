import { Base64String, stringToBase64, base64ToString, marshal, unmarshal, Marshalable } from "./encoding";
import { Storable, Storage } from "./storage";
import { Err, ErrorCode } from "./error";

// Minimum number of pbkdf2 iterations
const PBKDF2_ITER_MIN = 1e4;
// Default number of pbkdf2 iterations
const PBKDF2_ITER_DEFAULT = 5e4;
// Maximum number of pbkdf2 iterations
const PBKDF2_ITER_MAX = 1e7;

export type CipherText = Base64String;
export type PlainText = Base64String;

// Available Symmetric Key Sizes
export type KeySize = 128 | 192 | 256;
// Available authentication tag sizes
export type TagSize = 64 | 96 | 128;

export type SymmetricKey = Base64String;
export type PublicKey = Base64String;
export type PrivateKey = Base64String;

export type Key = SymmetricKey | PublicKey | PrivateKey;

export type CipherType = "symmetric" | "asymmetric";

export interface BaseCipherParams {
    cipherType: CipherType;
    algorithm: string;
}

export interface SymmetricCipherParams extends BaseCipherParams {
    cipherType: "symmetric";
    algorithm: "AES-GCM" | "AES-CCM";
    tagSize: TagSize;
    keySize: KeySize;
    iv?: Base64String;
    additionalData?: Base64String;
}

export interface AsymmetricCipherParams extends BaseCipherParams {
    cipherType: "asymmetric";
    algorithm: "RSA-OAEP";
}

export type CipherParams = SymmetricCipherParams | AsymmetricCipherParams;

export interface KeyDerivationParams {
    algorithm: "PBKDF2";
    hash: "SHA-256" | "SHA-512";
    keySize: KeySize;
    iterations: number;
    salt?: string;
}

export interface WrapKeyParams {
    algorithm: "RSA-OAEP";
}

export interface CryptoProvider {
    isAvailable(): boolean;
    randomBytes(n: number): Base64String;
    randomKey(n: KeySize): Promise<SymmetricKey>;
    deriveKey(password: string, params: KeyDerivationParams): Promise<SymmetricKey>;
    encrypt(key: Key, data: PlainText, params: CipherParams): Promise<CipherText>;
    decrypt(key: Key, data: Base64String, params: CipherParams): Promise<PlainText>;
    generateKeyPair(): Promise<{ privateKey: PrivateKey; publicKey: PublicKey }>;
}

export function validateCipherParams(params: any): CipherParams {
    switch (params.cipherType) {
        case "symmetric":
            if (
                !["AES-GCM", "AES-CCM"].includes(params.algorithm) ||
                // TODO: validate base 64
                !params.iv ||
                typeof params.iv !== "string" ||
                !params.additionalData ||
                typeof params.additionalData !== "string" ||
                !params.tagSize ||
                ![64, 96, 128].includes(params.tagSize)
            ) {
                throw new Err(ErrorCode.INVALID_CIPHER_PARAMS);
            }
            break;
        case "asymmetric":
            if (params.algorithm !== "RSA-OAEP") {
                throw new Err(ErrorCode.INVALID_CIPHER_PARAMS);
            }
            break;
        default:
            throw new Err(ErrorCode.INVALID_CIPHER_PARAMS);
    }

    return params as CipherParams;
}

export function defaultKeyDerivationParams(): KeyDerivationParams {
    return {
        algorithm: "PBKDF2",
        hash: "SHA-256",
        keySize: 256,
        iterations: PBKDF2_ITER_DEFAULT
    };
}

export function validateKeyDerivationParams(params: any): KeyDerivationParams {
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
        throw new Err(ErrorCode.INVALID_CIPHER_PARAMS);
    }

    return params as KeyDerivationParams;
}

export type EncryptionScheme = "simple" | "PBES2" | "shared";

export interface BaseRawContainer {
    version: 2;
    scheme: EncryptionScheme;
    id: string;
    ep: SymmetricCipherParams;
    ct: CipherText;
}

export interface SimpleRawContainer extends BaseRawContainer {
    scheme: "simple";
}

export interface PasswordBasedRawContainer extends BaseRawContainer {
    scheme: "PBES2";
    kp: KeyDerivationParams;
}

export interface SharedRawContainer extends BaseRawContainer {
    scheme: "shared";
    wp: AsymmetricCipherParams;
    accessors: Accessor[];
}

export type RawContainer = SimpleRawContainer | PasswordBasedRawContainer | SharedRawContainer;

export function validateRawContainer(raw: any): RawContainer {
    if (raw.version !== 2 || !raw.ep || !raw.ct) {
        throw new Err(ErrorCode.INVALID_CONTAINER_DATA);
    }

    validateCipherParams(raw.ep);

    switch (raw.scheme) {
        case "simple":
            break;
        case "PBES2":
            validateKeyDerivationParams(raw.kp);
            break;
        case "shared":
            validateCipherParams(raw.wp);
            break;
        default:
            throw new Err(ErrorCode.INVALID_CONTAINER_DATA);
    }

    return raw as RawContainer;
}

export function defaultEncryptionParams(): SymmetricCipherParams {
    return {
        cipherType: "symmetric",
        algorithm: "AES-GCM",
        tagSize: 64,
        keySize: 256
    };
}

export function defaultWrappingParams(): AsymmetricCipherParams {
    return {
        cipherType: "asymmetric",
        algorithm: "RSA-OAEP"
    };
}

export interface Permissions {
    read: boolean;
    write: boolean;
    manage: boolean;
}

export interface Accessor {
    id: string;
    email: string;
    publicKey: PublicKey;
    permissions: Permissions;
    encryptedKey?: CipherText;
}

export interface Access {
    accessorID: string;
    privateKey: PrivateKey;
}

export class Container implements Storage, Storable {
    id: string = "";
    kind: string = "";
    cipherText?: CipherText;
    key?: SymmetricKey;
    password?: string;
    access?: Access;
    accessors: Accessor[] = [];

    constructor(
        public scheme: EncryptionScheme = "simple",
        public encryptionParams: SymmetricCipherParams = defaultEncryptionParams(),
        public keyDerivationParams: KeyDerivationParams = defaultKeyDerivationParams(),
        public wrappingParams: AsymmetricCipherParams = defaultWrappingParams()
    ) {}

    get storageKey() {
        return this.id;
    }

    get storageKind() {
        return this.kind;
    }

    async getKey(): Promise<SymmetricKey> {
        switch (this.scheme) {
            case "simple":
                if (!this.key) {
                    this.key = await provider.randomKey(this.encryptionParams.keySize);
                }
                return this.key;
            case "PBES2":
                if (!this.keyDerivationParams.salt) {
                    this.keyDerivationParams.salt = provider.randomBytes(16);
                }
                if (!this.password) {
                    throw new Err(ErrorCode.DECRYPTION_FAILED, "No password provided");
                }
                return await provider.deriveKey(this.password, this.keyDerivationParams);
            case "shared":
                if (!this.access) {
                    throw new Err(ErrorCode.DECRYPTION_FAILED, "No access parameters provided");
                }
                if (this.accessors.length) {
                    const accessor = this.accessors.find(a => a.id === this.access!.accessorID);
                    if (!accessor || !accessor.encryptedKey) {
                        throw new Err(ErrorCode.DECRYPTION_FAILED, "Current accessor does not have access.");
                    }
                    return provider.decrypt(this.access.privateKey, accessor.encryptedKey, this.wrappingParams);
                } else {
                    return await provider.randomKey(this.encryptionParams.keySize);
                }
        }
    }

    async set(data: Storable) {
        this.id = data.storageKey;
        this.kind = data.storageKind;
        this.encryptionParams.iv = provider.randomBytes(16);
        // TODO: useful additional authenticated data?
        this.encryptionParams.additionalData = provider.randomBytes(16);

        const key = await this.getKey();
        const pt = stringToBase64(marshal(await data.serialize()));
        this.cipherText = await provider.encrypt(key, pt, this.encryptionParams);
    }

    async get(data: Storable) {
        if (!this.cipherText) {
            throw new Err(ErrorCode.DECRYPTION_FAILED, "Container is empty");
        }
        const key = await this.getKey();
        const pt = base64ToString(await provider.decrypt(key, this.cipherText, this.encryptionParams));
        await data.deserialize(unmarshal(pt));
    }

    async delete() {
        await this.clear();
    }

    async serialize() {
        const raw = {
            id: this.id,
            kind: this.kind,
            version: 2,
            scheme: this.scheme,
            ep: this.encryptionParams,
            ct: this.cipherText
        } as RawContainer;

        if (this.scheme === "PBES2") {
            (raw as PasswordBasedRawContainer).kp = this.keyDerivationParams;
        }

        if (this.scheme === "shared") {
            (raw as SharedRawContainer).wp = this.wrappingParams;
            (raw as SharedRawContainer).accessors = this.accessors;
        }

        return raw as Marshalable;
    }

    async deserialize(raw: any) {
        raw = validateRawContainer(raw);
        this.scheme = raw.scheme;
        this.cipherText = raw.ct;
        this.encryptionParams = raw.ep;
        this.id = raw.id;
        this.kind = raw.kind;

        if (raw.scheme === "PBES2") {
            this.keyDerivationParams = raw.kp;
        }

        if (raw.scheme === "shared") {
            this.wrappingParams = raw.wp;
            this.accessors = raw.accessors;
        }
        return this;
    }

    async addAccessor(accessor: Accessor) {
        if (this.scheme !== "shared") {
            throw new Err(ErrorCode.NOT_SUPPORTED, "Cannot add accessor in this scheme");
        }

        const key = await this.getKey();
        accessor.encryptedKey = await provider.encrypt(accessor.publicKey, key, this.wrappingParams);

        // const existing = this.accessors.find(a => a.id === accessor.id);
        // if (existing) {
        //     Object.assign(existing, accessor);
        // } else {
        this.accessors.push(accessor);
        // }
    }

    async clear() {
        delete this.password;
        delete this.access;
        delete this.key;
        delete this.cipherText;
        delete this.id;
        delete this.kind;
        this.accessors = [];
    }
}

let provider: CryptoProvider;

export function setProvider(p: CryptoProvider) {
    provider = p;
}

export function getProvider() {
    return provider;
}
