/* global padlock */

padlock.Settings = (function(util) {
    "use strict";

    /**
     * Object for storing settings. Setting properties are stored on the object directly while the `properties`
     * member holds a map of setting names and default values.
     * @param Object settings Object containing predefined setings with default values.
     *                        Any properties of this object will also be made available as
     *                        properties on the _Settings_ object directly
     * @param Source source   Source to use for persistency
     */
    var Settings = function(properties, source) {
        // The `properties` object contains a map of default properties which is also used to extract
        // values from the `Settings` object in the `raw` method. Properties that are not included in this
        // map are not saved to persistent storage.
        this.properties = properties;
        // Copy over default values onto `Settings` Object directly
        util.mixin(this, properties);
        this.source = source;
        // Flag used to indicate if the settings have been loaded from persistent storage initially
        this.loaded = false;
    };

    Settings.prototype = {
        //* Fetches the settings from the _Source_
        fetch: function(opts) {
            opts = opts || {};
            var success = opts.success;
            opts.success = function(data) {
                // Copy over setting values
                util.mixin(this, data, true);
                // Update loaded flag to indicate that data has been loaded from persistent storage at least once
                this.loaded = true;
                if (success) {
                    success();
                }
            }.bind(this);
            opts.key = "settings";
            this.source.fetch(opts);
        },
        //* Saves the existing settings to the _Source_
        save: function(opts) {
            opts = opts || {};
            opts.key = "settings";
            opts.data = this.raw();
            this.source.save(opts);
        },
        //* Returns a raw JS object containing the current settings
        raw: function() {
            var obj = {};
            // Extract settings from `Settings` Object based on property names in `properties` member
            for (var prop in this.properties) {
                obj[prop] = this[prop];
            }
            return obj;
        }
    };

    return Settings;
})(padlock.util);
