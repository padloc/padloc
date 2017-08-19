import * as sjcl from "sjcl";
import { isCordova, hasNode } from "./platform";

declare var pbkdf2: undefined |
    ((pass: string, salt: string, opts: { iterations: number, keySize: number }) => Promise<string>);
const nodeCrypto = hasNode() && window.require("crypto");

export class CryptoError {
    constructor(
        public code:
            "invalid_container_data" |
            "unsupported_container_version" |
            "invalid_key_params" |
            "decryption_failed" |
            "encryption_failed"
    ) {};
}

// Available cipher algorithms
export type Cipher = "aes";

// Available cipher modes
export type Mode = "ccm" | "ocb2";

// Available key sizes
export type KeySize = 128 | 192 | 256;

// Available authentication tag sizes
export type AtSize = 64 | 96 | 128;

// Minimum number of pbkdf2 iterations
const PBKDF2_ITER_MIN = 1e5;
// Default number of pbkdf2 iterations
const PBKDF2_ITER_DEFAULT = 1e5;
// Maximum number of pbkdf2 iterations
const PBKDF2_ITER_MAX = 1e7;

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

export interface Pbkdf2Params {
    keySize: KeySize;
    salt: string;
    iter: number;
}

export interface KeyParams extends Pbkdf2Params {
    password: string;
}

export interface CipherParams {
    cipher: Cipher;
    mode: Mode;
    iv: string;
    adata: string;
    ts: AtSize;
}

function validateKeyParams(params: any) {
    return [128, 192, 256].includes(params.keySize) &&
        typeof params.iter == "number" && // valid PBKDF2 iteration count
        params.iter <= PBKDF2_ITER_MAX && // sane pbkdf2 iteration count
        typeof params.salt == "string";//valid salt
}

function genKey(params: KeyParams): Promise<string> {
    if (
        !params.password ||
        typeof params.password !== "string" ||
        !validateKeyParams(params)
    ) {
        throw new CryptoError("invalid_key_params");
    }

    if (isCordova() && typeof pbkdf2 === "function") {
        return pbkdf2(
            params.password,
            params.salt,
            {
                iterations: params.iter,
                keySize: params.keySize
            }
        );
    } else if (nodeCrypto) {
        return new Promise((resolve, reject) => {
            nodeCrypto.pbkdf2(
                params.password,
                new Buffer(params.salt, "base64"),
                params.iter,
                params.keySize / 8,
                "sha256",
                (e: Error, key: string) => {
                    if (e) {
                        reject(e);
                    } else {
                        resolve(new Buffer(key).toString("base64"));
                    }
                }
            );
        });
    } else {
        let k = sjcl.misc.pbkdf2(
            utf8ToBits(params.password),
            base64ToBits(params.salt),
            params.iter,
            params.keySize
        );

        return Promise.resolve(bitsToBase64(k));
    }
}

function decrypt(key: string, ct: string, params: CipherParams): string {
    try {
        const cipher = new sjcl.cipher[params.cipher](base64ToBits(key));
        const pt = sjcl.mode[params.mode].decrypt(
            cipher, base64ToBits(ct), base64ToBits(params.iv),
            base64ToBits(params.adata), params.ts
        );
        return bitsToUtf8(pt);
    } catch(e) {
        throw new CryptoError("decryption_failed");
    }
}

function encrypt(key: string, pt: string, params: CipherParams): string {
    try {
        const cipher = new sjcl.cipher[params.cipher](base64ToBits(key));
        const mode = sjcl.mode[params.mode];
        var ct = mode.encrypt(cipher, utf8ToBits(pt), base64ToBits(params.iv),
                              base64ToBits(params.adata), params.ts);
        return bitsToBase64(ct);
    } catch(e) {
        throw new CryptoError("encryption_failed");
    }
}

export interface RawContainerV0 extends Pbkdf2Params, CipherParams {
    version: undefined;
    ct: string;
}

export interface RawContainerV1 extends Pbkdf2Params, CipherParams  {
    version: 1;
    ct: string;
}

export type RawContainer = RawContainerV0 | RawContainerV1;

export class Container implements KeyParams, CipherParams {

    password: string;
    salt: string;
    iv: string;
    adata: string;
    ct: string;

    private keyCache: Map<string, string>;

    constructor(
        public cipher: Cipher = "aes",
        public mode: Mode = "ccm",
        public keySize: KeySize = 256,
        public iter = PBKDF2_ITER_DEFAULT,
        public ts: AtSize = 64
    ) {
        this.salt = randBase64();
        this.keyCache = new Map<string, string>();
    }

    private async genKey(): Promise<string> {
        const p = JSON.stringify([this.password, this.salt, this.iter, this.keySize]);

        let key = this.keyCache.get(p);

        if (!key) {
            key = await genKey(this);
            this.keyCache.set(p, key);
        }

        return key;
    }

    async set(data: string): Promise<void> {
        // Make sure minium number of iterations is used
        this.iter = Math.max(this.iter, PBKDF2_ITER_MIN);
        const key = await this.genKey();
        this.iv = randBase64();
        this.adata = randBase64();
        this.ct = encrypt(key, data, this);
    }

    async get(): Promise<string> {
        const key = await this.genKey();
        return decrypt(key, this.ct, this);
    }

    raw(): RawContainer {
        return {
            version: 1,
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

    clear(): void {
        this.password = "";
        this.ct = "";
        this.keyCache.clear();
    }

    static fromRaw(raw: RawContainer): Container {
        if (!Container.validateRaw(raw)) {
            throw new CryptoError("invalid_container_data");
        }

        switch(raw.version) {
            case undefined: 
                // Legacy versions of Padlock had a bug where the base64-encoded
                // `adata` value was not converted to a BitArray before being
                // passed to `sjcl.mode.ccm.encrypt/decrypt` and the raw string was
                // passed instead. This went unnoticed as the functions in question
                // quietly accepted the string and simply treated it as an array.
                // So in order to successfully decrypt legacy containers we have to
                // perfom this conversion first.
                raw.adata = bitsToBase64(raw.adata as any as sjcl.BitArray);
                break;
            case 1:
                break;
            default:
                throw new CryptoError("unsupported_container_version");
        }

        let cont = new Container(raw.cipher, raw.mode, raw.keySize, raw.iter, raw.ts);
        Object.assign(cont, { salt: raw.salt, iv: raw.iv, adata: raw.adata, ct: raw.ct });

        return cont;
    }

    static fromJSON(json: string): Container {
        let raw: RawContainer;
        try {
            raw = JSON.parse(json);
            raw.cipher = raw.cipher.toLowerCase() as Cipher;
            raw.mode = raw.mode.toLowerCase() as Mode;
        } catch (e) {
            throw new CryptoError("invalid_container_data");
        }

        return Container.fromRaw(raw);
    }

    static validateRaw(obj: RawContainer) {
        return typeof obj == "object" &&
            (obj.version === undefined || typeof obj.version === "number") && // has a valid version
            validateKeyParams(obj) &&
            ["aes"].includes(obj.cipher) && // valid cipher
            ["ccm", "ocb2"].includes(obj.mode) && // exiting mode
            typeof obj.iv == "string" && // valid initialisation vector
            typeof obj.ct == "string" && // valid cipher text
            typeof obj.adata == "string" && // valid authorisation data
            [64, 96, 128].includes(obj.ts); // valid authorisation tag length
    }

}
