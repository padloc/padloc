(function(crypto) {
    module("padlock/crypto");

    test("key generation", function() {
        var pwd = "password", salt = crypto.rand(), keyLength = 256, iter = 1000;

        var p = crypto.genKey(pwd, salt, keyLength, iter);
        var p2 = crypto.genKey(pwd, salt, keyLength, iter);

        equal(p.key, p2.key, "Two keys created with the same password and salt should be equal.");
        equal(p.salt, p2.salt, "The correct salt should be passed back with the key object.");

        p2 = crypto.genKey(pwd, crypto.rand(), keyLength, iter);

        notEqual(p.key, p2.key, "A key generated with new salt should turn out differently.");
    });

    test("encrypt/decrypt roundtrip", function() {
        var pwd = "password", salt = crypto.rand(), keyLength = 256, iter = 1000, pt = "Hello World!";
        var p = crypto.genKey(pwd, salt, keyLength, iter);

        var c = crypto.encrypt(p, pt);

        var newC = crypto.encrypt(p, pt);
        notEqual(newC.ct, c.ct, "Encrypting the same value twice with the same key should result " +
                                "in two different cipher texts.");

        var dec = crypto.decrypt(p, c);
        equal(dec, pt, "The decrypted value should be equal to the original value");
    });

    asyncTest("worker keyGen", function() {
        expect(1);

        var pwd = "password", salt = crypto.rand(), keyLength = 256, iter = 1000,
            p = crypto.genKey(pwd, salt, keyLength, iter);

        crypto.workerGenKey(pwd, salt, keyLength, iter, function(keyData) {
            deepEqual(keyData, p, "Key obtained through the worker version should be identical to the one obtained " +
                "through the regular one.");
            start();
        });
    });

    asyncTest("worker encrypt", function() {
        var pwd = "password", salt = crypto.rand(), keyLength = 256, iter = 1000, pt = "Hello World!",
            p = crypto.genKey(pwd, salt, keyLength, iter);

        crypto.workerEncrypt(p, pt, function(c) {
            var pt2 = crypto.decrypt(p, c);
            equal(pt2, pt, "Worker version should work the same as the regular one, just asyncronously. I.e. the " +
                "result should be decryptable with the same key.");
            start();
        });
    });

    asyncTest("worker encrypt", function() {
        var pwd = "password", salt = crypto.rand(), keyLength = 256, iter = 1000, pt = "Hello World!",
            p = crypto.genKey(pwd, salt, keyLength, iter),
            c = crypto.encrypt(p, pt);

        crypto.workerDecrypt(p, c, function(pt2) {
            equal(pt2, pt, "Worker version should work the same as the regular one, just asyncronously. I.e. it " +
                "should be able to decrypt a cipher text encrypted with the same key.");
            start();
        });
    });
})(padlock.crypto);