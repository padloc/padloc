/* global padlock, Uint8Array */

/**
 * Module for generating random strings
 */
padlock.rand = (function() {
    "use strict";

    var chars = {
        numbers: "0123456789",
        lower: "abcdefghijklmnopqrstuvwxyz",
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        other: "/+()%\"=&-!:'*#?;,_.@`~$^[{]}\\|<>"
    };

    var charSets = {
        full: chars.numbers + chars.upper + chars.lower + chars.other,
        alphanum: chars.numbers + chars.upper + chars.lower,
        alpha: chars.lower + chars.upper,
        num: chars.numbers,
        hexa: chars.numbers + "abcdef"
    };

    //* Creates a random string with a given _length_ comprised of given set or characters
    function randomString(length, charSet) {
        length = length || 32;
        charSet = charSet || charSets.full;
        var rnd = new Uint8Array(1);
        var str = "";
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

    return {
        randomString: randomString,
        chars: chars,
        charSets: charSets
    };
})();
