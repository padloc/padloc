/* global padlock */

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
        var rnd = new Uint8Array(length);
        var str = "";
        window.crypto.getRandomValues(rnd);
        for (var i=0; i<length; i++) {
            str += charSet[Math.floor(rnd[i] * charSet.length / 256)];
        }
        return str;
    }

    return {
        randomString: randomString,
        chars: chars
    };
})();
