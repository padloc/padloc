import { Vault } from "@padloc/core/lib/vault.js";
import { VaultItem } from "@padloc/core/lib/item.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import * as imp from "../import.js";
import { prompt, alert } from "../dialog.js";
import { app } from "../init.js";
import { element, html, query, property } from "./base.js";
import { Select } from "./select.js";
import { Dialog } from "./dialog.js";

@element("pl-import-dialog")
export class ImportDialog extends Dialog<string, void> {
    @property()
    private _items: VaultItem[] = [];

    @query("#formatSelect")
    private _formatSelect: Select<imp.ImportFormat>;
    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    renderContent() {
        return html`
            <style>
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
            </style>

            <h1>${$l("Import Data")}</h1>

            <pl-select id="formatSelect" .options=${imp.supportedFormats} .label=${$l("Format")} disabled></pl-select>

            <div class="csv-note" ?hidden=${this._formatSelect && this._formatSelect.selected !== imp.CSV}>
                ${$l(
                    "IMPORTANT: Before importing, please make sure that your CSV data " +
                        "is structured according to Padlocks specific requirements!"
                )}
                <a href="https://padlock.io/howto/import/#importing-from-csv" target="_blank">${$l("Learn More")}</a>
            </div>

            <pl-select id="vaultSelect" .options=${app.vaults} .label=${$l("Target Vault")}></pl-select>

            <button @click=${() => this._import()} class="tap primary">
                ${$l("Import {0} Items", this._items.length.toString())}
            </button>
        `;
    }

    async show(input: string) {
        await this.updateComplete;
        const result = super.show();
        this._formatSelect.selected = imp.guessFormat(input) || imp.CSV;
        this._parseString(input);
        this._vaultSelect.selected = app.mainVault!;
        return result;
    }

    private async _parseString(rawStr: string): Promise<void> {
        switch (this._formatSelect.selected!.format) {
            case imp.PADLOCK_LEGACY.format:
                this.open = false;
                const pwd = await prompt($l("This file is protected by a password."), {
                    label: $l("Enter Password"),
                    type: "password",
                    validate: async (pwd: string) => {
                        try {
                            this._items = await imp.asPadlockLegacy(rawStr, pwd);
                        } catch (e) {
                            throw $l("Wrong Password");
                        }
                        return pwd;
                    }
                });
                this.open = true;

                if (pwd === null) {
                    this.done();
                }
                break;
            case imp.LASTPASS.format:
                this._items = await imp.asLastPass(rawStr);
                break;
            case imp.CSV.format:
                this._items = await imp.asCSV(rawStr);
                break;
            default:
                this._items = [];
        }
    }

    private async _import() {
        this.done();
        if (this._items.length) {
            app.addItems(this._items, this._vaultSelect.selected!);
            // this.dispatch("data-imported", { items: items });
            alert($l("Successfully imported {0} items.", this._items.length.toString()), { type: "success" });
        }
    }
}
