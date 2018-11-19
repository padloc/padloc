import { Err, ErrorCode } from "@padlock/core/lib/error.js";
import { Vault, VaultItem } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import * as imp from "../import.js";
import { prompt, alert } from "../dialog.js";
import { app } from "../init.js";
import { element, html, query, property } from "./base.js";
import { Select } from "./select.js";
import { Dialog } from "./dialog.js";

const formats = ["CSV", "Padlock v2"];

@element("pl-import-dialog")
export class ImportDialog extends Dialog<string, void> {
    @property()
    private _items: VaultItem[] = [];

    @query("#formatSelect")
    private _formatSelect: Select<string>;
    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    renderContent() {
        return html`

        <style>

            .inner {
                display: flex;
                flex-direction: column;
            }

            pl-input, pl-select, button {
                text-align: center;
                margin: 0 10px 10px 10px;
                background: var(--shade-2-color);
                border-radius: 8px;
            }

            h1 {
                display: block;
                text-align: center;
            }

            button {
                display: block;
                font-weight: bold;
                background: var(--shade-4-color);
                overflow: hidden;
            }

        </style>

        <h1>${$l("Import Data")}</h1>

        <pl-select id="formatSelect" .options=${formats} .label=${$l("Format")} disabled></pl-select>

        <pl-select id="vaultSelect" .options=${app.vaults} .label=${$l("Import Into Vault")}></pl-select>

        <button @click=${() => this._enter()} class="tap">
            ${$l("Import {0} Items", this._items.length.toString())}
        </button>
`;
    }

    private async _parseString(rawStr: string): Promise<void> {
        const isPadlock = imp.isFromPadlock(rawStr);
        // const isLastPass = imp.isFromLastPass(rawStr);
        const isCSV = await imp.isCSV(rawStr);

        if (isPadlock) {
            this.open = false;
            const pwd = await prompt($l("This file is protected by a password."), {
                label: $l("Enter Password"),
                type: "password",
                validate: async (pwd: string) => {
                    try {
                        this._items = await imp.fromPadlock(rawStr, pwd);
                    } catch (e) {
                        throw $l("Wrong Password");
                    }
                    return pwd;
                }
            });
            this.open = true;

            if (pwd === null) {
                this.done();
                return;
            }

            this._formatSelect.selected = formats[1];
            // } else if (isLastPass) {
            //     items = await imp.fromLastPass(rawStr);
        } else if (isCSV) {
            // const choice = await choose(
            //     $l(
            //         "The data you want to import seems to be in CSV format. Before you continue, " +
            //             "please make sure that the data is structured according to Padlocks specific " +
            //             "requirements!"
            //     ),
            //     [$l("Review Import Guidelines"), $l("Continue"), $l("Cancel")],
            //     { type: "info" }
            // );
            // switch (choice) {
            //     case 0:
            //         window.open("https://padlock.io/howto/import/#importing-from-csv", "_system");
            //         // Reopen dialog for when the user comes back from the web page
            //         return this._importString(rawStr);
            //     case 1:
            this._items = await imp.fromCSV(rawStr);
            this._formatSelect.selected = formats[0];
            //         break;
            //     case 2:
            //         return;
            // }
        } else {
            throw new Err(ErrorCode.INVALID_CSV);
        }
    }

    async show(input: string) {
        await this.updateComplete;
        this._parseString(input);
        this._vaultSelect.selected = app.mainVault!;
        return super.show();
    }

    private async _enter() {
        this.done();
        if (this._items.length) {
            app.addItems(this._items, this._vaultSelect.selected!);
            // this.dispatch("data-imported", { items: items });
            alert($l("Successfully imported {0} items.", this._items.length.toString()), { type: "success" });
        }
    }
}
