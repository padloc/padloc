(function(Polymer) {
    var proto = {
        hasFocus: false,
        selectAllOnFocus: false,
        ready: function() {
            // Turn off autocorrect and autocapitalize
            // this.setAttribute("autocorrect", "off");
            // this.setAttribute("autocapitalize", "off");
            
            require(["padlock/platform"], function(platform) {
                // In certain situations we want to handle the focussing
                // of input elements manually instead of relying on the native
                // tap-to-focus mechanism.
                this.overrideNativeFocus = platform.isIOSStandalone();
            }.bind(this));
        },
        tap: function(event) {
            if (this.overrideNativeFocus && !this.hasFocus) {
                this.setSelectionRange(this.value.length, this.value.length);
            }
        },
        mousedown: function() {
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
    };

    Polymer("padlock-input", proto);
    Polymer("padlock-textarea", proto);
})(Polymer);