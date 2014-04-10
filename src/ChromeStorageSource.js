define(function(require) {
    var Source = require("./Source"),
        storage = chrome.storage.local;
    
    /**
     * Source object using the local storage mechanism provided by the chrome apps api
     */
    var ChromeStorageSource = function() {};
    ChromeStorageSource.prototype = Object.create(Source.prototype);
    ChromeStorageSource.prototype.constructor = ChromeStorageSource;

    ChromeStorageSource.prototype.fetch = function(opts) {
        storage.get(opts.key, function(data) {
            opts.success(data[opts.key] || "");
        }.bind(this));
    };

    ChromeStorageSource.prototype.save = function(opts) {
        var obj = {};
        obj[opts.key] = opts.data;
        storage.set(obj, function() {
            if (opts.success) {
                opts.success();
            }
        });
    };

    return ChromeStorageSource;
});