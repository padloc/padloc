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

            this.push("record.fields", {name: "", value: ""});
            this.async(function() {
                var newNameInput = Polymer.dom(this.root).querySelector(".field:last-of-type .label");
                newNameInput && newNameInput.focus();

                // This is a workaround for ios where for some reason the input looses focus after a moment
                this.async(function() {
                    newNameInput && newNameInput.focus();
                }, 100);
            }, 100);
        },
        _openFieldMenu: function(e) {
            this.$.selector.select(e.model.item);
            this._fieldMenuOpen = true;
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Copy to Clipboard", submit: true, tap: this.copyToClipboard.bind(this)},
                    {element: "button", label: "Generate", submit: true, tap: this._generateValue.bind(this)},
                    {element: "button", label: "Remove", submit: true, tap: this._removeField.bind(this)}
                ],
                submit: function() {
                    this._fieldMenuOpen = false;
                }.bind(this),
                cancel: function() {
                    this._fieldMenuOpen = false;
                    this.$.selector.deselect();
                }.bind(this)
            });
        },
        _changeHandler: function() {
            this.fire("save");
            this.fire("notify", {message: "Changes Saved!", type: "success", duration: 1000});
        },
        _removeEmptyFields: function() {
            var focusedInput = Polymer.dom(this.root).querySelector("input:focus, textarea:focus");
            var focusedIndex = this.$.fieldList.indexForElement(focusedInput);
            var fieldsRemoved = false;
            var field;

            // Remove empty fields
            for (var i=0; i<this.record.fields.length; i++) {
                field = this.record.fields[i];
                if (field != this._selectedField && i != focusedIndex && !field.name && !field.value) {
                    this.splice("record.fields", i, 1);
                    fieldsRemoved = true;
                    i--;
                }
            }

            if (fieldsRemoved) {
                this.fire("save");
            }
        },
        _valueInputForIndex: function(index) {
            return Polymer.dom(this.root).querySelectorAll(".field .value:not(.obfuscated)")[index];
        },
        _valueInputForField: function(field) {
            var index = this.record.fields.indexOf(field);
            return this._valueInputForIndex(index);
        },
        _focusHandler: function(e) {
            // this._marked = e.model.index;
            this.$.selector.select(e.model.item);
        },
        _blurHandler: function() {
            if (!this._fieldMenuOpen) {
                this.$.selector.deselect();
            }
            this.async(this._removeEmptyFields, 200);
        },
        //* Opens the remove field confirm dialog
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
                    valueInput && valueInput.selectAll();
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
        _showAddButton: function() {
            var lastField = this.record && this.record.fields[this.record.fields.length-1];
            return !lastField || lastField.name || lastField.value;
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.MarkableBehavior, padlock.util, padlock.rand, padlock.platform);
