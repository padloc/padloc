/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import { randomString, charSets } from "../app/src/core/util";

suite("util", function() {
    test("randomString", function() {

        var charSet = charSets.full;
        var strings = {};
        var n = 0;
        var count = {};
        for (var k = 0; k < charSet.length; k++) {
            count[charSet[k]] = 0;
        }
        var wrongLength = false;
        var duplicates = 0;

        for (var i = 0; i < 10000; i++) {
            var l = Math.floor(Math.random() * 50) + 10;
            var rnd = randomString(l, charSet);
            if (rnd.length !== l) {
                wrongLength = true;
            }
            if (strings[rnd]) {
                duplicates++;
            }

            strings[rnd] = true;

            for (var j = 0; j < rnd.length; j++) {
                if (!(rnd[j] in count)) {
                    assert.fail("String should only contain characters from the char set",
                                "Found character " + rnd[j]);
                } else {
                    count[rnd[j]]++;
                }
            }

            n += l;
        }

        assert(!wrongLength, "All generated strings should have the right length");
        assert(!duplicates, "All generated strings should be unique; found " + duplicates + " duplicates");

        var avg = n / charSet.length;
        for (var char in count) {
            var dev = count[char] / avg - 1;
            assert(
                Math.abs(dev) < 0.05,
                "Deviation of each char count from expected average should be less than 5%; " +
                "Got " + dev + " for " + char
            );
        }

    });

});
