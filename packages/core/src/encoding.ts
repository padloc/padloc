import { Err, ErrorCode } from "./error";
import { toByteArray, fromByteArray, byteLength, isBase64 } from "./base64";

export class Serializable {
    get type(): string {
        return this.constructor.name.toLowerCase();
    }

    validate() {
        return true;
    }

    toRaw(exclude: string[] = []): object {
        const raw = {} as any;
        for (const [prop, val] of Object.entries(this)) {
            if (prop.startsWith("_") || exclude.includes(prop)) {
                continue;
            }

            if (val instanceof Serializable) {
                raw[prop] = val.toRaw();
            } else if (Array.isArray(val)) {
                raw[prop] = val.map((each: any) => (each instanceof Serializable ? each.toRaw() : each));
            } else {
                raw[prop] = val;
            }
        }
        return raw;
    }

    fromRaw(raw: any): this {
        Object.assign(this, raw);
        try {
            if (!this.validate()) {
                console.log("failed to validate", this.type, raw);
                throw new Err(ErrorCode.ENCODING_ERROR);
            }
        } catch (e) {
            throw new Err(ErrorCode.ENCODING_ERROR);
        }
        return this;
    }

    toJSON(): string {
        return JSON.stringify(this.toRaw());
    }

    fromJSON(json: string): this {
        return this.fromRaw(JSON.parse(json));
    }

    toBytes(): Uint8Array {
        return stringToBytes(this.toJSON());
    }

    fromBytes(bytes: Uint8Array): this {
        return this.fromJSON(bytesToString(bytes));
    }

    clone() {
        // @ts-ignore: This causes a typescript warning for some reason but works fine in practice
        return new this.constructor().fromRaw(this.toRaw());
    }
}

export class Bytes extends Serializable {
    constructor(public value?: Uint8Array) {
        super();
    }

    toRaw() {
        return {
            value: this.value ? bytesToBase64(this.value) : ""
        };
    }

    fromRaw({ value }: any) {
        if (!isBase64(value)) {
            throw new Err(ErrorCode.ENCODING_ERROR);
        }
        this.value = base64ToBytes(value);
        return this;
    }

    toBytes() {
        return this.value || new Uint8Array();
    }

    fromBytes(bytes: Uint8Array) {
        this.value = bytes;
        return this;
    }
}

export function marshal(obj: object): string {
    try {
        return JSON.stringify(obj);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function unmarshal(str: string): any {
    try {
        return JSON.parse(str);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export { isBase64 };

export function bytesToBase64(inp: Uint8Array, urlSafe = true): string {
    try {
        return fromByteArray(inp, urlSafe);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function base64ToBytes(inp: string): Uint8Array {
    try {
        return toByteArray(inp);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function stringToBytes(str: string): Uint8Array {
    try {
        return new TextEncoder().encode(str);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function bytesToString(bytes: Uint8Array, encoding = "utf-8") {
    try {
        return new TextDecoder(encoding).decode(bytes);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function stringToBase64(str: string, urlSafe = true): string {
    const bytes = stringToBytes(str);
    return bytesToBase64(bytes, urlSafe);
}

export function base64ToString(inp: string): string {
    const bytes = base64ToBytes(inp);
    return bytesToString(bytes);
}

export function base64ByteLength(inp: string): number {
    return byteLength(inp);
}

export function hexToBytes(str: string): Uint8Array {
    try {
        const bytes = new Uint8Array(str.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(str.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function bytesToHex(bytes: Uint8Array): string {
    try {
        let str = "";
        for (const b of bytes) {
            const s = b.toString(16);
            str += s.length == 1 ? "0" + s : s;
        }
        return str;
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function base64ToHex(b64: string): string {
    return bytesToHex(base64ToBytes(b64));
}

export function hexToBase64(hex: string): string {
    return bytesToBase64(hexToBytes(hex));
}

export function concatBytes(...arrs: Uint8Array[]): Uint8Array {
    const length = arrs.reduce((len, arr) => len + arr.length, 0);
    const res = new Uint8Array(length);
    let offset = 0;
    for (const arr of arrs) {
        res.set(arr, offset);
        offset += arr.length;
    }
    return res;
}
