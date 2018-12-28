import { Vault } from "@padloc/core/lib/vault.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { app } from "../init.js";
import { shared } from "../styles";
import { router } from "../init";
import { prompt } from "../dialog";
import { BaseElement, element, listen, property, html } from "./base.js";
import "./vault-list-item.js";

@element("pl-vault-list")
export class VaultList extends BaseElement {
    @property()
    selected: string = "";
    @property()
    private _showArchived: boolean = false;

    @listen("unlock", app)
    @listen("vault-created", app)
    @listen("vault-changed", app)
    _refresh() {
        this.requestUpdate();
    }

    private _select(vault: Vault) {
        router.go(`vaults/${vault.id}`);
    }

    private async _createVault() {
        await prompt($l("Please choose a vault name!"), {
            title: $l("Create Vault"),
            label: $l("Vault Name"),
            confirmLabel: $l("Create"),
            validate: async (name: string) => {
                if (!name) {
                    throw $l("Please enter a vault name!");
                }
                await app.createVault(name);
                return name;
            }
        });
    }

    render() {
        const vaults = app.vaults.filter(v => v !== app.mainVault);

        if (this._showArchived) {
            vaults.push(...app.archivedVaults);
        }

        return html`

            ${shared}

            <style>

                :host {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    background: var(--color-quaternary);
                }

                li {
                    border-bottom: solid 1px #ddd;
                    margin: 6px 0;
                    background: var(--color-tertiary);
                    border-bottom: solid 1px #ddd;
                }

                li:not([selected]):hover {
                    background: rgba(0, 0, 0, 0.05);
                }

                li[selected] {
                    background: #eee;
                }

                li[selected] {
                    background: #eee;
                }

                pl-vault-list-item {
                    border-top: solid 1px #ddd;
                }

                .subvault {
                    margin-top: -10px;
                    margin-left: 30px;
                    padding-left: 0;
                    height: 50px;
                }

                .subvault pl-icon {
                    font-size: 80%;
                }

                .show-archived {
                    margin: 5px 10px;
                    border-radius: var(--border-radius);
                    background: white;
                    width: calc(100% - 20px);
                    border: solid 1px #ddd;
                }

            </style>

            <header>

                <pl-icon icon="menu" class="tap menu-button" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

                <div class="title">${$l("Vaults")}</div>

                <pl-icon icon=""></pl-icon>

            </header>

            <main>

                <ul>

                    ${vaults.map(
                        vault => html`
                        <li ?selected=${vault.id === this.selected}>

                            <pl-vault-list-item
                                .vault=${vault}
                                class="vault tap ${vault.parent ? "subvault" : ""}"
                                @click=${() => this._select(vault)}>
                            </pl-vault-list-item>

                        </li>
                    `
                    )}

                </ul>

                <button
                    class="show-archived"
                    ?hidden=${!app.archivedVaults.length || this._showArchived}
                    @click=${() => (this._showArchived = true)}>
                    ${$l("Show Archived Vaults")}
                </button>

                <div class="empty-placeholder" ?hidden=${!!vaults.length || !!app.archivedVaults.length}>

                    <pl-icon icon="vaults"></pl-icon>

                    <div>${$l("You don't have any shared vaults yet.")}</div>

                </div>

                <div class="fabs">

                    <div class="flex"></div>

                    <pl-icon icon="add" class="tap fab" @click=${() => this._createVault()}></pl-icon>

                </div>

            </main>
        `;
    }
}
