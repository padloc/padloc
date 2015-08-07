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
            this.$$("padlock-lock").unlocked = false;
            ViewBehavior.show.apply(this, arguments);
        },
        enter: function() {
            this.$.pwdInput.blur();
            this.$.confirmInput.blur();

            var newPwd = this.$.pwdInput.value,
                cfmPwd = this.$.confirmInput.value;

            if (newPwd == cfmPwd) {
                this.fire("newpwd", {password: newPwd});
            } else {
                this.$.notification.show("Passwords do not match!", "error", 2000);
            }
        },
        getAnimationElement: function() {
            return this.$$("padlock-lock");
        }
    });

})(Polymer, padlock.ViewBehavior);
