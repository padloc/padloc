Polymer('padlock-record-view', {
    headerOptions: {
        show: true,
        leftIconShape: "arrow-left",
        rightIconShape: "more"
    },
    titleText: "",
    leftHeaderButton: function() {
        this.fire("back");
    },
    rightHeaderButton: function() {
        this.$.menu.open = true;
    },
    getAnimationElement: function() {
        return this.$.animated;
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
        this.$.nameInput.select();
    },
    confirmEditName: function() {
        this.$.editNameDialog.open = false;
        this.record.name = this.$.nameInput.value;
        this.fire("save");
    },
    //* Opens the add field dialog
    addField: function() {
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
    confirmEditField: function() {
        this.$.fieldMenu.open = false;
        this.selectedField.value = this.$.fieldValueInput.value;
        this.selectedField.name = this.$.fieldNameInput.value;
        this.fire("save");
    },
    //* Opens the field context menu
    openFieldMenu: function(event, detail, sender) {
        this.selectedField = sender.templateInstance.model.field;
        this.$.fieldValueInput.value = this.selectedField.value;
        this.$.fieldNameInput.value = this.selectedField.name;
        this.$.fieldMenu.open = true;
        this.$.fieldValueInput.select();
    },
    //* Opens the remove field confirm dialog
    removeField: function() {
        this.$.fieldMenu.open = false;
        this.$.confirmRemoveFieldDialog.open = true;
    },
    confirmRemoveField: function() {
        this.$.confirmRemoveFieldDialog.open = false;
        var util = require("padlock/util");
        this.record.fields = util.remove(this.record.fields, this.record.fields.indexOf(this.selectedField));
        this.fire("save");
    },
    cancelRemoveField: function() {
        this.$.confirmRemoveFieldDialog.open = false;
    },
    //* Change handler for the current record. Updates the title text.
    recordChanged: function() {
        this.titleText = this.record.name;
    }
});