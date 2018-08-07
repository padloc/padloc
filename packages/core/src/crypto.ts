import { Base64String, stringToBase64, base64ToString, marshal, unmarshal, Marshalable, DateString } from "./encoding";
import { Storable, Storage } from "./storage";
import { Err, ErrorCode } from "./error";
import { PublicAccount } from "./auth";

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
    fingerprint(key: PublicKey): Promise<Base64String>;
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
    encryptionParams: SymmetricCipherParams;
    cipherText: CipherText;
    meta: any;
}

export interface SimpleRawContainer extends BaseRawContainer {
    scheme: "simple";
}

export interface PasswordBasedRawContainer extends BaseRawContainer {
    scheme: "PBES2";
    keyDerivationParams: KeyDerivationParams;
}

export interface SharedRawContainer extends BaseRawContainer {
    scheme: "shared";
    wrappingParams: AsymmetricCipherParams;
    accessors: Accessor[];
}

export type RawContainer = SimpleRawContainer | PasswordBasedRawContainer | SharedRawContainer;

export function validateRawContainer(raw: any): RawContainer {
    if (raw.version !== 2 || !raw.encryptionParams || !raw.cipherText) {
        throw new Err(ErrorCode.INVALID_CONTAINER_DATA);
    }

    validateCipherParams(raw.encryptionParams);

    switch (raw.scheme) {
        case "simple":
            break;
        case "PBES2":
            validateKeyDerivationParams(raw.keyDerivationParams);
            break;
        case "shared":
            validateCipherParams(raw.wrappingParams);
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

export type AccessorStatus = "invited" | "active" | "left" | "removed" | "requested" | "rejected" | "none";

export interface Accessor extends PublicAccount {
    encryptedKey: CipherText;
    permissions: Permissions;
    addedBy: string;
    updated: DateString;
    status: AccessorStatus;
}

export interface Access extends PublicAccount {
    privateKey: PrivateKey;
}

export class Container implements Storage, Storable {
    id: string = "";
    kind: string = "";
    cipherText?: CipherText;
    meta: any = {};
    key?: SymmetricKey;
    password?: string;
    access: Access | null = null;
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
                    const accessor = this.accessors.find(a => a.email === this.access!.email);
                    if (!accessor || !accessor.encryptedKey) {
                        throw new Err(ErrorCode.MISSING_ACCESS, "Current accessor does not have access.");
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
            // TODO: rename to "encryptionParams", "cipterText" etc.
            encryptionParams: this.encryptionParams,
            cipherText: this.cipherText,
            meta: this.meta
        } as RawContainer;

        if (this.scheme === "PBES2") {
            (raw as PasswordBasedRawContainer).keyDerivationParams = this.keyDerivationParams;
        }

        if (this.scheme === "shared") {
            (raw as SharedRawContainer).wrappingParams = this.wrappingParams;
            (raw as SharedRawContainer).accessors = this.accessors;
        }

        return raw as Marshalable;
    }

    mergeAccessors(accessors: Accessor[]) {
        const merged = new Map<string, Accessor>(this.accessors.map(a => [a.email, a] as [string, Accessor]));
        const changed: Accessor[] = [];
        const added: Accessor[] = [];

        for (const acc of accessors) {
            const existing = merged.get(acc.email);
            if (!existing) {
                merged.set(acc.email, acc);
                added.push(acc);
            } else if (!existing.updated || new Date(existing.updated) < new Date(acc.updated)) {
                merged.set(acc.email, acc);
                changed.push(acc);
            }
        }

        this.accessors = Array.from(merged.values());
        return { changed, added };
    }

    async deserialize(raw: any) {
        raw = validateRawContainer(raw);
        this.scheme = raw.scheme;
        this.cipherText = raw.cipherText;
        this.encryptionParams = raw.encryptionParams;
        this.id = raw.id;
        this.kind = raw.kind;
        this.meta = raw.meta || {};

        if (raw.scheme === "PBES2") {
            this.keyDerivationParams = raw.keyDerivationParams;
        }

        if (raw.scheme === "shared") {
            this.wrappingParams = raw.wrappingParams;
            this.mergeAccessors(raw.accessors);
        }
        return this;
    }

    async getEncryptedKey(publicKey: PublicKey) {
        return provider.encrypt(publicKey, await this.getKey(), this.wrappingParams);
    }

    async setAccessor(accessor: Accessor) {
        if (this.scheme !== "shared") {
            throw new Err(ErrorCode.NOT_SUPPORTED, "Cannot add accessor in this scheme");
        }

        accessor.updated = new Date().toISOString();
        accessor.encryptedKey = await this.getEncryptedKey(accessor.publicKey);

        const existing = this.accessors.find(a => a.email === accessor.email);
        if (existing) {
            Object.assign(existing, accessor);
        } else {
            this.accessors.push(accessor);
        }
    }

    async removeAccessor(acc: string) {
        const removedAccessor = this.accessors.find(a => a.email === acc);

        if (!removedAccessor) {
            throw "Accessor does not exist on this store";
        }

        const key = await provider.randomKey(this.encryptionParams.keySize);
        await Promise.all(
            this.accessors.map(async a => {
                a.encryptedKey = await provider.encrypt(a.publicKey, key, this.wrappingParams);
                a.updated = new Date().toISOString();
            })
        );

        removedAccessor.encryptedKey = "";
        removedAccessor.status = "removed";
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
