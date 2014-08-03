/* jshint worker: true, browser: true */
/* global padlock, sjcl */

/**
 * Cyptrographic module for encrypting and decrypting content
 */
(function() {
    "use strict";

    // Whether or not the script was loaded in the context of a web worker instance
    // Perhaps there is a more reliable way to detect this?
    var isWorker = !!self.importScripts;

    // The function defining the module
    var modFunc = function(sjcl) {
        // Available cipher algorithms
        var ciphers = {
            AES: "AES"
        };

        // Available cipher modes
        var modes = {
            CCM: "ccm",
            OCB2: "ocb2"
        };

        // Various default parameters
        var defaults = {
            keySize: 256,
            iter: 10000
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
                cipher: ciphers.AES,       // Used cipher algorithm
                mode: modes.CCM,           // Encription mode (ccm or ocb2)
                iv: rand(),                // Initialization vector
                salt: "",                  // Salt used during key derivation
                keySize: defaults.keySize, // The size of the used key
                iter: defaults.iter,       // The number of iterations used for the key derivation
                ct: "",                    // The resulting cipher text
                adata: rand(),             // Authenticated data used for checking the integrity of
                                           // the encrypted message during decryption
                ts: 64                     // Size of the used authentication tag
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
            salt = toBits(salt);
            var p = sjcl.misc.cachedPbkdf2(passphrase, {iter: iter, salt: salt});
            p.key = fromBits(p.key.slice(0, size/32));
            p.salt = fromBits(salt);
            p.iter = iter;
            p.size = size;
            return p;
        }

        // Cache object for calculated keys
        var keyCache = {};

        //* Same as genKey, but fetches the data from cache if possible
        function cachedGenKey() {
            var prop = Array.prototype.join.call(arguments, "_");
            keyCache[prop] = keyCache[prop] || genKey.apply(null, arguments);
            return keyCache[prop];
        }

        //* Clears the cache for generating keys
        function clearKeyCache() {
            keyCache = {};
        }
        
        /**
         * Decrypts a value inside a _crypto.container_ using the provided _keyData_
         * @param {string} keyData
         * Key object containing the actual key (base64 encoded) and the used iterations and salt
         * @param {object} value
         * A _crypto.container_ containing the value to be decrypted
         */
        function decrypt(keyData, cont) {
            var aes = new sjcl.cipher.aes(toBits(keyData.key));
            var pt = sjcl.mode[cont.mode].decrypt(aes, toBits(cont.ct), toBits(cont.iv), cont.adata, cont.ts);
            return sjcl.codec.utf8String.fromBits(pt);
        }

        /**
         * Encrypts the _value_ using the provided _key_ and wraps it into a _crypto.container_ object.
         * @param {Object} keyData
         * Key object containing the actual key (base64 encoded) and the used iterations and salt
         * @param {string} value
         * Value to be encrypted
         */
        function encrypt(keyData, value) {
            var cont = initContainer();
            // Add key meta data to container so the key can later be reconstructed from the password
            cont.salt = keyData.salt;
            cont.iter = keyData.iter;
            cont.keySize = keyData.size;
            var aes = new sjcl.cipher.aes(sjcl.codec.base64.toBits(keyData.key));
            var pt = sjcl.codec.utf8String.toBits(value);
            var ct = sjcl.mode[cont.mode].encrypt(aes, pt, toBits(cont.iv), cont.adata, cont.ts);
            cont.ct = fromBits(ct);
            return cont;
        }

        //* Spawns a worker instance using this same script and returns it.
        function spawnWorker() {
            return new Worker("src/crypto.js");
        }

        //* Helper function for delegating the call to a certain _method_ to a worker instance
        function workerDo(method, args, success, fail) {
            var worker = spawnWorker();

            // Wait for the response.
            worker.addEventListener("message", function(e) {
                success(e.data);
                // This worker has done its part. Time to go.
                worker.terminate();
            });

            worker.addEventListener("error", function(e) {
                if (fail) {
                    fail(e);
                    // Prevent default behaviour of error event (i.e. recover)
                    e.preventDefault();
                }
                // This worker has done its part. Time to go.
                worker.terminate();
            });

            // This will invoke the method. The worker will post back the result as soon as it's done
            worker.postMessage({
                method: method,
                args: args
            });

            // Return the worker just in case
            return worker;
        }

        /**
         * Same as _genKey_, but uses a web worker for the heavy lifting. Therefore the call is asynchronous.
         * The result will be passed as the single argument to the _callback_ function
         */
        function workerGenKey(passphrase, salt, size, iter, callback) {
            return workerDo("genKey", [passphrase, salt, size, iter], callback);
        }

        //* Same as _workerGenKey_, but fetches the data from cache if possible
        function cachedWorkerGenKey(passphrase, salt, size, iter, callback) {
            var prop = Array.prototype.slice.call(arguments, 0, -1).join("_"),
                cached = keyCache[prop];
            if (cached) {
                callback(cached);
            } else {
                workerGenKey(passphrase, salt, size, iter, function(keyData) {
                    keyCache[prop] = keyData;
                    callback(keyData);
                });
            }
        }

        /**
         * Same as _decrypt_, but uses a web worker for the heavy lifting. Therefore the call is asynchronous.
         * The result will be passed as the single argument to the _callback_ function
         */
        function workerDecrypt(keyData, cont, success, fail) {
            workerDo("decrypt", [keyData, cont], success, fail);
        }

        /**
         * Same as _encrypt_, but uses a web worker for the heavy lifting. Therefore the call is asynchronous.
         * The result will be passed as the single argument to the _callback_ function
         */
        function workerEncrypt(keyData, value, success, fail) {
            workerDo("encrypt", [keyData, value], success, fail);
        }

        return {
            ciphers: ciphers,
            modes: modes,
            defaults: defaults,
            rand: rand,
            initContainer: initContainer,
            genKey: genKey,
            cachedGenKey: cachedGenKey,
            clearKeyCache: clearKeyCache,
            decrypt: decrypt,
            encrypt: encrypt,
            workerGenKey: workerGenKey,
            cachedWorkerGenKey: cachedWorkerGenKey,
            workerDecrypt: workerDecrypt,
            workerEncrypt: workerEncrypt
        };
    };

    if (isWorker) {
        // We're in a web worker! Let's create an interface for calling some of the modules methods

        // Load the sjcl dependency.
        importScripts("../lib/sjcl.js");
        // Create the module (Inject the dependy manually)
        var crypto = modFunc(sjcl);
        
        // Register handler for messages to the worker. Users can use _postMessage_ to invoke methods on the module
        // The result will be sent back via _postMessage_
        self.addEventListener("message", function(event) {
            var method = event.data.method,
                args = event.data.args,
                result;

            result = crypto[method].apply(crypto, args);
            self.postMessage(result);
        });
    } else {
        // The script was not loaded in the context of a web worker so we're assuming it was loaded in a script tag
        padlock.crypto = modFunc(sjcl);
    }

})();