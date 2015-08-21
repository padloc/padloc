/* global Polymer, padlock */

(function(Polymer, ViewBehavior, util, imp, platform) {
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
            this.rightHeaderIcon = "copy";
            this.headerTitle = "Import Records";
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        rightHeaderButton: function() {
            platform.getClipboard(function(text) {
                this.$.rawInput.value = text;
                this.fire("notify", {message: "Data pasted from clipboard", type: "success", duration: 1500});
            }.bind(this));
        },
        show: function() {
            this.$.rawInput.value = inputPlaceholder;
            platform.keyboardDisableScroll(true);
            ViewBehavior.show.apply(this, arguments);
        },
        hide: function() {
            platform.keyboardDisableScroll(false);
            ViewBehavior.hide.apply(this, arguments);
        },
        //* Shows password dialog
        _requirePassword: function(callback) {
            this.fire("open-form", {
                title: "Encrypted backup detected. Please enter the password for this backup.",
                components: [
                    {element: "input", type: "password", placeholder: "Enter Password",
                        name: "password", autofocus: true},
                    {element: "button", label: "Decrypt", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                submit: callback
            });
        },
        _startImport: function(e) {
            e && e.preventDefault();
            // this.$.nameColDialog.open = true;
            var rawStr = this.$.rawInput.value;
            if (!rawStr || rawStr == inputPlaceholder) {
                this.fire("notify", {message: "Please enter some data!", type: "error", duration: 1500});
                return;
            }

            if (imp.isSecuStoreBackup(rawStr)) {
                this._requirePassword(this._importSecuStoreBackup.bind(this));
            } else if (imp.isPadlockBackup(rawStr)) {
                this._requirePassword(this._importPadlockBackup.bind(this));
            } else {
                this._csvData = imp.parseCsv(rawStr);
                this._getNameCol();
            }
        },
        _importPadlockBackup: function(data) {
            this.$$("padlock-progress").show();
            imp.importPadlockBackup(this.collection, this.$.rawInput.value, data.password, function(records) {
                this.collection.save();
                this.fire("imported", {count: records.length});
            }.bind(this), this._promptDecryptionFailed.bind(this));
            this.$$("padlock-progress").hide();
        },
        //* Starts the import using the raw input and the provided password
        _importSecuStoreBackup: function(data) {
            this.$$("padlock-progress").show();

            imp.importSecuStoreBackup(this.collection, this.$.rawInput.value, data.password, function(records) {
                this.collection.save();
                this.fire("imported", {count: records.length});
            }.bind(this), this._promptDecryptionFailed.bind(this));
            this.$$("padlock-progress").hide();
        },
        _promptDecryptionFailed: function() {
            this.fire("open-form", {
                title: "Decrypting the data failed. Either the password you entered was incorrect or the " +
                    "data provided is incomplete or corrupted.",
                components: [
                    {element: "button", label: "Retry", submit: true, tap: this._startImport.bind(this)},
                    {element: "button", label: "Cancel", cancel: true}
                ]
            });
        },
        //* Opens a dialog for selecting a column for record names
        _getNameCol: function() {
            this._colNames = this._csvData[0].slice();
            this.fire("open-form", {
                title: "Which column would you like to use for record names?",
                components: this._colNames.map(function(col) {
                    return {element: "button", label: col, submit: true, tap: this._selectNameCol.bind(this, col)};
                }.bind(this))
            });
        },
        _selectNameCol: function(colName) {
            this._nameColIndex = this._colNames.indexOf(colName);
            this._getCatCol();
        },
        //* Opens the dialog for selecting a column for the category
        _getCatCol: function() {
            // One column is already taken by the record name
            var opts = util.remove(this._colNames, this._nameColIndex);
            var components = [
                {element: "button", label: "(none)", submit: true, tap: this._selectCatCol.bind(this, null)}
            ].concat(opts.map(function(col) {
                return {element: "button", label: col, submit: true, tap: this._selectCatCol.bind(this, col)};
            }.bind(this)));

            this.fire("open-form", {
                title: "Which column would you like to use for categories?",
                components: components
            });
        },
        _selectCatCol: function(colName) {
            this._catColIndex = this._colNames.indexOf(colName);
            this.async(this._importCsv, 100);
        },
        _importCsv: function() {
            var records = imp.importTable(this.collection, this._csvData, this._nameColIndex, this._catColIndex);
            this.collection.save();
            this.fire("imported", {count: records.length});
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.util, padlock.import, padlock.platform);
