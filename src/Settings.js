define(function() {
    /**
     * Object for storing settings.
     * @param Object settings Object containing predefined setings with default values.
     *                        Any properties of this object will also be made available as
     *                        properties on the _Settings_ object directly
     * @param Source source   Source to use for persistency
     */
    var Settings = function(settings, source) {
        this.source = source;
        this.defaults = settings;
        this.settings = {};

        // Define properties with getters and setters for all properties specified
        // in the _settings_ object. This allows direct access to settings without
        // the use of the _get_ or _set_ method and make data binding a little easier
        for (var prop in settings) {
            Object.defineProperty(this, prop, {
                enumerable: true,
                get: this.get.bind(this, prop),
                set: this.set.bind(this, prop)
            });
        }
    };

    Settings.prototype = {
        //* Fetches the settings from the _Source_
        fetch: function(opts) {
            opts = opts || {};
            var success = opts.success;
            opts.success = function(data) {
                this.settings = data || this.settings;
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
            opts.data = this.settings;
            this.source.save(opts);
        },
        //* Gets a _setting_
        get: function(setting) {
            return setting in this.settings ? this.settings[setting] : this.defaults[setting];
        },
        //* Sets a _setting_ to a _value_
        set: function(setting, value) {
            var oldValue = this.settings[setting];
            this.settings[setting] = value;
            if (Object.getNotifier) {
                // Manually notify any observers registered through Object.observe
                Object.getNotifier(this).notify({
                    type: "update",
                    name: setting,
                    oldValue: oldValue
                });
            }
        }
    };

    return Settings;
});