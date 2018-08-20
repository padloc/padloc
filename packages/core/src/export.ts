import { AccountStore, Record } from "./data";
import { loadPapa } from "./import";
import { marshal } from "./encoding";

function recordsToTable(records: Record[]) {
    // Array of column names
    let cols = ["name", "tags"];
    // Column indizes associated with field/column names
    let colInds = {};
    // Two dimensional array, starting with column names
    let table = [cols];
    // Filter out removed items
    records = records.filter(function(rec) {
        return !rec.removed;
    });

    // Fill up columns array with distinct field names
    for (let rec of records) {
        for (let field of rec.fields) {
            if (!colInds[field.name]) {
                colInds[field.name] = cols.length;
                cols.push(field.name);
            }
        }
    }

    // Creates an array of empty strings with the length of the `cols` array
    function emptyRow() {
        var l = cols.length;
        var row: string[] = [];
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
        row[1] = rec.tags.join(",");

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

export async function toCSV(records: Record[]): Promise<string> {
    const papa = await loadPapa();
    return papa.unparse(recordsToTable(records));
}

export async function toPadlock(records: Record[], password: string): Promise<string> {
    const store = new AccountStore(undefined, true, records);
    store.password = password;
    const data = await store.serialize();
    return marshal(data);
}
