/* global Polymer, padlock */

(function(Polymer, ViewBehavior, MarkableBehavior, util, rand, platform) {
    "use strict";

    Polymer({
        is: "padlock-record-view",
        behaviors: [ViewBehavior, MarkableBehavior],
        properties: {
            record: Object,
            categories: Object,
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
            "_updateTitleText(record.name)"
        ],
        ready: function() {
            this.headerOptions.show = true;
            this.headerOptions.leftIconShape = "left";
            this.headerOptions.rightIconShape = "more";
            this._itemSelector = ".field";
        },
        show: function() {
            this._marked = -1;
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
            this.$.editFieldDialog.open = true;
            this.$.fieldMenu.open = false;
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
        _copyToClipboard: function() {
            // If a field has been selected copy that one, otherwise copy the marked one
            var field = this._selectedField ? this._selectedField : this.record.fields[this._marked],
                value = field && field.value;

            platform.setClipboard(value);
            this._selectedField = null;
            this.$.clipboardNotification.show();
            this.$.clipboardNotification.hide();
        },
        //* Fills the current value input with a randomized value
        _randomize: function() {
            // Choose the right input based on whether we are creating a new field or editing an existing one
            var input = this._selectedField ? this.$.fieldValueInput : this.$.newValueInput;
            input.value = rand.randomString(20);
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
        _fieldName: function(field) {
            return field && field.name;
        },
        _preventDefault: function(event) {
            event.preventDefault();
        },
        _updateTitleText: function(name) {
            this.titleText = name;
        },
        _categoryClass: function(category) {
            return this.categories && "category color" + (this.categories.get(category) || "");
        },
        _categoryLabel: function(category) {
            return category || "Add a Category";
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.MarkableBehavior, padlock.util, padlock.rand, padlock.platform);
