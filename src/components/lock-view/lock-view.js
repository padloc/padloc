/* global Polymer, padlock */

(function(Polymer, ViewBehavior, platform) {
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
            this.fire("pwdenter", {password: this.$.pwdInput.value});
        },
        _clear: function() {
            this.$.pwdInput.value = "";
        },
        getAnimationElement: function() {
            return this.$$("padlock-lock");
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.platform);
