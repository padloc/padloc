/* global Polymer, padlock */

(function(Polymer, ViewBehavior, platform) {
    "use strict";

    Polymer({
        is: "padlock-start-view",
        behaviors: [ViewBehavior],
        properties: {
            mode: {
                type: String,
                value: "create",
                reflectToAttribute: true
            }
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
                    "that if you loose your master password, we won't be able to assist you with recovering your " +
                    "data. (You will be able to change it later, but only if you know the existing password)",
                components: [
                    {element: "input", placeholder: "Repeat Password", type: "password", name: "password"},
                    {element: "button", label: "Confirm", submit: true},
                    {element: "button", label: "Change", cancel: true}
                ],
                submit: function(data) {
                    if (newPwd == data.password) {
                        this.fire("newpwd", {password: newPwd});
                    } else {
                        this.fire("notify", {message: "Passwords do not match!", type: "error", duration: 2000});
                    }
                }.bind(this),
                cancel: function() {
                    this.$.pwdInput.focus();
                }.bind(this)
            });
        },
        _clear: function() {
            this.$.pwdInput.value = "";
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
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.platform);
