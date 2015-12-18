/* jshint browser: true */
/* global padlock */

padlock.CloudSource = (function(Source) {
    "use strict";

    padlock.ERR_CLOUD_UNAUTHORIZED = "Not authorized to request from source";
    padlock.ERR_CLOUD_SERVER_ERROR = "Internal server error";
    padlock.ERR_CLOUD_FAILED_CONNECTION = "Failed connection";
    padlock.ERR_CLOUD_VERSION_DEPRECATED = "Api version deprecated";

    function errFromStatus(s) {
        switch(s) {
            case 401:
                return padlock.ERR_CLOUD_UNAUTHORIZED;
            case 406:
                return padlock.ERR_CLOUD_VERSION_DEPRECATED;
            case 0:
                return padlock.ERR_CLOUD_FAILED_CONNECTION;
            default:
                return padlock.ERR_CLOUD_SERVER_ERROR;
        }
    }

    function isSuccess(code) {
        return Math.floor(code/100) == 2;
    }

    /**
     * This source uses the Padlock cloud api to fetch and store data.
     * @param String host  Base url for AJAX calls
     * @param String email Email for identifying a user
     * @param String authToken Api key used for authentication
     */
    var CloudSource = function(host, email, authToken) {
        this.host = host;
        this.email = email;
        this.authToken = authToken;
    };
    CloudSource.prototype = Object.create(Source.prototype);
    CloudSource.prototype.constructor = CloudSource;

    CloudSource.prototype.prepareRequest = function(method, path, cb) {
        var req = new XMLHttpRequest(),
            url = this.host + path;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                cb(req);
            }
        };

        req.open(method, url, true);

        req.setRequestHeader("Accept", "application/vnd.padlock;version=1");
        if (this.email && this.authToken) {
            req.setRequestHeader("Authorization", "AuthToken " + this.email + ":" + this.authToken);
        }

        return req;
    };

    CloudSource.prototype.fetch = function(opts) {
        var req = this.prepareRequest("GET", "/store/", function(req) {
            if (isSuccess(req.status)) {
                this.didFetch(req.responseText, opts);
            } else if (opts && opts.fail) {
                opts.fail(errFromStatus(req.status));
            }
        }.bind(this));
        req.send();
    };

    CloudSource.prototype.save = function(opts) {
        var req = this.prepareRequest("PUT", "/store/", function(req) {
            if (isSuccess(req.status)) {
                this.didFetch(req.responseText, opts);
            } else if (opts && opts.fail) {
                opts.fail(errFromStatus(req.status));
            }
        }.bind(this));

        req.send(JSON.stringify(opts.data));
    };

    CloudSource.prototype.destroy = function(opts) {
        // Not implemented yet
        if (opts.fail) {
            opts.fail();
        }
    };

    CloudSource.prototype.requestAuthToken = function(email, create, success, fail) {
        var req = this.prepareRequest("POST", "/auth/", function(req) {
            if (isSuccess(req.status)) {
                success && success(req.responseText);
            } else {
                fail && fail(errFromStatus(req.status));
            }
        });

        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        req.send("email=" + encodeURIComponent(email) + "&create=" + create);
    };

    CloudSource.prototype.requestDataReset = function(success, fail) {
        var req = this.prepareRequest("DELETE", "/store/", function(req) {
            if (isSuccess(req.status)) {
                success && success();
            } else {
                fail && fail(errFromStatus(req.status));
            }
        });

        req.send();
    };

    CloudSource.prototype.testCredentials = function(success, fail) {
        var req = this.prepareRequest("HEAD", "/store/", function() {
            if (isSuccess(req.status)) {
                success && success(true);
            } else if (req.status == 401) {
                success && success(false);
            } else {
                fail && fail(errFromStatus(req.status));
            }
        });

        req.send();
    };

    return CloudSource;
})(padlock.Source);
