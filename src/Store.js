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
                // Try to decrypt and parse data. This might fail either if the password
                // is incorrect or the data corrupted. If the decryption is successful, the parsing
                // should usually be no problem.
                try {
                    var records = JSON.parse(crypto.pwdDecrypt(password, data));
                    coll.add(records);
                    if (opts.success) {
                        opts.success(coll);
                    }
                } catch (e) {
                    if (opts.fail) {
                        opts.fail(e);
                    }
                }
            }, fail: opts.fail});

            // Remember the password for next time we save or fetch data
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
            source = opts.source || this.defaultSource;
            // Stringify the collections record array
            var pt = JSON.stringify(coll.records);
            // Encrypt the JSON string
            var c = crypto.pwdEncrypt(this.password, pt);
            opts.key = this.getKey(coll);
            opts.data = c;
            source.save(opts);
        },
        /**
         * Checks whether or not data for a collection exists in localstorage
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
            source.exists(opts);
        }
    };

    return Store;
});