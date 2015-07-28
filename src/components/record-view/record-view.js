/* global Polymer, padlock */

(function(Polymer, ViewBehavior, MarkableBehavior, util, rand, platform) {
    "use strict";

    Polymer({
        is: "padlock-record-view",
        behaviors: [ViewBehavior, MarkableBehavior],
        properties: {
            record: Object,
            titleText: {
                type: String,
                computed: "_titleText(record.name)"
            },
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
        deleteRecord: function() {
            this.$.menu.open = false;
            this.$.confirmDeleteDialog.open = true;
        },
        confirmDelete: function() {
            this.$.confirmDeleteDialog.open = false;
            this.fire("delete");
        },
        cancelDelete: function() {
            this.$.confirmDeleteDialog.open = false;
        },
        //* Opens the edit name dialog
        editName: function() {
            this.$.menu.open = false;
            this.$.nameInput.value = this.record.name;
            this.$.editNameDialog.open = true;
        },
        confirmEditName: function() {
            this.$.editNameDialog.open = false;
            this.record.name = this.$.nameInput.value;
            this.fire("save");
        },
        //* Opens the add field dialog
        addField: function() {
            this._selectedField = null;
            this.$.menu.open = false;
            this.$.newValueInput.value = "";
            this.$.newFieldNameInput.value = "";
            this.$.addFieldDialog.open = true;
        },
        confirmAddField: function() {
            this.$.addFieldDialog.open = false;
            var field = {
                name: this.$.newFieldNameInput.value,
                value: this.$.newValueInput.value
            };
            this.record.fields.push(field);
            this.fire("save");
        },
        //* Opens the edit field dialog for the currently selected field
        editField: function() {
            this.$.editFieldDialog.open = true;
            this.$.fieldMenu.open = false;
        },
        confirmEditField: function() {
            this._selectedField.value = this.$.fieldValueInput.value;
            this._selectedField = null;
            this.fire("save");
        },
        //* Opens the field context menu
        fieldTapped: function(e) {
            this._selectedField = e.model.item;
        },
        //* Opens the remove field confirm dialog
        removeField: function() {
            this.$.confirmRemoveFieldDialog.open = true;
            this.$.fieldMenu.open = false;
        },
        confirmRemoveField: function() {
            this.$.confirmRemoveFieldDialog.open = false;
            this.record.fields = util.remove(this.record.fields, this.record.fields.indexOf(this._selectedField));
            this._selectedField = null;
            this.fire("save");
        },
        cancelRemoveField: function() {
            this.$.confirmRemoveFieldDialog.open = false;
        },
        openCategories: function() {
            this.fire("categories");
        },
        copyToClipboard: function() {
            // If a field has been selected copy that one, otherwise copy the marked one
            var field = this._selectedField ? this._selectedField : this.record.fields[this._marked],
                value = field && field.value;

            platform.setClipboard(value);
            this._selectedField = null;
            this.$.clipboardNotification.show();
            this.$.clipboardNotification.hide();
        },
        //* Fills the current value input with a randomized value
        randomize: function() {
            // Choose the right input based on whether we are creating a new field or editing an existing one
            var input = this._selectedField ? this.$.fieldValueInput : this.$.newValueInput;
            input.value = rand.randomString(20);
        },
        selectMarked: function() {
            this._selectedField = this.record.fields[this._marked];
        },
        fieldDialogClosed: function() {
            // If all field-related dialogs are closed, unselect the field
            if (!this.$.fieldMenu.open && !this.$.confirmRemoveFieldDialog.open && !this.$.editFieldDialog.open) {
                this._selectedField = null;
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
        preventDefault: function(event) {
            event.preventDefault();
        },
        _titleText: function(name) {
            return name;
        },
        _categoryClass: function(category) {
            return "category color" + (this.categories.get(category) || "");
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.MarkableBehavior, padlock.util, padlock.rand, padlock.platform);
