import { Base64String } from "./encoding";
import { Err, ErrorCode } from "./error";

// Default number of pbkdf2 iterations
export const PBKDF2_ITER_DEFAULT = 5e4;
// Maximum number of pbkdf2 iterations
export const PBKDF2_ITER_MAX = 1e7;

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
    saltLength: 32;
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

export function defaultPBKDF2Params(): PBKDF2Params {
    return {
        algorithm: "PBKDF2",
        hash: "SHA-256",
        keySize: 256,
        iterations: PBKDF2_ITER_DEFAULT,
        salt: ""
    };
}

export function defaultHMACParams(): HMACParams {
    return {
        algorithm: "HMAC",
        hash: "SHA-256",
        keySize: 256
    };
}

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
        saltLength: 32
    };
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

let provider: CryptoProvider;

export function setProvider(p: CryptoProvider) {
    provider = p;
}

export function getProvider() {
    return provider;
}
