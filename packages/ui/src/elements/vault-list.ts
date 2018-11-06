import { Vault } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app } from "../init.js";
import { shared, mixins } from "../styles";
import { router } from "../init";
import { BaseElement, element, listen, property, html } from "./base.js";

@element("pl-vault-list")
export class VaultList extends BaseElement {
    @property()
    vault: Vault | null = null;

    @listen("unlock", app)
    @listen("vault-created", app)
    @listen("vault-changed", app)
    _refresh() {
        this.requestUpdate();
    }

    private _select(vault: Vault) {
        router.go(`vaults/${vault.id}`);
    }

    render() {
        return html`

            ${shared}

            <style>

                :host {
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
                        <li
                            ?selected=${vault === this.vault}
                            class="vault tap ${vault.parent ? "subvault" : ""}"
                            @click=${() => this._select(vault)}>

                            <pl-icon icon="vault"></pl-icon>

                            <div>${vault.name}</div> 

                        </li>
                    `
                    )}

                </ul>

            </main>
        `;
    }
}
