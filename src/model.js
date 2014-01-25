/**
 * Module containing logic for records, collections and the data store.
 */
define(["padlock/crypto", "padlock/util"], function(crypto, util) {
    /**
     * A _Store_ manages encryption and persistent storage for collections
     * @param {String} password Password used for encrpytion
     */
    var Store = function(password) {
        this.password = "";
    };

    Store.prototype = {
        /**
         * Fetches the data for an array from local storage, decrypts it and poplulates the collection
         * @param  {Collection} coll     The collection to fetch the data for
         * @param  {String}     password (Optional) Password to be used for decryption. If not provided,
         *                               the stores own _password_ property will be used
         * @return {Boolean}             _true_ if the fetch was successful, _false_ if not
         */
        fetch: function(coll, password) {
            // Use password argument if provided, otherwise use _this.password_
            password = password !== undefined && password !== null ? password : this.password;
            var obj = {};

            // Get raw JSON data from local storage
            var json = localStorage.getItem("coll_" + coll.name);
            if (json) {
                try {
                    // Try to decrypt and parse data
                    var c = JSON.parse(json);
                    coll.records = JSON.parse(crypto.pwdDecrypt(password, c));
                } catch (e) {
                    return false;
                }
            }

            // Remember the password for next time we save of fetch data
            this.password = password;

            return true;
        },
        /**
         * Encrypts the contents of a collection and saves them to local storage.
         * @param  {Collection} coll Collection to save
         */
        save: function(coll) {
            // Stringify the collections record array
            var pt = JSON.stringify(coll.records);
            // Encrypt the JSON string
            var c = crypto.pwdEncrypt(this.password, pt);
            // Save a JSON representation of the crypto container to local storage
            localStorage.setItem("coll_" + coll.name, JSON.stringify(c));
        },
        /**
         * Checks whether or not data for a collection exists in localstorage
         * @param  {String} collName Name of the collection
         * @return {Boolean}         _true_ if the collection exists, _false_ if not
         */
        collectionExists: function(collName) {
            return localStorage.getItem("coll_" + collName) !== null;
        }
    };

    /**
     * A collection of records
     * @param {String} name    Name of the collection
     * @param {Array}  records Initial records
     * @param {Store}  store   Store used for persistent storage
     */
    var Collection = function(name, records, store) {
        this.name = name || "default";
        this.records = records || [];
        this.store = store || new Store();
    };

    Collection.prototype = {
        /**
         * Fetches the data for this collection
         * @param  {String} password Password to be used for decyrption
         * @return {Boolean}         _true_ if fetching was successful, _false_ if not
         */
        fetch: function(password) {
            return this.store.fetch(this, password);
        },
        /**
         * Saves the collections contents
         */
        save: function() {
            this.store.save(this);
        },
        /**
         * Adds a record or an array of records to the collection
         * @param {Object}  rec A record object or an array of record objects to be added to the collection
         * @param {Integer} at  (optional) Where to insert the record(s). If omitted, the record(s) will be
         *                      added at the end
         */
        add: function(rec, at) {
            this.records = util.insert(this.records, rec, at !== undefined && at !== null ? at : this.records.length);
        },
        /**
         * Removes a record from this collection
         * @param  {Object} rec The record object to be removed
         */
        remove: function(rec) {
            var index = this.records.indexOf(rec);
            if (index != -1) {
                this.removeAt(index);
            }
        },
        /**
         * Removes the records at the specified range
         * @param  {Integer} from Start index for removal range
         * @param  {[type]}  to   End index for removal range
         */
        removeAt: function(from, to) {
            this.records = util.remove(this.records, from, to);
        },
        /**
         * Replaces a record object with another object
         * @param  {Object} orig Originial record
         * @param  {Object} repl Replacement
         */
        replace: function(orig, repl) {
            this.records[this.records.indexOf(orig)] = repl;
        },
        /**
         * Sets the new password for this collections store and saves the collection
         * @param {String} password New password
         */
        setPassword: function(password) {
            this.store.password = password;
            this.save();
        },
        /**
         * Checks if data for this collection exists in localstorage
         * @return {Boolean} _true_ if data for this collection exists, _false_ if not
         */
        exists: function() {
            return this.store.collectionExists(this.name);
        },
        /**
         * Empties the collection and removes the stored password
         */
        lock: function() {
            this.records = [];
            this.store.password = null;
        }
    };

    return {
        Store: Store,
        Collection: Collection
    };
});