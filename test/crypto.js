define(["padlock/crypto"], function(crypto) {
    module("padlock/crypto");

    test("key generation", function() {
        var keyLength = 256, pwd = "password";

        var p = crypto.genKey(pwd);
        var p2 = crypto.genKey(pwd, p.salt);

        equal(p.key, p2.key, "Two keys created with the same password and salt should be equal.");
        equal(p.salt, p2.salt, "The correct salt should be passed back with the key object.");

        p2 = crypto.genKey(pwd);

        notEqual(p.key, p2.key, "A key generated with new salt should turn out differently.");
    });

    test("encrypt/decrypt roundtrip", function() {
        var pwd = "password", pt = "Hello World!";
        var p = crypto.genKey(pwd);

        var c = crypto.encrypt(p.key, pt);

        var newC = crypto.encrypt(p.key, pt);
        notEqual(newC.ct, c.ct, "Encrypting the same value twice with the same key should result " +
                                "in two different cipher texts.");

        var dec = crypto.decrypt(p.key, c);
        equal(dec, pt, "The decrypted value should be equal to the original value");
    });

    test("pwdEncrypt/pwdDecrypt roundtrip", function() {
        var pwd = "password", pt = "Hello World!";

        var c = crypto.pwdEncrypt(pwd, pt);
        var pt2 = crypto.pwdDecrypt(pwd, c);

        equal(pt2, pt, "The decrypted value should be equal to original value.");

        c2 = crypto.pwdEncrypt(pwd, pt);
        notEqual(c2.ct, c.ct, "The same plaintext/password pair should not result in the same cypher text");
    });
});