define(function(require) {
    var Source = require("./Source");

    /**
     * This source uses the Padlock cloud api to fetch and store data.
     * @param String host  Base url for AJAX calls
     * @param String email Email for identifying a user
     */
    CloudSource = function(host, email) {
        this.host = host;
        this.email = email;
    };
    CloudSource.prototype = Object.create(Source.prototype);
    CloudSource.prototype.constructor = CloudSource;

    CloudSource.prototype.fetch = function(opts) {
        var req = new XMLHttpRequest(),
            url = this.host + "/" + this.email;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    this.didFetch(req.responseText, opts);
                } else if (opts && opts.fail) {
                    opts.fail(req.status, req.responseText);
                }
            }
        }.bind(this);

        req.open("GET", url, true);
        req.send();
    };

    CloudSource.prototype.save = function(opts) {
        var req = new XMLHttpRequest(),
            url = this.host + "/" + this.email;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    if (opts.success) {
                        opts.success();
                    }
                } else if (opts.fail) {
                    opts.fail(req.status, req.responseText);
                }
            }
        };

        req.open("POST", url, true);
        req.send(JSON.stringify(opts.data));
    };

    CloudSource.prototype.exists = function(opts) {
        var success = opts.success,
            fail = opts.fail;

        opts.success = function() {
            success(true);
        };
        opts.fail = function(status) {
            // If the api returns a 'not found', we consider the request successful
            // and return _false_. Otherwise something went wrong and we can't tell
            // for sure, so we consider the request failed.
            if (status == 404) {
                success(false);
            } else if (fail) {
                fail();
            }
        };
        this.fetch(opts);
    };

    return CloudSource;
});