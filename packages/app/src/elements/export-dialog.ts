import { Vault } from "@padloc/core/lib/vault.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { CSV, PBES2, ImportFormat } from "../import.js";
import { supportedFormats, asCSV, asPBES2Container } from "../export.js";
import { app } from "../init.js";
import { prompt } from "../dialog.js";
import { element, html, css, query } from "./base.js";
import { Select } from "./select.js";
import { Dialog } from "./dialog.js";

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

            <pl-select id="formatSelect" .options=${supportedFormats} .label=${$l("Format")}></pl-select>

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
        this._formatSelect.selected = CSV;
        this._vaultSelect.selected = app.mainVault!;
        return super.show();
    }

    private async _export() {
        const vault = this._vaultSelect.selected!;
        const items = [...vault.items];

        const date = new Date().toISOString().substr(0, 10);
        let data = "";
        let fileName = "";

        switch (this._formatSelect.selected.format) {
            case CSV.format:
                data = await asCSV(items);
                fileName = `${vault.name.replace(/ /g, "_")}_${date}.csv`;
                break;

            case PBES2.format:
                this.open = false;
                const password = await prompt($l("Please choose a password to protect this backup with!"), {
                    type: "password"
                });
                this.open = true;

                if (typeof password !== "string") {
                    this.done();
                    return;
                }

                data = await asPBES2Container(items, password);
                fileName = `${vault.name.replace(/ /g, "_")}_${date}.pbes2`;
                break;

            default:
                return;
        }
        this._download(data, fileName);
        this.done();
    }

    private async _download(data: string, fileName: string) {
        const a = document.createElement("a");
        a.href = `data:application/octet-stream,${encodeURIComponent(data)}`;
        a.download = fileName;
        a.click();
    }
}
