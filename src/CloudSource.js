/* jshint browser: true */
/* global padlock */

padlock.CloudSource = (function(Source) {
    "use strict";

    /**
     * This source uses the Padlock cloud api to fetch and store data.
     * @param String host  Base url for AJAX calls
     * @param String email Email for identifying a user
     */
    var CloudSource = function(host, email, apiKey) {
        this.host = host;
        this.email = email;
        this.apiKey = apiKey;
    };
    CloudSource.prototype = Object.create(Source.prototype);
    CloudSource.prototype.constructor = CloudSource;

    CloudSource.prototype.fetch = function(opts) {
        var req = new XMLHttpRequest(),
            url = this.host;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    this.didFetch(req.responseText, opts);
                } else if (opts && opts.fail) {
                    opts.fail(req);
                }
            }
        }.bind(this);

        req.open("GET", url, true);
        req.setRequestHeader("Authorization", "ApiKey " + this.email + ":" + this.apiKey);
        req.send();
    };

    CloudSource.prototype.save = function(opts) {
        var req = new XMLHttpRequest(),
            url = this.host;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    if (opts.success) {
                        opts.success();
                    }
                } else if (opts.fail) {
                    opts.fail(req);
                }
            }
        };

        req.open("PUT", url, true);
        req.setRequestHeader("Authorization", "ApiKey " + this.email + ":" + this.apiKey);
        req.send(JSON.stringify(opts.data));
    };

    return CloudSource;
})(padlock.Source);