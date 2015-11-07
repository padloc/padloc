/* global Polymer, padlock */

(function(Polymer, ViewBehavior, MarkableBehavior, util, rand, platform) {
    "use strict";

    Polymer({
        is: "padlock-record-view",
        behaviors: [ViewBehavior, MarkableBehavior],
        properties: {
            record: Object,
            settings: Object,
            _marked: {
                type: Number,
                value: -1,
                observer: "_markedChanged"
            },
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
            this.toggleClass("touch", platform.isTouch());
        },
        show: function() {
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
        //* Opens the add field dialog
        _addField: function() {
            this.$.selector.deselect();

            this.fire("open-form", {
                title: "Add Field",
                components: [
                    {element: "input", placeholder: "Enter Field Name", name: "name", autofocus: true},
                    {element: "button", label: "Save", submit: true}
                ],
                submit: function(data) {
                    if (!data.name) {
                        this.fire("notify", {message: "Please enter a field name!", type: "error", duration: 2000});
                    } else if (this.record.fields.some(function(f) { return f.name == data.name; })) {
                        this.fire("notify", {message: "A field with this name already exists!",
                            type: "error", duration: 2000});
                    } else {
                        var field = {
                            name: data.name,
                            value: ""
                        };
                        this.push("record.fields", field);
                        this.fire("save");
                        this.async(function() {
                            this.$.selector.select(field);
                            this._editField();
                        });
                    }
                }.bind(this)
            });
        },
        _openFieldMenu: function(e) {
            this._noDeselectOnBlur = true;
            this.$.selector.select(e.model.item);
            this.async(function() {
                this._noDeselectOnBlur = false;
            }, 300);
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Copy to Clipboard", submit: true, tap: this.copyToClipboard.bind(this)},
                    {element: "button", label: "Edit", submit: true, tap: this._editField.bind(this)},
                    {element: "button", label: "Generate", submit: true, tap: this._generateValue.bind(this)},
                    {element: "button", label: "Remove", submit: true, tap: this._removeField.bind(this)}
                ],
                cancel: function() {
                    this.$.selector.deselect();
                }.bind(this)
            });
        },
        _changeHandler: function() {
            this.fire("save");
            this.fire("notify", {message: "Changes Saved!", type: "success", duration: 1000});
        },
        _valueInputForIndex: function(index) {
            return Polymer.dom(this.root).querySelectorAll(".field .value:not(.obfuscated)")[index];
        },
        _valueInputForField: function(field) {
            var index = this.record.fields.indexOf(field);
            return this._valueInputForIndex(index);
        },
        _focusHandler: function(e) {
            this.$.selector.select(e.model.item);
            if (!platform.isIOS()) {
                this.async(this._revealMarked, 300);
            }
        },
        _blurHandler: function() {
            if (!this._noDeselectOnBlur) {
                this.$.selector.deselect();
            }
        },
        //* Opens the remove field confirm dialog
        _editField: function() {
            var input = this._valueInputForField(this._selectedField);
            this.async(function() {
                input && input.focus();
            }, 300);
        },
        _removeField: function() {
            this.fire("open-form", {
                title: "Are you sure you want to remove this field? This action can not be undone!",
                components: [
                    {element: "button", label: "Remove", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                submit: function() {
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
        _openCategories: function() {
            this.fire("categories");
        },
        copyToClipboard: function() {
            // If a field has been selected copy that one, otherwise copy the marked one
            var field = this._selectedField ? this._selectedField : this.record.fields[this._marked];

            if (field) {
                platform.setClipboard(field.value);
                this.$.selector.deselect();
                this.fire("notify", {message: "Copied to clipboard!", type: "success", duration: 1500});
            }
        },
        //* Fills the current value input with a randomized value
        _generateValue: function() {
            var field = this._selectedField;
            this.async(function() {
                this.fire("generate-value", {field: field});
            }, 300);
        },
        generateConfirm: function(field, value) {
            if (value) {
                this.set("_selectedField.value", value);
                var valueInput = this._valueInputForField(field);
                this.async(function() {
                    valueInput && valueInput.focus();
                    valueInput && valueInput.updateSize();
                }, 300);
            } else {
                this.$.selector.deselect();
            }
        },
        _selectedFieldChanged: function() {
            this._marked = this._selectedField ? this.record.fields.indexOf(this._selectedField) : -1;
        },
        _updateTitleText: function(name) {
            this.headerTitle = name;
        },
        _categoryClass: function(category) {
            return category ? "category selected" : "category";
        },
        _categoryLabel: function(category) {
            return category || "Add a Category";
        },
        _obfuscate: function(value) {
            return value.replace(/[^\n]/g, "\u2022");
        },
        _fieldMouseover: function(e) {
            if (!platform.isTouch() && !this._selectedField) {
                this._marked = e.model.index;
            }
        },
        _fieldMouseout: function() {
            if (!platform.isTouch() && !this._selectedField) {
                this._marked = -1;
            }
        },
        _updateObfuscate: function(obfuscate) {
            this.toggleClass("obfuscate", obfuscate);
        },
        _focusValueInput: function(e) {
            e.detail.keyboardEvent.preventDefault();
            var input = this._valueInputForIndex(e.model.index);
            input && input.focus();
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.MarkableBehavior, padlock.util, padlock.rand, padlock.platform);
