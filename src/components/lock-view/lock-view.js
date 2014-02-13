Polymer("padlock-lock-view", {
    keydown: function(event, detail, sender) {
        if (event.keyCode == 13) {
            this.enter();
        }
    },
    enter: function() {
        this.$.pwdInput.blur();
        this.fire("enter", {password: this.$.pwdInput.value});
    },
    show: function() {
        this.$.pwdInput.value = "";
        this.super(arguments);
    }
});