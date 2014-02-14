Polymer('padlock-record-view', {
    headerOptions: {
        show: true,
        leftIconShape: "arrow-left",
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
        this.selectedField = sender.templateInstance.model;
        this.$.fieldValueInput.value = this.selectedField.value;
        this.$.fieldNameInput.value = this.selectedField.name;
        this.$.fieldMenu.open = true;
    },
    //* Opens the remove field confirm dialog
    removeField: function() {
        this.$.fieldMenu.open = false;
        this.$.confirmRemoveFieldDialog.open = true;
    },
    confirmRemoveField: function() {
        this.$.confirmRemoveFieldDialog.open = false;
        require(["padlock/util"], function(util) {
            this.record.fields = util.remove(this.record.fields, this.record.fields.indexOf(this.selectedField));
            this.fire("save");
        }.bind(this));
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
    }
});