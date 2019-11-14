import { Vault } from "@padloc/core/src/vault";
import { translate as $l } from "@padloc/locale/src/translate";
import { saveFile } from "@padloc/core/src/platform";
import { stringToBytes } from "@padloc/core/src/encoding";
import { CSV, PBES2, ImportFormat } from "../lib/import";
import { supportedFormats, asCSV, asPBES2Container } from "../lib/export";
import { app } from "../globals";
import { prompt } from "../lib/dialog";
import { element, html, css, query } from "./base";
import { Select } from "./select";
import { Dialog } from "./dialog";

@element("pl-export-dialog")
export class ExportDialog extends Dialog<void, void> {
    @query("#formatSelect")
    private _formatSelect: Select<ImportFormat>;
    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                display: flex;
                flex-direction: column;
            }

            pl-input,
            pl-select,
            button {
                text-align: center;
                margin: 0 10px 10px 10px;
                background: var(--shade-2-color);
                border-radius: 8px;
            }

            h1 {
                display: block;
                text-align: center;
            }

            .csv-note {
                font-size: var(--font-size-micro);
                text-align: center;
                padding: 0px 20px 20px 20px;
            }
        `
    ];

    renderContent() {
        return html`
            <h1>${$l("Export Data")}</h1>

            <pl-select
                id="vaultSelect"
                .options=${app.vaults}
                .label=${$l("Target Vault")}
                @change=${() => this.requestUpdate()}
            >
            </pl-select>

            <pl-select
                id="formatSelect"
                .options=${supportedFormats}
                .label=${$l("Format")}
                @change=${() => this.requestUpdate()}
            ></pl-select>

            <div class="csv-note" ?hidden=${this._formatSelect && this._formatSelect.selected !== CSV}>
                ${$l(
                    "WARNING: Exporting to CSV format will save your data without encyryption of any " +
                        "kind which means it can be read by anyone. We strongly recommend exporting your data as " +
                        "a secure, encrypted file, instead!"
                )}
            </div>

            <button @click=${() => this._export()} class="tap primary">
                ${$l("Export {0} Items", this._vaultSelect && this._vaultSelect.selected!.items.size.toString())}
            </button>
        `;
    }

    async show() {
        await this.updateComplete;
        this._formatSelect.selected = PBES2;
        this._vaultSelect.selected = app.mainVault!;
        return super.show();
    }

    private async _export() {
        const vault = this._vaultSelect.selected!;
        const items = [...vault.items];

        const date = new Date().toISOString().substr(0, 10);
        let data = "";
        let fileName = "";
        let type = "text/plain";

        switch (this._formatSelect.selected.format) {
            case CSV.format:
                data = await asCSV(items);
                fileName = `${vault.name.replace(/ /g, "_")}_${date}.csv`;
                type = "text/csv";
                break;

            case PBES2.format:
                this.open = false;
                const password = await prompt($l("Please choose a password to protect this backup with!"), {
                    title: $l("Choose Password"),
                    type: "password",
                    placeholder: "Enter Password",
                    validate: async val => {
                        if (!val) {
                            throw $l("Please choose a password!");
                        }
                        return val;
                    }
                });

                if (!password) {
                    this.open = true;
                    return;
                }

                const repeated = await prompt($l("Please repeat the password!"), {
                    title: $l("Choose Password"),
                    type: "password",
                    placeholder: "Repeat Password",
                    validate: async val => {
                        if (val !== password) {
                            throw $l("Password not repeated correctly!");
                        }
                        return val;
                    }
                });

                if (!repeated) {
                    this.open = true;
                    return;
                }

                data = await asPBES2Container(items, password);
                fileName = `${vault.name.replace(/ /g, "_")}_${date}.pbes2`;
                break;

            default:
                return;
        }
        saveFile(fileName, type, stringToBytes(data));
        this.done();
    }
}
