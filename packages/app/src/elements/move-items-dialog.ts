import { Vault } from "@padloc/core/src/vault";
import { VaultItem } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { app } from "../globals";
import { Select } from "./select";
import { Dialog } from "./dialog";
import "./button";
import { customElement, property, query } from "lit/decorators.js";
import { html } from "lit";

@customElement("pl-move-items-dialog")
export class MoveItemsDialog extends Dialog<{ vault: Vault; item: VaultItem }[], VaultItem[]> {
    @property({ attribute: false })
    items: { vault: Vault; item: VaultItem }[] = [];

    @property({ attribute: false })
    vaults: Vault[] = [];

    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    static styles = [...Dialog.styles];

    renderContent() {
        const itemsDescription =
            this.items.length === 1 ? `'${this.items[0].item.name}'` : $l("{0} Items", this.items.length.toString());

        return html`
            <div class="padded spacing vertical layout">
                <h1 class="large margined text-centering">${$l("Move {0} To", itemsDescription)}</h1>

                <div class="padded subtle text-centering" ?hidden=${!!this.vaults.length}>
                    ${$l("No target vaults available!")}
                </div>

                <pl-select
                    id="vaultSelect"
                    .options=${this.vaults}
                    .label=${$l("Vault")}
                    ?hidden=${!this.vaults.length}
                >
                </pl-select>

                <div class="horizontal evenly stretching spacing layout">
                    <pl-button @click=${this._enter} class="primary" ?disabled=${!this.vaults.length}>
                        ${this.items.length === 1 ? $l("Move Item") : $l("Move Items")}
                    </pl-button>
                    <pl-button @click=${this.dismiss}> ${$l("Cancel")} </pl-button>
                </div>
            </div>
        `;
    }

    private async _enter() {
        this.done(
            await app.moveItems(
                this.items.map((i) => i.item),
                this._vaultSelect.selected!
            )
        );
    }

    async show(items: { vault: Vault; item: VaultItem }[]) {
        this.items = items;
        const sourceVaults = this.items.reduce((sv, i) => sv.add(i.vault), new Set<Vault>());
        this.vaults =
            sourceVaults.size === 1
                ? app.vaults.filter((v) => app.hasWritePermissions(v) && v !== sourceVaults.values().next().value)
                : app.vaults.filter((v) => app.hasWritePermissions(v));
        // this._vaultSelect.options = vaults;
        await this.updateComplete;
        this._vaultSelect.selected = this.vaults[0];
        return super.show();
    }
}
