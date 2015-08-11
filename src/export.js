/* global padlock */

padlock.export = (function() {
    "use strict";

    function recordsToTable(records) {
        var cols = ["name", "category"];
        var colInds = {};
        var table = [cols];
        records = records.filter(function(rec) { return !rec.removed; });

        records.forEach(function(rec) {
            rec.fields.forEach(function(field) {
                if (!colInds[field.name]) {
                    colInds[field.name] = cols.length;
                    cols.push(field.name);
                }
            });
        });

        function emptyRow() {
            var l = cols.length;
            var row = [];
            while (l--) {
                row.push("");
            }
            return row;
        }

        records.forEach(function(rec) {
            var row = emptyRow();
            row[0] = rec.name;
            row[1] = rec.category || "";
            table.push(row);

            rec.fields.forEach(function(rec) {
                row[colInds[rec.name]] = rec.value;
            });
        });

        return table;
    }

    function tableToCsv(table) {
        return table.map(function(row) {
            return row.map(JSON.stringify).join(",");
        }).join("\r\n");
    }

    function generateCsv(records) {
        return tableToCsv(recordsToTable(records));
    }

    return {
        generateCsv: generateCsv
    };
})();
