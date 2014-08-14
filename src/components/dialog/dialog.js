/* global Polymer, padlock */

(function(Polymer, platform) {
    "use strict";

    Polymer("padlock-dialog", {
        open: false,
        //* Changed handler for the _open_ property. Shows/hides the dialog
        openChanged: function() {
            var items = this.children,
                // transition delay between individual items
                dt = 0.2/items.length,
                prefix = platform.getVendorPrefix().css,
                l = items.length,
                delay;

            // Firefox apparently doesn't want a prefix when setting the style property directly via the dom
            prefix = prefix == "-moz-" ? "" : prefix;

            // Apply incremental transition delays to the individual elements
            // to create a nice animation
            for (var i=0; i<l; i++) {
                delay = this.open ? i * dt : (items.length - i - 1) * dt;
                items[i].style[prefix + "transition"] = prefix + "transform 0.3s ease " +
                    delay + "s, opacity 0.3s ease " + delay + "s";
            }

            // Set _display: block_ if we're showing. If we're hiding
            // we need to wait until the transitions have finished before we
            // set _display: none_.
            if (this.open) {
                this.style.display = "block";
            }

            // We have two transitions per child and one for the dialog element
            // itself. We'll count this down after each _transitionend_ so
            // we know when we're done animating.
            this.transCount = items.length * 2 + 1;

            // Trigger relayout to make sure all elements have been rendered
            // when applying the transition
            // jshint expr: true
            this.offsetLeft;
            // jshint expr: false

            if (this.open) {
                this.classList.add("open");
            } else {
                this.classList.remove("open");
            }

            // Remove focus from any input elements when closing
            if (!this.open) {
                Array.prototype.forEach.call(this.querySelectorAll("input"), function(input) {
                    input.blur();
                });
            }

            this.fire(this.open ? "open" : "close");
        },
        /** 
         * Counts down the transition count and, if we are hiding the dialog,
         * sets _display: none_ once all transitions are through
         */
        transitionEnd: function() {
            this.transCount--;
            if (!this.transCount && !this.open) {
                this.style.display = "none";
            }
        },
        innerTap: function(event) {
            // Intercept the tap event to prevent closing the popup if one
            // of the inner elements was tapped.
            event.stopPropagation();
        },
        //* Closes the popup (duh)
        close: function() {
            this.open = false;
        }
    });

})(Polymer, padlock.platform);