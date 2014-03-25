define(function() {
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
                if (opts && opts.success) {
                    opts.success(data);
                }
            } catch (e) {
                if (opts && opts.fail) {
                    opts.fail(e);
                }
            }
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
        fetch: function(opts) {
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
        save: function(opts) {
            // Not implemented
        }
    };

    return Source;
});