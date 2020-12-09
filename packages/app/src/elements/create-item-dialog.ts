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
        `,
    ];

    renderContent() {
        return html`
            <header class="large double-padded text-centering">${$l("New Vault Item")}</header>

            <pl-scroller class="stretch">
                <div class="horizontally-padded">
                    <pl-select
                        id="vaultSelect"
                        icon="vault"
                        .options=${app.vaults.filter((v) => app.hasWritePermissions(v))}
                    ></pl-select>

                    <div class="double-margined text-centering">${$l("What kind of item you would like to add?")}</div>

                    <div class="grid">
                        ${ITEM_TEMPLATES.map(
                            (template) => html`
                                <pl-button
                                    toggleable
                                    class="horizontal center-aligning text-left-aligning spacing layout template"
                                    @click=${() => (this._template = template)}
                                    .toggled=${this._template === template}
                                >
                                    <pl-icon icon=${template.icon} class="icon"></pl-icon>
                                    <div class="stretch ellipsis">${template.toString()}</div>
                                </pl-button>
                            `
                        )}
                    </div>
                </div>
                <div class="spacer"></div>
            </pl-scroller>

            <footer class="padded evenly stretching spacing horizontal layout">
                <pl-button @click=${() => this._enter()} class="primary">${$l("Create")}</pl-button>

                <pl-button @click=${() => this.done()}>${$l("Cancel")}</pl-button>
            </footer>
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
