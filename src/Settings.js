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
            opts = opts || {};
            var success = opts.success;
            opts.success = function(data) {
                this.settings = data;
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
            return this.settings[setting] || this.defaults[setting];
        },
        set: function(setting, value) {
            this.settings[setting] = value;
        }
    };

    return Settings;
});