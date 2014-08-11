/* global Polymer, padlock */

(function(Polymer, util, rand, platform) {
    "use strict";

    Polymer("padlock-record-view", {
        headerOptions: {
            show: true,
            leftIconShape: "left",
            rightIconShape: "more"
        },
        titleText: "",
        observe: {
            "record.name": "updateTitleText"
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
            this.selectedField = null;
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
            this.selectedField.value = this.$.fieldValueInput.value;
            this.selectedField = null;
            this.fire("save");
        },
        //* Opens the field context menu
        fieldTapped: function(event, detail, sender) {
            this.selectedField = sender.templateInstance.model;
        },
        //* Opens the remove field confirm dialog
        removeField: function() {
            this.$.confirmRemoveFieldDialog.open = true;
            this.$.fieldMenu.open = false;
        },
        confirmRemoveField: function() {
            this.$.confirmRemoveFieldDialog.open = false;
            this.record.fields = util.remove(this.record.fields, this.record.fields.indexOf(this.selectedField));
            this.selectedField = null;
            this.fire("save");
        },
        cancelRemoveField: function() {
            this.$.confirmRemoveFieldDialog.open = false;
        },
        //* Updates the titleText property with the name of the current record
        updateTitleText: function() {
            this.titleText = this.record && this.record.name;
        },
        openCategories: function() {
            this.fire("categories");
        },
        copyToClipboard: function() {
            // If a field has been selected copy that one, otherwise copy the marked one
            var field = this.selectedField ? this.selectedField : this.record.fields[this.marked],
                value = field && field.value;

            platform.setClipboard(value);
            this.selectedField = null;
        },
        //* Fills the current value input with a randomized value
        randomize: function() {
            // Choose the right input based on whether we are creating a new field or editing an existing one
            var input = this.selectedField ? this.$.fieldValueInput : this.$.newValueInput;
            input.value = rand.randomString(20);
        },
        markNext: function() {
            if (this.record.fields.length && !this.selectedField) {
                if (this.marked === null) {
                    this.marked = 0;
                } else {
                    this.marked = (this.marked + 1 + this.record.fields.length) % this.record.fields.length;
                }
            }
        },
        markPrev: function() {
            if (this.record.fields.length && !this.selectedField) {
                if (this.marked === null) {
                    this.marked = this.record.fields.length - 1;
                } else {
                    this.marked = (this.marked - 1 + this.record.fields.length) % this.record.fields.length;
                }
            }
        },
        markedChanged: function(markedOld, markedNew) {
            var elements = this.shadowRoot.querySelectorAll(".field"),
                oldEl = elements[markedOld],
                newEl = elements[markedNew];

            if (oldEl) {
                oldEl.classList.remove("marked");
            }
            if (newEl) {
                newEl.classList.add("marked");
                this.scrollIntoView(newEl);
            }
        },
        //* Scrolls a given element in the list into view
        scrollIntoView: function(el) {
            if (el.offsetTop < this.scrollTop) {
                // The element is off to the top; Scroll it into view, aligning it at the top
                el.scrollIntoView();
            } else if (el.offsetTop + el.offsetHeight > this.scrollTop + this.offsetHeight) {
                // The element is off to the bottom; Scroll it into view, aligning it at the bottom
                el.scrollIntoView(false);
            }
        },
        selectMarked: function() {
            this.selectedField = this.record.fields[this.marked];
        },
        fieldDialogClosed: function() {
            // If all field-related dialogs are closed, unselect the field
            if (!this.$.fieldMenu.open && !this.$.confirmRemoveFieldDialog.open && !this.$.editFieldDialog.open) {
                this.selectedField = null;
            }
        },
        selectedFieldChanged: function() {
            if (this.selectedField) {
                this.selectedFieldName = this.selectedField.name;
                this.$.fieldValueInput.value = this.selectedField && this.selectedField.value || "";
                this.$.fieldMenu.open = true;
            } else {
                this.$.fieldMenu.open = false;
                this.$.editFieldDialog.open = false;
                this.$.confirmDeleteDialog.open = false;
            }
            var fieldIndex = this.record.fields.indexOf(this.selectedField);
            this.marked = fieldIndex !== -1 ? fieldIndex : null;
        }
    });

})(Polymer, padlock.util, padlock.rand, padlock.platform);