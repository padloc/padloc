/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer({
        is: "padlock-lock-view",
        properties: {
            errorMessage: {
                type: String,
                observer: "_errorMessageChanged",
                notify: true
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
        },
        _errorMessageChanged: function(message) {
            this.toggleClass("error", !!message);
        }
    });

})(Polymer);
