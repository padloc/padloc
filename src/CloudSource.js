/* jshint browser: true */
/* global padlock */

padlock.CloudSource = (function(Source) {
    "use strict";

    padlock.ERR_CLOUD_UNAUTHORIZED = "Not authorized to request from source";
    padlock.ERR_CLOUD_SERVER_ERROR = "Internal server error";
    padlock.ERR_CLOUD_FAILED_CONNECTION = "Failed connection";
    padlock.ERR_CLOUD_VERSION_DEPRECATED = "Api version deprecated";
    padlock.ERR_CLOUD_SUBSCRIPTION_REQUIRED = "Padlock Cloud subscription required";
    padlock.ERR_CLOUD_NOT_FOUND = "Account not found";

    function errFromStatus(s) {
        switch(s) {
            case 401:
                return padlock.ERR_CLOUD_UNAUTHORIZED;
            case 402:
                return padlock.ERR_CLOUD_SUBSCRIPTION_REQUIRED;
            case 404:
                return padlock.ERR_CLOUD_NOT_FOUND;
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
     * @param Object padlock.Settings object containing information such as remote host and user credentials
     */
    var CloudSource = function(settings) {
        this.settings = settings;
    };
    CloudSource.prototype = Object.create(Source.prototype);
    CloudSource.prototype.constructor = CloudSource;

    CloudSource.prototype.prepareRequest = function(method, path, cb) {
        var req = new XMLHttpRequest(),
            host = this.settings.sync_custom_host ? this.settings.sync_host_url : "https://cloud.padlock.io",
            url = host + path;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                cb(req);
            }
        };

        try {
            req.open(method, url, true);

            req.setRequestHeader("Accept", "application/vnd.padlock;version=1");
            if (this.settings.sync_email && this.settings.sync_key) {
                req.setRequestHeader("Authorization",
                    "AuthToken " + this.settings.sync_email + ":" + this.settings.sync_key);
            }

            if (this.settings.sync_require_subscription === false) {
                req.setRequestHeader("Require-Subscription", "NO");
            }

            return req;
        } catch(e) {
            return null;
        }
    };

    CloudSource.prototype.fetch = function(opts) {
        var req = this.prepareRequest("GET", "/store/", function(req) {
            if (isSuccess(req.status)) {
                this.didFetch(req.responseText, opts);
            } else if (opts && opts.fail) {
                opts.fail(errFromStatus(req.status));
            }
        }.bind(this));

        if (!req) {
            opts && opts.fail(padlock.ERR_CLOUD_FAILED_CONNECTION);
            return;
        }

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

        if (!req) {
            opts && opts.fail(padlock.ERR_CLOUD_FAILED_CONNECTION);
            return;
        }

        req.send(JSON.stringify(opts.data));
    };

    CloudSource.prototype.destroy = function(opts) {
        // Not implemented yet
        if (opts.fail) {
            opts.fail();
        }
    };

    CloudSource.prototype.requestAuthToken = function(email, create, success, fail) {
        var req = this.prepareRequest(create ? "POST" : "PUT", "/auth/", function(req) {
            if (isSuccess(req.status)) {
                try {
                    success && success(JSON.parse(req.responseText));
                } catch(e) {
                    fail(padlock.ERR_CLOUD_SERVER_ERROR);
                }
            } else {
                fail && fail(errFromStatus(req.status));
            }
        });

        if (!req) {
            fail && fail(padlock.ERR_CLOUD_FAILED_CONNECTION);
            return;
        }

        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        req.send("email=" + encodeURIComponent(email));
    };

    CloudSource.prototype.requestDataReset = function(success, fail) {
        var req = this.prepareRequest("DELETE", "/store/", function(req) {
            if (isSuccess(req.status)) {
                success && success();
            } else {
                fail && fail(errFromStatus(req.status));
            }
        });

        if (!req) {
            fail && fail(padlock.ERR_CLOUD_FAILED_CONNECTION);
            return;
        }

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

        if (!req) {
            fail && fail(padlock.ERR_CLOUD_FAILED_CONNECTION);
            return;
        }

        req.send();
    };

    return CloudSource;
})(padlock.Source);
