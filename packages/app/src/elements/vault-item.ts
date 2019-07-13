import { VaultID } from "@padloc/core/src/vault";
import { shared } from "../styles";
import { BaseElement, element, html, css, property } from "./base";
import "./icon";

@element("pl-vault-item")
export class VaultItem extends BaseElement {
    @property()
    vault: { id: VaultID; name: string };

    @property()
    groups: number = 0;

    @property()
    members: number = 0;

    static styles = [
        shared,
        css`
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
        `
    ];

    render() {
        return html`
            <pl-icon class="icon" icon="vault"></pl-icon>

            <div class="vault-info">
                <div class="vault-name ellipsis">${this.vault.name}</div>

                <div class="tags small">
                    <div class="tag">
                        <pl-icon icon="group"></pl-icon>

                        <div>${this.groups}</div>
                    </div>

                    <div class="tag">
                        <pl-icon icon="user"></pl-icon>

                        <div>${this.members}</div>
                    </div>
                </div>
            </div>
        `;
    }
}
