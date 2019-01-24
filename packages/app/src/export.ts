import { VaultItem } from "@padloc/core/lib/item.js";
import { PBES2Container } from "@padloc/core/lib/container.js";
import { marshal, stringToBase64 } from "@padloc/core/lib/encoding.js";
import { loadPapa, ImportFormat, CSV } from "./import.js";

export const supportedFormats: ImportFormat[] = [CSV];
export { CSV } from "./import.js";

function itemsToTable(items: VaultItem[]) {
    // Array of column names
    let cols = ["name", "tags"];
    // Column indizes associated with field/column names
    let colInds = {};
    // Two dimensional array, starting with column names
    let table = [cols];

    // Fill up columns array with distinct field names
    for (let item of items) {
        for (let field of item.fields) {
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

    // Add a row for each item
    items.forEach(function(item) {
        // Create an empty row to be filled with item name, category and field values
        var row = emptyRow();
        // VaultItem name and category are always the first and second column respectively
        row[0] = item.name;
        row[1] = item.tags.join(",");

        // Fill up columns with corrensponding field values if the fields exist on the item. All
        // other columns remain empty
        item.fields.forEach(function(item) {
            row[colInds[item.name]] = item.value;
        });

        // Add row to table
        table.push(row);
    });

    return table;
}

export async function asCSV(items: VaultItem[]): Promise<string> {
    const papa = await loadPapa();
    return papa.unparse(itemsToTable(items));
}

export async function asPBES2Container(items: VaultItem[], password: string): Promise<string> {
    const container = new PBES2Container();
    container.password = password;

    await container.set(stringToBase64(marshal({ items })));

    return await container.serialize();
}
