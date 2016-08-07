/* global padlock, unescape, Papa */

/**
 * Module for importing data from various formats.
 */
padlock.import = (function(crypto, DisposableSource, Papa) {
    "use strict";

    //* Detects if a string contains a SecuStore backup
    var isSecuStoreBackup = function(rawData) {
        // Very simply check but I think it should do.
        return rawData.indexOf("SecuStore") != -1 && rawData.indexOf("#begin") != -1 && rawData.indexOf("#end") != -1;
    };

    /**
     * Decrypts a SecuStore backup and converts it into a Padlock-compatible array of records
     * @param  {String}   rawData  Raw backup string
     * @param  {String}   password Password to be used for decryption
     * @return {Array}             A list of records
     */
    var importSecuStoreBackup = function(collection, rawData, password, success, fail) {
        var begin = "#begin",
            end = "#end",
            objJSON, obj;

        //Get the JSON code for the data
        objJSON = rawData.substring(rawData.indexOf(begin) + begin.length, rawData.indexOf(end));

        try {
            // Try to parse JSON object containing data needed for decryption
            obj = JSON.parse(objJSON);
        } catch(e) {
            fail && fail(e);
            return;
        }

        // Create a crypto container and initialize it with the parameters from the
        // obtained object
        var cont = crypto.initContainer();
        cont.salt = obj.salt;
        cont.iv = obj.data.iv;
        cont.ct = obj.data.ct;
        cont.iter = 1000;
        cont.keySize = 256;
        cont.adata = unescape(obj.data.adata);

        // Generate a key from the password provided by the user and the meta data from the backup
        crypto.cachedWorkerGenKey(password, cont.salt, cont.keySize, cont.iter, function(keyData) {
            // Decrypt data
            crypto.workerDecrypt(keyData, cont, function(pt) {
                // If the decrypting was successful there should no reason why this should fail
                var data = JSON.parse(pt);

                // Convert the _items_ array of the SecuStore Set object into an array of Padlock records
                var records = data.items.map(function(item) {
                    var fields = item.template.containsPassword ?
                        // Passwords are a separate property in SecuStore but will be treated as
                        // regular fields in Padlock
                        item.fields.concat([{name: "password", value: item.password}]) : item.fields;

                    return {
                        name: item.title,
                        category: data.name,
                        fields: fields
                    };
                });

                collection.add(records);

                success && success(records);
            }, fail);
        });
    };

    /**
     * Parses a raw CSV string into an 2-dimensional array.
     * Taken from
     * http://www.bennadel.com/blog/1504-Ask-Ben-Parsing-CSV-Strings-With-Javascript-Exec-Regular-Expression-Command.htm
     * @param  String   strData      Raw CSV string
     * @param  String   strDelimiter Row delimiter
     * @return Array                 2-dimensional array containing rows & columns
     */
    var parseCsv = function(strData) {
        var parsed = Papa.parse(strData);
        return parsed.data;
    };

    /**
     * Takes a data table (represented by a two-dimensional array) and converts it
     * into an array of records
     * @param  Array    data         Two-dimensional array containing tabular record data; The first 'row'
     *                               should contain field names. All other rows represent records, containing
     *                               the record name, field values and optionally a category name.
     * @param  Integer  nameColIndex Index of the column containing the record names. Defaults to 0
     * @param  Integer  catColIndex  Index of the column containing the record categories. If left empty
     *                               no categories will be used
     * @return Array                 An array or records
     */
    var importTable = function(collection, data, nameColIndex, catColIndex) {
        // Use first row for column names
        var colNames = data[0];
        nameColIndex = nameColIndex || 0;

        // All subsequent rows should contain values
        var records = data.slice(1).map(function(row) {
            // Construct an array of field object from column names and values
            var fields = [];
            for (var i=0; i<row.length; i++) {
                // Skip name column, category column (if any) and empty fields
                if (i != nameColIndex && i != catColIndex && row[i]) {
                    fields.push({
                        name: colNames[i],
                        value: row[i]
                    });
                }
            }

            return {
                name: row[nameColIndex] || "Unnamed",
                category: row[catColIndex] || "",
                fields: fields
            };
        });

        collection.add(records);
        return records;
    };

    /**
     * Checks if a given string represents a Padlock enrypted backup
     */
    var isPadlockBackup = function(string) {
        try {
            // Try to parse string into JS object
            var data = JSON.parse(string);
            // Check if all expected properties are present on the object
            return crypto.validateContainer(data);
        } catch(e) {
            // The string is not valid JSON so it can't be a valid Padlock backup
            return false;
        }
    };

    /**
     * Imports a given Padlock crypto container into a given `Collection`
     * @params {padlock.Collection} Collection object to import data into
     * @data {String} String representing a Padlock encrypted backup
     * @password {String} Password to use for decrypting data
     * @success {Function} Success callback
     * @fail {Function} Failure callback
     */
    var importPadlockBackup = function(collection, data, password, success, fail) {
        try {
            // Try to parse string to JS object
            data = JSON.parse(data);
        } catch(e) {
            // Failed to parse as JSON, so unable to restore data
            fail && fail(e);
            return;
        }

        // Use simple container Source to import data into collection
        var source = new DisposableSource(data);
        collection.fetch({source: source, password: password, success: success, fail: fail});
    };

    /*
     * Lastpass secure notes are exported by putting non-standard fields into the 'extra' column. Every line
     * represents a field in the following format:
     *
     *     field_name:data
     *
     * We're parsing that information to retrieve the individual fields
     */
    function lpParseNotes(str) {
        var lines = str.split("\n");
        var fields = lines.filter(function(line) { return !!line; }).map(function(line) {
            var splitInd = line.indexOf(":");
            return {
                name: line.substring(0, splitInd),
                value: line.substring(splitInd + 1)
            };
        });

        return fields;
    }

    /*
     * Parses a single row in a LastPass CSV file. Apart from extracting the default fields, we also parse
     * the 'extra' column for 'special notes' and remove any special fields that are not needed outside of
     * LastPass
     */
    function lpParseRow(row) {
        var nameIndex = 4;
        var categoryIndex = 5;
        var urlIndex = 0;
        var usernameIndex = 1;
        var passwordIndex = 2;
        var notesIndex = 3;

        // Create a basic item using the standard fields
        var item = {
            name: row[nameIndex],
            category: row[categoryIndex],
            fields: [
                {name: "url", value: row[urlIndex]},
                {name: "username", value: row[usernameIndex]},
                {name: "password", value: row[passwordIndex]}
            ]
        };
        var notes = row[notesIndex];
        if (row[urlIndex] == "http://sn") {
            // The 'http://sn' url indicates that this line represents a 'secure note', which means
            // we'll have to parse the 'extra' column to retrieve the individual fields
            item.fields.push.apply(item.fields, lpParseNotes(notes));
            // In case of 'secure notes' we don't want the url and NoteType field
            item.fields = item.fields.filter(function(f) {
                return f.name != "url" && f.name != "NoteType";
            });
        } else {
            // We've got a regular 'site' item, so the 'extra' column simply contains notes
            item.fields.push({name: "Notes", value: notes});
        }

        return item;
    }

    /**
     * Imports data from a CSV file exported from LastPass
     * @param {padlock.Collection} Collection object to import the data into
     * @param {String} CSV string to parse and import
     * @returns {Array} An array of record objects
     */
    function importLastPassExport(collection, data) {
        var records = parseCsv(data);

        // Remove first row as it only contains field names
        records.shift();
        // Make an array of records by parsing every (non empty) row
        records = records.filter(function(row) { return row.length > 1; }).map(lpParseRow);

        collection.add(records);
        return records;
    }

    /**
     * Checks if a given string represents a LastPass CSV file
     */
    function isLastPassExport(data) {
        return data.split("\n")[0] == "url,username,password,extra,name,grouping,fav";
    }

    return {
        isSecuStoreBackup: isSecuStoreBackup,
        isPadlockBackup: isPadlockBackup,
        importSecuStoreBackup: importSecuStoreBackup,
        importPadlockBackup: importPadlockBackup,
        parseCsv: parseCsv,
        importTable: importTable,
        importLastPassExport: importLastPassExport,
        isLastPassExport: isLastPassExport
    };
})(padlock.crypto, padlock.DisposableSource, Papa);
