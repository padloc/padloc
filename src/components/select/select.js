/* global Polymer, padlock */

(function(Polymer, platform) {
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
                type: Object,
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
        attached: function() {
            this.async(this._selectDefault.bind(this));
        },
        _selectDefault: function() {
            var opts = this.options;
            // Initially select the first item with the _selected_ attribute
            for (var i=0; i < opts.length; i++) {
                if (opts[i].selected) {
                    this.selected = opts[i];
                    break;
                }
            }
        },
        _openChanged: function() {
            var options = this.options,
                prefix = platform.getVendorPrefix().css,
                // We're assuming all rows have the same height
                rowHeight = options[0] && options[0].offsetHeight || 50,
                gutterWidth = 5;

            // Apparently firefox doesnt want a prefix when setting the style directly
            prefix = prefix == "-moz-" ? "" : prefix;

            // Show all options except the selected one by making them opaque
            // and lining them up via a css transform
            for (var i=0, j=0, o; i<options.length; i++) {
                o = options[i];

                // If we are showing the options, skip the selected one
                if (!this.open || o != this.selected) {
                    var y = (j + 1) * (rowHeight + gutterWidth);
                    y = this.openUpwards ? -y : y;
                    var trans = this.open ? "translate(0px, " + y + "px)" : "";
                    o.style[prefix + "transform"] = trans;
                    o.style.opacity = this.open ? 1 : 0;
                    j++;
                }
            }
        },
        //* Toggles the open state
        toggleOpen: function() {
            this.open = !this.open;
        },
        _optionTap: function(event) {
            this.selected = event.target;
            this.open = false;
        },
        _selectedChanged: function() {
            this.value = this.selected && this.selected.value;
        },
        _valueChanged: function() {
            this.selectValue(this.value);
        },
        //* Selects the first option with the given value
        selectValue: function(value) {
            this.selected = Array.prototype.filter.call(Polymer.dom(this).children, function(option) {
                return option.value == value;
            })[0];
        },
        _label: function(selected, label) {
            return selected ? selected.innerHTML : label;
        },
        _shape: function(open) {
            return open ? "cancel" : "down";
        }
    });

})(Polymer, padlock.platform);
