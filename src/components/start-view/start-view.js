/* global Polymer, padlock */

(function(Polymer, ViewBehavior, platform) {
    "use strict";

    Polymer({
        is: "padlock-start-view",
        behaviors: [ViewBehavior],
        hide: function() {
            this.$$("padlock-lock").unlocked = true;
            var args = arguments;
            this.async(function() {
                ViewBehavior.hide.apply(this, args);
            }, 500);
        },
        show: function() {
            this._clear();
            this.$$("padlock-lock").unlocked = false;
            ViewBehavior.show.apply(this, arguments);
            if (!platform.isTouch()) {
                this.async(function() {
                    this.$.pwdInput.focus();
                }, 500);
            }
        },
        enter: function() {
            this.$.pwdInput.blur();
            this.$.confirmInput.blur();

            var newPwd = this.$.pwdInput.value,
                cfmPwd = this.$.confirmInput.value,
                score = this.$.pwdInput.score;

            if (!newPwd) {
                this.fire("notify", {message: "Please enter a master password!", type: "error", duration: 2000});
            } else if (newPwd != cfmPwd) {
                this.fire("notify", {message: "Passwords do not match!", type: "error", duration: 2000});
            } else if (score < 2) {
                this._promptWeakPassword(newPwd);
            } else {
                this.fire("newpwd", {password: newPwd});
            }
        },
        getAnimationElement: function() {
            return this.$$("padlock-lock");
        },
        _promptWeakPassword: function(password) {
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Retry", cancel: true},
                    {element: "button", label: "Use Anyway", submit: true}
                ],
                title: "WARNING: The password you entered is weak which makes it easier for attackers to break " +
                    "the encryption used to protect your data. Try to use a longer password or include a " +
                    "variation of uppercase, lowercase and special characters as well as numbers.",
                submit: function() {
                    this.fire("newpwd", {password: password});
                }.bind(this)
            });
        },
        _clear: function() {
            this.$.pwdInput.value = this.$.confirmInput.value = "";
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.platform);
