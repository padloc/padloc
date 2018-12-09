import { Base64String, bytesToBase64, base64ToBytes, stringToBytes } from "@padloc/core/lib/encoding.js";
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
    validatePBKDF2Params,
    validateAESEncryptionParams,
    validateRSAEncryptionParams,
    RSASigningParams
} from "@padloc/core/lib/crypto.js";
import { Err, ErrorCode } from "@padloc/core/lib/error.js";
import SJCLProvider from "@padloc/core/lib/sjcl.js";

const webCrypto = window.crypto && window.crypto.subtle;

export class WebCryptoProvider implements CryptoProvider {
    async randomBytes(n: number): Promise<Base64String> {
        const bytes = window.crypto.getRandomValues(new Uint8Array(n));
        return bytesToBase64(bytes as Uint8Array);
    }

    async hash(input: Base64String, params: HashParams): Promise<Base64String> {
        const bytes = await webCrypto.digest({ name: params.algorithm }, base64ToBytes(input));
        return bytesToBase64(new Uint8Array(bytes));
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
                const keyPair = await webCrypto.generateKey(Object.assign(params, { name: "RSA-OAEP" }), true, [
                    "encrypt",
                    "decrypt"
                ]);

                const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
                const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);

                return {
                    privateKey: bytesToBase64(new Uint8Array(privateKey)),
                    publicKey: bytesToBase64(new Uint8Array(publicKey))
                };
            // case "HMAC":
            //     const key = await webCrypto.generateKey(Object.assign({}, params, { name: params.algorithm }), true, [
            //         "sign",
            //         "verify"
            //     ]);
            //     const raw = await webCrypto.exportKey("raw", key);
            //     return bytesToBase64(new Uint8Array(raw));
        }
    }

    async deriveKey(password: string, params: PBKDF2Params): Promise<SymmetricKey> {
        validatePBKDF2Params(params);

        const baseKey = await webCrypto.importKey("raw", stringToBytes(password), params.algorithm, false, [
            "deriveBits"
        ]);

        const key = await webCrypto.deriveBits(
            {
                name: params.algorithm,
                salt: base64ToBytes(params.salt!),
                iterations: params.iterations,
                hash: params.hash
            },
            baseKey,
            params.keySize
        );

        return bytesToBase64(new Uint8Array(key));
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
            case "AES-CCM":
                return this._encryptAES(key, data, params);
            case "RSA-OAEP":
                return this._encryptRSA(key, data, params);
            default:
                throw new Err(ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }
    }

    decrypt(key: AESKey, data: Base64String, params: AESEncryptionParams): Promise<Base64String>;
    decrypt(publicKey: RSAPublicKey, data: Base64String, params: RSAEncryptionParams): Promise<Base64String>;
    async decrypt(
        key: AESKey | RSAPublicKey,
        data: Base64String,
        params: AESEncryptionParams | RSAEncryptionParams
    ): Promise<Base64String> {
        switch (params.algorithm) {
            case "AES-GCM":
            case "AES-CCM":
                return this._decryptAES(key, data, params);
            case "RSA-OAEP":
                return this._decryptRSA(key, data, params);
            default:
                throw new Err(ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }
    }

    private async _encryptAES(key: AESKey, data: Base64String, params: AESEncryptionParams): Promise<Base64String> {
        validateAESEncryptionParams(params);

        if (params.algorithm === "AES-CCM") {
            return SJCLProvider.encrypt(key, data, params);
        }

        const k = await webCrypto.importKey("raw", base64ToBytes(key), params.algorithm, false, ["encrypt"]);

        try {
            const buf = await webCrypto.encrypt(
                {
                    name: params.algorithm,
                    iv: base64ToBytes(params.iv),
                    additionalData: base64ToBytes(params.additionalData),
                    tagLength: params.tagSize
                },
                k,
                base64ToBytes(data)
            );

            return bytesToBase64(new Uint8Array(buf));
        } catch (e) {
            throw new Err(ErrorCode.ENCRYPTION_FAILED);
        }
    }

    private async _decryptAES(key: AESKey, data: Base64String, params: AESEncryptionParams): Promise<Base64String> {
        validateAESEncryptionParams(params);

        if (params.algorithm === "AES-CCM") {
            return SJCLProvider.decrypt(key, data, params);
        }

        const k = await webCrypto.importKey("raw", base64ToBytes(key), params.algorithm, false, ["decrypt"]);

        try {
            const buf = await webCrypto.decrypt(
                {
                    name: params.algorithm,
                    iv: base64ToBytes(params.iv!),
                    additionalData: base64ToBytes(params.additionalData!),
                    tagLength: params.tagSize
                },
                k,
                base64ToBytes(data)
            );

            return bytesToBase64(new Uint8Array(buf));
        } catch (e) {
            throw new Err(ErrorCode.DECRYPTION_FAILED);
        }
    }

    async _encryptRSA(publicKey: RSAPublicKey, key: AESKey, params: RSAEncryptionParams) {
        validateRSAEncryptionParams(params);
        const p = Object.assign({}, params, { name: params.algorithm });
        const k = await webCrypto.importKey("spki", base64ToBytes(publicKey), p, false, ["encrypt"]);
        try {
            const buf = await webCrypto.encrypt(p, k, base64ToBytes(key));
            return bytesToBase64(new Uint8Array(buf));
        } catch (e) {
            throw new Err(ErrorCode.DECRYPTION_FAILED);
        }
    }

    async _decryptRSA(privateKey: RSAPrivateKey, key: AESKey, params: RSAEncryptionParams) {
        validateRSAEncryptionParams(params);
        const p = Object.assign({}, params, { name: params.algorithm });
        const k = await webCrypto.importKey("pkcs8", base64ToBytes(privateKey), p, false, ["decrypt"]);
        try {
            const buf = await webCrypto.decrypt(p, k, base64ToBytes(key));
            return bytesToBase64(new Uint8Array(buf));
        } catch (e) {
            throw new Err(ErrorCode.DECRYPTION_FAILED);
        }
    }

    async fingerprint(key: RSAPublicKey): Promise<Base64String> {
        const bytes = await webCrypto.digest("SHA-256", base64ToBytes(key));
        return bytesToBase64(new Uint8Array(bytes));
    }

    async sign(key: HMACKey, data: Base64String, params: HMACParams): Promise<Base64String>;
    async sign(key: RSAPrivateKey, data: Base64String, params: RSASigningParams): Promise<Base64String>;
    async sign(
        key: HMACKey | RSAPrivateKey,
        data: Base64String,
        params: HMACParams | RSASigningParams
    ): Promise<Base64String> {
        switch (params.algorithm) {
            case "HMAC":
                return this._signHMAC(key, data, params);
            case "RSA-PSS":
                return this._signRSA(key, data, params);
            default:
                throw new Err(ErrorCode.NOT_SUPPORTED);
        }
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
        params: HMACParams | RSASigningParams
    ): Promise<boolean> {
        switch (params.algorithm) {
            case "HMAC":
                return this._verifyHMAC(key, signature, data, params);
            case "RSA-PSS":
                return this._verifyRSA(key, signature, data, params);
            default:
                throw new Err(ErrorCode.NOT_SUPPORTED);
        }
    }

    private async _signHMAC(key: HMACKey, data: Base64String, params: HMACParams): Promise<Base64String> {
        const p = Object.assign({}, params, { name: params.algorithm, length: params.keySize });
        const k = await webCrypto.importKey("raw", base64ToBytes(key), p, false, ["sign"]);
        const signature = await webCrypto.sign(p, k, base64ToBytes(data));
        return bytesToBase64(new Uint8Array(signature));
    }

    private async _verifyHMAC(
        key: HMACKey,
        signature: Base64String,
        data: Base64String,
        params: HMACParams
    ): Promise<boolean> {
        const p = Object.assign({}, params, { name: params.algorithm, length: params.keySize });
        const k = await webCrypto.importKey("raw", base64ToBytes(key), p, false, ["verify"]);
        return await webCrypto.verify(p, k, base64ToBytes(signature), base64ToBytes(data));
    }

    private async _signRSA(key: RSAPrivateKey, data: Base64String, params: RSASigningParams): Promise<Base64String> {
        const p = Object.assign({}, params, { name: params.algorithm });
        const k = await webCrypto.importKey("pkcs8", base64ToBytes(key), p, false, ["sign"]);
        const signature = await webCrypto.sign(p, k, base64ToBytes(data));
        return bytesToBase64(new Uint8Array(signature));
    }

    private async _verifyRSA(
        key: RSAPublicKey,
        signature: Base64String,
        data: Base64String,
        params: RSASigningParams
    ): Promise<boolean> {
        const p = Object.assign({}, params, { name: params.algorithm });
        const k = await webCrypto.importKey("spki", base64ToBytes(key), p, false, ["verify"]);
        return await webCrypto.verify(p, k, base64ToBytes(signature), base64ToBytes(data));
    }
}

export default WebCryptoProvider;
