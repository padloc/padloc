/* global padlock, chrome */

padlock.ChromeStorageSource = (function() {
    "use strict";

    var storage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
    
    /**
     * Source object using the local storage mechanism provided by the chrome apps api
     */
    var ChromeStorageSource = function() {};

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
})();