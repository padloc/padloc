import { toByteArray, fromByteArray, byteLength } from "./base64";

export type Bytes = Uint8Array;
export type Base64String = string;
export type DateString = string;
export type TimeStamp = number;

export interface Marshalable {}

export interface Serializable {
    serialize: () => Promise<Marshalable>;
    deserialize: (data: any) => Promise<this>;
}

export function marshal(obj: Marshalable): string {
    return JSON.stringify(obj);
}

export function unmarshal(str: string): any {
    return JSON.parse(str);
}

export function bytesToBase64(inp: Bytes, urlSafe = true): Base64String {
    return fromByteArray(inp, urlSafe);
}

export function base64ToBytes(inp: Base64String): Bytes {
    return toByteArray(inp);
}

export function stringToBytes(str: string): Bytes {
    return new TextEncoder().encode(str);
}

export function bytesToString(bytes: Bytes, encoding = "utf-8") {
    return new TextDecoder(encoding).decode(bytes);
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
