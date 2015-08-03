/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer({
        is: "padlock-shutter",
        properties: {
            errorMessage: String,
            currentView: Object,
            filterString: {
                type: Boolean,
                notify: true
            },
            scrim: Boolean,
            startMode: Boolean,
            open: {
                type: Boolean,
                value: false,
                reflectToAttribute: true,
                observer: "_openChanged"
            }
        },
        blurFilterInput: function() {
            this.$.header.blurFilterInput();
        },
        focusFilterInput: function() {
            this.$.header.focusFilterInput();
        },
        _openChanged: function() {
            if (this.open) {
                this.$.lockView.reset();
            }
        },
        focusPwdInput: function() {
            this.$.lockView.focusPwdInput();
        },
        cancelFilter: function() {
            this.$.header.cancelFilter();
        },
        _showFilter: function(showFilter, open) {
            return showFilter && open;
        }
    });

})(Polymer);
