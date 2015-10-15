/* global padlock, unescape */

/**
 * Module for importing data from various formats.
 */
padlock.import = (function(crypto, DisposableSource) {
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
            fail(e);
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

                success(records);
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
    var parseCsv = function(strData, strDelimiter) {
        // Check to see if the delimiter is defined. If not,
        // then default to comma.
        strDelimiter = (strDelimiter || ",");

        // Create a regular expression to parse the CSV values.
        var objPattern = new RegExp(
            (
                // Delimiters.
                "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
                // Quoted fields.
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
                // Standard fields.
                "([^\"\\" + strDelimiter + "\\r\\n]*))"
            ),
            "gi"
        );

        // Create an array to hold our data. Give the array
        // a default empty first row.
        var arrData = [[]];

        // Create an array to hold our individual pattern
        // matching groups.
        var arrMatches = null;

        // Keep looping over the regular expression matches
        // until we can no longer find a match.
        while ((arrMatches = objPattern.exec(strData))) {

            // Get the delimiter that was found.
            var strMatchedDelimiter = arrMatches[1];

            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {

                // Since we have reached a new row of data,
                // add an empty row to our data array.
                arrData.push([]);

            }

            // Now that we have our delimiter out of the way,
            // lets check to see which kind of value we
            // captured (quoted or unquoted).
            var strMatchedValue;
            if (arrMatches[2]){
                // We found a quoted value. When we capture
                // this value, unescape any double quotes.
                strMatchedValue = arrMatches[2].replace(
                    new RegExp("\"\"", "g"),
                    "\""
                );
            } else {
                // We found a non-quoted value.
                strMatchedValue = arrMatches[3];
            }

            // Now that we have our value string, lets add
            // it to the data array.
            arrData[arrData.length - 1].push(strMatchedValue);
        }

        // Return the parsed data.
        return arrData;
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
            fail(e);
            return;
        }

        // Use simple container Source to import data into collection
        var source = new DisposableSource(data);
        collection.fetch({source: source, password: password, success: success, fail: fail});
    };

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

    function lpParseRow(row) {
        var nameIndex = 4;
        var categoryIndex = 5;
        var urlIndex = 0;
        var usernameIndex = 1;
        var passwordIndex = 2;
        var notesIndex = 3;

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
            item.fields.push.apply(item.fields, lpParseNotes(notes));
            // In case of 'secure notes' we don't want the url and NoteType field
            item.fields = item.fields.filter(function(f) {
                return f.name != "url" && f.name != "NoteType";
            });
        } else {
            item.fields.push({name: "Notes", value: notes});
        }

        return item;
    }

    function importLastPassExport(collection, data) {
        var records = parseCsv(data);

        // Remove first row as it only contains field names
        records.shift();
        records = records.filter(function(row) { return row.length > 1; }).map(lpParseRow);

        collection.add(records);
        return records;
    }

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
})(padlock.crypto, padlock.DisposableSource);
