/* global padlock */

padlock.Settings = (function(util, LocalSource) {
    "use strict";

    var storeKey = "settings_encrypted";

    /**
     * Object for storing settings. Setting properties are stored on the object directly while the `properties`
     * member holds a map of setting names and default values.
     * @param {padlock.Store} store - Store object used to save settings
     * @param {Object} defaults - Default settings
     */
    var Settings = function(store, defaults) {
        // Copy over default values onto `Settings` Object directly
        util.mixin(this, this.properties);
        util.mixin(this, defaults, true);
        this.store = store;
        // Flag used to indicate if the settings have been loaded from persistent storage initially
        this.loaded = false;
    };

    Settings.prototype = {
        // The `properties` object contains a map of default properties which is also used to extract
        // values from the `Settings` object in the `raw` method. Properties that are not included in this
        // map are not saved to persistent storage.
        properties: {
            "auto_lock": true,
            // Auto lock delay in minutes
            "auto_lock_delay": 1,
            "sync_host_url": "https://cloud.padlock.io",
            "sync_custom_host": false,
            "sync_email": "",
            "sync_key": "",
            "sync_device": "",
            "sync_connected": false,
            "sync_auto": true,
            "sync_sub_status": "",
            "sync_trial_end": 0,
            "default_fields": ["username", "password"],
            "obfuscate_fields": false,
            "showed_backup_reminder": 0,
            "sync_require_subscription": false,
            "sync_id": "",
            "version": ""
        },
        parse: function(data) {
            try {
                data = JSON.parse(data);
            } catch (e) {
                data = {};
            }
            // Copy over setting values
            util.mixin(this, data, true);
        },
        //* Returns a raw JS object containing the current settings
        raw: function() {
            var obj = {};
            // Extract settings from `Settings` Object based on property names in `properties` member
            for (var prop in this.properties) {
                obj[prop] = this[prop];
            }
            return obj;
        },
        toString: function() {
            return JSON.stringify(this.raw());
        },
        //* Fetches the settings
        fetch: function(opts) {
            opts = opts || {};
            var success = opts.success;
            opts.success = function(data) {
                this.parse(data);
                // Update loaded flag to indicate that data has been loaded from persistent storage at least once
                this.loaded = true;
                if (success) {
                    success();
                }
            }.bind(this);
            opts.key = "settings";
            this.store.fetch(storeKey, opts);
        },
        //* Saves the existing settings
        save: function(opts) {
            this.store.save(storeKey, this.toString(), opts);
        },
        reset: function() {
            for (var prop in this.properties) {
                this[prop] = this.properties[prop];
            }
        }
    };

    var legacySource = new LocalSource();

    // Fetches any old, unencrypted settings data and then deletes it
    function fetchLegacy(settings, cb) {
        legacySource.fetch({
            key: "settings",
            success: function(data) {
                if (data) {
                    util.mixin(settings, data, true);
                }
                legacySource.destroy({key: "settings"});
                cb();
            },
            fail: function() {
                cb();
            }
        });
    }

    // Fetch and delete any legacy data before doing the actual fetch
    var fetch = Settings.prototype.fetch;
    Settings.prototype.fetch = function() {
        fetchLegacy(this, fetch.apply.bind(fetch, this, arguments));
    };

    return Settings;
})(padlock.util, padlock.LocalSource);
