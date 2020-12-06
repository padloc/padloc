import { Vault } from "@padloc/core/src/vault";
import { VaultItem, Field, ItemTemplate, ITEM_TEMPLATES } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { app, router } from "../globals";
import { alert } from "../lib/dialog";
import { element, html, css, query, property } from "./base";
import { Select } from "./select";
import { Dialog } from "./dialog";
import "./scroller";
import "./button";

@element("pl-create-item-dialog")
export class CreateItemDialog extends Dialog<Vault, VaultItem> {
    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    @property()
    private _template: ItemTemplate = ITEM_TEMPLATES[0];

    readonly preventDismiss = true;

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                max-width: 500px;
            }

            pl-input,
            pl-select {
                text-align: center;
            }

            .templates {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                grid-gap: 0.5em;
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
                --button-background: var(--color-highlight);
                --button-foreground: var(--color-white);
                color: var(--color-white);
                font-weight: bold;
                text-shadow: rgba(0, 0, 0, 0.15) 0 2px 0;
            }
        `,
    ];

    renderContent() {
        return html`
            <div class="vertical layout fit">
                <header class="large double-padded text-centering">${$l("New Vault Item")}</header>

                <pl-scroller class="stretch">
                    <div class="padded">
                        <pl-select
                            id="vaultSelect"
                            class="vault-select tap item"
                            icon="vault"
                            .options=${app.vaults.filter((v) => app.hasWritePermissions(v))}
                        ></pl-select>

                        <div class="double-margined text-centering">
                            ${$l("What kind of item you would like to add?")}
                        </div>

                        <div class="templates">
                            ${ITEM_TEMPLATES.map(
                                (template) => html`
                                    <pl-button
                                        class="horizontal center-aligning text-left-aligning spacing layout template"
                                        @click=${() => (this._template = template)}
                                        ?active=${this._template === template}
                                    >
                                        <pl-icon icon=${template.icon} class="icon"></pl-icon>
                                        <div class="stretch ellipsis">${template.toString()}</div>
                                    </pl-button>
                                `
                            )}
                        </div>
                    </div>
                </pl-scroller>

                <footer class="padded evenly stretching spacing horizontal layout">
                    <pl-button @click=${() => this._enter()} class="primary">${$l("Create")}</pl-button>

                    <pl-button @click=${() => this.done()} class="transparent">${$l("Cancel")}</pl-button>
                </footer>
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
                    icon: "list",
                });
            } else {
                alert($l("You have reached the maximum number of items for this account!"), { type: "warning" });
            }
            return;
        }

        const item = await app.createItem(
            "",
            vault,
            this._template.fields.map((f) => new Field({ ...f, value: "" }))
        );
        this.done(item);

        const params = { ...router.params, edit: "true", newitem: "true" } as any;
        if (this._template.attachment) {
            params.addattachment = "true";
        }
        router.go(`items/${item.id}`, params);
    }

    async show(vault: Vault = app.mainVault!) {
        await this.updateComplete;
        this._vaultSelect.selected = vault;
        return super.show();
    }
}
