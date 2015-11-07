/* global Polymer, padlock */

(function(Polymer, ViewBehavior, MarkableBehavior, util, rand, platform) {
    "use strict";

    Polymer({
        is: "padlock-record-view",
        behaviors: [ViewBehavior, MarkableBehavior],
        properties: {
            // Record object containing the data to display
            record: Object,
            // Reference to global settings object; used to obfuscate fields based on corresponding setting
            settings: Object,
            // Currently 'selected' field. Used for keeping a reference to a field when doing manipulations on it
            _selectedField: {
                type: Object,
                observer: "_selectedFieldChanged"
            }
        },
        observers: [
            "_updateTitleText(record.name)",
            "_updateObfuscate(settings.obfuscate_fields)"
        ],
        ready: function() {
            this.adjustScrollHeight = true;
            this.leftHeaderIcon = "left";
            this.rightHeaderIcon = "trash";
            this._itemSelector = ".field";
            // Add 'touch' class to hide some desktop specific UI features like hover-behavior
            this.toggleClass("touch", platform.isTouch());
        },
        show: function() {
            // When returning to this view from a different view, make sure to restore the 'marked' state
            // based on the currently selected field
            this._marked = this.record ? this.record.fields.indexOf(this._selectedField) : -1;
            ViewBehavior.show.apply(this, arguments);
        },
        add: function() {
            this._addField();
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        rightHeaderButton: function() {
            this._deleteRecord();
        },
        titleTapped: function() {
            this._editName();
        },
        // Opens a prompt for deleting the current record
        _deleteRecord: function() {
            this.fire("open-form", {
                title: "Are you sure you want to delete this record? This action can not be undone!",
                components: [
                    {element: "button", label: "Delete", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                submit: this.fire.bind(this, "delete")
            });
        },
        // Opens a dialog for editing the record name
        _editName: function() {
            this.fire("open-form", {
                title: "Edit Name",
                components: [
                    {element: "input", placeholder: "Enter Name", name: "name",
                        value: this.record.name, autofocus: true, selectAllOnFocus: true},
                    {element: "button", label: "Save", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                submit: function(data) {
                    this.set("record.name", data.name);
                    this.fire("save");
                    this.fire("notify", {message: "Changes Saved!", type: "success", duration: 1000});
                }.bind(this)
            });
        },
        // Opens a dialog for adding a field
        _addField: function() {
            this.$.selector.deselect();

            this.fire("open-form", {
                title: "Add Field",
                components: [
                    {element: "input", placeholder: "Enter Field Name", name: "name", autofocus: true},
                    {element: "button", label: "Save", submit: true}
                ],
                submit: function(data) {
                    // new fields should have a non-empty name that doesn't exist in this record yet
                    if (!data.name) {
                        this.fire("notify", {message: "Please enter a field name!", type: "error", duration: 2000});
                    } else if (this.record.fields.some(function(f) { return f.name == data.name; })) {
                        this.fire("notify", {message: "A field with this name already exists!",
                            type: "error", duration: 2000});
                    } else {
                        // Create field and add it to the record
                        var field = {
                            name: data.name,
                            value: ""
                        };
                        this.push("record.fields", field);
                        this.fire("save");

                        // Start editing the field value
                        this.async(function() {
                            this.$.selector.select(field);
                            this._editField();
                        });
                    }
                }.bind(this)
            });
        },
        _fieldTapped: function(e) {
            // Depending on the timing, a blur event on any currently selected input field might happen
            // after this, which will undo the select unless we do something to prevent it.
            this._noDeselectOnBlur = true;
            this.$.selector.select(e.model.item);
            this.async(function() {
                this._noDeselectOnBlur = false;
            }, 300);
            this._openFieldMenu();
        },
        // Opens a context menu for the currently selected field
        _openFieldMenu: function() {
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Copy", submit: true, tap: this.copyToClipboard.bind(this)},
                    {element: "button", label: "Edit", submit: true, tap: this._editField.bind(this)},
                    {element: "button", label: "Generate", submit: true, tap: this._generateValue.bind(this)},
                    {element: "button", label: "Remove", submit: true, tap: this._removeField.bind(this)}
                ],
                cancel: function() {
                    this.$.selector.deselect();
                }.bind(this)
            });
        },
        // Saves the record and shows a notification whenever a change event fires on an input field
        _changeHandler: function() {
            this.fire("save");
            this.fire("notify", {message: "Changes Saved!", type: "success", duration: 1000});
        },
        // Finds the value input for a given index
        _valueInputForIndex: function(index) {
            return Polymer.dom(this.root).querySelectorAll(".field .value:not(.obfuscated)")[index];
        },
        // Finds the value input for a given field
        _valueInputForField: function(field) {
            var index = this.record.fields.indexOf(field);
            return this._valueInputForIndex(index);
        },
        // Focus handler for input fields
        _focusHandler: function(e) {
            this.$.selector.select(e.model.item);

            // Make sure the currently focus input is visible in the viewport. On iOS we have a separate
            // solution for this which is implemented in padlock.ViewBehavior
            if (!platform.isIOS()) {
                this.async(this._revealMarked, 300);
            }
        },
        // Blur handler for input fields. Deselects the currently selected field
        _blurHandler: function() {
            if (!this._noDeselectOnBlur) {
                this.$.selector.deselect();
            }
        },
        // Starts editing a field by moving focus to it
        _editField: function() {
            var input = this._valueInputForField(this._selectedField);
            this.async(function() {
                input && input.focus();
            }, 300);
        },
        // Opens a prompt for removing the currently selected field
        _removeField: function() {
            this.fire("open-form", {
                title: "Are you sure you want to remove this field? This action can not be undone!",
                components: [
                    {element: "button", label: "Remove", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                submit: function() {
                    // Remove the field from the record and save
                    var ind = this.record.fields.indexOf(this._selectedField);
                    this.splice("record.fields", ind, 1);
                    this.$.selector.deselect();
                    this.fire("save");
                    this.fire("notify", {message: "Changes Saved!", type: "success", duration: 1000});
                }.bind(this),
                cancel: function() {
                    this.$.selector.deselect();
                }.bind(this)
            });
        },
        // Opens the categories menu for this record
        _openCategories: function() {
            this.fire("categories");
        },
        //* Copies the value of the currently selected or marked field to the clipboard
        copyToClipboard: function() {
            // If a field has been selected copy that one, otherwise copy the marked one
            var field = this._selectedField ? this._selectedField : this.record.fields[this._marked];

            if (field) {
                platform.setClipboard(field.value);
                this.$.selector.deselect();
                this.fire("notify", {message: "Copied to clipboard!", type: "success", duration: 1500});
            }
        },
        // Fills the current value input with a randomized value
        _generateValue: function() {
            var field = this._selectedField;
            this.async(function() {
                this.fire("generate-value", {field: field});
            }, 300);
        },
        // Callback function for generating values for a field. Updates the given field and moves focus to it
        generateConfirm: function(field, value) {
            if (value) {
                this.set("_selectedField.value", value);
                var valueInput = this._valueInputForField(field);
                this.async(function() {
                    valueInput && valueInput.focus();
                    valueInput && valueInput.updateSize();
                }, 300);
            } else {
                // If no value is provided the generation process is considered canceled
                this.$.selector.deselect();
            }
        },
        _selectedFieldChanged: function() {
            // If a field is selected, lets also consider it 'marked'
            this._marked = this._selectedField ? this.record.fields.indexOf(this._selectedField) : -1;
        },
        // Updates the header title whenever the record name changes
        _updateTitleText: function(name) {
            this.headerTitle = name;
        },
        // Filter function for category class
        _categoryClass: function(category) {
            return category ? "category selected" : "category";
        },
        // Filter function for category label
        _categoryLabel: function(category) {
            return category || "Add a Category";
        },
        // Replaces all non-newline characters in a given string with dots
        _obfuscate: function(value) {
            return value.replace(/[^\n]/g, "\u2022");
        },
        // Marks a field when hovered (if not on a touch device)
        _fieldMouseover: function(e) {
            if (!platform.isTouch() && !this._selectedField) {
                this._marked = e.model.index;
            }
        },
        // Unmarks a field when hover ends (if not on a touch device)
        _fieldMouseout: function() {
            if (!platform.isTouch() && !this._selectedField) {
                this._marked = -1;
            }
        },
        // Trigger obfuscation based on settings
        _updateObfuscate: function(obfuscate) {
            this.toggleClass("obfuscate", obfuscate);
        },
        // Selects the currently marked field and opens the field menu
        selectMarked: function() {
            var field = this.record.fields[this._marked];
            if (field) {
                this.$.selector.select(field);
                this._openFieldMenu();
            }
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.MarkableBehavior, padlock.util, padlock.rand, padlock.platform);
