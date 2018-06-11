import { toByteArray, fromByteArray } from "./base64";

export type Base64String = string;

export interface Marshalable {}

export interface Serializable {
    serialize: () => Promise<Marshalable>;
    deserialize: (data: Marshalable) => Promise<void>;
}

export function marshal(obj: Marshalable): string {
    return JSON.stringify(obj);
}

export function unmarshal(str: string): Marshalable {
    return JSON.parse(str);
}

export function bytesToBase64(inp: Uint8Array): Base64String {
    return fromByteArray(inp);
}

export function base64ToBytes(inp: Base64String): Uint8Array {
    return toByteArray(inp);
}

export function stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

export function bytesToString(bytes: Uint8Array, encoding = "utf-8") {
    return new TextDecoder(encoding).decode(bytes);
}

export function stringToBase64(str: string): Base64String {
    const bytes = stringToBytes(str);
    return bytesToBase64(bytes);
}

export function base64ToString(inp: Base64String): string {
    const bytes = base64ToBytes(inp);
    return bytesToString(bytes);
}
