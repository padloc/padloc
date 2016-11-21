import * as sjcl from "sjcl";

export const ERR_CRYPTO_INVALID_CONTAINER = "Invalid container";
export const ERR_CRYPTO_INVALID_KEY_PARAMS = "Invalid key params";
export const ERR_CRYPTO_DECRYPTION_FAILED = "Decryption failed";
export const ERR_CRYPTO_ENCRYPTION_FAILED = "Encryption failed";

// Available cipher algorithms
type Cipher = "aes";

// Available cipher modes
type Mode = "ccm" | "ocb2";

// Available key sizes
type KeySize = 128 | 192 | 256;

// Available authentication tag sizes
type AtSize = 64 | 96 | 128;

// Maximum number of pbkdf2 iterations
const pbkdf2MaxIter = 1e6;

// Shorthands for codec functions
const bitsToBase64 = sjcl.codec.base64.fromBits;
const base64ToBits = sjcl.codec.base64.toBits;
const bitsToUtf8 = sjcl.codec.utf8String.fromBits;
const utf8ToBits = sjcl.codec.utf8String.toBits;

/**
 * Returns a base64 encoded random string
 */
function randBase64(): string {
    return bitsToBase64(sjcl.random.randomWords(4, 0));
}

interface KeyParams {
    keySize: KeySize;
    salt: string;
    iter: number;
}

interface CipherParams {
    cipher: Cipher;
    mode: Mode;
    iv: string;
    adata: string;
    ts: number;
}

// Cache object for calculated keys
let keyCache = new Map<KeyParams, string>();
//* Clears the cache for generating keys
export function clearKeyCache() {
    keyCache.clear();
}

function genKey(passphrase: string, params: KeyParams): string {
    if (params.iter > pbkdf2MaxIter) {
        throw ERR_CRYPTO_INVALID_KEY_PARAMS;
    }

    let key = keyCache.get(params);

    if (!key) {
        let k = sjcl.misc.pbkdf2(
            utf8ToBits(passphrase),
            base64ToBits(params.salt),
            params.iter,
            params.keySize
        );
        key = bitsToBase64(k);
        keyCache.set(params, key);
    }

    return key;
}

function decrypt(key: string, ct: string, params: CipherParams): string {
    try {
        const cipher = new sjcl.cipher[params.cipher](base64ToBits(key));
        const pt = sjcl.mode[params.mode].decrypt(
            cipher, base64ToBits(ct), base64ToBits(params.iv),
            params.adata, params.ts
        );
        return bitsToUtf8(pt);
    } catch(e) {
        throw ERR_CRYPTO_DECRYPTION_FAILED;
    }
}

function encrypt(key: string, pt: string, params: CipherParams): string {
    try {
        const cipher = new sjcl.cipher[params.cipher](base64ToBits(key));
        const mode = sjcl.mode[params.mode];
        var ct = mode.encrypt(cipher, utf8ToBits(pt), base64ToBits(params.iv), params.adata, params.ts);
        return bitsToBase64(ct);
    } catch(e) {
        throw ERR_CRYPTO_ENCRYPTION_FAILED;
    }
}

export class Container implements KeyParams, CipherParams {

    salt: string;
    iv: string;
    adata: string;
    ct: string;

    constructor(
        readonly cipher: Cipher = "aes",
        readonly mode: Mode = "ccm",
        readonly keySize: KeySize = 256,
        readonly iter = 1e4,
        readonly ts = 64,
    ) {
        this.salt = randBase64();
        this.iv = randBase64();
        this.adata = randBase64();
    }

    setData(passphrase: string, data: string) {
        var key = genKey(passphrase, this);
        this.ct = encrypt(key, data, this);
    }

    getData(passphrase: string): string {
        var key = genKey(passphrase, this);
        return decrypt(key, this.ct, this);
    }

}
