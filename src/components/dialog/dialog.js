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
            },
            closeOnTap: Boolean,
            allowDismiss: {
                type: Boolean,
                value: true
            }
        },
        listeners: {
            tap: "_dismiss"
        },
        //* Changed handler for the _open_ property. Shows/hides the dialog
        _openChanged: function(curr, prev) {
            // Set _display: block_ if we're showing. If we're hiding
            // we need to wait until the transitions have finished before we
            // set _display: none_.
            if (this.open) {
                this.cancelAsync(this._hideTimeout);
                this.style.display = "block";
                this.isShowing = true;
            } else {
                this._hideTimeout = this.async(function() {
                    this.style.display = "none";
                    this.isShowing = false;
                }, 250);
            }

            // Trigger relayout to make sure all elements have been rendered
            // when applying the transition
            // jshint expr: true
            this.offsetLeft;
            // jshint expr: false

            this.toggleClass("open", this.open);
            
            if (prev !== undefined) {
                this.fire(this.open ? "open" : "close");
            }
        },
        _innerTap: function(event) {
            // Intercept the tap event to prevent closing the popup if one
            // of the inner elements was tapped.
            if (!this.closeOnTap) {
                event.stopPropagation();
            }
        },
        //* Closes the popup (duh)
        _close: function() {
            this.open = false;
        },
        _dismiss: function() {
            if (this.allowDismiss) {
                this._close();
                this.fire("dismiss");
            }
        }
    });

})(Polymer);
