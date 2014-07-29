padlock.LocalStorageSource = (function(Source) {
    /**
     * This source uses the _localStorage_ api to fetch and store data. Although
     * _localStorage_ works synchronously, All methods use callbacks to be
     * consistent with asynchronous sources.
     */
    var LocalStorageSource = function() {};
    LocalStorageSource.prototype = Object.create(Source.prototype);
    LocalStorageSource.prototype.constructor = LocalStorageSource;

    LocalStorageSource.prototype.fetch = function(opts) {
        var json = localStorage.getItem(opts.key);
        this.didFetch(json, opts);
    };

    LocalStorageSource.prototype.save = function(opts) {
        localStorage.setItem(opts.key, JSON.stringify(opts.data));
        if (opts.success) {
            opts.success();
        }
    };

    return LocalStorageSource;
})(padlock.Source);