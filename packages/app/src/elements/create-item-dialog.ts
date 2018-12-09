import { Vault, VaultItem } from "@padloc/core/lib/vault.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { app } from "../init.js";
import { element, html, query } from "./base.js";
import { Input } from "./input.js";
import { Select } from "./select.js";
import { Dialog } from "./dialog.js";

@element("pl-create-item-dialog")
export class CreateItemDialog extends Dialog<undefined, VaultItem> {
    @query("#nameInput")
    private _nameInput: Input;
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

        <h1>${$l("Create Vault Item")}</h1>

        <pl-input
            id="nameInput"
            .label=${$l("Item Name")}
            @enter=${() => this._enter()}>
        </pl-input>

        <pl-select id="vaultSelect" .options=${app.vaults} .label=${$l("Vault")}></pl-select>

        <button @click=${() => this._enter()} class="tap">${$l("Create Item")}</button>
`;
    }

    private async _enter() {
        this.done(await app.createItem(this._nameInput.value, this._vaultSelect.selected!));
    }

    async show() {
        await this.updateComplete;
        this._nameInput.value = "";
        setTimeout(() => this._nameInput.focus(), 100);
        return super.show();
    }
}
