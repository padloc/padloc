define(["sjcl"], function(sjcl) {
    // Available cipher algorithms
    var ciphers = {
        AES: "AES"
    };

    // Available cipher modes
    var modes = {
        CCM: "ccm",
        OCB2: "ocb2"
    };

    /**
     * Container object for encrypted values. Contains all the information needed to
     * successfully decrypt the encrypted value, except the key.
     * @type {[type]}
     */
    var container = Object.create({}, {
        cipher:  {value: ciphers.AES, writable: true, enumerable: true},
        mode:    {value: modes.CCM,   writable: true, enumerable: true},
        iv:      {value: "",          writable: true, enumerable: true},
        salt:    {value: "",          writable: true, enumerable: true},
        keySize: {value: 256,         writable: true, enumerable: true},
        iter:    {value: 1000,        writable: true, enumerable: true},
        ct:      {value: "",          writable: true},
        adata:   {value: [],          writable: true},
        ts:      {value: 64,          writable: true}
    });

    /**
     * Generates a cryptographic key out of a provided _passphrase_ and a random
     * _salt_ value. Uses the PBKDF2 algorithm.
     * @param  {string} passphrase
     * A string to be used as base for the key derivation
     * @param  {array}  salt
     * Base64 encoded salt to be used for key derivation. Will be generated if not provided
     * @param  {number} size
     * Desired key size. Defaults to 256
     * @param  {number} iter
     * Numer of iterations to use for the key derivation algorithm. Defaults to 1000
     * @return {object}
     * Key object containing the actual _key_ (base64 encoded) along with the used _salt_ and _iter_ations used
     */
    function genKey(passphrase, salt, size, iter) {
        var s = salt ? sjcl.codec.base64.toBits(salt) : sjcl.random.randomWords(4,0);
        size = size || 256;
        iter = iter || 1000;
        var p = sjcl.misc.cachedPbkdf2(passphrase, {iter: iter, salt: s});
        p.key = sjcl.codec.base64.fromBits(p.key.slice(0, size/32));
        p.salt = sjcl.codec.base64.fromBits(s);
        p.size = size;
        return p;
    }
    
    /**
     * Decrypts a value inside a _crypto.container_ using the provided _key_
     * @param {string} key
     * The encryption key (base64 encoded)
     * @param {object} value
     * A _crypto.container_ containing the value to be decrypted
     */
    function decrypt(key, cont) {
        var aes = new sjcl.cipher.aes(sjcl.codec.base64.toBits(key));
        var iv = sjcl.codec.base64.toBits(cont.iv);
        var ct = sjcl.codec.base64.toBits(cont.ct);
        var pt = sjcl.mode[cont.mode].decrypt(aes, ct, iv, cont.adata, cont.ts);
        return sjcl.codec.utf8String.fromBits(pt);
    }

    /**
     * Encrypts the _value_ using the provided _key_ and wraps it into a _crypto.container_ object.
     * @param {string} key
     * Key to be used for encryption (base64 encoded)
     * @param {string} value
     * Value to be encrypted
     * @param {string} adata
     * Authenticated data to be used for checking the integrity of the encrypted data and whether
     * a description was successful
     * @param {number} tagSize
     */
    function encrypt(key, value, adata, tagSize) {
        var cont = Object.create(container);
        var iv = sjcl.random.randomWords(4,0);
        var aes = new sjcl.cipher.aes(sjcl.codec.base64.toBits(key));
        var pt = sjcl.codec.utf8String.toBits(value);
        cont.adata = adata || sjcl.codec.base64.fromBits(sjcl.random.randomWords(4,0));
        cont.ts = tagSize || 0;
        var ct = sjcl.mode[cont.mode].encrypt(aes, pt, iv, cont.adata, cont.ts);
        cont.iv = sjcl.codec.base64.fromBits(iv);
        cont.ct = sjcl.codec.base64.fromBits(ct);
        return cont;
    }

    function pwdDecrypt(pwd, cont) {
        var p = genKey(pwd, cont.salt, cont.keySize, cont.iter);
        return decrypt(p.key, cont);
    }

    function pwdEncrypt(pwd, value) {
        var p = genKey(pwd);
        var cont = encrypt(p.key, value);
        cont.salt = p.salt;
        cont.iter = p.iter;
        cont.keySize = p.size;
        return cont;
    }

    return {
        ciphers: ciphers,
        modes: modes,
        container: container,
        genKey: genKey,
        decrypt: decrypt,
        encrypt: encrypt,
        pwdDecrypt: pwdDecrypt,
        pwdEncrypt: pwdEncrypt
    };
});