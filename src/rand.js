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

    //* Returns a random item from an array of a random char from a string
    function randomItem(choices) {
        return choices[Math.floor(Math.random()*choices.length)];
    }

    //* Creates a random string with a given _length_ comprised of given set or characters
    function randomString(length, charSet) {
        length = length || 32;
        charSet = charSet || charSets.full;
        var rndm = "";
        while (rndm.length < length) {
            rndm += randomItem(charSet);
        }
        return rndm;
    }

    return {
        randomString: randomString,
        chars: chars
    };
})();
