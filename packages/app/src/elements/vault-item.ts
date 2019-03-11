import { VaultID } from "@padloc/core/lib/vault.js";
import { shared } from "../styles";
import { BaseElement, element, html, property } from "./base.js";
import "./icon.js";

@element("pl-vault-item")
export class VaultItem extends BaseElement {
    @property()
    vault: { id: VaultID; name: string };

    render() {
        return html`
            ${shared}

            <style>
                :host {
                    display: flex;
                    align-items: center;
                    padding: 4px 0;
                }

                .icon {
                    font-size: 120%;
                    margin: 8px;
                    background: #eee;
                    border: solid 1px #ddd;
                    width: 45px;
                    height: 45px;
                }

                .tags {
                    margin: 4px 0;
                }

                .vault-name {
                    font-weight: bold;
                    margin-bottom: 4px;
                }

                .vault-info {
                    flex: 1;
                    width: 0;
                }
            </style>

            <pl-icon class="icon" icon="vault"></pl-icon>

            <div class="vault-info">
                <div class="vault-name ellipsis">${this.vault.name}</div>

                <div class="tags small">
                    <div class="tag">
                        <pl-icon icon="group"></pl-icon>

                        <div>0</div>
                    </div>

                    <div class="tag">
                        <pl-icon icon="list"></pl-icon>

                        <div>0</div>
                    </div>
                </div>
            </div>
        `;
    }
}
