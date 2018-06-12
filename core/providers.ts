import { Base64String, bytesToBase64, base64ToBytes, stringToBytes, bytesToString } from "./encoding";
import { SymmetricKey, CipherText, PlainText, KeyDerivationParams, CipherParams, CryptoError } from "./crypto";
import { sjcl } from "../app/vendor/sjcl";

export interface CryptoProvider {
    isAvailable(): boolean;
    randomBytes(n: number): Base64String;
    deriveKey(params: KeyDerivationParams): Promise<SymmetricKey>;
    encrypt(data: PlainText, params: CipherParams): Promise<CipherText>;
    decrypt(data: Base64String, params: CipherParams): Promise<PlainText>;
}

// TODO: more checks
function validateKeyParams(params: KeyDerivationParams): boolean {
    return !!params.password && typeof params.password === "string" && !!params.salt && typeof params.salt === "string";
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
const bitsToUtf8 = sjcl.codec.utf8String.fromBits;
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

    async deriveKey(params: KeyDerivationParams): Promise<SymmetricKey> {
        if (!validateKeyParams(params)) {
            throw new CryptoError("invalid_key_params");
        }

        const k = sjcl.misc.pbkdf2(
            utf8ToBits(params.password),
            base64ToBits(params.salt!),
            params.iterations,
            params.keySize
        );
        return {
            kty: "oct",
            alg: "A256GCM",
            k: bitsToBase64(k)
        };
    },

    decrypt(ct: CipherText, params: CipherParams): Promise<PlainText> {
        if (params.cipherType !== "symmetric" || params.algorithm !== "A256CCM") {
            throw new CryptoError("invalid_cipher_params");
        }

        // Only AES and CCM are supported
        const algorithm = "aes";
        const mode = "ccm";

        try {
            const cipher = new sjcl.cipher[algorithm](base64ToBits(params.key!.k));
            const pt = sjcl.mode[mode].decrypt(
                cipher,
                base64ToBits(ct),
                base64ToBits(params.iv!),
                base64ToBits(params.additionalData!),
                params.tagSize
            );
            return Promise.resolve(bitsToUtf8(pt));
        } catch (e) {
            throw new CryptoError("decryption_failed");
        }
    },

    encrypt(pt: PlainText, params: CipherParams): Promise<CipherText> {
        if (params.cipherType !== "symmetric" || params.algorithm !== "A256CCM") {
            throw new CryptoError("invalid_cipher_params");
        }

        // Only AES and CCM are supported
        const algorithm = "aes";
        const mode = "ccm";

        try {
            const cipher = new sjcl.cipher[algorithm](base64ToBits(params.key!.k));
            var ct = sjcl.mode[mode].encrypt(
                cipher,
                utf8ToBits(pt),
                base64ToBits(params.iv!),
                base64ToBits(params.additionalData!),
                params.tagSize
            );
            return Promise.resolve(bitsToBase64(ct));
        } catch (e) {
            throw new CryptoError("encryption_failed");
        }
    }
};

const webCrypto = window.crypto && window.crypto.subtle;

const webCryptoSupportedAlgorithms = {
    A256GCM: "AES-GCM"
};

export var WebCryptoProvider: CryptoProvider = {
    isAvailable() {
        return !!webCrypto;
    },

    randomBytes(n: number): Base64String {
        const bytes = window.crypto.getRandomValues(new Uint8Array(n));
        return bytesToBase64(bytes as Uint8Array);
    },

    async deriveKey(params: KeyDerivationParams): Promise<SymmetricKey> {
        if (!validateKeyParams(params)) {
            throw new CryptoError("invalid_key_params");
        }

        // First, create a PBKDF2 "key" containing the password
        const baseKey = await webCrypto.importKey("raw", stringToBytes(params.password!), params.algorithm, false, [
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
            true, // Extrable
            ["encrypt", "decrypt"] // For new key
        );

        const k = await webCrypto.exportKey("jwk", key);
        // const k = bytesToBase64(new Uint8Array(raw));

        return k as SymmetricKey;
    },

    async encrypt(data: string, params: CipherParams): Promise<CipherText> {
        switch (params.cipherType) {
            case "symmetric":
                if (params.algorithm === "A256CCM") {
                    return SJCLProvider.encrypt(data, params);
                }

                const algorithm = webCryptoSupportedAlgorithms[params.algorithm];
                if (!algorithm) {
                    throw new CryptoError("invalid_cipher_params");
                }

                const key = await webCrypto.importKey("jwk", params.key as JsonWebKey, algorithm, false, ["encrypt"]);
                const buf = await webCrypto.encrypt(
                    {
                        name: algorithm,
                        iv: base64ToBytes(params.iv!),
                        additionalData: base64ToBytes(params.additionalData!),
                        tagLength: params.tagSize
                    },
                    key,
                    stringToBytes(data)
                );
                return bytesToBase64(new Uint8Array(buf));
                break;
            default:
                throw new CryptoError("invalid_cipher_params");
        }
    },

    async decrypt(data: CipherText, params: CipherParams): Promise<string> {
        switch (params.cipherType) {
            case "symmetric":
                if (params.algorithm === "A256CCM") {
                    return SJCLProvider.decrypt(data, params);
                }

                const algorithm = webCryptoSupportedAlgorithms[params.algorithm];

                if (!algorithm) {
                    throw new CryptoError("invalid_cipher_params");
                }

                const key = await webCrypto.importKey("jwk", params.key as JsonWebKey, algorithm, false, ["decrypt"]);
                const buf = await webCrypto.decrypt(
                    {
                        name: algorithm,
                        iv: base64ToBytes(params.iv!),
                        additionalData: base64ToBytes(params.additionalData!),
                        tagLength: params.tagSize
                    },
                    key,
                    base64ToBytes(data)
                );
                return bytesToString(new Uint8Array(buf));
                break;
            default:
                throw new CryptoError("invalid_cipher_params");
        }
    }
};
