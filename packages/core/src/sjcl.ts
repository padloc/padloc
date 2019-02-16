import { PBKDF2Params, AESKey, AESEncryptionParams } from "./crypto";
import { Err, ErrorCode } from "./error";
import { sjcl } from "../vendor/sjcl";

// Shorthands for codec functions
const bytesToBits = sjcl.codec.bytes.toBits;
const bitsToBytes = sjcl.codec.bytes.fromBits;

const SJCLProvider = {
    isAvailable() {
        return true;
    },

    randomBytes(_bytes: number): Uint8Array {
        // if (bytes % 4) {
        //     throw "Number of bytes must be dividable by 4";
        // }
        // return bitsToBytes(sjcl.random.randomWords(bytes / 4, 0));
        throw new Err(ErrorCode.NOT_SUPPORTED);
    },

    async deriveKey(_password: string, _params: PBKDF2Params): Promise<AESKey> {
        // const k = sjcl.misc.pbkdf2(utf8ToBits(password), bytesToBits(params.salt!), params.iterations, params.keySize);
        // return bitsToBytes(k);
        throw new Err(ErrorCode.NOT_SUPPORTED);
    },

    async randomKey(_n = 256) {
        // return sjcl.randomBytes(n / 8);
        throw new Err(ErrorCode.NOT_SUPPORTED);
    },

    async decrypt(key: AESKey, ct: Uint8Array, params: AESEncryptionParams): Promise<Uint8Array> {
        if (params.algorithm !== "AES-CCM") {
            throw new Err(ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }

        // Only AES and CCM are supported
        const algorithm = "aes";
        const mode = "ccm";

        try {
            const cipher = new sjcl.cipher[algorithm](bytesToBits(key));
            const pt = sjcl.mode[mode].decrypt(
                cipher,
                bytesToBits(ct),
                bytesToBits(params.iv!),
                bytesToBits(params.additionalData!),
                params.tagSize
            );
            return bitsToBytes(pt);
        } catch (e) {
            throw new Err(ErrorCode.DECRYPTION_FAILED);
        }
    },

    async encrypt(key: AESKey, pt: Uint8Array, params: AESEncryptionParams): Promise<Uint8Array> {
        if (params.algorithm !== "AES-CCM") {
            throw new Err(ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }

        // Only AES and CCM are supported
        const algorithm = "aes";
        const mode = "ccm";

        try {
            const cipher = new sjcl.cipher[algorithm](bytesToBits(key));
            var ct = sjcl.mode[mode].encrypt(
                cipher,
                bytesToBits(pt),
                bytesToBits(params.iv!),
                bytesToBits(params.additionalData!),
                params.tagSize
            );
            return bitsToBytes(ct);
        } catch (e) {
            throw new Err(ErrorCode.ENCRYPTION_FAILED);
        }
    }
};

export default SJCLProvider;
