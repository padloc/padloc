import * as sjcl from "sjcl";

export const ERR_INVALID_CONTAINER_DATA = "Invalid container data";
export const ERR_INVALID_KEY_PARAMS = "Invalid key params";
export const ERR_DECRYPTION_FAILED = "Decryption failed";
export const ERR_ENCRYPTION_FAILED = "Encryption failed";

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

export interface KeyParams {
    keySize: KeySize;
    salt: string;
    iter: number;
}

export interface CipherParams {
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
        throw ERR_INVALID_KEY_PARAMS;
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
        throw ERR_DECRYPTION_FAILED;
    }
}

function encrypt(key: string, pt: string, params: CipherParams): string {
    try {
        const cipher = new sjcl.cipher[params.cipher](base64ToBits(key));
        const mode = sjcl.mode[params.mode];
        var ct = mode.encrypt(cipher, utf8ToBits(pt), base64ToBits(params.iv), params.adata, params.ts);
        return bitsToBase64(ct);
    } catch(e) {
        throw ERR_ENCRYPTION_FAILED;
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
    }

    setData(passphrase: string, data: string) {
        var key = genKey(passphrase, this);
        this.iv = randBase64();
        this.adata = randBase64();
        this.ct = encrypt(key, data, this);
    }

    getData(passphrase: string): string {
        var key = genKey(passphrase, this);
        return decrypt(key, this.ct, this);
    }

    raw(): Object {
        return {
            cipher: this.cipher,
            mode: this.mode,
            keySize: this.keySize,
            iter: this.iter,
            ts: this.ts,
            salt: this.salt,
            iv: this.iv,
            adata: this.adata,
            ct: this.ct
        };
    }

    toJSON(): string {
        return JSON.stringify(this.raw());
    }

    static fromJSON(json: string): Container {
        let raw: any;
        try {
            raw = JSON.parse(json);
        } catch (e) {
            throw {
                error: ERR_INVALID_CONTAINER_DATA,
                message: e.toString()
            };
        }

        if (!Container.validateRaw(raw)) {
            throw { error: ERR_INVALID_CONTAINER_DATA };
        }

        let cont = new Container(raw.cipher, raw.mode, raw.keySize, raw.iter, raw.ts);
        Object.assign(cont, { salt: raw.salt, iv: raw.iv, adata: raw.adata, ct: raw.ct });

        return cont;
    }

    static validateRaw(obj: any) {
        return typeof obj == "object" &&
            ["aes"].includes(obj.cipher) && // valid cipher
            ["ccm", "ocb2"].includes(obj.mode) && // exiting mode
            [128, 192, 256].includes(obj.keySize) &&
            typeof obj.iter == "number" && // valid PBKDF2 iteration count
            obj.iter <= pbkdf2MaxIter && // sane pbkdf2 iteration count
            typeof obj.iv == "string" && // valid initialisation vector
            typeof obj.salt == "string" && //valid salt
            typeof obj.ct == "string" && // valid cipher text
            typeof obj.adata == "string" && // valid authorisation data
            [64, 96, 128].includes(obj.ts); // valid authorisation tag length
    }

}
