/* global Polymer, padlock, cordova */

(function(Polymer, ViewBehavior, util, imp) {
    "use strict";

    var inputPlaceholder =
        "Paste your data here! It should be in CSV format, like this:\n" +
        "\n" +
        "Name,Category,Url,Username,Password\n" +
        "Gmail,Work,google.com,Martin,j83jaDK\n" +
        "Twitter,,twitter.com,mclovin,dj83$j\n" +
        "\n" +
        "Encrypted Padlock backups are also supported.";

    Polymer({
        is: "padlock-import-view",
        behaviors: [ViewBehavior],
        properties: {
            collection: Object,
        },
        ready: function() {
            this.leftHeaderIcon = "left";
            this.rightHeaderIcon = "";
            this.headerTitle = "Import Records";
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        show: function() {
            this.$.rawInput.value = inputPlaceholder;
            if (typeof cordova !== "undefined") {
                setTimeout(function() {
                    cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
                }, 10);
            }
            ViewBehavior.show.apply(this, arguments);
        },
        hide: function() {
            if (typeof cordova !== "undefined") {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            ViewBehavior.hide.apply(this, arguments);
        },
        //* Shows password dialog
        _requirePassword: function() {
            this.$.errorDialog.open = false;
            this.$.pwdInput.value = "";
            this.$.pwdDialog.open = true;
        },
        _startImport: function() {
            // this.$.nameColDialog.open = true;
            var rawStr = this.$.rawInput.value;
            if (!rawStr) {
                return;
            }

            if (imp.isSecuStoreBackup(rawStr)) {
                this._type = "secustore";
                this._requirePassword();
            } else if (imp.isPadlockBackup(rawStr)) {
                this._type = "padlock";
                this._requirePassword();
            } else {
                this._csvData = imp.parseCsv(rawStr);
                this._getNameCol();
            }
        },
        _passwordConfirm: function() {
            this.$.pwdDialog.open = false;
            if (this._type == "secustore") {
                this._importSecuStoreBackup();
            } else if (this._type == "padlock") {
                this._importPadlockBackup();
            }
        },
        _importPadlockBackup: function() {
            this.$.progress.show();
            imp.importPadlockBackup(this.collection, this.$.rawInput.value, this.$.pwdInput.value, function(records) {
                this.collection.save();
                this.fire("imported", {count: records.length});
            }.bind(this), function() {
                this.$.errorDialog.open = true;
            }.bind(this));
            this.$.progress.hide();
        },
        //* Starts the import using the raw input and the provided password
        _importSecuStoreBackup: function() {
            this.$.progress.show();

            imp.importSecuStoreBackup(this.collection, this.$.rawInput.value, this.$.pwdInput.value, function(records) {
                this.collection.save();
                this.fire("imported", {count: records.length});
            }.bind(this), function() {
                this.$.errorDialog.open = true;
            }.bind(this));
            this.$.progress.hide();
        },
        _importCancel: function() {
            this.$.errorDialog.open = false;
            this.fire("back");
        },
        //* Opens a dialog for selecting a column for record names
        _getNameCol: function() {
            this.colNames = this._csvData[0].slice();
            this._nameColOptions = this.colNames;
            this.$.nameColSelect.selected = -1;
            this.$.nameColDialog.open = true;
        },
        _confirmNameCol: function() {
            this._nameColIndex = this.$.nameColSelect.selected;
            if (this._nameColIndex != -1) {
                this.$.nameColDialog.open = false;
                this._getCatCol();
            }
        },
        //* Opens the dialog for selecting a column for the category
        _getCatCol: function() {
            var select = this.$.catColSelect;
            // One column is already taken by the record name
            var opts = util.remove(this.colNames, this._nameColIndex);
            this._catColOptions = opts;
            select.selected = -1;
            this.$.catColDialog.open = true;
        },
        _confirmCatCol: function() {
            var colName = this.$.catColSelect.value;
            this._catColIndex = this.colNames.indexOf(colName);
            this.$.catColDialog.open = false;
            this._importCsv();
        },
        _importCsv: function() {
            var records = imp.importTable(this._csvData, this._nameColIndex, this._catColIndex);

            this.fire("import", {records: records});
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.util, padlock.import);
