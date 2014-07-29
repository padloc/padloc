(function(Polymer) {

Polymer("padlock-toggle", {
    value: false,
    toggle: function() {
        this.value = !this.value;
        this.valueChanged();
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

})(Polymer);