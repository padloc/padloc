/* global Polymer, padlock */

(function(Polymer, ViewBehavior) {
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
        },
        enter: function() {
            this.$.pwdInput.blur();
            this.$.confirmInput.blur();

            var newPwd = this.$.pwdInput.value,
                cfmPwd = this.$.confirmInput.value,
                score = this.$.pwdInput.score;

            if (!newPwd) {
                this.$.notification.show("Please enter a master password!", "error", 2000);
            } else if (newPwd != cfmPwd) {
                this.$.notification.show("Passwords do not match!", "error", 2000);
            } else if (score < 2) {
                this.$.weakPasswordDialog.open = true;
            } else {
                this.fire("newpwd", {password: newPwd});
            }
        },
        getAnimationElement: function() {
            return this.$$("padlock-lock");
        },
        _weakPasswordRetry: function() {
            this.$.weakPasswordDialog.open = false;
            this.$.pwdInput.focus();
        },
        _weakPasswordDismiss: function() {
            this.$.weakPasswordDialog.open = false;
            this.fire("newpwd", {password: this.$.pwdInput.value});
        },
        _clear: function() {
            this.$.pwdInput.value = this.$.confirmInput.value = "";
        }
    });

})(Polymer, padlock.ViewBehavior);
