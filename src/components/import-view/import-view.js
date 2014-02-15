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
    startImport: function() {
        // this.$.nameColDialog.open = true;
        var rawStr = this.$.rawInput.value;
        if (!rawStr) {
            return;
        }

        require(["padlock/import"], function(imp) {
            if (imp.isSecuStoreBackup(rawStr)) {
                this.requirePassword();
            } else {
                this.csvData = imp.parseCsv(rawStr);
                this.getNameCol();
            }
        }.bind(this));
    },
    //* Starts the import using the raw input and the provided password
    importSecuStoreBackup: function() {
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
    },
    //* Opens a dialog for selecting a column for record names
    getNameCol: function() {
        this.colNames = this.csvData[0];
        // This is to make sure the option elements are generated right away
        // so we can select the first one.
        Platform.performMicrotaskCheckpoint();
        // Select the first column by default
        this.$.nameColSelect.selected = this.$.nameColSelect.options[0];
        this.$.nameColDialog.open = true;
    },
    confirmNameCol: function() {
        var colName = this.$.nameColSelect.selected.innerHTML;
            colIndex = this.colNames.indexOf(colName);

        this.nameColIndex = colIndex;
        this.$.nameColDialog.open = false;
        this.importCsv();
    },
    importCsv: function() {
        var imp = require("padlock/import"),
            records = imp.importTable(this.csvData, this.nameColIndex);

        this.fire("import", {records: records});
    }
});