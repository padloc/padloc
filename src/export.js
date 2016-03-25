/* global padlock, Papa */

/**
 * Module for exporting padlock data to CSV or Padlock encrypted container format
 */
padlock.export = (function(Papa) {
    "use strict";

    /**
     * Converts an array of Padlock records to a two-dimensional array
     * @param {Array} records Array of Padlock records
     */
    function recordsToTable(records) {
        // Array of column names
        var cols = ["name", "category"];
        // Column indizes associated with field/column names
        var colInds = {};
        // Two dimensional array, starting with column names
        var table = [cols];
        // Filter out removed items
        records = records.filter(function(rec) { return !rec.removed; });

        // Fill up columns array with distinct field names
        records.forEach(function(rec) {
            rec.fields.forEach(function(field) {
                if (!colInds[field.name]) {
                    colInds[field.name] = cols.length;
                    cols.push(field.name);
                }
            });
        });

        // Creates an array of empty strings with the length of the `cols` array
        function emptyRow() {
            var l = cols.length;
            var row = [];
            while (l--) {
                row.push("");
            }
            return row;
        }

        // Add a row for each record
        records.forEach(function(rec) {
            // Create an empty row to be filled with record name, category and field values
            var row = emptyRow();
            // Record name and category are always the first and second column respectively
            row[0] = rec.name;
            row[1] = rec.category || "";

            // Fill up columns with corrensponding field values if the fields exist on the record. All
            // other columns remain empty
            rec.fields.forEach(function(rec) {
                row[colInds[rec.name]] = rec.value;
            });

            // Add row to table
            table.push(row);
        });

        return table;
    }

    /**
     * Generates a CSV string from a two-dimensional array
     * @param {Array} table two-dimensional array containing a first row of field names and a number of
     * subsequent rows containing field values
     */

    /**
     * Generates a CSV string from an array of Padlock records
     * @param {Array} records Array of Padlock records
     */
    function generateCsv(records) {
        return Papa.unparse(recordsToTable(records));
    }

    return {
        generateCsv: generateCsv
    };
})(Papa);
