import { Vault } from "@padloc/core/src/vault";
import { VaultItem, ItemTemplate, ITEM_TEMPLATES } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { app } from "../globals";
import { alert } from "../lib/dialog";
import { element, html, css, query } from "./base";
import { Input } from "./input";
import { Select } from "./select";
import { Dialog } from "./dialog";

@element("pl-create-item-dialog")
export class CreateItemDialog extends Dialog<ItemTemplate, VaultItem> {
    @query("#nameInput")
    private _nameInput: Input;
    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;
    @query("#templateSelect")
    private _templateSelect: Select<ItemTemplate>;

    readonly preventDismiss = true;

    static styles = [
        ...Dialog.styles,
        css`
            :host {
                --gutter-size: 12px;
            }

            .inner {
                background: var(--color-quaternary);
            }

            pl-input,
            pl-select {
                text-align: center;
            }
        `
    ];

    renderContent() {
        return html`
            <header>
                <div class="title flex">${$l("New Vault Item")}</div>
            </header>

            <div class="content">
                <pl-input
                    id="nameInput"
                    .label=${$l("Item Name")}
                    @enter=${() => this._enter()}
                    class="item"
                ></pl-input>

                <pl-select
                    id="templateSelect"
                    .options=${ITEM_TEMPLATES}
                    .label=${$l("Template")}
                    class="tap item"
                ></pl-select>

                <pl-select
                    id="vaultSelect"
                    class="tap item"
                    .options=${app.vaults.filter(v => app.hasWritePermissions(v))}
                    .label=${$l("Vault")}
                ></pl-select>

                <div class="actions">
                    <button @click=${() => this._enter()} class="primary tap">${$l("Create & Edit")}</button>

                    <button @click=${() => this.done()} class="tap">${$l("Cancel")}</button>
                </div>
            </div>
        `;
    }

    private async _enter() {
        const vault = this._vaultSelect.selected!;
        const quota = app.getItemsQuota(vault);
        if (quota !== -1 && vault.items.size >= quota) {
            this.done();
            if (app.billingConfig) {
                this.dispatch("get-premium", {
                    message: $l(
                        "You have reached the maximum number of items for this account. " +
                            "Upgrade to Premium to get unlimited items for your private vault!"
                    ),
                    icon: "list"
                });
            } else {
                alert($l("You have reached the maximum number of items for this account!"), { type: "warning" });
            }
            return;
        }

        const template = this._templateSelect.selected;
        const item = await app.createItem(
            this._nameInput.value,
            vault,
            template.fields.map(f => ({ ...f, value: "" }))
        );
        this.done(item);
    }

    async show(template: ItemTemplate) {
        await this.updateComplete;
        this._nameInput.value = "";
        this._vaultSelect.selected = app.mainVault!;
        this._templateSelect.selected = template;
        setTimeout(() => this._nameInput.focus(), 300);
        return super.show();
    }
}
