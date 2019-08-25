import { numToBytes, bytesToNum } from "./encoding";
import { HMACParams } from "./crypto";
import { getCryptoProvider as getProvider } from "./platform";
import { base32ToBytes } from "./encoding";

export interface HOTPOpts {
    digits: number;
    hash: "SHA-1" | "SHA-256";
}

export interface TOTPOpts extends HOTPOpts {
    interval: number;
}

function getToken(hmac: Uint8Array, digits: number = 6): string {
    const offset = hmac[hmac.length - 1] & 0xf;
    const bin = new Uint8Array([hmac[offset] & 0x7f, hmac[offset + 1], hmac[offset + 2], hmac[offset + 3]]);
    const num = bytesToNum(bin);
    return (num % 10 ** digits).toString().padStart(digits, "0");
}

export async function hotp(
    secret: Uint8Array,
    counter: number,
    { hash, digits }: HOTPOpts = { digits: 6, hash: "SHA-1" }
) {
    const hmac = await getProvider().sign(
        secret,
        numToBytes(counter),
        new HMACParams({ hash, keySize: secret.length * 8 })
    );
    return getToken(hmac, digits);
}

export async function totp(
    secret: Uint8Array,
    time: number = Date.now(),
    { interval, ...opts }: TOTPOpts = { interval: 30, digits: 6, hash: "SHA-1" }
) {
    const counter = Math.floor(time / interval / 1000);
    return hotp(secret, counter, opts);
}

export function parseURL(data: string) {
    const url = new URL(data);
    const params = new URLSearchParams(url.search);
    const secret = params.get("secret");

    if (!secret || !base32ToBytes(secret).length) {
        throw "Invalid secret";
    }

    return { secret };
}
