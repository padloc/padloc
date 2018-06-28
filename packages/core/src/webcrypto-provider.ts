import { Base64String, bytesToBase64, base64ToBytes, stringToBytes } from "./encoding";
import {
    CryptoProvider,
    CipherText,
    PlainText,
    KeyDerivationParams,
    CipherParams,
    Key,
    SymmetricKey,
    PublicKey,
    PrivateKey,
    validateKeyDerivationParams,
    validateCipherParams
} from "./crypto";
import { Err, ErrorCode } from "./error";
import SJCLProvider from "./sjcl-provider";

const webCrypto = window.crypto && window.crypto.subtle;

async function webCryptoGetArgs(key: Key, params: CipherParams, action = "encrypt") {
    validateCipherParams(params);

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

const WebCryptoProvider: CryptoProvider = {
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

    async deriveKey(password: string, params: KeyDerivationParams): Promise<SymmetricKey> {
        validateKeyDerivationParams(params);

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

        let buf;
        try {
            buf = await webCrypto.encrypt(p, k, base64ToBytes(data));
        } catch (e) {
            throw new Err(ErrorCode.ENCRYPTION_FAILED);
        }

        return bytesToBase64(new Uint8Array(buf));
    },

    async decrypt(key: Key, data: CipherText, params: CipherParams): Promise<string> {
        if (params.algorithm === "AES-CCM") {
            return SJCLProvider.decrypt(key, data, params);
        }

        const { p, k } = await webCryptoGetArgs(key, params, "decrypt");

        let buf;
        try {
            buf = await webCrypto.decrypt(p, k, base64ToBytes(data));
        } catch (e) {
            throw new Err(ErrorCode.DECRYPTION_FAILED);
        }

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

export default WebCryptoProvider;
