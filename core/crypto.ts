import {
    Base64String,
    bytesToBase64,
    base64ToBytes,
    stringToBytes,
    stringToBase64,
    base64ToString,
    marshal,
    unmarshal
} from "./encoding";
import { sjcl } from "../app/vendor/sjcl";
import { Storable, Storage } from "./storage";

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

export interface KeyDerivationparams {
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
    deriveKey(password: string, params: KeyDerivationparams): Promise<SymmetricKey>;
    encrypt(key: Key, data: PlainText, params: CipherParams): Promise<CipherText>;
    decrypt(key: Key, data: Base64String, params: CipherParams): Promise<PlainText>;
    generateKeyPair(): Promise<{ privateKey: PrivateKey; publicKey: PublicKey }>;
}

export class CryptoError {
    constructor(
        public code:
            | "invalid_container_data"
            | "unsupported_container_version"
            | "invalid_cipher_params"
            | "invalid_key_params"
            | "decryption_failed"
            | "encryption_failed"
            | "not_supported"
    ) {}
}

export function validateCipherParams(params: CipherParams) {
    switch (params.cipherType) {
        case "symmetric":
            return (
                ["AES-GCM", "AES-CCM"].includes(params.algorithm) &&
                // TODO: validate base 64
                !!params.iv &&
                typeof params.iv === "string" &&
                !!params.additionalData &&
                typeof params.additionalData === "string" &&
                params.tagSize &&
                [64, 96, 128].includes(params.tagSize)
            );
            break;
        case "asymmetric":
            return params.algorithm === "RSA-OAEP";
            break;
        default:
            return false;
    }
}

export function defaultKeyDerivationParams(): KeyDerivationparams {
    return {
        algorithm: "PBKDF2",
        hash: "SHA-256",
        keySize: 256,
        iterations: PBKDF2_ITER_DEFAULT
    };
}

export function validateDeriveKeyParams(params: KeyDerivationparams): boolean {
    return (
        params.algorithm === "PBKDF2" &&
        !!params.salt &&
        typeof params.salt === "string" &&
        !!params.iterations &&
        params.iterations >= PBKDF2_ITER_MIN &&
        params.iterations <= PBKDF2_ITER_MAX &&
        [192, 256, 512].includes(params.keySize) &&
        ["SHA-256", "SHA-512"].includes(params.hash)
    );
}

// Shorthands for codec functions
const bitsToBase64: (bits: any) => Base64String = sjcl.codec.base64url.fromBits;
const base64ToBits = (base64: Base64String): any => {
    try {
        return sjcl.codec.base64url.toBits(base64);
    } catch {
        return sjcl.codec.base64.toBits(base64);
    }
};
const utf8ToBits = sjcl.codec.utf8String.toBits;

export var SJCLProvider: CryptoProvider = {
    isAvailable() {
        return true;
    },

    randomBytes(bytes: number): Base64String {
        if (bytes % 4) {
            throw "Number of bytes must be dividable by 4";
        }
        return bitsToBase64(sjcl.random.randomWords(bytes / 4, 0));
    },

    async deriveKey(password: string, params: KeyDerivationparams): Promise<SymmetricKey> {
        if (!validateDeriveKeyParams(params)) {
            throw new CryptoError("invalid_key_params");
        }

        const k = sjcl.misc.pbkdf2(utf8ToBits(password), base64ToBits(params.salt!), params.iterations, params.keySize);
        return bitsToBase64(k);
    },

    async randomKey(n = 256) {
        return sjcl.randomBytes(n / 8);
    },

    async decrypt(key: Key, ct: CipherText, params: CipherParams): Promise<PlainText> {
        if (params.cipherType !== "symmetric" || params.algorithm !== "AES-CCM") {
            throw new CryptoError("invalid_cipher_params");
        }

        // Only AES and CCM are supported
        const algorithm = "aes";
        const mode = "ccm";

        try {
            const cipher = new sjcl.cipher[algorithm](base64ToBits(key));
            const pt = sjcl.mode[mode].decrypt(
                cipher,
                base64ToBits(ct),
                base64ToBits(params.iv!),
                base64ToBits(params.additionalData!),
                params.tagSize
            );
            return bitsToBase64(pt);
        } catch (e) {
            throw new CryptoError("decryption_failed");
        }
    },

    async encrypt(key: Key, pt: PlainText, params: CipherParams): Promise<CipherText> {
        if (params.cipherType !== "symmetric" || params.algorithm !== "AES-CCM") {
            throw new CryptoError("invalid_cipher_params");
        }

        // Only AES and CCM are supported
        const algorithm = "aes";
        const mode = "ccm";

        try {
            const cipher = new sjcl.cipher[algorithm](base64ToBits(key));
            var ct = sjcl.mode[mode].encrypt(
                cipher,
                base64ToBits(pt),
                base64ToBits(params.iv!),
                base64ToBits(params.additionalData!),
                params.tagSize
            );
            return bitsToBase64(ct);
        } catch (e) {
            throw new CryptoError("encryption_failed");
        }
    },

    async generateKeyPair(): Promise<{ privateKey: PrivateKey; publicKey: PublicKey }> {
        throw new CryptoError("not_supported");
    }
};

const webCrypto = window.crypto && window.crypto.subtle;

async function webCryptoGetArgs(key: Key, params: CipherParams, action = "encrypt") {
    if (!validateCipherParams(params)) {
        throw new CryptoError("invalid_cipher_params");
    }

    const keyFormat = params.cipherType === "symmetric" ? "raw" : action === "encrypt" ? "spki" : "pkcs8";
    const k = await webCrypto.importKey(
        keyFormat,
        base64ToBytes(key),
        { name: params.algorithm, hash: "SHA-1" },
        false,
        [action]
    );

    const p = { name: params.algorithm };

    if (params.cipherType === "symmetric") {
        Object.assign(p, {
            iv: base64ToBytes(params.iv!),
            additionalData: base64ToBytes(params.additionalData!),
            tagLength: params.tagSize
        });
    }

    return { p, k };
}

export var WebCryptoProvider: CryptoProvider = {
    isAvailable() {
        return !!webCrypto;
    },

    randomBytes(n: number): Base64String {
        const bytes = window.crypto.getRandomValues(new Uint8Array(n));
        return bytesToBase64(bytes as Uint8Array);
    },

    async randomKey(size = 256) {
        return WebCryptoProvider.randomBytes(size / 8);
    },

    async deriveKey(password: string, params: KeyDerivationparams): Promise<SymmetricKey> {
        if (!validateDeriveKeyParams(params)) {
            throw new CryptoError("invalid_key_params");
        }

        const baseKey = await webCrypto.importKey("raw", stringToBytes(password!), params.algorithm, false, [
            "deriveKey"
        ]);

        const key = await webCrypto.deriveKey(
            {
                name: params.algorithm,
                salt: base64ToBytes(params.salt!),
                iterations: params.iterations,
                hash: params.hash
            },
            baseKey,
            { name: "AES-GCM", length: params.keySize },
            true,
            ["encrypt", "decrypt"]
        );

        const raw = await webCrypto.exportKey("raw", key);

        return bytesToBase64(new Uint8Array(raw));
    },

    async encrypt(key: Key, data: PlainText, params: CipherParams): Promise<CipherText> {
        if (params.algorithm === "AES-CCM") {
            return SJCLProvider.encrypt(key, data, params);
        }

        const { p, k } = await webCryptoGetArgs(key, params, "encrypt");

        const buf = await webCrypto.encrypt(p, k, base64ToBytes(data));

        return bytesToBase64(new Uint8Array(buf));
    },

    async decrypt(key: Key, data: CipherText, params: CipherParams): Promise<string> {
        if (params.algorithm === "AES-CCM") {
            return SJCLProvider.decrypt(key, data, params);
        }

        const { p, k } = await webCryptoGetArgs(key, params, "decrypt");

        const buf = await webCrypto.decrypt(p, k, base64ToBytes(data));

        return bytesToBase64(new Uint8Array(buf));
    },

    async generateKeyPair(): Promise<{ privateKey: PrivateKey; publicKey: PublicKey }> {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-1"
            },
            true,
            ["encrypt", "decrypt"]
        );

        const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);

        return {
            privateKey: bytesToBase64(new Uint8Array(privateKey)),
            publicKey: bytesToBase64(new Uint8Array(publicKey))
        };
    }
};

export const provider = WebCryptoProvider;

export type EncryptionScheme = "simple" | "PBES2" | "shared";

interface BaseRawContainer {
    version: 2;
    scheme: EncryptionScheme;
    id: string;
    ep: SymmetricCipherParams;
    ct: CipherText;
}

interface SimpleRawContainer extends BaseRawContainer {
    scheme: "simple";
}

interface PasswordBasedRawContainer extends BaseRawContainer {
    scheme: "PBES2";
    kp: KeyDerivationparams;
}

interface SharedRawContainer extends BaseRawContainer {
    scheme: "shared";
    wp: AsymmetricCipherParams;
    ek: {
        [id: string]: CipherText;
    };
}

type RawContainer = SimpleRawContainer | PasswordBasedRawContainer | SharedRawContainer;

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

export interface Participant {
    id: string;
    publicKey: PublicKey;
    privateKey?: PrivateKey;
    encryptedKey?: CipherText;
}

export class Container implements Storage, Storable {
    id: string = "";
    cipherText?: CipherText;
    key?: SymmetricKey;
    password?: string;
    user?: Participant;
    private encryptedKeys: { [id: string]: CipherText } = {};

    constructor(
        public scheme: EncryptionScheme = "simple",
        public encryptionParams: SymmetricCipherParams = defaultEncryptionParams(),
        public keyDerivationParams: KeyDerivationparams = defaultKeyDerivationParams(),
        public wrappingParams: AsymmetricCipherParams = defaultWrappingParams()
    ) {}

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
                    throw "no password provided";
                }
                return await provider.deriveKey(this.password, this.keyDerivationParams);
            case "shared":
                if (!this.user || !this.user.privateKey || !this.encryptedKeys) {
                    throw "Cannot derive key";
                }
                if (Object.keys(this.encryptedKeys).length) {
                    const encryptedKey = this.encryptedKeys[this.user.id];
                    return provider.decrypt(this.user.privateKey, encryptedKey, this.wrappingParams);
                } else {
                    return await provider.randomKey(this.encryptionParams.keySize);
                }
        }
    }

    async set(data: Storable) {
        this.encryptionParams.iv = provider.randomBytes(16);
        // TODO: useful additional authenticated data?
        this.encryptionParams.additionalData = provider.randomBytes(16);

        const key = await this.getKey();
        const pt = stringToBase64(marshal(await data.serialize()));
        this.cipherText = await provider.encrypt(key, pt, this.encryptionParams);
    }

    async get(data: Storable) {
        if (!this.cipherText) {
            throw "Nothing to get";
        }
        const key = await this.getKey();
        const pt = base64ToString(await provider.decrypt(key, this.cipherText, this.encryptionParams));
        await data.deserialize(unmarshal(pt));
    }

    async serialize(): Promise<RawContainer> {
        const raw = {
            version: 2,
            scheme: this.scheme,
            id: this.id,
            ep: this.encryptionParams,
            ct: this.cipherText
        } as RawContainer;

        if (this.scheme === "PBES2") {
            (raw as PasswordBasedRawContainer).kp = this.keyDerivationParams;
        }

        if (this.scheme === "shared") {
            (raw as SharedRawContainer).wp = this.wrappingParams;
            (raw as SharedRawContainer).ek = this.encryptedKeys;
        }

        return raw;
    }

    async deserialize(raw: RawContainer) {
        this.id = raw.id;
        this.scheme = raw.scheme;
        this.cipherText = raw.ct;
        this.encryptionParams = raw.ep;

        if (raw.scheme === "PBES2") {
            this.keyDerivationParams = raw.kp;
        }

        if (raw.scheme === "shared") {
            this.wrappingParams = raw.wp;
            this.encryptedKeys = raw.ek;
        }
        return this;
    }

    async addParticipant(p: Participant) {
        if (this.scheme !== "shared") {
            throw "Cannot add participant in this scheme";
        }
        const key = await this.getKey();
        this.encryptedKeys[p.id] = await provider.encrypt(p.publicKey, key, this.wrappingParams);
    }

    async clear() {
        delete this.password;
        delete this.user;
        delete this.key;
        delete this.cipherText;
        this.id = "";
        this.encryptedKeys = {};
    }
}

// export class SimpleContainer extends Container {
//     scheme: "simple";
//     public key: SymmetricKey;
//
//     async getKey(): Promise<SymmetricKey> {}
// }
//
// export class PasswordBasedContainer extends Container {
//     password: string;
//
//     constructor(
//         encryptionParams: SymmetricCipherParams = defaultEncryptionParams(),
//         public keyDerivationParams: KeyDerivationparams = defaultKeyDerivationParams()
//     ) {
//         super(encryptionParams);
//     }
//
//     async getKey() {}
//
//     async serialize(): Promise<PasswordBasedRawContainer> {
//         const raw = (await super.serialize()) as PasswordBasedRawContainer;
//         raw.kp = this.keyDerivationParams;
//         return raw;
//     }
//
//     async deserialize(raw: PasswordBasedRawContainer) {
//         this.keyDerivationParams = raw.kp!;
//         return super.deserialize(raw);
//     }
// }
//
// export class SharedContainer extends Container {
//     user?: Participant;
//     private encryptedKeys: { [id: string]: CipherText } = {};
//
//     constructor(
//         encryptionParams: SymmetricCipherParams,
//         public wrappingParams: AsymmetricCipherParams = defaultWrappingParams()
//     ) {
//         super(encryptionParams);
//     }
//
//     async getKey() {
//         if (!this.user || !this.user.privateKey || !this.encryptedKeys) {
//             throw "Cannot derive key";
//         }
//         const encryptedKey = this.encryptedKeys[this.user.id];
//         return provider.decrypt(this.user.privateKey, encryptedKey, this.wrappingParams);
//     }
//
//     async addParticipant(p: Participant) {
//         const key = await this.getKey();
//         this.encryptedKeys[p.id] = await provider.encrypt(p.publicKey, key, this.wrappingParams);
//     }
//
//     async serialize(): Promise<SharedRawContainer> {
//         const raw = (await super.serialize()) as SharedRawContainer;
//         raw.wp = this.wrappingParams;
//         raw.ek = this.encryptedKeys;
//         return raw;
//     }
//
//     async deserialize(raw: SharedRawContainer) {
//         this.wrappingParams = raw.wp || defaultWrappingParams();
//         this.encryptedKeys = raw.ek!;
//     }
// }
