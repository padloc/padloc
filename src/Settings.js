define(function() {
    /**
     * Object for storing settings.
     * @param Source source   Source to use for persistency
     * @param Object defaults Default values.
     */
    var Settings = function(settings, source) {
        this.source = source;
        this.defaults = settings;
        this.settings = {};

        for (var prop in settings) {
            Object.defineProperty(this, prop, {
                enumerable: true,
                get: this.get.bind(this, prop),
                set: this.set.bind(this, prop)
            });
        }
    };

    Settings.prototype = {
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
        save: function(opts) {
            opts = opts || {};
            opts.key = "settings";
            opts.data = this.settings;
            this.source.save(opts);
        },
        get: function(setting) {
            return setting in this.settings ? this.settings[setting] : this.defaults[setting];
        },
        set: function(setting, value) {
            this.settings[setting] = value;
        }
    };

    return Settings;
});