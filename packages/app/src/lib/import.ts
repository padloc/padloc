import { unmarshal, bytesToString } from "@padloc/core/src/encoding";
import { PBES2Container } from "@padloc/core/src/container";
import { validateLegacyContainer, parseLegacyContainer } from "@padloc/core/src/legacy";
import { VaultItem, Field, createVaultItem, FieldType, FIELD_DEFS } from "@padloc/core/src/item";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { uuid, capitalize } from "@padloc/core/src/util";
import { translate as $l } from "@padloc/locale/src/translate";
import { readFileAsText, readFileAsArrayBuffer } from "@padloc/core/src/attachment";

import { OnePuxItem } from "./1pux-parser";

export interface ImportFormat {
    value: "csv" | "padlock-legacy" | "lastpass" | "padloc" | "1pux";
    label: string;
}

export interface ImportCSVColumn {
    name: string;
    displayName: string;
    type: FieldType;
}

export const CSV: ImportFormat = {
    value: "csv",
    label: "CSV",
};

export const PADLOCK_LEGACY: ImportFormat = {
    value: "padlock-legacy",
    label: "Padlock (v2)",
};

export const LASTPASS: ImportFormat = {
    value: "lastpass",
    label: "LastPass",
};

export const PBES2: ImportFormat = {
    value: "padloc",
    label: "Encrypted Container",
};

export const ONEPUX: ImportFormat = {
    value: "1pux",
    label: "1Password (1pux)",
};

export const supportedFormats: ImportFormat[] = [CSV, PADLOCK_LEGACY, LASTPASS, PBES2, ONEPUX];

export function loadPapa(): Promise<any> {
    return import(/* webpackChunkName: "papaparse" */ "papaparse");
}

/**
 * Takes a data table (represented by a two-dimensional array) and converts it
 * into an array of items
 * @param  Array    data         Two-dimensional array containing tabular item data; The first 'row'
 *                               should contain field names. All other rows represent items, containing
 *                               the item name, field values and optionally a list of tags.
 * @param  Integer  nameColIndex Index of the column containing the item names. Defaults to 0
 * @param  Integer  tagsColIndex  Index of the column containing the item categories. If left empty
 *                               no categories will be used
 */
export async function fromTable(data: string[][], nameColIndex?: number, tagsColIndex?: number): Promise<VaultItem[]> {
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
    let items = data.slice(1).map(function (row) {
        // Construct an array of field object from column names and values
        let fields: Field[] = [];
        for (let i = 0; i < row.length; i++) {
            // Skip name column, category column (if any) and empty fields
            if (i != nameColIndex && i != tagsColIndex && row[i]) {
                const name = colNames[i];
                const value = row[i];
                fields.push(
                    new Field().fromRaw({
                        name,
                        value,
                    })
                );
            }
        }

        const name = row[nameColIndex!];
        const tags = row[tagsColIndex!];
        return createVaultItem({ name, fields, tags: (tags && tags.split(",")) || [] });
    });

    return Promise.all(items);
}

export async function isCSV(data: string): Promise<Boolean> {
    const papa = await loadPapa();
    return papa.parse(data).errors.length === 0;
}

export async function asCSV(file: File, nameColIndex?: number, tagsColIndex?: number): Promise<VaultItem[]> {
    const data = await readFileAsText(file);
    const papa = await loadPapa();
    const parsed = papa.parse(data);
    if (parsed.errors.length) {
        throw new Err(ErrorCode.INVALID_CSV, "Failed to parse .csv file.");
    }
    return fromTable(parsed.data, nameColIndex, tagsColIndex);
}

export async function asCSVColumns(file: File): Promise<ImportCSVColumn[]> {
    const data = await readFileAsText(file);
    const papa = await loadPapa();
    const parsed = papa.parse(data);
    if (parsed.errors.length) {
        throw new Err(ErrorCode.INVALID_CSV, "Failed to parse .csv file.");
    }
    const rows = parsed.data as string[][];

    const columnNames = rows[0].map((column) => column.toLowerCase());

    return columnNames.map((columnName) => {
        const type = (Object.keys(FIELD_DEFS).filter((fieldType) => columnName.includes(fieldType))[0] ||
            FieldType.Text) as FieldType;

        return {
            name: columnName,
            displayName: capitalize(columnName),
            type,
        };
    });
}

export async function isPadlockV1(file: File): Promise<boolean> {
    try {
        const data = await readFileAsText(file);
        return validateLegacyContainer(unmarshal(data));
    } catch (e) {
        return false;
    }
}

export async function asPadlockLegacy(file: File, password: string): Promise<VaultItem[]> {
    const data = await readFileAsText(file);
    const container = parseLegacyContainer(unmarshal(data));
    await container.unlock(password);
    return importLegacyContainer(container);
}

export async function importLegacyContainer(container: PBES2Container) {
    const records = unmarshal(bytesToString(await container.getData())) as any[];
    const items = records
        .filter(({ removed }) => !removed)
        .map(async ({ name = "Unnamed", fields = [], tags, category, updated }) => {
            return new VaultItem().fromRaw({
                id: await uuid(),
                name,
                fields,
                tags: tags || [category],
                updated,
                updatedBy: "",
                attachments: [],
            });
        });

    return Promise.all(items);
}

export async function isPBES2Container(file: File) {
    try {
        const data = await readFileAsText(file);
        new PBES2Container().fromRaw(unmarshal(data));
        return true;
    } catch (error) {
        return false;
    }
}

export async function asPBES2Container(file: File, password: string): Promise<VaultItem[]> {
    const data = await readFileAsText(file);
    const container = new PBES2Container().fromRaw(unmarshal(data));
    await container.unlock(password);

    const raw = unmarshal(bytesToString(await container.getData())) as any;

    const items = raw.items.map((item: any) => {
        // Due to a bug in < v1.3.4 items were not serialized properly, so we may
        // need this additional step
        if (typeof item === "string") {
            try {
                item = unmarshal(item);
            } catch (e) {}
        }
        return new VaultItem().fromRaw(item);
    });

    return items;
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
    let fields = lines
        .filter((line) => !!line)
        .map((line) => {
            let split = line.indexOf(":");
            return new Field({
                name: line.substring(0, split),
                value: line.substring(split + 1),
                type: FieldType.Text,
            });
        });
    return fields;
}

/*
 * Parses a single row in a LastPass CSV file. Apart from extracting the default fields, we also parse
 * the 'extra' column for 'special notes' and remove any special fields that are not needed outside of
 * LastPass
 */
async function lpParseRow(row: string[]): Promise<VaultItem> {
    const nameIndex = 4;
    const categoryIndex = 5;
    const urlIndex = 0;
    const usernameIndex = 1;
    const passwordIndex = 2;
    const notesIndex = 3;

    let fields: Field[] = [
        new Field({ name: $l("Username"), value: row[usernameIndex], type: FieldType.Username }),
        new Field({ name: $l("Password"), value: row[passwordIndex], type: FieldType.Password }),
        new Field({ name: $l("URL"), value: row[urlIndex], type: FieldType.Url }),
    ];
    let notes = row[notesIndex];

    if (row[urlIndex] === "http://sn") {
        // The 'http://sn' url indicates that this line represents a 'secure note', which means
        // we'll have to parse the 'extra' column to retrieve the individual fields
        fields.push(...lpParseNotes(notes));
        // In case of 'secure notes' we don't want the url and NoteType field
        fields = fields.filter((f) => f.name != "url" && f.name != "NoteType");
    } else {
        // We've got a regular 'site' item, so the 'extra' column simply contains notes
        fields.push(new Field({ name: $l("Notes"), value: notes, type: FieldType.Note }));
    }

    const dir = row[categoryIndex];
    // Create a basic item using the standard fields
    return createVaultItem({ name: row[nameIndex], fields, tags: dir ? [dir] : [] });
}

export async function asLastPass(file: File): Promise<VaultItem[]> {
    const data = await readFileAsText(file);
    const papa = await loadPapa();
    let items = papa
        .parse(data)
        .data // Remove first row as it only contains field names
        .slice(1)
        // Filter out empty rows
        .filter((row: string[]) => row.length > 1)
        .map(lpParseRow);

    return Promise.all(items);
}

export async function isLastPass(file: File): Promise<boolean> {
    try {
        const data = await readFileAsText(file);
        return data.split("\n")[0] === "url,username,password,extra,name,grouping,fav";
    } catch (error) {
        return false;
    }
}

async function parse1PuxItem(
    accountName: string,
    vaultName: string,
    item: OnePuxItem["item"]
): Promise<VaultItem | undefined> {
    if (!item) {
        return;
    }

    const { parseToRowData } = await import("./1pux-parser");

    const rowData = parseToRowData(item, [accountName, vaultName]);

    if (!rowData) {
        return;
    }

    const itemName = rowData.name;
    const tags = rowData.tags.split(",");

    if (item.trashed) {
        tags.push("trashed");
    }

    let fields: Field[] = [
        new Field({ name: $l("Username"), value: rowData.username, type: FieldType.Username }),
        new Field({ name: $l("Password"), value: rowData.password, type: FieldType.Password }),
        new Field({ name: $l("URL"), value: rowData.url, type: FieldType.Url }),
    ];

    if (rowData.notes) {
        fields.push(new Field({ name: $l("Notes"), value: rowData.notes, type: FieldType.Note }));
    }

    for (const extraField of rowData.extraFields) {
        if (extraField.type === "totp") {
            // Extract just the secret
            try {
                const secret = new URL(extraField.value).searchParams.get("secret");
                if (secret) {
                    fields.push(new Field({ name: extraField.name, value: secret, type: FieldType.Totp }));
                }
            } catch (error) {
                // Do nothing
            }
        } else {
            fields.push(
                new Field({ name: extraField.name, value: extraField.value, type: extraField.type as FieldType })
            );
        }
    }

    return createVaultItem({ name: itemName, fields, tags });
}

export async function as1Pux(file: File): Promise<VaultItem[]> {
    try {
        const { parse1PuxFile } = await import("./1pux-parser");
        const data = await readFileAsArrayBuffer(file);
        const dataExport = await parse1PuxFile(data);

        const items = [];

        for (const account of dataExport.data.accounts) {
            for (const vault of account.vaults) {
                for (const vaultItem of vault.items) {
                    if (vaultItem.item) {
                        const parsedItem = await parse1PuxItem(account.attrs.name, vault.attrs.name, vaultItem.item);
                        if (parsedItem) {
                            items.push(parsedItem);
                        }
                    }
                }
            }
        }

        return items;
    } catch (error) {
        throw new Err(ErrorCode.INVALID_1PUX, "Failed to parse .1pux file.");
    }
}

/**
 * Checks if a given file name ends with .1pux to avoid trying to parse unnecessarily
 */
export function is1Pux(file: File): boolean {
    return file.name.endsWith(".1pux");
}

export async function guessFormat(file: File): Promise<ImportFormat> {
    // Try to guess sync first (won't need parsing)
    if (is1Pux(file)) {
        return ONEPUX;
    }
    if (await isPBES2Container(file)) {
        return PBES2;
    }
    if (await isPadlockV1(file)) {
        return PADLOCK_LEGACY;
    }
    if (await isLastPass(file)) {
        return LASTPASS;
    }

    return CSV;
}
