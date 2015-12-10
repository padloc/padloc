/* jshint browser: true */
/* global padlock */

padlock.CloudSource = (function(Source) {
    "use strict";

    /**
     * This source uses the Padlock cloud api to fetch and store data.
     * @param String host  Base url for AJAX calls
     * @param String email Email for identifying a user
     * @param String apiKey Api key used for authentication
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

    CloudSource.prototype.destroy = function(opts) {
        // Not implemented yet
        if (opts.fail) {
            opts.fail();
        }
    };

    CloudSource.prototype.requestApiKey = function(email, device, success, fail) {
        var req = new XMLHttpRequest();
        var url = this.host + "auth/";

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status === 200 || req.status === 201) {
                    try {
                        var apiKey = JSON.parse(req.responseText);
                        success && success(apiKey);
                    } catch(e) {
                        fail && fail(e);
                    }
                } else {
                    fail && fail(req);
                }
            }
        }.bind(this);

        req.open("POST", url, true);
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        req.setRequestHeader("Accept", "application/json");
        req.send("email=" + email + "&device_name=" + device);
    };

    CloudSource.prototype.requestDataReset = function(success, fail) {
        var req = new XMLHttpRequest(),
            email = this.email,
            url = this.host + email;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status === 202) {
                    success && success();
                } else {
                    fail && fail();
                }
            }
        }.bind(this);

        req.open("DELETE", url, true);
        req.send();
    };

    CloudSource.prototype.testCredentials = function(success, fail) {
        var req = new XMLHttpRequest();
        var url = this.host;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status == 200) {
                    success && success(true);
                } else if (req.status == 401) {
                    success && success(false);
                } else {
                    fail && fail(errFromStatus(req.status));
                }
            }
        };

        req.open("HEAD", url, true);
        req.setRequestHeader("Authorization", "ApiKey " + this.email + ":" + this.apiKey);
        req.send();
    };

    return CloudSource;
})(padlock.Source);
