import { Vault } from "@padlock/core/lib/vault.js";
import { shared } from "../styles";
import { View } from "./view.js";
import { element, property, html } from "./base.js";
import "./vault-list.js";
import "./vault-view.js";

@element("pl-manage")
export class Manage extends View {
    @property()
    vault: Vault | null = null;

    render() {
        return html`

            ${shared}

            <style>

                :host {
                    display: flex;
                }

                pl-vault-list {
                    width: 350px;
                    border-right: solid 2px #ddd;
                }

                pl-vault-view {
                    flex: 1;
                }

            </style>

            <pl-vault-list .vault=${this.vault}></pl-vault-list>

            <pl-vault-view .vault=${this.vault}></pl-vault-view>
        `;
    }
}
