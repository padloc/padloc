import { Base64String } from "./encoding";
import { PBKDF2Params, AESKey, AESEncryptionParams, validatePBKDF2Params, validateAESEncryptionParams } from "./crypto";
import { Err, ErrorCode } from "./error";
import { sjcl } from "../vendor/sjcl";

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

const SJCLProvider = {
    isAvailable() {
        return true;
    },

    randomBytes(bytes: number): Base64String {
        if (bytes % 4) {
            throw "Number of bytes must be dividable by 4";
        }
        return bitsToBase64(sjcl.random.randomWords(bytes / 4, 0));
    },

    async deriveKey(password: string, params: PBKDF2Params): Promise<AESKey> {
        validatePBKDF2Params(params);

        const k = sjcl.misc.pbkdf2(utf8ToBits(password), base64ToBits(params.salt!), params.iterations, params.keySize);
        return bitsToBase64(k);
    },

    async randomKey(n = 256) {
        return sjcl.randomBytes(n / 8);
    },

    async decrypt(key: AESKey, ct: Base64String, params: AESEncryptionParams): Promise<Base64String> {
        if (params.algorithm !== "AES-CCM") {
            throw new Err(ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }
        validateAESEncryptionParams(params);

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
            throw new Err(ErrorCode.DECRYPTION_FAILED);
        }
    },

    async encrypt(key: AESKey, pt: Base64String, params: AESEncryptionParams): Promise<Base64String> {
        if (params.algorithm !== "AES-CCM") {
            throw new Err(ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }

        validateAESEncryptionParams(params);

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
            throw new Err(ErrorCode.ENCRYPTION_FAILED);
        }
    }
};

export default SJCLProvider;
