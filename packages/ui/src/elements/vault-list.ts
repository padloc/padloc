import { Vault } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app } from "../init.js";
import { shared, mixins } from "../styles";
import { router } from "../init";
import { prompt } from "../dialog";
import { BaseElement, element, listen, property, html } from "./base.js";
import "./vault-list-item.js";

@element("pl-vault-list")
export class VaultList extends BaseElement {
    @property()
    selected: string = "";

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
        const vaultName = await prompt($l("Enter Vault Name"));
        if (vaultName) {
            await app.createVault(vaultName);
        }
    }

    render() {
        return html`

            ${shared}

            <style>

                :host {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    background: var(--color-quaternary);
                }

                ul {
                    background: var(--color-tertiary);
                    border-bottom: solid 1px #ddd;
                }

                li {
                    display: flex;
                    align-items: center;
                    height: 60px;
                    padding: 0 10px;
                    border-top: solid 1px #ddd;
                }

                li:not([selected]):hover {
                    background: rgba(0, 0, 0, 0.1);
                }

                li[selected] {
                    background: #eee;
                }

                li div {
                    flex: 1;
                    ${mixins.ellipsis()}
                }

                .subvault {
                    margin-left: 30px;
                    padding-left: 0;
                    height: 50px;
                }

                .subvault pl-icon {
                    font-size: 80%;
                }

                pl-vault-list-item {
                    border-top: solid 1px #ddd;
                }

                pl-vault-list-item[selected] {
                    background: #eee;
                }

            </style>

            <header>

                <pl-icon icon="menu" class="tap menu-button" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

                <div class="title">${$l("Vaults")}</div>

                <pl-icon icon=""></pl-icon>

            </header>

            <main>

                <ul>

                    ${app.vaults.map(
                        vault => html`
                        <pl-vault-list-item
                            .vault=${vault}
                            ?selected=${vault.id === this.selected}
                            class="vault tap ${vault.parent ? "subvault" : ""}"
                            @click=${() => this._select(vault)}>
                        </pl-vault-list-item>
                    `
                    )}

                </ul>

                <pl-icon icon="add" class="tap fab" @click=${() => this._createVault()}></pl-icon>

            </main>
        `;
    }
}
