import { unmarshal, bytesToString } from "@padloc/core/src/encoding";
import { PBES2Container } from "@padloc/core/src/container";
import { validateLegacyContainer, parseLegacyContainer } from "@padloc/core/src/legacy";
import { VaultItem, Field, createVaultItem, FieldType, guessFieldType } from "@padloc/core/src/item";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { uuid, capitalize } from "@padloc/core/src/util";
import { translate as $l } from "@padloc/locale/src/translate";
import { readFileAsText, readFileAsArrayBuffer } from "@padloc/core/src/attachment";

import { OnePuxItem } from "./1pux-parser";
import { BitwardenExport, BitwardenItem } from "./bitwarden-parser";

export interface ImportFormat {
    value: "csv" | "padlock-legacy" | "lastpass" | "padloc" | "1pux" | "bitwarden";
    label: string;
}

export interface ImportCSVColumn {
    name: string;
    displayName: string;
    type: FieldType | "name" | "tags" | "skip";
    values: string[];
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

export const BITWARDEN: ImportFormat = {
    value: "bitwarden",
    label: "Bitwarden (JSON)",
};

export const supportedFormats: ImportFormat[] = [CSV, PADLOCK_LEGACY, LASTPASS, PBES2, ONEPUX, BITWARDEN];

export function loadPapa(): Promise<any> {
    return import(/* webpackChunkName: "papaparse" */ "papaparse");
}

/**
 * Takes a data table (represented by a two-dimensional array) and converts it
 * into an array of items
 * @param  Array    data            Two-dimensional array containing tabular item data; The first 'row'
 *                                  might contain field names. All other rows represent items, containing
 *                                  the item name, field values and optionally a list of tags.
 * @param  Array    columnTypes     Array containing the type of field per column.
 * @param  Boolean  columnsOnFirstRow  Boolean, representing if there are columnms on the first row.
 */
async function fromTable(
    data: string[][],
    columnTypes: ImportCSVColumn[],
    columnsOnFirstRow: boolean
): Promise<VaultItem[]> {
    let nameColumnIndex = columnTypes.findIndex((columnType) => columnType.type === "name");
    const tagsColumnIndex = columnTypes.findIndex((columnType) => columnType.type === "tags");

    if (nameColumnIndex === -1) {
        nameColumnIndex = 0;
    }

    const dataRows = columnsOnFirstRow ? data.slice(1) : data;

    // All subsequent rows should contain values
    const items = dataRows
        .filter((row) => {
            // Skip empty rows
            if (row.length === 1 && row[0] === "") {
                return false;
            }

            return true;
        })
        .map((row) => {
            // Construct an array of field object from column names and values
            const fields: Field[] = [];
            for (let columnIndex = 0; columnIndex < row.length; ++columnIndex) {
                if (columnTypes[columnIndex]?.type === "skip") {
                    continue;
                }

                // Skip name column, category column (if any) and empty fields
                if (columnIndex !== nameColumnIndex && columnIndex !== tagsColumnIndex && row[columnIndex]) {
                    const name = columnTypes[columnIndex]?.displayName || "";
                    const value = row[columnIndex];
                    const type = columnTypes[columnIndex]?.type || undefined;
                    fields.push(
                        new Field().fromRaw({
                            name,
                            value,
                            type,
                        })
                    );
                }
            }

            const name = row[nameColumnIndex!];
            const tags = row[tagsColumnIndex!];
            return createVaultItem({ name, fields, tags: (tags && tags.split(",")) || [] });
        });

    return Promise.all(items);
}

export async function isCSV(data: string): Promise<Boolean> {
    const papa = await loadPapa();
    return papa.parse(data).errors.length === 0;
}

export async function asCSV(
    file: File,
    mappedItemColumns: ImportCSVColumn[],
    columnsOnFirstRow: boolean
): Promise<{ items: VaultItem[]; itemColumns: ImportCSVColumn[] }> {
    const data = await readFileAsText(file);
    const papa = await loadPapa();
    const parsed = papa.parse(data);
    if (parsed.errors.length) {
        throw new Err(ErrorCode.INVALID_CSV, "Failed to parse .csv file.");
    }
    const rows = parsed.data as string[][];

    if (rows.length === 0) {
        throw new Err(ErrorCode.INVALID_CSV, "No rows found in .csv file.");
    }

    const columnNames = columnsOnFirstRow
        ? rows[0].map((column) => column.toLowerCase())
        : rows[0].map((_value, index) => $l("Column {0}", index.toString()));

    let hasNameColumn = false;
    let hasTagsColumn = false;

    const itemColumns =
        mappedItemColumns.length > 0
            ? mappedItemColumns
            : columnNames.map((columnName, columnIndex) => {
                  const values = (columnsOnFirstRow ? rows.slice(1) : rows).map((row) => row[columnIndex] || "");

                  // Guess field type based on first non-empty value
                  // TODO: Sample all values for more reliable results?
                  let type = guessFieldType({
                      name: columnsOnFirstRow ? columnName : "",
                      value: values.find((value) => Boolean(value)),
                  }) as ImportCSVColumn["type"];

                  // If we're not given field names by the first row, base the name on the type
                  const name = columnsOnFirstRow ? columnName.toLocaleLowerCase() : type;

                  if (!hasNameColumn && name === "name") {
                      type = "name";
                      hasNameColumn = true;
                  }

                  if (!hasTagsColumn && ["tags", "category"].includes(name)) {
                      type = "tags";
                      hasTagsColumn = true;
                  }

                  return {
                      name,
                      displayName: capitalize(name),
                      type,
                      values,
                  };
              });

    // Ensure there's at least one nameColumn
    if (!hasNameColumn) {
        itemColumns[0].type = "name";
    }

    const items = await fromTable(rows, itemColumns, columnsOnFirstRow);

    return { items, itemColumns };
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
    const totpIndex = 7;

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

    if (row[totpIndex]) {
        fields.push(new Field({ name: $l("One-Time Password"), value: row[totpIndex], type: FieldType.Totp }));
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
        const headerRow = data.split("\n")[0];
        return (
            headerRow === "url,username,password,extra,name,grouping,fav" ||
            headerRow === "url,username,password,extra,name,grouping,fav,totp"
        );
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

async function parseBitwardenItem(
    vaultName: string,
    item: BitwardenItem,
    folders: BitwardenExport["folders"]
): Promise<VaultItem | undefined> {
    if (!item) {
        return;
    }

    const { parseToRowData } = await import("./bitwarden-parser");

    const rowData = parseToRowData(item, [vaultName], folders);

    if (!rowData) {
        return;
    }

    const itemName = rowData.name;
    const tags = rowData.tags.split(",");

    const fields: Field[] = [];

    if (rowData.username) {
        fields.push(new Field({ name: $l("Username"), value: rowData.username, type: FieldType.Username }));
    }

    if (rowData.password) {
        fields.push(new Field({ name: $l("Password"), value: rowData.password, type: FieldType.Password }));
    }

    if (rowData.url) {
        fields.push(new Field({ name: $l("URL"), value: rowData.url, type: FieldType.Url }));
    }

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

export async function asBitwarden(file: File): Promise<VaultItem[]> {
    try {
        const { parseBitwardenFile } = await import("./bitwarden-parser");
        const contents = await readFileAsText(file);
        const dataExport = await parseBitwardenFile(contents);

        const items = [];

        for (const vaultItem of dataExport.items) {
            if (vaultItem) {
                const parsedItem = await parseBitwardenItem(
                    file.name.replace(".json", ""),
                    vaultItem,
                    dataExport.folders
                );
                if (parsedItem) {
                    items.push(parsedItem);
                }
            }
        }

        return items;
    } catch (error) {
        throw new Err(ErrorCode.INVALID_BITWARDEN, "Failed to parse Bitwarden .json file.");
    }
}

export async function isBitwarden(file: File): Promise<boolean> {
    try {
        const content = await readFileAsText(file);
        const data = JSON.parse(content);
        return Object.prototype.hasOwnProperty.call(data, "items");
    } catch (error) {
        return false;
    }
}

export async function guessFormat(file: File): Promise<ImportFormat> {
    // Try to guess 1pux first (won't need parsing)
    if (is1Pux(file)) {
        return ONEPUX;
    }
    if (await isBitwarden(file)) {
        return BITWARDEN;
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
