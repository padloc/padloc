Polymer("padlock-toggle", {
    value: false,
    toggle: function() {
        this.value = !this.value;
    },
    valueChanged: function() {
        if (this.value) {
            this.classList.add("on");
        } else {
            this.classList.remove("on");
        }
        this.fire("change");
    }
});