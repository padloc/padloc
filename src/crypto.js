/**
 * Cyptrographic module for encrypting and decrypting content
 */
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

    // Shorthands for base64 codec
    var fromBits = sjcl.codec.base64.fromBits;
    var toBits = sjcl.codec.base64.toBits;

    /**
     * Returns a base64 encoded random string
     */
    function rand() {
        return fromBits(sjcl.random.randomWords(4,0));
    }

    /**
     * Creates an object containing all the contextual information for an encrypted value
     */
    function initContainer() {
        return {
            cipher: ciphers.AES, // Used cipher algorithm
            mode: modes.CCM,     // Encription mode (ccm or ocb2)
            iv: rand(),          // Initialization vector
            salt: "",            // Salt used during key derivation
            keySize: 256,        // The size of the used key
            iter: 1000,          // The number of iterations used for the key derivation
            ct: "",              // The resulting cipher text
            adata: rand(),       // Authenticated data used for checking the integrity of
                                 // the encrypted message during decryption
            ts: 64               // Size of the used authentication tag
        };
    }

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
        salt = toBits(salt || rand());
        size = size || 256;
        iter = iter || 1000;
        var p = sjcl.misc.cachedPbkdf2(passphrase, {iter: iter, salt: salt});
        p.key = fromBits(p.key.slice(0, size/32));
        p.salt = fromBits(salt);
        p.iter = iter;
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
        var aes = new sjcl.cipher.aes(toBits(key));
        var pt = sjcl.mode[cont.mode].decrypt(aes, toBits(cont.ct), toBits(cont.iv), cont.adata, cont.ts);
        return sjcl.codec.utf8String.fromBits(pt);
    }

    /**
     * Encrypts the _value_ using the provided _key_ and wraps it into a _crypto.container_ object.
     * @param {string} key
     * Key to be used for encryption (base64 encoded)
     * @param {string} value
     * Value to be encrypted
     */
    function encrypt(key, value) {
        var cont = initContainer();
        var aes = new sjcl.cipher.aes(sjcl.codec.base64.toBits(key));
        var pt = sjcl.codec.utf8String.toBits(value);
        var ct = sjcl.mode[cont.mode].encrypt(aes, pt, toBits(cont.iv), cont.adata, cont.ts);
        cont.ct = fromBits(ct);
        return cont;
    }

    /**
     * Does the same as _decrypt_ but takes a simple passphrase instead of a key and uses the _genKey_
     * function to generate a the appropriate cryptographic key.
     * @param  {string} pwd  Password to derive encryption key from
     * @param  {object} cont Object containing the cipher text as well as all the contextual information
     *                       needed for decryption (except the key, of course)
     * @return {string}      The decrypted value
     */
    function pwdDecrypt(pwd, cont) {
        var p = genKey(pwd, cont.salt, cont.keySize, cont.iter);
        return decrypt(p.key, cont);
    }

    /**
     * Does the same as _encrypt_ but takes a simple passphrase instead of a key and uses the _getKey_
     * function to generate an appropriate cryptographic key.
     * @param  {string} pwd   The password to derive the key from
     * @param  {[type]} value The value to be encrypted
     * @return {[type]}       An object containing the cipher text as well as all the contextual information
     *                        needed for decryption (except the key, of course)
     */
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
        initContainer: initContainer,
        genKey: genKey,
        decrypt: decrypt,
        encrypt: encrypt,
        pwdDecrypt: pwdDecrypt,
        pwdEncrypt: pwdEncrypt
    };
});