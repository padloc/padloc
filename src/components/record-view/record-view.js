/* global Polymer, padlock */

(function(Polymer, ViewBehavior, MarkableBehavior, util, rand, platform) {
    "use strict";

    Polymer({
        is: "padlock-record-view",
        behaviors: [ViewBehavior, MarkableBehavior],
        properties: {
            record: Object,
            categories: Object,
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
            this._marked = -1;
            this._revealedFields = {};
            ViewBehavior.show.apply(this, arguments);
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        rightHeaderButton: function() {
            this.$.menu.open = true;
        },
        //* Opens the confirm dialog for deleting the current element
        _deleteRecord: function() {
            this.$.menu.open = false;
            this.$.confirmDeleteDialog.open = true;
        },
        _confirmDelete: function() {
            this.$.confirmDeleteDialog.open = false;
            this.fire("delete");
        },
        _cancelDelete: function() {
            this.$.confirmDeleteDialog.open = false;
        },
        //* Opens the edit name dialog
        _editName: function() {
            this.$.menu.open = false;
            this.$.nameInput.value = this.record.name;
            this.$.editNameDialog.open = true;
        },
        _confirmEditName: function() {
            this.$.editNameDialog.open = false;
            this.set("record.name", this.$.nameInput.value);
            this.fire("save");
        },
        //* Opens the add field dialog
        _addField: function() {
            this.$.selector.deselect();
            this.$.menu.open = false;
            this.$.newValueInput.value = "";
            this.$.newFieldNameInput.value = "";
            this.$.addFieldDialog.open = true;
        },
        _confirmAddField: function() {
            this.$.addFieldDialog.open = false;
            var field = {
                name: this.$.newFieldNameInput.value,
                value: this.$.newValueInput.value
            };
            this.push("record.fields", field);
            this.fire("save");
        },
        //* Opens the edit field dialog for the currently selected field
        _editField: function() {
            this.$.fieldMenu.open = false;
            this.$.editFieldDialog.open = true;
        },
        _confirmEditField: function() {
            this.set("_selectedField.value", this.$.fieldValueInput.value);
            this.$.selector.deselect();
            this.fire("save");
        },
        //* Opens the field context menu
        _fieldTapped: function(e) {
            this.$.selector.select(e.model.item);
        },
        //* Opens the remove field confirm dialog
        _removeField: function() {
            this.$.confirmRemoveFieldDialog.open = true;
            this.$.fieldMenu.open = false;
        },
        _confirmRemoveField: function() {
            var ind = this.record.fields.indexOf(this._selectedField);
            this.splice("record.fields", ind, 1);
            this.$.selector.deselect();
            this.fire("save");
            this.$.confirmRemoveFieldDialog.open = false;
        },
        _cancelRemoveField: function() {
            this.$.confirmRemoveFieldDialog.open = false;
        },
        _openCategories: function() {
            this.fire("categories");
        },
        copyToClipboard: function() {
            // If a field has been selected copy that one, otherwise copy the marked one
            var field = this._selectedField ? this._selectedField : this.record.fields[this._marked],
                value = field && field.value;

            platform.setClipboard(value);
            this._selectedField = null;
            this.$.notification.show("Copied to clipboard!", "success", 1500);
        },
        //* Fills the current value input with a randomized value
        _generateValue: function() {
            var field = this._selectedField ||
                {name: this.$.newFieldNameInput.value, value: this.$.newValueInput.value};
            this.$.editFieldDialog.open = false;
            this.$.addFieldDialog.open = false;
            this.async(function() {
                this.fire("generate-value", {field: field});
            }, 300);
        },
        generateConfirm: function(field, value) {
            if (this.record.fields.indexOf(field) !== -1) {
                this.$.selector.select(field);
                this.$.editFieldDialog.open = true;
                this.$.fieldMenu.open = false;
                this.$.fieldValueInput.value = value;
            } else {
                this.$.newValueInput.value = value;
                this.$.newFieldNameInput.value = field.name;
                this.$.addFieldDialog.open = true;
            }
        },
        selectMarked: function() {
            this.$.selector.select(this.record.fields[this._marked]);
        },
        _fieldDialogClosed: function() {
            // If all field-related dialogs are closed, unselect the field
            if (!this.$.fieldMenu.open && !this.$.confirmRemoveFieldDialog.open && !this.$.editFieldDialog.open) {
                this.$.selector.deselect();
            }
        },
        _selectedFieldChanged: function() {
            if (this._selectedField) {
                this.$.fieldValueInput.value = this._selectedField && this._selectedField.value || "";
                this.$.fieldMenu.open = true;
            } else {
                this.$.fieldMenu.open = false;
                this.$.editFieldDialog.open = false;
                this.$.confirmDeleteDialog.open = false;
            }
            this._marked = this.record ? this.record.fields.indexOf(this._selectedField) : -1;
        },
        _preventDefault: function(event) {
            event.preventDefault();
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
