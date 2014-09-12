/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer("padlock-start-view", {
        keyDown: function(event) {
            if (event.keyCode == 13) {
                this.enter();
            }
        },
        enter: function() {
            this.$.pwdInput.blur();
            this.$.confirmInput.blur();

            var newPwd = this.$.pwdInput.value,
                cfmPwd = this.$.confirmInput.value;

            if (newPwd == cfmPwd) {
                this.classList.remove("error");
                this.fire("newpwd", {password: newPwd});
            } else {
                this.classList.add("error");
            }
        }
    });

})(Polymer);