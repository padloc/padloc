define(["padlock/crypto"], function(crypto) {
    /**
     * The _Store_ acts as a proxy between the persistence layer (e.g. _LocalStorageSource_)
     * and a _Collection_ object it mainly handles encryption and decryption of data
     * @param Object defaultSource Default source to be used for _fetch_, _save_ etc.
     */
    var Store = function(defaultSource) {
        this.defaultSource = defaultSource;
        this.password = "";
    };

    Store.prototype = {
        getKey: function(coll) {
            return "coll_" + coll.name;
        },
        /**
         * Fetches the data for an array from local storage, decrypts it and populates the collection
         * @param  {Collection} coll     The collection to fetch the data for
         * @param  {Object}     opts     Object containing options for this call. Options may include:
         * 
         * - password: Password to be used for decryption. If not provided,
         *                        the stores own _password_ property will be used
         * - success:  Success callback
         * - fail:     Fail callback. The call will fail if 
         *             a) retrieving the data from the source fails,
         *             b) the encrypted data is corrupted or
         *             c) the provided password is incorrect.
         * - source:   Source to use for retreiving the data. If not provided, _defaultSource_ is used. 
         */
        fetch: function(coll, opts) {
            opts = opts || {};
            source = opts.source || this.defaultSource;
            // Use password argument if provided, otherwise use _this.password_
            var password = opts.password !== undefined && opts.password !== null ? opts.password : this.password,
                key = this.getKey(coll);

            source.fetch({key: key, success: function(data) {
                // If there is no data, we simply consider the collection to be empty.
                if (data) {
                    // Store the key generation parameters for this source so we can later reconstruct
                    // the same key when saving.
                    source.keyOpts = {
                        salt: data.salt,
                        size: data.keySize,
                        iter: data.iter
                    };
                    
                    // Construct a cryptographic key using the password provided by the user and the metadata
                    // from the fetched container. The whole thing happens in a web worker which is why it's asynchronous
                    crypto.cachedWorkerGenKey(password, data.salt, data.keySize, data.iter, function(keyData) {
                        // Use the generated key to decrypt the data. Again, this is done in a web worker.
                        crypto.workerDecrypt(keyData, data, function(pt) {
                            // If the decryption was successful, there should be, under normal circumstances, no
                            // reason why the parsing should fail. So we can do without a try-catch.
                            var records = JSON.parse(pt);
                            coll.add(records);
                            if (opts.success) {
                                opts.success(coll);
                            }
                        }, function(e) {
                            // The decryption failed, probably because the password was incorrect
                            if (opts.fail) {
                                fail(e);
                            }
                        });
                    });
                }
            }, fail: opts.fail});

            // Remember the password for the duration of the session
            this.password = password;
        },
        /**
         * Encrypts the contents of a collection and saves them to local storage.
         * @param  {Collection} coll Collection to save
         * @param  {Object}     opts Object containing options for the call. Options may include:
         *
         * - success:  Success callback
         * - fail:     Fail callback
         * - source:   Source to store the data to. If not provided, _defaultSource_ is used. 
         */
        save: function(coll, opts) {
            opts = opts || {};
            opts.key = this.getKey(coll);
            source = opts.source || this.defaultSource;
            source.keyOpts = source.keyOpts || {};

            var pt = JSON.stringify(coll.records),
                // Take the existing parameters for the key generation from the source kind if they are set.
                // Otherwise generate a new, random salt and use the defaults for key size and iteration count.
                salt = source.keyOpts.salt = source.keyOpts.salt || crypto.rand(),
                keySize = source.keyOpts.size = source.keyOpts.size || crypto.defaults.keySize,
                iter = source.keyOpts.iter = source.keyOpts.iter || crypto.defaults.iter;

            // Construct a cryptographic key using the password provided by the user and the metadata
            // from the source. The whole thing happens in a web worker which is why it's asynchronous
            crypto.cachedWorkerGenKey(this.password, salt, keySize, iter, function(keyData) {
                // Encrypt the data. Again, this happens in a web worker.
                crypto.workerEncrypt(keyData, pt, function(c) {
                    opts.data = c;
                    source.save(opts);
                });
            }.bind(this));
        },
        /**
         * Checks whether or not data for a collection exists
         * @param  {Collection} coll Collection to check for
         * @param  {Object}     opts Object containing options for the call. Options may include:
         *
         * - success:  Success callback. Will be passed _true_ or _false_ as only argument,
         *             depending on the outcome.
         * - fail:     Fail callback
         * - source:   Source to check for the collection. If not provided, _defaultSource_ is used. 
         */
        exists: function(coll, opts) {
            source = opts.source || this.defaultSource;
            opts = opts || {};
            opts.key = this.getKey(coll);
            var success = opts.success;
            opts.success = function(data) {
                // The _data_ argument will be either a non-emtpy string or _null_.
                // We want a boolean though so we'll have to convert it.
                success(!!data);
            };
            source.fetch(opts);
        }
    };

    return Store;
});