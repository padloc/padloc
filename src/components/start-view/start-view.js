(function(Polymer) {

Polymer("padlock-start-view", {
    show: function(animation, callback) {
        this.$.pwdInput.value = "";
        this.$.confirmInput.value = "";

        // var cb = function() {
        //     this.$.pwdInput.focus();
        //     if (callback) {
        //         callback();
        //     }
        // }.bind(this);
        this.super([animation, callback]);
    },
    keyDown: function(event) {
        if (event.keyCode == 13) {
            this.enter();
        }
    },
    enter: function() {
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