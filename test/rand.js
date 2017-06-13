(function(rand) {
    module("padlock/rand");

    test("randomString", function() {
        var charSet = rand.charSets.full;
        var strings = {};
        var n = 0;
        var count = {};
        for (var k = 0; k < charSet.length; k++) {
            count[charSet[k]] = 0;
        }
        var wrongLength = false;
        var duplicates = 0;

        for (var i = 0; i < 100000; i++) {
            var l = Math.floor(Math.random() * 50) + 10;
            var rnd = rand.randomString(l, rand.charSets.full);
            if (rnd.length !== l) {
                wrongLength = true;
            }
            if (strings[rnd]) {
                duplicates++;
            }

            strings[rnd] = true;

            for (var j = 0; j < rnd.length; j++) {
                if (!(rnd[j] in count)) {
                    ok(false, "The string should only contain characters from the char set; found " + rnd[j]);
                } else {
                    count[rnd[j]]++;
                }
            }

            n += l;
        }

        ok(!wrongLength, "All generated strings should have the right length");
        ok(!duplicates, "All generated strings should be unique; found " + duplicates + " duplicates");

        var avg = n / charSet.length;
        for (var char in count) {
            var dev = count[char] / avg - 1;
            ok(Math.abs(dev) < 0.05, "Deviation of each char count from expected average should be less than 5%; " +
                "Got " + dev + " for " + char);
        }

    });

})(padlock.rand);
