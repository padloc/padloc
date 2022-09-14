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
import { ToggleButton } from "./toggle-button";
import { customElement, query, state, queryAll } from "lit/decorators.js";
import { html, css } from "lit";

const fieldTypeOptions = Object.keys(FIELD_DEFS).map((fieldType) => ({
    label: FIELD_DEFS[fieldType].name as string,
    value: fieldType,
}));

fieldTypeOptions.push({
    label: "Ignore/skip this column",
    value: "skip",
});

@customElement("pl-import-dialog")
export class ImportDialog extends Dialog<File, void> {
    @state()
    private _file: File;

    @state()
    private _items: VaultItem[] = [];

    @state()
    private _itemColumns: imp.ImportCSVColumn[] = [];

    @query("#csvHasColumnsOnFirstRowButton")
    private _csvHasColumnsOnFirstRowButton: ToggleButton;

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
        const csvHasColumnsOnFirstRow = this._csvHasColumnsOnFirstRowButton?.active;
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

                <div class="small padded" ?hidden=${this._formatSelect?.value !== imp.CSV.value}>
                    ${$l("Choose the correct column names and types for each column below.")}
                </div>

                <pl-scroller class="stretch" ?hidden=${this._formatSelect?.value !== imp.CSV.value}>
                    <ul class="vertical spacing layout">
                        <pl-toggle-button
                            class="transparent"
                            id="csvHasColumnsOnFirstRowButton"
                            .label=${$l("First row contains field names")}
                            reverse
                            @change=${() => this._parseData(true)}
                        >
                        </pl-toggle-button>

                        <pl-select
                            id=${"nameColumnSelect"}
                            .label=${$l("Name Column")}
                            .options=${this._nameColumnSelectOptions()}
                            .selectedIndex=${this._nameColumnSelect?.selectedIndex}
                            @change=${this._handleNameColumnChange}
                        ></pl-select>

                        <pl-select
                            id=${"tagsColumnSelect"}
                            .label=${$l("Tags Column")}
                            .options=${this._tagsColumnSelectOptions()}
                            .selectedIndex=${this._tagsColumnSelect?.selectedIndex}
                            @change=${this._handleTagsColumnChange}
                        ></pl-select>

                        <div class="spacer"></div>

                        ${this._itemColumns.map(
                            (itemColumn, itemColumnIndex) => html`
                                <li
                                    class="padded box vertical spacing layout"
                                    ?hidden=${itemColumn.type === "name" || itemColumn.type === "tags"}
                                >
                                    <div class="small margined spacing horizontal layout">
                                        <div class="stretch">
                                            ${csvHasColumnsOnFirstRow
                                                ? itemColumn.name
                                                : $l("Column {0}", (itemColumnIndex + 1).toString())}
                                        </div>
                                        <div class="subtle" ?hidden=${!csvHasColumnsOnFirstRow}>
                                            ${$l("Column {0}", (itemColumnIndex + 1).toString())}
                                        </div>
                                    </div>

                                    <div class="tiny horizontally-margined subtle mono ellipsis">
                                        ${itemColumn.values
                                            .filter((value) => value !== "")
                                            .slice(0, 20)
                                            .map((value) => (value.includes(",") ? `"${value}"` : value))
                                            .join(", ")}
                                    </div>

                                    <pl-input
                                        .label=${$l("Field Name")}
                                        class="field-name-input"
                                        .value=${itemColumn.displayName}
                                        @change=${() => this._handleFieldNameChange(itemColumnIndex)}
                                        ?hidden=${itemColumn.type === "skip"}
                                    ></pl-input>

                                    <pl-select
                                        id=${`itemColumnSelect-${itemColumnIndex}`}
                                        class="field-type-select"
                                        icon=${FIELD_DEFS[itemColumn.type]?.icon || "text"}
                                        .label=${$l("Field Type")}
                                        .options=${fieldTypeOptions}
                                        .value=${itemColumn.type}
                                        @change=${() => this._handleFieldTypeChange(itemColumnIndex)}
                                    ></pl-select>
                                </li>
                            `
                        )}
                    </ul>
                </pl-scroller>

                <pl-select
                    id="vaultSelect"
                    .options=${app.vaults.map((vault) => ({
                        disabled: !app.isEditable(vault),
                        value: vault,
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

        // Reset fields
        this._items = [];
        this._itemColumns = [];
        this._csvHasColumnsOnFirstRowButton.active = true;
        this._file = file;

        const importFormat = (await imp.guessFormat(file)) || imp.CSV;
        this._formatSelect.value = importFormat.value;

        await this._parseData(true);

        this._vaultSelect.value = app.mainVault!;

        return result;
    }

    private _nameColumnSelectOptions() {
        const csvHasColumnsOnFirstRow = this._csvHasColumnsOnFirstRowButton?.active;

        return this._itemColumns.map((itemColumn, itemColumnIndex) => ({
            label: csvHasColumnsOnFirstRow
                ? `${itemColumn.displayName} (${$l("Column {0}", (itemColumnIndex + 1).toString())})`
                : $l("Column {0}", (itemColumnIndex + 1).toString()),
            value: itemColumnIndex,
        }));
    }

    private _tagsColumnSelectOptions() {
        const csvHasColumnsOnFirstRow = this._csvHasColumnsOnFirstRowButton?.active;

        return [
            { label: $l("None"), value: -1 },
            ...this._itemColumns.map((itemColumn, itemColumnIndex) => ({
                label: csvHasColumnsOnFirstRow
                    ? `${itemColumn.displayName} (${$l("Column {0}", (itemColumnIndex + 1).toString())})`
                    : $l("Column {0}", (itemColumnIndex + 1).toString()),
                value: itemColumnIndex,
            })),
        ];
    }

    private _handleNameColumnChange() {
        const currentNameColumnIndex = this._itemColumns.findIndex((itemColumn) => itemColumn.type === "name");
        const nameColumnIndex = this._nameColumnSelect?.value || 0;

        this._itemColumns[nameColumnIndex].type = "name";

        if (currentNameColumnIndex !== -1) {
            this._itemColumns[currentNameColumnIndex].type = FieldType.Text;
        }

        this._parseData();
    }

    private _handleTagsColumnChange() {
        const currentTagsColumnIndex = this._itemColumns.findIndex((itemColumn) => itemColumn.type === "tags");
        const tagsColumnIndex = this._tagsColumnSelect?.value || 0;

        this._itemColumns[tagsColumnIndex].type = "tags";

        if (currentTagsColumnIndex !== -1) {
            this._itemColumns[currentTagsColumnIndex].type = FieldType.Text;
        }

        this._parseData();
    }

    private _handleFieldNameChange(itemColumnIndex: number) {
        const newFieldNameInput = this._fieldNameInputs[itemColumnIndex];
        const newFieldName = newFieldNameInput?.value;
        if (newFieldName) {
            this._itemColumns[itemColumnIndex].displayName = newFieldName;
            this._parseData();
        }
    }

    private _handleFieldTypeChange(itemColumnIndex: number) {
        const newValue = this._fieldTypeSelects[itemColumnIndex]?.value;
        if (newValue) {
            this._itemColumns[itemColumnIndex].type = newValue;
            this._parseData();
        }
    }

    private async _parseData(resetCSVColumns = false): Promise<void> {
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
                const result = await imp.asCSV(
                    file,
                    resetCSVColumns ? [] : this._itemColumns,
                    this._csvHasColumnsOnFirstRowButton.active
                );
                this._items = result.items;
                this._itemColumns = result.itemColumns;
                await this.updateComplete;
                this._nameColumnSelect.selectedIndex = this._itemColumns.findIndex(({ type }) => type === "name");
                // +1 because the first item is "none" for tags
                this._tagsColumnSelect.selectedIndex = this._itemColumns.findIndex(({ type }) => type === "tags") + 1;
                break;
            case imp.ONEPUX.value:
                this._items = await imp.as1Pux(file);
                break;
            case imp.BITWARDEN.value:
                this._items = await imp.asBitwarden(file);
                break;
            case imp.DASHLANE.value:
                this._items = await imp.asDashlane(file);
                break;
            case imp.KEEPASS.value:
                this._items = await imp.asKeePass(file);
                break;
            case imp.NORDPASS.value:
                this._items = await imp.asNordPass(file);
                break;
            case imp.ICLOUD.value:
                this._items = await imp.asICloud(file);
                break;
            case imp.CHROME.value:
                this._items = await imp.asChrome(file);
                break;
            case imp.FIREFOX.value:
                this._items = await imp.asFirefox(file);
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
        app.addItems(this._items, vault);
        this.done();
        alert($l("Successfully imported {0} items.", this._items.length.toString()), { type: "success" });
    }
}
