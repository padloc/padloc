/* global Polymer, padlock */

(function(Polymer, ViewBehavior, platform, CloudSource) {
    "use strict";

    Polymer({
        is: "padlock-start-view",
        behaviors: [ViewBehavior],
        properties: {
            mode: {
                type: String,
                value: "create",
                reflectToAttribute: true
            },
            collection: Object
        },
        hide: function() {
            this.$$("padlock-lock").unlocked = true;
            this.toggleClass("reveal", false, this.$$(".switch-button"));
            var args = arguments;
            this.async(function() {
                ViewBehavior.hide.apply(this, args);
            }, 500);
        },
        show: function() {
            this._clear();
            this.$$("padlock-lock").unlocked = false;
            this.async(function() {
                this.toggleClass("reveal", true, this.$$(".switch-button"));
            }, 1000);
            ViewBehavior.show.apply(this, arguments);
            if (!platform.isTouch()) {
                this.async(function() {
                    this.$.pwdInput.focus();
                }, 500);
            }
        },
        _enter: function() {
            this.$.pwdInput.blur();

            var newPwd = this.$.pwdInput.value,
                score = this.$.pwdInput.score;

            if (!newPwd) {
                this.fire("notify", {message: "Please enter a master password!", type: "error", duration: 2000});
            } else if (score < 2) {
                this._promptWeakPassword();
            } else {
                this._confirmPassword();
            }
        },
        getAnimationElement: function() {
            return this.$$("padlock-lock");
        },
        _promptWeakPassword: function() {
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Retry", cancel: true},
                    {element: "button", label: "Use Anyway", submit: true}
                ],
                title: "WARNING: The password you entered is weak which makes it easier for attackers to break " +
                    "the encryption used to protect your data. Try to use a longer password or include a " +
                    "variation of uppercase, lowercase and special characters as well as numbers.",
                submit: this._confirmPassword.bind(this)
            });
        },
        _confirmPassword: function() {
            var newPwd = this.$.pwdInput.value;

            this.fire("open-form", {
                title: "Remember your master password! Without it, nobody will be able to access your data, " +
                    "not even we! This is to ensure that your data is as safe as possible but it also means " +
                    "that if you lose your master password, we won't be able to assist you with recovering your " +
                    "data.",
                components: [
                    {element: "input", placeholder: "Repeat Password", type: "password", name: "password"},
                    {element: "button", label: "Confirm", submit: true}
                ],
                submit: function(data) {
                    if (newPwd == data.password) {
                        this.fire("newpwd", {password: newPwd});
                    } else {
                        this.fire("notify", {message: "Passwords do not match!", type: "error", duration: 2000});
                    }
                }.bind(this)
            });
        },
        _clear: function() {
            this.$.pwdInput.value = "";
            this.$.emailInput.value = "";
            this.$.cloudPwdInput.value = "";
        },
        _buttonLabel: function(mode) {
            return this._isChangeMode(mode) ? "Change Password" : "Get Started";
        },
        _switchButtonLabel: function(mode) {
            return mode == "restore-cloud" ? "Get Started Offline" : "Restore From Cloud";
        },
        _isChangeMode: function(mode) {
            return mode == "change-password";
        },
        _switchMode: function() {
            this.mode = this.mode == "restore-cloud" ? "get-started" : "restore-cloud";
        },
        _cloudEnter: function() {
            var cloudSource = new CloudSource(this.settings);

            var email = this.$.emailInput.value;
            if (!email) {
                this.fire("notify", {message: "Please enter an email address!", type: "error", duration: 2000});
                return;
            }

            this.$$("padlock-progress").show();
            this.$.cloudEnterButton.disabled = true;
            cloudSource.requestAuthToken(email, false, function(authToken) {
                this.$$("padlock-progress").hide();
                this.$.cloudEnterButton.disabled = false;
                this.set("settings.sync_email", email);
                this.set("settings.sync_key", authToken.token);
                this.set("settings.sync_id", authToken.id);
                this._promptConnecting();
                this._attemptRestore();
            }.bind(this), function(e) {
                this.$.cloudEnterButton.disabled = false;
                this.$$("padlock-progress").hide();
                switch(e) {
                    case padlock.ERR_CLOUD_NOT_FOUND:
                    case padlock.ERR_CLOUD_SUBSCRIPTION_REQUIRED:
                        this.fire("open-form", {
                            components: [
                                {element: "button", label: "Try Different Email", submit: true, tap: function() {
                                    this.$.emailInput.value = "";
                                    this.$.emailInput.focus();
                                }.bind(this)},
                                {element: "button", label: "Get Started Offline", submit: true, tap: function() {
                                    this.mode = "get-started";
                                }.bind(this)}
                            ],
                            title: "There is no existing Padlock Cloud account with this email address! " +
                                "Create an offline account first, then connect to Padlock Cloud later!"
                        });
                        break;
                    default:
                        this.fire("error", e);
                }
            }.bind(this));
        },
        _attemptRestore: function() {
            var cloudSource = new CloudSource(this.settings);

            this._cancelRestore = false;

            this.collection.fetch({
                source: cloudSource,
                password: this.$.cloudPwdInput.value,
                success: this._restoreSuccess.bind(this),
                fail: function(e) {
                    if (this._cancelRestore) {
                        this._cancelRestore = false;
                        this.set("settings.sync_email", "");
                        this.set("settings.sync_key", "");
                        this.set("settings.sync_id", "");
                        return;
                    }
                    if (e == padlock.ERR_CLOUD_UNAUTHORIZED) {
                        this._attemptRestoreTimeout = setTimeout(this._attemptRestore.bind(this), 1000);
                    } else {
                        this.fire("error", e);
                    }
                }.bind(this)
            });
        },
        _stopAttemptRestore: function() {
            this._cancelRestore = true;
            this.set("settings.sync_email", "");
            this.set("settings.sync_key", "");
            this.set("settings.sync_id", "");
            clearTimeout(this._attemptRestoreTimeout);
        },
        _restoreSuccess: function() {
            if (this._cancelRestore) {
                this._cancelRestore = false;
                return;
            }
            this.set("settings.sync_connected", true);
            this.collection.save({password: this.$.cloudPwdInput.value, rememberPassword: true});

            this.fire("open-form", {
                title: "Your data has been successfully restored from Padlock Cloud!",
                components: [
                    {element: "button", label: "View My Records", submit: true}
                ],
                submit: this.fire.bind(this, "restore"),
                cancel: this.fire.bind(this, "restore"),
                allowDismiss: false
            });
        },
        _promptConnecting: function() {
            this.fire("open-form", {
                title: "Almost done! An email was sent to " + this.settings.sync_email +
                    " with further instructions. Hit 'Cancel' to abort the process. (Connection ID: " +
                    this.settings.sync_id + ")",
                components: [
                    {element: "button", label: "Cancel", tap: this._cancelConnect.bind(this), close: true}
                ],
                allowDismiss: false
            });
        },
        _cancelConnect: function() {
            this.fire("open-form", {
                title: "Are you sure you want to cancel the connection process?",
                components: [
                    {element: "button", label: "Yes", tap: this._stopAttemptRestore.bind(this), close: true},
                    {element: "button", label: "No", tap: this._promptConnecting.bind(this), close: true}
                ]
            });
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.platform, padlock.CloudSource);
