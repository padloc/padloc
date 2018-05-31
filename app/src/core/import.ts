import { parse } from "papaparse";
import { Record, Field } from "./data";
import { Container } from "./crypto";

export class ImportError {
    constructor(public code: "invalid_csv") {}
}

//* Detects if a string contains a SecuStore backup
export function isFromSecuStore(data: string): boolean {
    return data.indexOf("SecuStore") != -1 && data.indexOf("#begin") != -1 && data.indexOf("#end") != -1;
}

export async function fromSecuStore(rawData: string, password: string): Promise<Record[]> {
    const begin = "#begin";
    const end = "#end";

    //Get the JSON code for the data
    const objJSON = rawData.substring(rawData.indexOf(begin) + begin.length, rawData.indexOf(end));

    // Try to parse JSON object containing data needed for decryption
    const obj = JSON.parse(objJSON);

    // Create a crypto container and initialize it with the parameters from the
    // obtained object
    const cont = Container.fromRaw({
        version: undefined,
        cipher: "aes",
        mode: "ccm",
        ts: 64,
        iv: obj.data.iv,
        adata: decodeURIComponent(obj.data.adata),
        keySize: 256,
        salt: obj.salt,
        iter: 1000,
        ct: obj.data.ct
    });
    cont.password = password;

    const data = JSON.parse(await cont.get());

    // Convert the _items_ array of the SecuStore Set object into an array of Padlock records
    let records = data.items.map((item: any) => {
        let fields = item.template.containsPassword
            ? // Passwords are a separate property in SecuStore but will be treated as
              // regular fields in Padlock
              item.fields.concat([{ name: "password", value: item.password }])
            : item.fields;

        return new Record(item.title, fields, [data.name]);
    });

    return records;
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

        const tags = row[tagsColIndex!];
        return new Record(row[nameColIndex || 0], fields, (tags && tags.split(",")) || []);
    });

    return records;
}

export function isCSV(data: string): Boolean {
    return parse(data).errors.length === 0;
}

export function fromCSV(data: string, nameColIndex?: number, tagsColIndex?: number): Record[] {
    const parsed = parse(data);
    if (parsed.errors.length) {
        throw new ImportError("invalid_csv");
    }
    return fromTable(parsed.data, nameColIndex, tagsColIndex);
}

/**
 * Checks if a given string represents a Padlock enrypted backup
 */
export function isFromPadlock(data: string): boolean {
    try {
        Container.fromJSON(data);
        return true;
    } catch (e) {
        return false;
    }
}

export async function fromPadlock(data: string, password: string): Promise<Record[]> {
    let cont = Container.fromJSON(data);
    cont.password = password;
    return JSON.parse(await cont.get()).map(Record.fromRaw);
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
    return new Record(row[nameIndex], fields, dir ? [dir] : []);
}

export function fromLastPass(data: string): Record[] {
    let records = parse(data)
        .data// Remove first row as it only contains field names
        .slice(1)
        // Filter out empty rows
        .filter(row => row.length > 1)
        .map(lpParseRow);

    return records;
}

/**
 * Checks if a given string represents a LastPass CSV file
 */
export function isFromLastPass(data: string): boolean {
    return data.split("\n")[0] === "url,username,password,extra,name,grouping,fav";
}
