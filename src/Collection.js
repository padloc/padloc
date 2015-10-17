/* global padlock */

/**
 * Module containing logic for records, collections and the data store.
 */
padlock.Collection = (function(util) {
    "use strict";

    /**
     * A collection of records
     * @param {String} name    Name of the collection
     * @param {Store}  store   Store instance to be used. If not provided,
     *                         a new instance will be created.
     */
    var Collection = function(name, store) {
        this.name = name || "default";
        this.store = store;
        this.records = [];
        // This is to keep track of all existing records via their uuid.
        this.uuidMap = {};
        // Helper element for dispatching custom events. This is currently only used for publishing
        // the `update` event
        this.dispatcher = document.createElement("div");
    };

    Collection.prototype = {
        /**
         * Fetches the data for this collection
         * @param {Object} opts Object containing options for the call. Options may include:
         *
         * - password: Password to be used for decyrption
         * - success:  Success callback. Will be passed the collection as only argument
         * - fail:     Fail callback
         * - source:   Source to to be used. If not provided, the stores default source is used.
         */
        fetch: function(opts) {
            this.store.fetch(this, opts);
        },
        /**
         * Saves the collections contents
         * @param {Object} opts Object containing options for the call. Options may include:
         *
         * - success:  Success callback. Will be passed the collection as only argument
         * - fail:     Fail callback
         * - source:   Source to to be used. If not provided, the stores default source is used.
         */
        save: function(opts) {
            var rec = opts && opts.record;
            if (rec) {
                rec.name = rec.name || "Unnamed";
                rec.updated = new Date();
            }
            this.store.save(this, opts);
        },
        /**
         * Destroy the collection and delete its data
         * @param {Object} opts Object containing options for the call. Options may include:
         *
         * - success:  Success callback. Will be passed the collection as only argument
         * - fail:     Fail callback
         * - source:   Source to delete this collection from. If not provided, the stores default source is used.
         */
        destroy: function(opts) {
            this.store.destroy(this, opts);
        },
        /**
         * Calls `splice` on the `records` property with the given arguments and fires the `update` event to
         * notify any subscribers. Always use this method instead of manipulating the `records` array directly
         * since the `update` event is required by web components to update bindings.
         */
        splice: function() {
            var rem = Array.prototype.splice.apply(this.records, arguments);
            var e = new CustomEvent("update", {detail: Array.prototype.slice.apply(arguments)});
            this.dispatcher.dispatchEvent(e);
            return rem;
        },
        /**
         * Adds a record or an array of records to the collection. If the record does not
         * have a _uuid_ yet, it will be generated. If two records with the same _uuid_ exist, i.e.
         * if one exists in the collection and one is added, the one with the more recent _updated_
         * property is used.
         * @param {Object}  rec A record object or an array of record objects to be added to the collection
         */
        add: function(rec) {
            var newRecords = [];

            rec = util.isArray(rec) ? rec : [rec];
            rec.forEach(function(r) {
                // Generate uuid if the record doesn't have one yet
                r.uuid = r.uuid || util.uuid();

                // If the record does not have and 'updated' property, use the current time
                var updated = r.updated || new Date();
                // If the updated property is not a Date object, convert it to one.
                r.updated = updated instanceof Date ? updated : new Date(updated);

                // If a record with the same uuid exists but the new one is more
                // recent, replace the existing one in-place. Otherwise add it to
                // the array of new records to be added
                var existing = this.uuidMap[r.uuid];
                if (existing && r.updated > existing.updated) {
                    // Switch out record in-place in both uuid map and records array
                    this.uuidMap[r.uuid] = r;
                    this.splice(this.records.indexOf(existing), 1, r);
                } else if (!existing) {
                    this.uuidMap[r.uuid] = r;
                    newRecords.push(r);
                }
            }.bind(this));

            // add new records to the end of the array
            this.splice.apply(this, [this.records.length, 0].concat(newRecords));
        },
        /**
         * Removes a record from this collection. This does not actually remove the record from
         * the _records_ array but instead removes all the information except the _uuid_ and sets
         * the _removed_ property to _true_. This makes it possible to synchronize deleting
         * records between sources.
         * @param  {Object} rec The record object to be removed
         */
        remove: function(rec) {
            // remove all properties except uuid
            for (var prop in rec) {
                if (rec.hasOwnProperty(prop) && prop != "uuid") {
                    delete rec[prop];
                }
            }
            // During synchronization removing an item is treated like editing, so we have to set the
            // `updated` property
            rec.updated = new Date();
            // The `removed` propery is used to filter out removed items from the list.
            rec.removed = true;
        },
        /**
         * Sets the new password for this collections store and saves the collection
         * @param {String} password New password
         */
        setPassword: function(password) {
            // Setting a new password effectively just means reencrypting the data with the new password
            this.save({password: password});
        },
        /**
         * Checks whether or not data for the collection exists
         * @param  {Object}     opts Object containing options for the call. Options may include:
         *
         * - success:  Success callback. Will be passed _true_ or _false_ as only argument,
         *             depending on the outcome.
         * - fail:     Fail callback
         * - source:   Source to check for the collection. If not provided, _defaultSource_ is used.
         */
        exists: function(opts) {
            this.store.exists(this, opts);
        },
        /**
         * Empties the collection and removes the stored password
         */
        clear: function() {
            this.splice(0, this.records.length);
            this.uuidMap = {};
            this.store.clear();
        },
        /**
         * Synchronizes the collection with a different source
         * @param  {Source} source The source to sync with
         * @param  {Object} opts   Object containing options. Options may include:
         *
         *                         - success: Success callback
         *                         - fail: Failure callback
         */
        sync: function(source, opts) {
            opts = opts || {};

            // If a remote password is provided or a password is already stored on the remote source,
            // use that one. Otherwise assume that the remote password is the same as the local one
            if (opts.remotePassword === undefined && source.password === undefined) {
                opts.remotePassword = this.defaultPassword;
            }

            // Fetch data from remote source
            var fetchRemote = function() {
                this.fetch({source: source, success: saveLocal, fail: opts.fail, password: opts.remotePassword});
            }.bind(this);

            // Save data to local source
            var saveLocal = function() {
                this.save({success: saveRemote, fail: opts.fail});
            }.bind(this);

            // Update remote source
            var saveRemote = function() {
                this.save({source: source, success: done, fail: opts.fail, password: opts.remotePassword});
            }.bind(this);

            // We're done!
            var done = function() {
                if (opts && opts.success) {
                    opts.success();
                }
            }.bind(this);

            fetchRemote();
        },
        //* The password associated with the default source
        get defaultPassword() {
            return this.store.defaultSource.password;
        },
        //* Add event listener to the dispatcher. Usually this will be used for subscribing to the `update` event
        addEventListener: function() {
            this.dispatcher.addEventListener.apply(this.dispatcher, arguments);
        }
    };

    return Collection;
})(padlock.util);
