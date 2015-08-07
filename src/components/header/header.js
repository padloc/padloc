/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer({
        is: "padlock-header",
        properties: {
            view: Object,
            filterString: {
                type: String,
                notify: true
            },
            filterActive: {
                type: Boolean,
                value: false,
                reflectToAttribute: true
            },
            scrim: {
                type: Boolean,
                value: false,
                reflectToAttribute: true
            },
            showing: {
                type: Boolean,
                value: false,
                reflectToAttribute: true
            },
            _filterHasFocus: {
                type: Boolean,
                observer: "_filterHasFocusChanged"
            },
            _title: String
        },
        observers: [
            "_updateIcons(view, filterActive)",
            "_updateTitle(view.headerTitle)",
            "_toggleFilter(view.showFilter)"
        ],
        //* Updates the icon shapes for the left and right header button
        _updateIcons: function(view, filterActive) {
            if (view && view.showFilter && filterActive) {
                // In case the filter input is showing, view preferences are overwritten
                this.$.leftIcon.shape = "";
                this.$.rightIcon.shape = "cancel";
            } else {
                // The current view provides the icon shapes it wants
                this.$.leftIcon.shape = view && view.leftHeaderIcon;
                this.$.rightIcon.shape = view && view.rightHeaderIcon;
            }
        },
        //* The left button was clicked. Delegates to the corresponding view method
        _leftClicked: function() {
            if (this.view && this.view.leftHeaderButton) {
                this.view.leftHeaderButton();
            }
        },
        /**
         * The right button was clicked. Resets the filter string if the filter input is showing,
         * delegates to view method otherwise
         */
        _rightClicked: function() {
            if (this.view && this.view.showFilter && this.filterActive) {
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
        _filterHasFocusChanged: function() {
            if (this._filterHasFocus) {
                this.filterActive = true;
            } else if (!this.$.filterInput.value) {
                setTimeout(function() {
                    this.filterActive = false;
                }.bind(this), 50);
            }
        },
        _filterPlaceholder: function(hasFocus) {
           return hasFocus ? "type to search..." : "tap to search...";
        },
        _updateTitle: function(title) {
            this._title = title || this._title;
        },
        _toggleFilter: function(showFilter) {
            this.toggleClass("show-filter", showFilter);
        }
    });

})(Polymer);
