/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer("padlock-lock-view", {
        keydown: function(event) {
            if (event.keyCode == 13) {
                this.enter();
            }
        },
        enter: function() {
            this.errorMessage = "";
            this.$.pwdInput.blur();
            this.fire("pwdenter", {password: this.$.pwdInput.value});
        },
        reset: function() {
            this.$.pwdInput.value = "";
        },
        focusPwdInput: function() {
            this.$.pwdInput.focus();
        }
    });

})(Polymer);