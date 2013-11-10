module("safe.crypto");

test("key generation", function() {
    var keyLength = 256, pwd = "password";

    var key = safe.crypto.genKey(pwd, null, keyLength);

    // Make sure key is the right size
    equal(key.key.length, keyLength/32);

    var newKey = safe.crypto.genKey(pwd, key.salt, keyLength);

    // Using the same password and salt should result in the same key
    equal(key.key.join(), newKey.key.join());
    equal(key.salt.join(), newKey.salt.join());
});