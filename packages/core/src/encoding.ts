import { Err, ErrorCode } from "./error";
import { toByteArray, fromByteArray, byteLength } from "./base64";

export type Bytes = Uint8Array;
export type Base64String = string;
export type HexString = string;
export type DateString = string;
export type TimeStamp = number;

export interface Marshalable {}

export interface Serializable {
    serialize: () => Promise<Marshalable>;
    deserialize: (data: any) => Promise<this>;
}

export function marshal(obj: Marshalable): string {
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

export function bytesToBase64(inp: Bytes, urlSafe = true): Base64String {
    try {
        return fromByteArray(inp, urlSafe);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function base64ToBytes(inp: Base64String): Bytes {
    try {
        return toByteArray(inp);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function stringToBytes(str: string): Bytes {
    try {
        return new TextEncoder().encode(str);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function bytesToString(bytes: Bytes, encoding = "utf-8") {
    try {
        return new TextDecoder(encoding).decode(bytes);
    } catch (e) {
        throw new Err(ErrorCode.ENCODING_ERROR, e.toString());
    }
}

export function stringToBase64(str: string, urlSafe = true): Base64String {
    const bytes = stringToBytes(str);
    return bytesToBase64(bytes, urlSafe);
}

export function base64ToString(inp: Base64String): string {
    const bytes = base64ToBytes(inp);
    return bytesToString(bytes);
}

export function base64ByteLength(inp: Base64String): number {
    return byteLength(inp);
}

export function hexToBytes(str: HexString): Bytes {
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

export function bytesToHex(bytes: Bytes): HexString {
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

export function base64ToHex(b64: Base64String): HexString {
    return bytesToHex(base64ToBytes(b64));
}

export function hexToBase64(hex: HexString): Base64String {
    return bytesToBase64(hexToBytes(hex));
}
