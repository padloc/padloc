import { Vault } from "@padloc/core/src/vault";
import { VaultItem, ItemTemplate, ITEM_TEMPLATES } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { app, router } from "../globals";
import { alert } from "../lib/dialog";
import { element, html, css, query, property } from "./base";
import { Select } from "./select";
import { Dialog } from "./dialog";

@element("pl-create-item-dialog")
export class CreateItemDialog extends Dialog<ItemTemplate, VaultItem> {
    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    @property()
    private _template: ItemTemplate;

    readonly preventDismiss = true;

    static styles = [
        ...Dialog.styles,
        css`
            :host {
                --gutter-size: 12px;
            }

            .inner {
                background: var(--color-quaternary);
                max-width: 500px;
            }

            pl-input,
            pl-select {
                text-align: center;
            }

            .templates {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                grid-gap: 8px;
                margin: var(--gutter-size);
            }

            .template {
                padding: 4px;
                display: flex;
                align-items: center;
                margin: 0;
                font-weight: 600;
            }

            .vault-select,
            .template[active] {
                background: var(--color-primary);
                color: var(--color-tertiary);
                font-weight: bold;
                text-shadow: rgba(0, 0, 0, 0.15) 0 2px 0;
            }

            .icon {
                margin-right: 4px;
            }

            .message {
                text-align: center;
                margin: 20px;
            }

            .actions {
                background: var(--color-tertiary);
                margin: 0;
                padding: 12px;
                border-top: solid 1px var(--color-shade-1);
            }
        `
    ];

    renderContent() {
        return html`
            <header>
                <div class="title flex">${$l("New Vault Item")}</div>
            </header>

            <div class="content">
                <pl-select
                    id="vaultSelect"
                    class="vault-select tap item"
                    icon="vault"
                    .options=${app.vaults.filter(v => app.hasWritePermissions(v))}
                ></pl-select>

                <div class="message">
                    ${$l("What kind of item you would like to add?")}
                </div>

                <div class="templates">
                    ${ITEM_TEMPLATES.map(
                        template => html`
                            <div
                                class="item template tap"
                                @click=${() => (this._template = template)}
                                ?active=${this._template === template}
                            >
                                <pl-icon icon=${template.icon} class="icon"></pl-icon>
                                <div>${template.toString()}</div>
                            </div>
                        `
                    )}
                </div>
            </div>

            <div class="actions">
                <button @click=${() => this._enter()} class="primary tap">${$l("Create")}</button>

                <button @click=${() => this.done()} class="tap">${$l("Cancel")}</button>
            </div>
        `;
    }

    private async _enter() {
        const vault = this._vaultSelect.selected!;
        const quota = app.getItemsQuota(vault);
        if (quota !== -1 && vault.items.size >= quota) {
            this.done();
            if (app.billingEnabled) {
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

        const item = await app.createItem(
            "",
            vault,
            this._template.fields.map(f => ({ ...f, value: "" }))
        );
        this.done(item);

        const params = { ...router.params, edit: "true", newitem: "true" } as any;
        if (this._template.attachment) {
            params.addattachment = "true";
        }
        router.go(`items/${item.id}`, params);
    }

    async show(template: ItemTemplate = ITEM_TEMPLATES[0]) {
        await this.updateComplete;
        this._vaultSelect.selected = app.mainVault!;
        this._template = template;
        return super.show();
    }
}
