/**
 * Module for importing data from various formats.
 */
define(["padlock/crypto", "padlock/util"], function(crypto, util) {

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
    var importSecuStoreBackup = function(rawData, password) {
        var begin = '#begin',
            end = '#end';
        // rawData = tData;
        
        //Get the JSON code for the data
        objJSON = rawData.substring(rawData.indexOf(begin) + begin.length, rawData.indexOf(end));
        
        try {
            // Try to parse JSON object containing data needed for decryption
            var obj = JSON.parse(objJSON);

            // Create a crypto container and initialize it with the parameters from the
            // obtained object
            var cont = crypto.initContainer();
            cont.salt = obj.salt;
            cont.iv = obj.data.iv;
            cont.ct = obj.data.ct;
            cont.iter = 1000;
            cont.adata = unescape(obj.data.adata);

            // Decrypt data and parse the resulting JSON
            var data = JSON.parse(crypto.pwdDecrypt(password, cont));

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

            return records;
        } catch(e) {
            console.error("Failed to restore backup! The data is corrupt or password incorrect!", e);
            return null;
        }
    };

    /**
     * Parses a raw CSV string into an 2-dimensional array.
     * Taken from http://www.bennadel.com/blog/1504-Ask-Ben-Parsing-CSV-Strings-With-Javascript-Exec-Regular-Expression-Command.htm
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
        while (arrMatches = objPattern.exec(strData)) {

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
    var importTable = function(data, nameColIndex, catColIndex) {
        var colNames = data[0];
        nameColIndex = nameColIndex || 0;

        return data.slice(1).map(function(row) {
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
                name: row[nameColIndex],
                category: row[catColIndex],
                fields: fields
            };
        });
    };

    return {
        isSecuStoreBackup: isSecuStoreBackup,
        importSecuStoreBackup: importSecuStoreBackup,
        parseCsv: parseCsv,
        importTable: importTable
    };
});