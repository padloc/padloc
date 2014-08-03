/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, platform) {
    "use strict";

    var inputProto = {
        hasFocus: false,
        selectAllOnFocus: false,
        ready: function() {
            // In certain situations we want to handle the focussing
            // of input elements manually instead of relying on the native
            // tap-to-focus mechanism.
            this.overrideNativeFocus = platform.isIOS();
        },
        tap: function() {
            if (this.overrideNativeFocus && !this.hasFocus) {
                this.setSelectionRange(this.value.length, this.value.length);
            }
        },
        mousedown: function(event) {
            if (this.overrideNativeFocus) {
                // We've already focussed the input. This is for suppressing the
                // native mechanism.
                event.preventDefault();
                event.stopPropagation();
            }
        },
        focussed: function() {
            this.hasFocus = true;

            if (this.selectAllOnFocus) {
                // Need to do this asynchronously in some browsers or it won't work
                setTimeout(function() {
                    this.setSelectionRange(0, this.value.length);
                }.bind(this), 10);
            }
        },
        blurred: function() {
            this.hasFocus = false;
        }
    },
    taProto = {
        hasFocus: false,
        selectAllOnFocus: false,
        ready: inputProto.ready,
        tap: inputProto.tap,
        mousedown: inputProto.mousedown,
        focussed: inputProto.focussed,
        blurred: inputProto.blurred
    };

    Polymer("padlock-input", inputProto);
    Polymer("padlock-textarea", taProto);

})(Polymer, padlock.platform);