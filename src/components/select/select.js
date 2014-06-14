Polymer("padlock-option");

Polymer("padlock-select", {
    //* Determines wheter the select options are shown or not
    open: false,
    //* Text shown if no option is selected
    label: "tap to select",
    //* The selected element
    selected: null,
    //* If _true_, options will expand upwards instead of downwards
    openUpwards: false,
    get options() {
        return this.querySelectorAll("padlock-option");
    },
    attached: function() {
        // Initially select the first item with the _selected_ attribute
        for (var i=0; i<this.children.length; i++) {
            if (this.children[i].selected) {
                this.selected = this.children[i];
                break;
            }
        }
    },
    openChanged: function() {
        require(["padlock/platform"], function(platform) {
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
        }.bind(this));
    },
    //* Toggles the open state
    toggleOpen: function() {
        this.open = !this.open;
    },
    optionTap: function(event) {
        this.selected = event.target;
        this.open = false;
    },
    selectedChanged: function() {
        this.value = this.selected.value;
    },
    valueChanged: function() {
        this.selectValue(this.value);
    },
    //* Selects the first option with the given value
    selectValue: function(value) {
        this.selected = Array.prototype.filter.call(this.children, function(option) {
            return option.value == value;
        })[0];
    }
});