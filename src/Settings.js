/* global padlock */

padlock.Settings = (function(util) {
    "use strict";

    /**
     * Object for storing settings.
     * @param Object settings Object containing predefined setings with default values.
     *                        Any properties of this object will also be made available as
     *                        properties on the _Settings_ object directly
     * @param Source source   Source to use for persistency
     */
    var Settings = function(properties, source) {
        this.properties = properties;
        util.mixin(this, properties);
        this.source = source;
        this.loaded = false;
    };

    Settings.prototype = {
        //* Fetches the settings from the _Source_
        fetch: function(opts) {
            opts = opts || {};
            var success = opts.success;
            opts.success = function(data) {
                util.mixin(this, data, true);
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
            // opts.data = this.settings;
            this.source.save(opts);
        },
        //* Returns a raw JS object containing the current settings
        raw: function() {
            var obj = {};
            for (var prop in this.properties) {
                obj[prop] = this[prop];
            }
            return obj;
        }
    };

    return Settings;
})(padlock.util);
