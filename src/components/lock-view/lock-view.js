/* global Polymer, padlock */

(function(Polymer, ViewBehavior) {
    "use strict";

    Polymer({
        is: "padlock-lock-view",
        behaviors: [ViewBehavior],
        ready: function() {
            this.outAnimation = "expand";
            this.animationEasing = "cubic-bezier(1, -0.05, 0.9, 0.05)";
        },
        hide: function() {
            this.$$("padlock-lock").unlocked = true;
            var args = arguments;
            this.async(function() {
                ViewBehavior.hide.apply(this, args);
            }, 500);
        },
        enter: function() {
            this.$.pwdInput.blur();
            this.fire("pwdenter", {password: this.$.pwdInput.value});
            // this.$$("padlock-lock").unlocked = true;
            // this.async(function() {
            //     this.$$("padlock-lock").expanded = true;
            // }, 500);
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
