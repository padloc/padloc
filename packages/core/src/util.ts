import { getCryptoProvider as getProvider } from "./platform";
import { bytesToHex } from "./encoding";

/** Generates a random UUID v4 */
export async function uuid(): Promise<string> {
    const bytes = await getProvider().randomBytes(16);

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    // Canonical representation
    // XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
    return [
        bytesToHex(bytes.slice(0, 4)),
        "-",
        bytesToHex(bytes.slice(4, 6)),
        "-",
        bytesToHex(bytes.slice(6, 8)),
        "-",
        bytesToHex(bytes.slice(8, 10)),
        "-",
        bytesToHex(bytes.slice(10, 16))
    ].join("");
}

/** Caracters, by category */
export const chars = {
    numbers: "0123456789",
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    other: "/+()%\"=&-!:'*#?;,_.@`~$^[{]}\\|<>"
};

/** Predefined char sets for generating randing strings */
export const charSets = {
    full: chars.numbers + chars.upper + chars.lower + chars.other,
    alphanum: chars.numbers + chars.upper + chars.lower,
    alpha: chars.lower + chars.upper,
    num: chars.numbers,
    hexa: chars.numbers + "abcdef"
};

/** Creates a random string with a given `length`, with characters chosen from a given `charSet` */
export async function randomString(length = 32, charSet = charSets.full) {
    const provider = getProvider();
    let str = "";
    while (str.length < length) {
        const [rnd] = await provider.randomBytes(1);
        // Prevent modulo bias by rejecting values larger than the highest muliple of `charSet.length`
        if (rnd > 255 - (256 % charSet.length)) {
            continue;
        }
        str += charSet[rnd % charSet.length];
    }
    return str;
}

/**
 * Generates a random number between `min` and `max`.
 * Taken from https://github.com/EFForg/OpenWireless/blob/master/app/js/diceware.js
 */
export async function randomNumber(min: number = 0, max: number = 10): Promise<number> {
    if (max < min) {
        throw "Upper bound must be greater than or equal to lower bound!";
    }

    let rval = 0;
    const range = max - min + 1;
    const bitsNeeded = Math.ceil(Math.log2(range));
    if (bitsNeeded > 53) {
        throw new Error("We cannot generate numbers larger than 53 bits.");
    }

    const bytesNeeded = Math.ceil(bitsNeeded / 8);
    const mask = Math.pow(2, bitsNeeded) - 1;

    // Fill a byte array with N random numbers
    const byteArray = await getProvider().randomBytes(bytesNeeded);

    let p = (bytesNeeded - 1) * 8;
    for (let i = 0; i < bytesNeeded; i++) {
        rval += byteArray[i] * Math.pow(2, p);
        p -= 8;
    }

    // Use & to apply the mask and reduce the number of recursive lookups
    // tslint:disable-next-line
    rval = rval & mask;

    if (rval >= range) {
        // Integer out of acceptable range
        return randomNumber(min, max);
    }

    // Return an integer that falls within the range
    return min + rval;
}

/**
 * "Debounces" a function, making sure it is only called once within a certain
 * time window
 */
export function debounce(fn: (...args: any[]) => any, delay: number) {
    let timeout: number;

    return function(...args: any[]) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(args), delay);
    };
}

/** Returns a promise that resolves after a given `delay`. */
export function wait(delay: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, delay));
}

/**
 * Resolves a given locale string to the approprivate available language
 */
export function resolveLanguage(locale: string, supportedLanguages: { [lang: string]: any }): string {
    const localeParts = locale.toLowerCase().split("-");

    while (localeParts.length) {
        const l = localeParts.join("-");
        if (supportedLanguages[l]) {
            return l;
        }

        localeParts.pop();
    }

    return Object.keys(supportedLanguages)[0];
}

/**
 * Applies a number of class `mixins` to a `baseClass`
 */
export function applyMixins(baseClass: any, ...mixins: ((cls: any) => any)[]): any {
    return mixins.reduce((cls, mixin) => mixin(cls), baseClass);
}

/**
 * Escapes all regex special characters within a given string.
 */
export function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
