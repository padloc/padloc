module("safe.crypto");

test("key generation", function() {
    var keyLength = 256, pwd = "password";

    var key = safe.crypto.genKey(pwd, null, keyLength);

    // Make sure key is the right size
    equal(key.key.length, keyLength/32);

    var newKey = safe.crypto.genKey(pwd, key.salt, keyLength);

    // Using the same password and salt should result in the same key
    deepEqual(key.key, newKey.key);
    deepEqual(key.salt, newKey.salt);

    newKey = safe.crypto.genKey(pwd, null, keyLength);

    // A key generated with new salt should turn out differently.
    notDeepEqual(newKey.key, key.key);
});

test("encrypt/decrypt roundtrip", function() {
    var pwd = "password", pt = "Hello World!";
    var key = safe.crypto.genKey(pwd);

    var c = safe.crypto.encrypt(key.key, pt);

    // We should get back a _safe.crypto.container_ object
    ok(safe.crypto.container.isPrototypeOf(c));

    // Encrypting the same value twice with the same key should
    // result in two different cipher texts, since a new iv is randomly
    // generated each time
    var newC = safe.crypto.encrypt(key.key, pt);
    notEqual(newC.ct, c.ct);

    // Decrypted value should be equal to the original value
    var dec = safe.crypto.decrypt(key.key, c);

    equal(dec, pt);
});