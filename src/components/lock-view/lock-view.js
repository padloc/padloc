/* global Polymer, padlock */

(function(Polymer, ViewBehavior) {
    "use strict";

    Polymer({
        is: "padlock-lock-view",
        behaviors: [ViewBehavior],
        hide: function() {
            this.$$("padlock-lock").unlocked = true;
            var args = arguments;
            this.async(function() {
                ViewBehavior.hide.apply(this, args);
            }, 500);
        },
        show: function() {
            ViewBehavior.show.apply(this, arguments);
            this.async(function() {
                this.$$("padlock-lock").unlocked = false;
            }, 800);
        },
        enter: function() {
            this.$.pwdInput.blur();
            this.fire("pwdenter", {password: this.$.pwdInput.value});
        },
        reset: function() {
            this.$.pwdInput.value = "";
        },
        focusPwdInput: function() {
            this.$.pwdInput.focus();
        },
        getAnimationElement: function() {
            return this.$$("padlock-lock");
        }
    });

})(Polymer, padlock.ViewBehavior);
