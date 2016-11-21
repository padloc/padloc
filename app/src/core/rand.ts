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
