import {
    Base64String,
    bytesToBase64,
    base64ToBytes,
    stringToBytes,
    stringToBase64,
    base64ToString,
    marshal,
    unmarshal,
    Serializable
} from "./encoding";
import { sjcl } from "../app/vendor/sjcl";
import { JWK as Key, PrivateKey, PublicKey, SymmetricKey, Algorithm as JoseAlgorithm } from "./jose";

export { Key, PrivateKey, PublicKey, SymmetricKey };

// For backward compatibilty, AES in CCM mode needs to be supported,
// even though it is not defined in https://tools.ietf.org/html/rfc7518#section-6.4
export type Algorithm = JoseAlgorithm | "A256CCM";

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

export interface CryptoProvider {
    isAvailable(): boolean;
    randomBytes(n: number): Base64String;
    randomKey(n: KeySize): Promise<SymmetricKey>;
    deriveKey(password: string, params: KeyDerivationParams): Promise<SymmetricKey>;
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

export function defaultKeyDerivationParams(): KeyDerivationParams {
    return {
        algorithm: "PBKDF2",
        hash: "SHA-256",
        keySize: 256,
        iterations: PBKDF2_ITER_DEFAULT
    };
}

export function validateKeyParams(params: KeyDerivationParams): boolean {
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

    async deriveKey(password: string, params: KeyDerivationParams): Promise<SymmetricKey> {
        if (!validateKeyParams(params)) {
            throw new CryptoError("invalid_key_params");
        }

        const k = sjcl.misc.pbkdf2(utf8ToBits(password), base64ToBits(params.salt!), params.iterations, params.keySize);
        return {
            kty: "oct",
            alg: "A256GCM",
            k: bitsToBase64(k)
        };
    },

    async randomKey(n = 256) {
        return {
            kty: "oct",
            alg: "A256GCM",
            k: sjcl.randomBytes(n / 8)
        };
    },

    async decrypt(key: Key, ct: CipherText, params: CipherParams): Promise<PlainText> {
        if (params.cipherType !== "symmetric" || params.algorithm !== "AES-CCM") {
            throw new CryptoError("invalid_cipher_params");
        }

        // Only AES and CCM are supported
        const algorithm = "aes";
        const mode = "ccm";
        const k = (key as SymmetricKey).k;

        try {
            const cipher = new sjcl.cipher[algorithm](base64ToBits(k));
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
        const k = (key as SymmetricKey).k;

        try {
            const cipher = new sjcl.cipher[algorithm](base64ToBits(k));
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

    const k = await webCrypto.importKey("jwk", key as JsonWebKey, { name: params.algorithm, hash: "SHA-1" }, false, [
        action
    ]);

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
        const key = await webCrypto.generateKey({ name: "AES-GCM", length: size }, true, ["encrypt", "decrypt"]);
        const jwk = await webCrypto.exportKey("jwk", key);
        return jwk as SymmetricKey;
    },

    async deriveKey(password: string, params: KeyDerivationParams): Promise<SymmetricKey> {
        if (!validateKeyParams(params)) {
            throw new CryptoError("invalid_key_params");
        }

        const baseKey = await webCrypto.importKey("raw", stringToBytes(password!), params.algorithm, false, [
            "deriveKey"
        ]);

        const key = await webCrypto.deriveKey(
            {
                name: "PBKDF2",
                salt: base64ToBytes(params.salt!),
                iterations: params.iterations,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: params.keySize }, // Key we want
            true,
            ["encrypt", "decrypt"]
        );

        const k = await webCrypto.exportKey("jwk", key);

        return k as SymmetricKey;
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

        return {
            privateKey: (await crypto.subtle.exportKey("jwk", keyPair.privateKey)) as PrivateKey,
            publicKey: (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as PublicKey
        };
    }
};

export const provider = WebCryptoProvider;

interface RawContainerV2 {
    version: 2;
    ccp: SymmetricCipherParams;
    ct: CipherText;
    wcp?: AsymmetricCipherParams;
    kdp?: KeyDerivationParams;
    ek?: {
        [id: string]: CipherText;
    };
}

type RawContainer = RawContainerV2;

export interface Participant {
    id: string;
    publicKey: PublicKey;
    privateKey?: PrivateKey;
    encryptedKey?: CipherText;
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

export class Container<T extends Serializable> implements Serializable {
    constructor(
        public data: T,
        public currentParticipant?: Participant,
        public participants: Participant[] = [],
        public encryptionParams: SymmetricCipherParams = defaultEncryptionParams(),
        public wrappingParams: AsymmetricCipherParams = defaultWrappingParams()
    ) {}

    private _key: SymmetricKey;

    async getKey(): Promise<SymmetricKey> {
        if (!this._key) {
            this._key = await provider.randomKey(this.encryptionParams.keySize);
        }

        return this._key;
    }

    async addParticipant(p: Participant) {
        const key = await this.getKey();
        const rawKey = key.k;
        p.encryptedKey = await provider.encrypt(p.publicKey, rawKey, this.wrappingParams);
        this.participants.push(p);
    }

    async serialize(): Promise<RawContainer> {
        this.encryptionParams.iv = provider.randomBytes(16);
        // TODO: useful additional authenticated data?
        this.encryptionParams.additionalData = provider.randomBytes(16);

        const key = await this.getKey();
        const pt = stringToBase64(marshal(await this.data.serialize()));
        const ct = await provider.encrypt(key, pt, this.encryptionParams);
        const raw: RawContainer = {
            version: 2,
            ccp: this.encryptionParams,
            ct: ct
        };

        if (this.participants.length) {
            raw.wcp = this.wrappingParams;
            raw.ek = {};
            for (const p of this.participants) {
                raw.ek[p.id] = p.encryptedKey!;
            }
        }

        return raw;
    }

    async deserialize(raw: RawContainer): Promise<void> {
        this.encryptionParams = raw.ccp;
        this.wrappingParams = raw.wcp || defaultWrappingParams();
        const currPart = this.currentParticipant;

        if (currPart && raw.ek) {
            const encryptedKey = raw.ek[currPart.id];

            this._key = {
                kty: "oct",
                alg: "A256GCM",
                key_ops: ["decrypt"],
                k: await provider.decrypt(currPart.privateKey!, encryptedKey, this.wrappingParams)
            };
        }

        const key = await this.getKey();

        const pt = base64ToString(await provider.decrypt(key, raw.ct, this.encryptionParams));
        await this.data.deserialize(unmarshal(pt));
    }
}

export class PasswordBasedContainer<T extends Serializable> extends Container<T> {
    password: string;

    constructor(
        data: T,
        params?: SymmetricCipherParams,
        public keyDerivationParams: KeyDerivationParams = defaultKeyDerivationParams()
    ) {
        super(data, undefined, undefined, params, undefined);
    }

    private async _deriveKey(): Promise<SymmetricKey> {
        if (!this.keyDerivationParams.salt) {
            this.keyDerivationParams.salt = provider.randomBytes(16);
        }
        return await provider.deriveKey(this.password, this.keyDerivationParams);
    }

    async getKey() {
        return this._deriveKey();
    }

    async serialize() {
        const raw = await super.serialize();
        raw.kdp = this.keyDerivationParams;
        return raw;
    }

    async deserialize(raw: RawContainer) {
        this.keyDerivationParams = raw.kdp!;
        return super.deserialize(raw);
    }
}
