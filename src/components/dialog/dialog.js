/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer({
        is: "padlock-dialog",
        properties: {
            open: {
                type: Boolean,
                value: false,
                observer: "_openChanged"
            },
            isShowing: {
                type: Boolean,
                value: false,
                notify: true
            }
        },
        listeners: {
            tap: "_dismiss"
        },
        //* Changed handler for the _open_ property. Shows/hides the dialog
        _openChanged: function() {
            // Set _display: block_ if we're showing. If we're hiding
            // we need to wait until the transitions have finished before we
            // set _display: none_.
            if (this.open) {
                this.style.display = "block";
                this.isShowing = true;
            } else {
                this.async(function() {
                    this.style.display = "none";
                    this.isShowing = false;
                }, 500);
            }

            // Trigger relayout to make sure all elements have been rendered
            // when applying the transition
            // jshint expr: true
            this.offsetLeft;
            // jshint expr: false

            this.toggleClass("open", this.open);

            // Remove focus from any input elements when closing
            if (!this.open) {
                Array.prototype.forEach.call(this.querySelectorAll("input"), function(input) {
                    input.blur();
                });
            }

            this.fire(this.open ? "open" : "close");
        },
        _innerTap: function(event) {
            // Intercept the tap event to prevent closing the popup if one
            // of the inner elements was tapped.
            event.stopPropagation();
        },
        //* Closes the popup (duh)
        _close: function() {
            this.open = false;
        },
        _dismiss: function() {
            this._close();
            this.fire("dismiss");
        }
    });

})(Polymer);
