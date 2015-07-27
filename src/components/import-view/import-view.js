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
        "SecuStore backups are also supported.";

    Polymer({
        is: "padlock-import-view",
        behaviors: [ViewBehavior],
        ready: function() {
            this.headerOptions.show = true;
            this.headerOptions.leftIconShape = "left";
            this.headerOptions.rightIconShape = "";
            this.titleText = "Import Records";
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
                this._requirePassword();
            } else {
                this._csvData = imp.parseCsv(rawStr);
                this._getNameCol();
            }
        },
        //* Starts the import using the raw input and the provided password
        _importSecuStoreBackup: function() {
            this.$.pwdDialog.open = false;
            this.$.progress.show();

            imp.importSecuStoreBackup(this.$.rawInput.value, this.$.pwdInput.value, function(records) {
                this.fire("import", {records: records});
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
            // This is to make sure the option elements are generated right away
            // so we can select the first one.
            // Platform.performMicrotaskCheckpoint();
            // Select the first column by default
            this.$.nameColSelect.selected = this.$.nameColSelect.options[0];
            this.$.nameColDialog.open = true;
        },
        _confirmNameCol: function() {
            var colName = this.$.nameColSelect.value;

            this._nameColIndex = this.colNames.indexOf(colName);
            this.$.nameColDialog.open = false;
            this._getCatCol();
        },
        //* Opens the dialog for selecting a column for the category
        _getCatCol: function() {
            var select = this.$.catColSelect;

            // One column is already taken by the record name
            this._catColOptions = util.remove(this.colNames, this._nameColIndex);
            // The category is optional so we need an option for selecting none of the columns
            this._catColOptions.push("(none)");
            // This is to make sure the option elements are generated right away
            // so we can select the first one.
            // Platform.performMicrotaskCheckpoint();
            // Select 'none' by default
            select.selected = select.options[select.options.length-1];
            this.$.catColDialog.open = true;
        },
        _confirmCatCol: function() {
            var colName = this.$.catColSelect.value;

            this._catColIndex = colName == "(none)" ? undefined : this.colNames.indexOf(colName);
            this.$.catColDialog.open = false;
            this._importCsv();
        },
        _importCsv: function() {
            var records = imp.importTable(this._csvData, this._nameColIndex, this._catColIndex);

            this.fire("import", {records: records});
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.util, padlock.import);
