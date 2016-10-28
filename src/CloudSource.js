/* jshint browser: true */
/* global padlock */

padlock.CloudSource = (function(Source) {
    "use strict";

    padlock.ERR_CLOUD_INVALID_AUTH_TOKEN = "invalid_auth_token";
    padlock.ERR_CLOUD_EXPIRED_AUTH_TOKEN = "expired__auth_token";
    padlock.ERR_CLOUD_SERVER_ERROR = "internal_server_error";
    padlock.ERR_CLOUD_VERSION_DEPRECATED = "deprecated_api_version";
    padlock.ERR_CLOUD_SUBSCRIPTION_REQUIRED = "subscription_required";
    padlock.ERR_CLOUD_NOT_FOUND = "account_not_found";
    padlock.ERR_CLOUD_LIMIT_EXCEEDED = "rate_limit_exceeded";
    padlock.ERR_CLOUD_FAILED_CONNECTION = "failed_connection";
    padlock.ERR_CLOUD_UNKNOWN = "unknown_error";

    function errFromReq(req) {
        if (req.status == 0) {
            return { error: padlock.ERR_CLOUD_FAILED_CONNECTION };
        } else {
            try {
                return JSON.parse(req.responseText);
            } catch (e) {
                return {
                    error: "unknown_error",
                    message: req.responseText
                };
            }
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
        var req = new XMLHttpRequest();
        var host = this.settings.sync_custom_host ? this.settings.sync_host_url : "https://cloud.padlock.io";
        // Remove any trailing slashes
        host = host.replace(/\/+$/, "");
        var url = host + path;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                var subStatus = req.getResponseHeader("X-Sub-Status");
                if (subStatus) {
                    this.settings["sync_sub_status"] = subStatus;
                }
                try {
                    this.settings["sync_trial_end"] =
                        parseInt(req.getResponseHeader("X-Sub-Trial-End"), 10);
                } catch (e) {
                    //
                }
                cb(req);
            }
        }.bind(this);

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
                opts.fail(errFromReq(req));
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
            if (isSuccess(req.status) && opts && opts.success) {
                opts.success();
            } else if (opts && opts.fail) {
                opts.fail(errFromReq(req));
            }
        }.bind(this));

        if (!req) {
            opts && opts.fail({
                error: padlock.ERR_CLOUD_FAILED_CONNECTION
            });
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
                fail && fail(errFromReq(req));
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
                fail && fail(errFromReq(req));
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
                fail && fail(errFromReq(req));
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
