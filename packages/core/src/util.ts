import { getProvider } from "./crypto";

// RFC4122-compliant uuid generator
export function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export const chars = {
    numbers: "0123456789",
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    other: "/+()%\"=&-!:'*#?;,_.@`~$^[{]}\\|<>"
};

export const charSets = {
    full: chars.numbers + chars.upper + chars.lower + chars.other,
    alphanum: chars.numbers + chars.upper + chars.lower,
    alpha: chars.lower + chars.upper,
    num: chars.numbers,
    hexa: chars.numbers + "abcdef"
};

//* Creates a random string with a given _length_ comprised of given set or characters
export function randomString(length = 32, charSet = charSets.full) {
    let rnd = new Uint8Array(1);
    let str = "";
    while (str.length < length) {
        window.crypto.getRandomValues(rnd);
        // Prevent modulo bias by rejecting values larger than the highest muliple of `charSet.length`
        if (rnd[0] > 255 - (256 % charSet.length)) {
            continue;
        }
        str += charSet[rnd[0] % charSet.length];
    }
    return str;
}

// taken from https://github.com/EFForg/OpenWireless/blob/master/app/js/diceware.js
export async function randomNumber(min: number = 0, max: number = 10): Promise<number> {
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

export function debounce(fn: (...args: any[]) => any, delay: number) {
    let timeout: number;

    return function(...args: any[]) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(args), delay);
    };
}

export function wait(dt: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, dt));
}

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

export function applyMixins(baseClass: any, ...mixins: ((cls: any) => any)[]): any {
    return mixins.reduce((cls, mixin) => mixin(cls), baseClass);
}

export function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
