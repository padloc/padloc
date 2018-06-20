(function() {
    window.pbkdf2 = function(passphrase, salt, opts, successCb, failCb) {
        opts = opts || {};

        var promise, success, fail;
        if (typeof Promise !== "undefined") {
            promise = new Promise(function(resolve, reject) {
                success = function(key) {
                    typeof successCb === "function" && successCb(key);
                    resolve(key);
                }
                fail = function(e) {
                    typeof failCb === "function" && failCb(e);
                    reject(e);
                }
            });
        } else {
            success = successCb;
            fail = failCb;
        }

        cordova.exec(
            success,
            fail,
            "Pbkdf2",
            "genKey",
            [
                passphrase,
                salt,
                opts.iterations || 10000,
                opts.keySize || 256
            ]
        );

        return promise;
    };
})();
