const moment = require("moment");
require("moment-duration-format");

// RFC4122-compliant uuid generator
export function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == "x" ? r : (r&0x3|0x8);
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
        if (rnd[0] > 255 - 256 % charSet.length) {
            continue;
        }
        str += charSet[rnd[0] % charSet.length];
    }
    return str;
}

export function debounce(fn: (...args: any[]) => any, delay: number) {
    let timeout: number;

    return function(...args: any[]) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(args), delay);
    };
}

export function wait(dt: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, dt));
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

export function formatDateFromNow(date: Date) {
    return moment(date).fromNow();
}

export function formatDateUntil(startDate: Date|string|number, duration: number) {
    const d = moment.duration(moment(startDate).add(duration, "hours").diff(moment()));
    return d.format("hh:mm:ss");
}

export function isFuture(date: Date|string|number, duration: number) {
    return moment(date).add(duration, "days").isAfter();
}
