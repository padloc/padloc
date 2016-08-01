/* global padlock */

padlock.Source = (function() {
    "use strict";

    padlock.ERR_SOURCE_INVALID_JSON = "Invalid JSON";

    /**
     * The _Source_ object is responsible for fetching/saving data from/to a persistent
     * storage like localStorage or a cloud. It is meant as a base object to be extended
     * by different implementations
     */
    var Source = function() {
    };

    Source.prototype = {
        didFetch: function(rawData, opts) {
            try {
                // Try to parse data
                var data = rawData ? JSON.parse(rawData) : null;
            } catch (e) {
                opts && opts.fail && opts.fail(padlock.ERR_SOURCE_INVALID_JSON);
            }

            opts && opts.success && opts.success(data);
        },
        /**
         * Fetches data
         * @param Object opts
         * Object containing options for the call. Options may include:
         *
         * - collName (required): Name of the collection to fetch data for
         * - success: Success callback. Retrieved data will be passed as only argument
         * - fail: Fail callback
         */
        fetch: function() {
            // Not implemented
        },
        /**
         * Saves data
         * @param Object opts
         * Object containing options for the call. Options may include:
         *
         * - collName (required): Name of the collection to save data for
         * - success: Success callback.
         */
        save: function() {
            // Not implemented
        }
    };

    return Source;
})();

/**
 * DisposableSource is just a simple container to hold data so it can be used directly with a `padlock.Collection`
 * object. This is used when storing data from a Padlock backup for example.
 */
padlock.DisposableSource = (function() {
    "use strict";

    var DisposableSource = function(data) {
        // Just store the data object in a property to be retrieved later
        this.data = data;
    };

    DisposableSource.prototype.fetch = function(opts) {
        // Simply call the success method directly with the store data object
        opts && opts.success && opts.success(this.data);
    };

    return DisposableSource;

})();
