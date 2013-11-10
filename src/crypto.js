safe.crypto = (function(sjcl) {
    var ciphers = {
        AES: "AES"
    };

    var modes = {
        CCM: "ccm",
        OCB2: "ocb2"
    };

    var container = Object.create({}, {
        cipher: {value: ciphers.AES, writable: true, enumerable: true},
        mode:   {value: modes.CCM,   writable: true, enumerable: true},
        iv:     {value: "",          writable: true, enumerable: true},
        ct:     {value: "",          writable: true},
        adata:  {value: [],          writable: true},
        ts:     {value: 64,          writable: true}
    });

    function genKey(password, salt, size, iter) {
        salt = salt || sjcl.random.randomWords(4,0);
        size = size || 256;
        var p = sjcl.misc.cachedPbkdf2(password, {iter: iter || 1000, salt: salt});
        p.key = p.key.slice(0, size/32);
        return p;
    }
    
    /**
     * Decrypts a value inside a _crypto.container_ using the provided _key_
     * @param {string} key
     * The encryption key
     * @param {object} value
     * A _crypto.container_ containing the value to be decrypted
     */
    function decrypt(key, cont) {
        var aes = new sjcl.cipher.aes(key);
        var iv = sjcl.codec.base64.toBits(cont.iv);
        var ct = sjcl.codec.base64.toBits(cont.ct);
        var pt = sjcl.mode[cont.mode.toLowerCase()].decrypt(aes, ct, iv, unescape(cont.adata), cont.ts);
        return sjcl.codec.utf8String.fromBits(pt);
    }

    /**
     * Encrypts the _value_ using the provided _key_ and wraps it into a _crypto.container_ object.
     * @param {string} key
     * Key to be used for encryption
     * @param {string} value
     * Value to be encrypted
     * @param {array} adata
     * @param {number} tagSize
     */
    function encrypt(key, value, adata, tagSize) {
        var cont = Object.create(container);
        var iv = sjcl.random.randomWords(4,0);
        var aes = new sjcl.cipher.aes(key);
        var pt = sjcl.codec.utf8String.toBits(value);
        var ct = sjcl.mode[cont.mode].encrypt(aes, pt, iv, cont.adata, cont.ts);
        cont.iv = sjcl.codec.base64.fromBits(iv);
        cont.ct = sjcl.codec.base64.fromBits(ct);
        return cont;
    }

    return {
        ciphers: ciphers,
        modes: modes,
        container: container,
        genKey: genKey,
        decrypt: decrypt,
        encrypt: encrypt
    };
})(sjcl);