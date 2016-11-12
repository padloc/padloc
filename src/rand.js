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

    //* Returns a random uniform value 0 to max, or -1 if max < 0 or max > 0x7fffffff
    function secureRandom(max) {
        var rand = new Uint32Array(1);
        var result;

        max = max | 0;
        if (max < 0 || max > 0x7fffffff) {
            return -1;
        }

        if (((max + 1) & max) === 0) {
            window.crypto.getRandomValues(rand);
            result = rand[0] & max;
        } else {
            var skip = 0x7fffffff - 0x7fffffff % (max + 1);

            do {
                window.crypto.getRandomValues(rand);
                result = rand[0] & 0x7fffffff;
            } while (result >= skip);
            result %= max + 1;
        }
        return result;
    }

    //* Creates a random string with a given _length_ comprised of given set or characters
    function randomString(length, charSet) {
        length = length || 32;
        charSet = charSet || charSets.full;
        var str = "";
        for (var i=0; i<length; i++) {
            str += charSet[secureRandom(charSet.length - 1)];
        }
        return str;
    }

    return {
        randomString: randomString,
        chars: chars
    };
})();
