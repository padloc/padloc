/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer({
        is: "padlock-lock-view",
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
