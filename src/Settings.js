define(function() {
    /**
     * Object for storing settings.
     * @param Source source   Source to use for persistency
     * @param Object defaults Default values.
     */
    var Settings = function(source, defaults) {
        this.source = source;
        this.defaults = defaults || {};
        this.settings = {};
    };

    Settings.prototype = {
        fetch: function(opts) {
            var success = function(data) {
                this.settings = data;
                if (opts && opts.success) {
                    opts.success();
                }
            };
            opts = opts || {};
            opts.success = success;
            opts.key = "settings";
            this.source.fetch(opts);
        },
        save: function(opts) {
            opts = opts || {};
            opts.key = "settings";
            this.source.save(this.settings);
        },
        get: function(setting) {
            return this.settings[setting] || this.defaults[setting];
        },
        set: function(setting, value) {
            this.settings[setting] = value;
        }
    };

    return Settings;
});