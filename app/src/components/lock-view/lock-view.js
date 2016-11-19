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
        getAnimationElement: function() {
            return this.$$("padlock-lock");
        },
        _clear: function() {
            this.$.pwdInput.value = "";
        },
        _openOptions: function() {
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Reset App", submit: true}
                ],
                submit: this._confirmResetApp.bind(this, false)
            });
        },
        _confirmResetApp: function(failed) {
            var title = failed ? "Failed to Confirm. Make sure to type 'RESET' in the text field below." :
                "Are you sure you want to delete all your data and reset the app? " +
                "This action can not be undone! Type 'RESET' to Confirm.";

            this.fire("open-form", {
                title: title,
                components: [
                    {element: "input", name: "confirm", placeholder: "Type 'RESET' to Confirm"},
                    {element: "button", label: "Reset App", submit: true}
                ],
                submit: function(data) {
                    if (data.confirm.toLowerCase() == "reset") {
                        this.fire("reset-app");
                    } else {
                        this._confirmResetApp(true);
                    }
                }.bind(this)
            });
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.platform);
