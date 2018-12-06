import { byteLength } from "./base64";
import { Base64String, bytesToBase64, base64ToBytes, stringToBytes } from "./encoding";
import {
    CryptoProvider,
    PBKDF2Params,
    AESKey,
    RSAPublicKey,
    RSAPrivateKey,
    HMACKey,
    SymmetricKey,
    AESKeyParams,
    RSAKeyParams,
    HMACParams,
    AESEncryptionParams,
    RSAEncryptionParams,
    HashParams,
    RSASigningParams
} from "./crypto";
import { Err, ErrorCode } from "./error";

function concat(...arrs: Uint8Array[]): Uint8Array {
    const length = arrs.reduce((len, arr) => len + arr.length, 0);
    const res = new Uint8Array(length);
    let offset = 0;
    for (const arr of arrs) {
        res.set(arr, offset);
        offset += arr.length;
    }
    return res;
}

export class StubCryptoProvider implements CryptoProvider {
    async randomBytes(n: number): Promise<Base64String> {
        const bytes = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            bytes[i] = Math.random() * 255;
        }
        return bytesToBase64(bytes);
    }

    async hash(input: Base64String, _params: HashParams): Promise<Base64String> {
        return bytesToBase64(base64ToBytes(input).slice(0, 32));
    }

    generateKey(params: AESKeyParams): Promise<AESKey>;
    generateKey(params: RSAKeyParams): Promise<{ privateKey: RSAPrivateKey; publicKey: RSAPublicKey }>;
    generateKey(params: HMACParams): Promise<HMACKey>;
    async generateKey(params: AESKeyParams | RSAKeyParams | HMACParams) {
        switch (params.algorithm) {
            case "AES":
            case "HMAC":
                return this.randomBytes(params.keySize / 8);
            case "RSA":
                const key = await this.randomBytes(32);
                return {
                    publicKey: key,
                    privateKey: key
                };
        }
    }

    async deriveKey(password: string, params: PBKDF2Params): Promise<SymmetricKey> {
        const bytes = new Uint8Array(params.keySize);
        bytes.set(concat(stringToBytes(password), stringToBytes(params.salt)));
        return bytesToBase64(bytes.slice(0, 32));
    }

    encrypt(key: AESKey, data: Base64String, params: AESEncryptionParams): Promise<Base64String>;
    encrypt(publicKey: RSAPublicKey, data: Base64String, params: RSAEncryptionParams): Promise<Base64String>;
    async encrypt(
        key: AESKey | RSAPublicKey,
        data: Base64String,
        params: AESEncryptionParams | RSAEncryptionParams
    ): Promise<Base64String> {
        switch (params.algorithm) {
            case "AES-GCM":
                return bytesToBase64(
                    concat(
                        base64ToBytes(key),
                        base64ToBytes(params.iv),
                        base64ToBytes(params.additionalData),
                        base64ToBytes(data)
                    )
                );
            case "RSA-OAEP":
                return bytesToBase64(concat(base64ToBytes(key), base64ToBytes(data)));
            default:
                throw new Err(ErrorCode.NOT_SUPPORTED);
        }
    }

    decrypt(key: AESKey, data: Base64String, params: AESEncryptionParams): Promise<Base64String>;
    decrypt(publicKey: RSAPublicKey, data: Base64String, params: RSAEncryptionParams): Promise<Base64String>;
    async decrypt(
        key: AESKey | RSAPublicKey,
        data: Base64String,
        params: AESEncryptionParams | RSAEncryptionParams
    ): Promise<Base64String> {
        if (params.algorithm.startsWith("AES")) {
            params = params as AESEncryptionParams;
            const keyLength = byteLength(key);
            const ivLength = byteLength(params.iv);
            const adataLength = byteLength(params.additionalData);
            const dataBytes = base64ToBytes(data);
            const extractedKey = bytesToBase64(dataBytes.slice(0, keyLength));
            const iv = bytesToBase64(dataBytes.slice(keyLength, keyLength + ivLength));
            const adata = bytesToBase64(dataBytes.slice(keyLength + ivLength, keyLength + ivLength + adataLength));

            if (key !== extractedKey || iv !== params.iv || adata !== params.additionalData) {
                throw new Err(ErrorCode.DECRYPTION_FAILED);
            }
            return bytesToBase64(dataBytes.slice(keyLength + adataLength + ivLength));
        } else {
            const keyLength = byteLength(key);
            const dataBytes = base64ToBytes(data);
            const extractedKey = bytesToBase64(dataBytes.slice(0, keyLength));

            if (key !== extractedKey) {
                throw new Err(ErrorCode.DECRYPTION_FAILED);
            }
            return bytesToBase64(dataBytes.slice(keyLength));
        }
    }

    async fingerprint(key: RSAPublicKey): Promise<Base64String> {
        return key;
    }

    async sign(key: HMACKey, data: Base64String, params: HMACParams): Promise<Base64String>;
    async sign(key: RSAPrivateKey, data: Base64String, params: RSASigningParams): Promise<Base64String>;
    async sign(
        key: HMACKey | RSAPrivateKey,
        data: Base64String,
        _params: HMACParams | RSASigningParams
    ): Promise<Base64String> {
        return bytesToBase64(concat(base64ToBytes(key), base64ToBytes(data)));
    }

    async verify(key: HMACKey, signature: Base64String, data: Base64String, params: HMACParams): Promise<boolean>;
    async verify(
        key: RSAPrivateKey,
        signature: Base64String,
        data: Base64String,
        params: RSASigningParams
    ): Promise<boolean>;
    async verify(
        key: HMACKey | RSAPrivateKey,
        signature: Base64String,
        data: Base64String,
        _params: HMACParams | RSASigningParams
    ): Promise<boolean> {
        const keyLength = byteLength(key);
        const sigBytes = base64ToBytes(signature);
        const extractedKey = bytesToBase64(sigBytes.slice(0, keyLength));
        const extractedData = bytesToBase64(sigBytes.slice(keyLength));
        return key === extractedKey && data === extractedData;
    }
}
