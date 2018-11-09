import { VaultItem } from "@padlock/core/lib/data.js";
import { Vault } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { shared } from "../styles";
import { app } from "../init.js";
import { BaseElement, element, html, query } from "./base.js";
import { Input } from "./input.js";
import { Select } from "./select.js";
import { Dialog } from "./dialog.js";

@element("pl-create-item-dialog")
export class CreateItemDialog extends BaseElement {
    @query("pl-dialog")
    private _dialog: Dialog;
    @query("#nameInput")
    private _nameInput: Input;
    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    private _resolve: ((val: VaultItem | null) => void) | null;

    render() {
        return html`
        ${shared}

        <style include="shared">

            pl-input, pl-select {
                text-align: center;
            }

        </style>

        <pl-dialog @dialog-dismiss=${() => this._dismiss()}>

            <div class="message">${$l("New Vault Item")}</div>

            <pl-input
                id="nameInput"
                .label=${$l("Item Name")}
                @enter=${() => this._enter()}>
            </pl-input>

            <pl-select id="vaultSelect" .options=${app.vaults} .label=${$l("Vault")}></pl-select>

            <button @click=${() => this._enter()}>${$l("Create Item")}</button>

        </pl-dialog>
`;
    }

    private async _enter() {
        this._resolve && this._resolve(await app.createItem(this._nameInput.value, this._vaultSelect.selected!));
        this._resolve = null;
        this._dialog.open = false;
    }

    private _dismiss() {
        this._resolve && this._resolve(null);
        this._resolve = null;
        this._dialog.open = false;
    }

    async show() {
        await this.updateComplete;
        this._nameInput.value = "";
        this._dialog.open = true;

        setTimeout(() => this._nameInput.focus(), 100);

        return new Promise<VaultItem | null>(resolve => {
            this._resolve = resolve;
        });
    }
}
