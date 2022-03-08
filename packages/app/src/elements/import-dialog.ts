import { Vault } from "@padloc/core/src/vault";
import { VaultItem, FIELD_DEFS, FieldType } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import * as imp from "../lib/import";
import { prompt, alert } from "../lib/dialog";
import { app } from "../globals";
import { Select } from "./select";
import { Input } from "./input";
import { Dialog } from "./dialog";
import "./button";
import { customElement, query, state, queryAll } from "lit/decorators.js";
import { html, css } from "lit";
import { saveFile } from "@padloc/core/src/platform";
import { stringToBytes } from "@padloc/core/src/encoding";

const fieldTypeOptions = Object.keys(FIELD_DEFS).map((fieldType) => ({
    label: FIELD_DEFS[fieldType].name as string,
    value: fieldType,
}));

@customElement("pl-import-dialog")
export class ImportDialog extends Dialog<File, void> {
    @state()
    private _file: File;

    @state()
    private _items: VaultItem[] = [];

    @state()
    private _itemColumns: imp.ImportCSVColumn[] = [];

    @state()
    private _csvHasDataOnFirstRow: boolean = false;

    @query("#formatSelect")
    private _formatSelect: Select<string>;

    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    @query("#nameColumnSelect")
    private _nameColumnSelect: Select<number>;

    @query("#tagsColumnSelect")
    private _tagsColumnSelect: Select<number>;

    @queryAll("pl-select.field-type-select")
    private _fieldTypeSelects: Select<FieldType>[];

    @queryAll("pl-input.field-name-input")
    private _fieldNameInputs: Input[];

    static styles = [
        ...Dialog.styles,
        css`
            :host {
                --pl-dialog-max-width: 40em;
            }
        `,
    ];

    renderContent() {
        if (this._formatSelect?.value === imp.CSV.value) {
            if (
                this._nameColumnSelect &&
                (this._nameColumnSelect.selectedIndex === -1 || this._nameColumnSelect.selectedIndex === undefined)
            ) {
                const selectedNameIndex = this._itemColumns.findIndex((itemColumn) => itemColumn.type === "name");
                this._nameColumnSelect.value = selectedNameIndex;
                this._nameColumnSelect.selectedIndex = selectedNameIndex;
            }

            if (
                this._tagsColumnSelect &&
                (this._tagsColumnSelect.selectedIndex === -1 || this._tagsColumnSelect.selectedIndex === undefined)
            ) {
                // +1 because we have the "none" option first
                const selectedTagsIndex = this._itemColumns.findIndex((itemColumn) => itemColumn.type === "tags") + 1;
                this._tagsColumnSelect.value = selectedTagsIndex - 1;
                this._tagsColumnSelect.selectedIndex = selectedTagsIndex;
            }
        }

        return html`
            <div class="padded vertical spacing layout fit-vertically">
                <h1 class="big text-centering margined">${$l("Import Data")}</h1>

                <pl-select
                    id="formatSelect"
                    .options=${imp.supportedFormats}
                    .label=${$l("Format")}
                    @change=${this._parseData}
                    disabled
                ></pl-select>

                <div class="small padded" ?hidden=${this._formatSelect && this._formatSelect.value !== imp.CSV.value}>
                    ${$l("Choose the field name and type for each column below. If you are having trouble,")}
                    <a href="#" @click=${this._downloadCSVSampleFile}> ${$l("Download Sample File")} </a>
                </div>

                <div
                    class="vertical spacing layout"
                    ?hidden=${this._formatSelect && this._formatSelect.value !== imp.CSV.value}
                >
                    <pl-select
                        id=${"nameColumnSelect"}
                        .label=${$l("Name Column")}
                        .options=${this._itemColumns.map((itemColumn, itemColumnIndex) => ({
                            label: `${itemColumn.displayName} (${$l("Column {0}", itemColumnIndex.toString())})`,
                            value: itemColumnIndex,
                        }))}
                        .selectedIndex=${this._nameColumnSelect?.selectedIndex}
                        @change=${() => {
                            const currentNameColumnIndex = this._itemColumns.findIndex(
                                (itemColumn) => itemColumn.type === "name"
                            );
                            const nameColumnIndex = this._nameColumnSelect?.value || 0;
                            this._itemColumns[nameColumnIndex].type = "name";

                            if (currentNameColumnIndex !== -1) {
                                this._itemColumns[currentNameColumnIndex].type = FieldType.Text;
                            }

                            this._parseData();
                        }}
                    ></pl-select>

                    <pl-select
                        id=${"tagsColumnSelect"}
                        .label=${$l("Tags Column")}
                        .options=${[
                            { label: $l("None"), value: -1 },
                            ...this._itemColumns.map((itemColumn, itemColumnIndex) => ({
                                label: `${itemColumn.displayName} (${$l("Column {0}", itemColumnIndex.toString())})`,
                                value: itemColumnIndex,
                            })),
                        ]}
                        .selectedIndex=${this._tagsColumnSelect?.selectedIndex}
                        @change=${() => {
                            const currentTagsColumnIndex = this._itemColumns.findIndex(
                                (itemColumn) => itemColumn.type === "tags"
                            );
                            const tagsColumnIndex = this._tagsColumnSelect?.value || 0;
                            this._itemColumns[tagsColumnIndex].type = "tags";

                            if (currentTagsColumnIndex !== -1) {
                                this._itemColumns[currentTagsColumnIndex].type = FieldType.Text;
                            }

                            this._parseData();
                        }}
                    ></pl-select>

                    <!-- TODO: Add checkbox/toggle for this._csvHasDataOnFirstRow -->
                </div>

                <pl-scroller
                    class="stretch"
                    ?hidden=${this._formatSelect && this._formatSelect.value !== imp.CSV.value}
                >
                    <ul class="vertical spacing layout">
                        ${this._itemColumns.map(
                            (itemColumn, itemColumnIndex) => html`
                                <li
                                    class="padded box vertical spacing layout"
                                    ?hidden=${itemColumn.type === "name" || itemColumn.type === "tags"}
                                >
                                    <div class="small margined spacing horizontal layout">
                                        <div class="stretch">${itemColumn.name}</div>
                                        <div class="subtle">${$l("Column {0}", itemColumnIndex.toString())}</div>
                                    </div>

                                    <div class="tiny horizontally-margined subtle mono">
                                        ${itemColumn.exampleValues}
                                    </div>

                                    <pl-input
                                        .label=${$l("Field Name")}
                                        class="field-name-input"
                                        .value=${itemColumn.displayName}
                                        @change=${() => {
                                            const newFieldNameInput = this._fieldNameInputs[itemColumnIndex];
                                            const newFieldName = newFieldNameInput?.value;
                                            if (newFieldName) {
                                                this._itemColumns[itemColumnIndex].displayName = newFieldName;
                                                this._parseData();
                                            }
                                        }}
                                    ></pl-input>

                                    <pl-select
                                        id=${`itemColumnSelect-${itemColumnIndex}`}
                                        class="field-type-select"
                                        icon=${FIELD_DEFS[itemColumn.type]?.icon || "text"}
                                        .label=${$l("Field Type")}
                                        .options=${fieldTypeOptions}
                                        .value=${itemColumn.type}
                                        @change=${() => {
                                            const newValue = this._fieldTypeSelects[itemColumnIndex]?.value;
                                            if (newValue) {
                                                this._itemColumns[itemColumnIndex].type = newValue;
                                                this._parseData();
                                            }
                                        }}
                                    ></pl-select>
                                </li>
                            `
                        )}
                    </ul>
                </pl-scroller>

                <pl-select
                    id="vaultSelect"
                    .options=${app.vaults.map((v) => ({
                        disabled: !app.isEditable(v),
                        value: v,
                    }))}
                    .label=${$l("Target Vault")}
                ></pl-select>

                <div class="horizontal evenly stretching spacing layout">
                    <pl-button @click=${() => this._import()} class="primary" ?disabled=${!this._items.length}>
                        ${$l("Import {0} Items", this._items.length.toString())}
                    </pl-button>
                    <pl-button @click=${this.dismiss}> ${$l("Cancel")} </pl-button>
                </div>
            </div>
        `;
    }

    async show(file: File) {
        await this.updateComplete;
        const result = super.show();

        this._file = file;
        this._formatSelect.value = ((await imp.guessFormat(file)) || imp.CSV).value;
        await this._parseData();
        this._vaultSelect.value = app.mainVault!;

        return result;
    }

    private async _downloadCSVSampleFile(e: Event) {
        e.preventDefault();
        saveFile(
            `${process.env.PL_APP_NAME}_csv_import_sample.csv`,
            "text/csv",
            stringToBytes(`name,tags,url,username,password,notes
Facebook,social,https://facebook.com/,john.doe@gmail.com,3kjaf93,"Some note..."
Github,"work,coding",https://github.com,john.doe@gmail.com,129lskdf93`)
        );
    }

    private async _parseData(): Promise<void> {
        const file = this._file;

        switch (this._formatSelect.value) {
            case imp.PADLOCK_LEGACY.value:
                this.open = false;
                const pwd = await prompt($l("This file is protected by a password."), {
                    title: $l("Enter Password"),
                    placeholder: $l("Enter Password"),
                    type: "password",
                    validate: async (pwd: string) => {
                        try {
                            this._items = await imp.asPadlockLegacy(file, pwd);
                        } catch (e) {
                            throw $l("Wrong Password");
                        }
                        return pwd;
                    },
                });
                this.open = true;

                if (pwd === null) {
                    this.done();
                }
                break;
            case imp.LASTPASS.value:
                this._items = await imp.asLastPass(file);
                break;
            case imp.CSV.value:
                const result = await imp.asCSV(file, this._itemColumns, this._csvHasDataOnFirstRow);
                this._items = result.items;
                this._itemColumns = result.itemColumns;
                break;
            case imp.ONEPUX.value:
                this._items = await imp.as1Pux(file);
                break;
            case imp.PBES2.value:
                this.open = false;
                const pwd2 = await prompt($l("This file is protected by a password."), {
                    title: $l("Enter Password"),
                    placeholder: $l("Enter Password"),
                    type: "password",
                    validate: async (pwd: string) => {
                        try {
                            this._items = await imp.asPBES2Container(file, pwd);
                        } catch (e) {
                            throw $l("Wrong Password");
                        }
                        return pwd;
                    },
                });
                this.open = true;

                if (pwd2 === null) {
                    this.done();
                }
                break;
            default:
                this._items = [];
        }
    }

    private async _import() {
        const vault = this._vaultSelect.value!;
        const quota = app.getItemsQuota(vault);

        if (quota !== -1 && vault.items.size + this._items.length > quota) {
            this.done();
            alert($l("The number of imported items exceeds your remaining quota."), { type: "warning" });
            return;
        }

        app.addItems(this._items, vault);
        // this.dispatch("data-imported", { items: items });
        this.done();
        alert($l("Successfully imported {0} items.", this._items.length.toString()), { type: "success" });
    }
}
