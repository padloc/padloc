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
            },
            _revealedFields: Object
        },
        observers: [
            "_updateTitleText(record.name)"
        ],
        ready: function() {
            this.leftHeaderIcon = "left";
            this.rightHeaderIcon = "more";
            this._itemSelector = ".field";
        },
        show: function() {
            this._marked = this.record ? this.record.fields.indexOf(this._selectedField) : -1;
            this._revealedFields = {};
            ViewBehavior.show.apply(this, arguments);
        },
        add: function() {
            this._addField();
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        rightHeaderButton: function() {
            this._openRecordMenu();
        },
        _openRecordMenu: function() {
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Edit Record Name", submit: true, tap: this._editName.bind(this)},
                    {element: "button", label: "Delete Record", submit: true, tap: this._deleteRecord.bind(this)},
                    {element: "button", submit: true, tap: this._toggleObfuscate.bind(this),
                        label: this.settings.obfuscate_fields ? "Show Field Values" : "Hide Field Values"}
                ],
                cancel: this._deselect.bind(this)
            });
        },
        _deleteRecord: function() {
            this.fire("open-form", {
                title: "Are you sure you want to delete this record?",
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
                }.bind(this)
            });
        },
        //* Opens the add field dialog
        _addField: function(presets) {
            presets = presets || {};
            this.$.selector.deselect();

            this.fire("open-form", {
                title: "Add Field",
                components: [
                    {element: "input", placeholder: "Enter Label", name: "name", value: presets.name, autofocus: true},
                    {element: "input", placeholder: "Enter Content", name: "value", value: presets.value},
                    {element: "button", label: "Generate", cancel: true, tap: this._generateValue.bind(this)},
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
                            value: data.value
                        };
                        this.push("record.fields", field);
                        this.fire("save");
                    }
                }.bind(this)
            });
        },
        _openFieldMenu: function() {
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Copy to Clipboard", submit: true, tap: this.copyToClipboard.bind(this)},
                    {element: "button", label: "Edit", submit: true, tap: this._editField.bind(this)},
                    {element: "button", label: "Remove", submit: true, tap: this._removeField.bind(this)}
                ],
                cancel: this._deselect.bind(this)
            });
        },
        _editField: function(presets) {
            presets = presets || {};
            var field = this._selectedField;
            this.fire("open-form", {
                title: "Edit '" + field.name + "'",
                components: [
                    {element: "input", placeholder: "Enter Content", name: "value",
                        value: presets.value || field.value, autofocus: true, selectAllOnFocus: true},
                    {element: "button", label: "Generate", close: true, tap: this._generateValue.bind(this)},
                    {element: "button", label: "Save", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                cancel: this._deselect.bind(this),
                submit: function(data) {
                    this.set("_selectedField.value", data.value);
                    this.$.selector.deselect();
                    this.fire("save");
                }.bind(this)
            });
        },
        //* Opens the field context menu
        _fieldTapped: function(e) {
            this.$.selector.select(e.model.item);
        },
        //* Opens the remove field confirm dialog
        _removeField: function() {
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Remove", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                submit: function() {
                    var ind = this.record.fields.indexOf(this._selectedField);
                    this.splice("record.fields", ind, 1);
                    this.$.selector.deselect();
                    this.fire("save");
                }.bind(this),
                cancel: this._deselect.bind(this)
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
                this._selectedField = null;
                this.fire("notify", {message: "Copied to clipboard!", type: "success", duration: 1500});
            }
        },
        //* Fills the current value input with a randomized value
        _generateValue: function(values) {
            var field = this._selectedField || values;
            this.async(function() {
                this.fire("generate-value", {field: field});
            }, 300);
        },
        generateConfirm: function(field, value) {
            if (this._selectedField) {
                this._editField({value: value});
            } else {
                this._addField({name: field.name, value: value});
            }
        },
        selectMarked: function() {
            this.$.selector.select(this.record.fields[this._marked]);
        },
        _deselect: function() {
            // If all field-related dialogs are closed, unselect the field
            this.$.selector.deselect();
        },
        _selectedFieldChanged: function() {
            if (this._selectedField) {
                this._openFieldMenu();
            }
            this._marked = this.record ? this.record.fields.indexOf(this._selectedField) : -1;
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
            var res = "", l = value.length;
            while (l--) {
                res += "\u2022";
            }
            return res;
        },
        _revealField: function(e) {
            this.set("_revealedFields." + e.model.index, true);
        },
        _unrevealField: function(e) {
            this.set("_revealedFields." + e.model.index, false);
        },
        _isObfuscated: function(ind) {
            return this.settings.obfuscate_fields && !this._revealedFields[ind];
        },
        _fieldMouseover: function(e) {
            if (!platform.isTouch()) {
                this._revealField(e);
            }
        },
        _fieldMouseout: function(e) {
            if (!platform.isTouch()) {
                this._unrevealField(e);
            }
        },
        _toggleObfuscate: function() {
            this.set("settings.obfuscate_fields", !this.settings.obfuscate_fields);
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.MarkableBehavior, padlock.util, padlock.rand, padlock.platform);
