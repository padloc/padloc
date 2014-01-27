Polymer("padlock-import-view", {
    headerOptions: {
        show: true,
        leftIconShape: "arrow-left",
        rightIconShape: ""
    },
    titleText: "Import Records",
    leftHeaderButton: function() {
        this.fire("back");
    },
    show: function(animation, callback) {
        this.$.rawInput.value = "";
        this.super([animation, callback]);
    },
    //* Shows password dialog
    requirePassword: function() {
        this.$.errorDialog.open = false;
        this.$.pwdInput.value = "";
        this.$.pwdDialog.open = true;
    },
    //* Starts the import using the raw input and the provided password
    startImport: function() {
        this.$.pwdDialog.open = false;
        require(["padlock/import"], function(imp) {
            var records = imp.importSecuStoreBackup(this.$.rawInput.value, this.$.pwdInput.value);
            if (records) {
                this.fire("import", {records: records});
            } else {
                this.$.errorDialog.open = true;
            }
        }.bind(this));
    },
    importCancel: function() {
        this.$.errorDialog.open = false;
        this.fire("back");
    }
});