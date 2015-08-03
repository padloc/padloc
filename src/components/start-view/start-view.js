/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer({
        is: "padlock-start-view",
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
        }
    });

})(Polymer);
