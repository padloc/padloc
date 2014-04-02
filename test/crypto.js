define(["padlock/crypto"], function(crypto) {
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
});