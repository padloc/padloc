/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer({
        is: "padlock-toggle",
        properties: {
            value: {
                type: Boolean,
                value: false,
                notify: true,
                observer: "_valueChanged"
            },
            notap: Boolean
        },
        listeners: {
            tap: "_tap"
        },
        _tap: function() {
            if (!this.notap) {
                this.toggle();
            }
        },
        toggle: function() {
            this.value = !this.value;
        },
        _valueChanged: function() {
            this.toggleClass("on", this.value);
            this.fire("change");
        }
    });

})(Polymer);
