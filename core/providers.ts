import { Base64String } from "./encoding";
import { SymmetricKey, CipherText, PlainText } from "./crypto";
import { KeyDerivationParams, CipherParams, CryptoError } from "./crypto";
import { sjcl } from "../app/vendor/sjcl";

export interface CryptoProvider {
    isAvailable(): boolean;
    randomBytes(n: number): Base64String;
    deriveKey(params: KeyDerivationParams): Promise<SymmetricKey>;
    encrypt(data: PlainText, params: CipherParams): Promise<CipherText>;
    decrypt(data: Base64String, params: CipherParams): Promise<PlainText>;
}

// Shorthands for codec functions
const bitsToBase64: (bits: any) => Base64String = sjcl.codec.base64.fromBits;
const base64ToBits: (base64: Base64String) => any = sjcl.codec.base64.toBits;
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
