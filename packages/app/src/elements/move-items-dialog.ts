import { Vault } from "@padloc/core/src/vault";
import { VaultItem } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { app } from "../globals";
import { element, property, html, css, query } from "./base";
import { Select } from "./select";
import { Dialog } from "./dialog";

@element("pl-move-items-dialog")
export class MoveItemsDialog extends Dialog<{ vault: Vault; item: VaultItem }[], VaultItem[]> {
    @property()
    items: { vault: Vault; item: VaultItem }[] = [];
    @property()
    vaults: Vault[] = [];

    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    static styles = [
        ...Dialog.styles,
        css`
            pl-input,
            pl-select {
                text-align: center;
                margin: 12px;
            }

            .actions {
                margin: 12px;
                grid-gap: 12px;
            }

            h1 {
                display: block;
                text-align: center;
            }

            .message {
                margin: 8px;
                text-align: center;
            }
        `
    ];

    renderContent() {
        const itemsDescription =
            this.items.length === 1 ? `'${this.items[0].item.name}'` : $l("{0} Items", this.items.length.toString());

        return html`
            <h1>${$l("Move {0} To", itemsDescription)}</h1>

            <div class="message" ?hidden=${this.vaults.length}>
                ${$l("No target vaults available!")}
            </div>

            <pl-select id="vaultSelect" .options=${this.vaults} .label=${$l("Vault")} ?hidden=${!this.vaults.length}>
            </pl-select>

            <div class="actions">
                <button @click=${this._enter} class="primary tap" ?disabled=${!this.vaults.length}>
                    ${this.items.length === 1 ? $l("Move Item") : $l("Move Items")}
                </button>
                <button @click=${this.dismiss} class="tap">
                    ${$l("Cancel")}
                </button>
            </div>
        `;
    }

    private async _enter() {
        this.done(await app.moveItems(this.items, this._vaultSelect.selected!));
    }

    async show(items: { vault: Vault; item: VaultItem }[]) {
        this.items = items;
        const sourceVaults = this.items.reduce((sv, i) => sv.add(i.vault), new Set<Vault>());
        this.vaults =
            sourceVaults.size === 1
                ? app.vaults.filter(v => app.hasWritePermissions(v) && v !== sourceVaults.values().next().value)
                : app.vaults.filter(v => app.hasWritePermissions(v));
        // this._vaultSelect.options = vaults;
        await this.updateComplete;
        this._vaultSelect.selected = this.vaults[0];
        return super.show();
    }
}
