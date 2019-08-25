import { sjcl } from "../vendor/sjcl";
import { Err, ErrorCode } from "./error";
import { PBKDF2_ITER_MAX } from "./crypto";
import { PBES2Container } from "./container";

/**
 * Interface representing legacy container structure (i.e. encryption format
 * used in Padlock versions 1.x and 2.x)
 */
export interface LegacyContainer {
    version?: 1;
    cipher: "aes";
    mode: "ccm";
    iv: string;
    adata: string;
    ts: 64 | 96 | 128;
    keySize: 256;
    salt: string;
    iter: number;
    ct: string;
}

/**
 * Validates legacy container structure
 */
export function validateLegacyContainer(obj: any): boolean {
    return (
        typeof obj === "object" &&
        (obj.version === undefined || obj.version === 1) && // has a valid version
        [128, 192, 256].includes(obj.keySize) &&
        typeof obj.iter == "number" && // valid PBKDF2 iteration count
        obj.iter <= PBKDF2_ITER_MAX && // sane pbkdf2 iteration count
        typeof obj.salt == "string" &&
        ["aes"].includes(obj.cipher) && // valid cipher
        ["ccm", "ocb2"].includes(obj.mode) && // exiting mode
        typeof obj.iv == "string" && // valid initialisation vector
        typeof obj.ct == "string" && // valid cipher text
        typeof obj.adata == "string" && // valid authorisation data
        [64, 96, 128].includes(obj.ts) // valid authorisation tag length
    );
}

/**
 * Transforms a legacy container object into an instance of [[PBES2Container]]
 */
export function parseLegacyContainer(raw: LegacyContainer): PBES2Container {
    if (!validateLegacyContainer(raw)) {
        throw new Err(ErrorCode.ENCODING_ERROR);
    }

    if (raw.version === undefined) {
        // Legacy versions of Padlock had a bug where the base64-encoded
        // `adata` value was not converted to a BitArray before being
        // passed to `sjcl.mode.ccm.encrypt/decrypt` and the raw string was
        // passed instead. This went unnoticed as the functions in question
        // quietly accepted the string and simply treated it as an array.
        // So in order to successfully decrypt legacy containers we have to
        // perfom this conversion first.
        raw.adata = sjcl.codec.base64.fromBits(raw.adata);
    }

    return new PBES2Container().fromRaw({
        encryptionParams: {
            algorithm: "AES-CCM",
            tagSize: raw.ts,
            keySize: raw.keySize,
            iv: raw.iv,
            additionalData: raw.adata
        },
        keyParams: {
            algorithm: "PBKDF2",
            hash: "SHA-256",
            keySize: raw.keySize,
            iterations: raw.iter,
            salt: raw.salt
        },
        encryptedData: raw.ct
    });
}
