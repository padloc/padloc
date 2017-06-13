/* global Polymer */

(function(Polymer) {
    "use strict";

    Polymer({
        is: "padlock-select",
        properties: {
            //* Determines wheter the select options are shown or not
            open: {
                type: Boolean,
                value: false,
                observer: "_openChanged"
            },
            //* Text shown if no option is selected
            label: {
                type: String,
                value: "tap to select"
            },
            //* The selected element
            selected: {
                type: Number,
                notify: true,
                observer: "_selectedChanged"
            },
            //* Value of the selected option
            value: {
                type: String,
                notify: true,
                observer: "_valueChanged"
            },
            //* If _true_, options will expand upwards instead of downwards
            openUpwards: Boolean
        },
        get options() {
            return Polymer.dom(this).querySelectorAll("padlock-option");
        },
        get selectedOption() {
            return this.options[this.selected];
        },
        attached: function() {
            this.async(this._selectDefault.bind(this));
        },
        _selectDefault: function() {
            var opts = this.options;
            // Initially select the first item with the _selected_ attribute
            for (var i=0; i < opts.length; i++) {
                if (opts[i].default) {
                    this.selected = i;
                    return;
                }
            }
            this.selected = -1;
        },
        _openChanged: function() {
            var options = this.options,
                // We're assuming all rows have the same height
                rowHeight = options[0] && options[0].offsetHeight || 50,
                gutterWidth = 5;

            // Show all options except the selected one by making them opaque
            // and lining them up via a css transform
            for (var i=0, j=0, o; i<options.length; i++) {
                o = options[i];

                // If we are showing the options, skip the selected one
                if (!this.open || i != this.selected) {
                    var y = (j + 1) * (rowHeight + gutterWidth);
                    y = !this.open ? "0" : this.openUpwards ? -y + "px" : y + "px";
                    this.translate3d("0", y, "0", o);
                    o.style.opacity = this.open ? 1 : 0;
                    j++;
                }
            }
        },
        //* Toggles the open state
        toggleOpen: function() {
            this.open = !this.open;
        },
        _optionTap: function(e) {
            this.selectElement(e.target);
            this.open = false;
        },
        _selectedChanged: function() {
            this.value = this.selectedOption && this.selectedOption.value;
        },
        _valueChanged: function() {
            this.selectValue(this.value);
        },
        //* Selects the first option with the given value
        selectValue: function(value) {
            var opts = this.options;
            for (var i = 0; i < opts.length; i++) {
                if (opts[i].value == value) {
                    this.selected = i;
                    return;
                }
            }
            this.selected = -1;
        },
        selectElement: function(el) {
            this.selected = this.options.indexOf(el);
        },
        _label: function() {
            var opt = this.selectedOption;
            return opt && (opt.label || opt.value) || this.label;
        },
        _shape: function(open) {
            return open ? "cancel" : "down";
        },
        _selectedClass: function() {
            return this.selectedOption && this.selectedOption.selectedClass || "";
        }
    });

})(Polymer);
