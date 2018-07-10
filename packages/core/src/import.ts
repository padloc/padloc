import { unmarshal } from "./encoding";
import { Record, Field, Store, createRecord } from "./data";
import { Container, validateRawContainer } from "./crypto";
import { loadScript } from "./util";
import { Err, ErrorCode } from "./error";

export function loadPapa(): Promise<any> {
    return loadScript("vendor/papaparse.js", "Papa");
}

/**
 * Takes a data table (represented by a two-dimensional array) and converts it
 * into an array of records
 * @param  Array    data         Two-dimensional array containing tabular record data; The first 'row'
 *                               should contain field names. All other rows represent records, containing
 *                               the record name, field values and optionally a list of tags.
 * @param  Integer  nameColIndex Index of the column containing the record names. Defaults to 0
 * @param  Integer  tagsColIndex  Index of the column containing the record categories. If left empty
 *                               no categories will be used
 */
export function fromTable(data: string[][], nameColIndex?: number, tagsColIndex?: number): Record[] {
    // Use first row for column names
    const colNames = data[0];

    if (nameColIndex === undefined) {
        const i = colNames.indexOf("name");
        nameColIndex = i !== -1 ? i : 0;
    }

    if (tagsColIndex === undefined) {
        tagsColIndex = colNames.indexOf("tags");
        if (tagsColIndex === -1) {
            tagsColIndex = colNames.indexOf("category");
        }
    }

    // All subsequent rows should contain values
    let records = data.slice(1).map(function(row) {
        // Construct an array of field object from column names and values
        let fields = [];
        for (let i = 0; i < row.length; i++) {
            // Skip name column, category column (if any) and empty fields
            if (i != nameColIndex && i != tagsColIndex && row[i]) {
                fields.push({
                    name: colNames[i],
                    value: row[i]
                });
            }
        }

        const name = row[nameColIndex!];
        const tags = row[tagsColIndex!];
        return createRecord(name, fields, (tags && tags.split(",")) || []);
    });

    return records;
}

export async function isCSV(data: string): Promise<Boolean> {
    const papa = await loadPapa();
    return papa.parse(data).errors.length === 0;
}

export async function fromCSV(data: string, nameColIndex?: number, tagsColIndex?: number): Promise<Record[]> {
    const papa = await loadPapa();
    const parsed = papa.parse(data);
    if (parsed.errors.length) {
        throw new Err(ErrorCode.INVALID_CSV);
    }
    return fromTable(parsed.data, nameColIndex, tagsColIndex);
}

/**
 * Checks if a given string represents a Padlock enrypted backup
 */
export function isFromPadlock(data: string): boolean {
    try {
        validateRawContainer(unmarshal(data));
        return true;
    } catch (e) {
        return false;
    }
}

export async function fromPadlock(data: string, password: string): Promise<Record[]> {
    let cont = await new Container().deserialize(unmarshal(data));
    const store = new Store();
    cont.password = password;
    await cont.get(store);
    return store.records;
}

/*
 * Lastpass secure notes are exported by putting non-standard fields into the 'extra' column. Every line
 * represents a field in the following format:
 *
 *     field_name:data
 *
 * We're parsing that information to retrieve the individual fields
 */
function lpParseNotes(str: string): Field[] {
    let lines = str.split("\n");
    let fields = lines.filter(line => !!line).map(line => {
        let split = line.indexOf(":");
        return {
            name: line.substring(0, split),
            value: line.substring(split + 1)
        };
    });
    return fields;
}

/*
 * Parses a single row in a LastPass CSV file. Apart from extracting the default fields, we also parse
 * the 'extra' column for 'special notes' and remove any special fields that are not needed outside of
 * LastPass
 */
function lpParseRow(row: string[]): Record {
    const nameIndex = 4;
    const categoryIndex = 5;
    const urlIndex = 0;
    const usernameIndex = 1;
    const passwordIndex = 2;
    const notesIndex = 3;

    let fields: Field[] = [
        { name: "url", value: row[urlIndex] },
        { name: "username", value: row[usernameIndex] },
        { name: "password", value: row[passwordIndex], masked: true }
    ];
    let notes = row[notesIndex];

    if (row[urlIndex] === "http://sn") {
        // The 'http://sn' url indicates that this line represents a 'secure note', which means
        // we'll have to parse the 'extra' column to retrieve the individual fields
        fields.push(...lpParseNotes(notes));
        // In case of 'secure notes' we don't want the url and NoteType field
        fields = fields.filter(f => f.name != "url" && f.name != "NoteType");
    } else {
        // We've got a regular 'site' item, so the 'extra' column simply contains notes
        fields.push({ name: "notes", value: notes });
    }

    const dir = row[categoryIndex];
    // Create a basic item using the standard fields
    return createRecord(row[nameIndex], fields, dir ? [dir] : []);
}

export async function fromLastPass(data: string): Promise<Record[]> {
    const papa = await loadPapa();
    let records = papa
        .parse(data)
        .data // Remove first row as it only contains field names
        .slice(1)
        // Filter out empty rows
        .filter((row: string[]) => row.length > 1)
        .map(lpParseRow);

    return records;
}

/**
 * Checks if a given string represents a LastPass CSV file
 */
export function isFromLastPass(data: string): boolean {
    return data.split("\n")[0] === "url,username,password,extra,name,grouping,fav";
}
