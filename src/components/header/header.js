/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer("padlock-header", {
        view: null,
        filterString: "",
        filterActive: false,
        observe: {
            filterActive: "updateIcons",
            view: "updateIcons",
            record: "updateIcons"
        },
        //* Updates the icon shapes for the left and right header button
        updateIcons: function() {
            if (this.view && this.view.headerOptions.showFilter && this.filterActive) {
                // In case the filter input is showing, view preferences are overwritten
                this.$.leftIcon.shape = "";
                this.$.rightIcon.shape = "cancel";
            } else {
                // The current view provides the icon shapes it wants
                this.$.leftIcon.shape = this.view.headerOptions.leftIconShape;
                this.$.rightIcon.shape = this.view.headerOptions.rightIconShape;
            }
        },
        //* The left button was clicked. Delegates to the corresponding view method
        leftClicked: function() {
            if (this.view && this.view.leftHeaderButton) {
                this.view.leftHeaderButton();
            }
        },
        /**
         * The right button was clicked. Resets the filter string if the filter input is showing,
         * delegates to view method otherwise
         */
        rightClicked: function() {
            if (this.view && this.view.headerOptions.showFilter && this.filterActive) {
                this.cancelFilter();
            } else if (this.view && this.view.rightHeaderButton) {
                this.view.rightHeaderButton();
            }
        },
        //* Clears the filter input and resets the filter string
        cancelFilter: function() {
            this.filterString = "";
            this.$.filterInput.blur();
            this.filterActive = false;
        },
        blurFilterInput: function() {
            this.$.filterInput.blur();
        },
        focusFilterInput: function() {
            this.$.filterInput.focus();
        },
        filterHasFocusChanged: function() {
            if (this.filterHasFocus) {
                this.filterActive = true;
            } else if (!this.$.filterInput.value) {
                setTimeout(function() {
                    this.filterActive = false;
                }.bind(this), 50);
            }
        }
    });

})(Polymer);