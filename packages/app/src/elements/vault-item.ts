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
            .icon {
                font-size: 120%;
                background: var(--color-shade-1);
                border: solid 1px var(--border-color);
                border-radius: 100%;
                width: 2em;
                height: 2em;
            }

            .tags {
                margin-top: 0.2em;
            }
        `,
    ];

    render() {
        return html`
            <div class="horizontal spacing center-aligning layout">
                <pl-icon class="icon" icon="vault"></pl-icon>

                <div class="stretch collapse">
                    <div class="bold ellipsis">${this.vault.name}</div>

                    <div class="tiny tags">
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
            </div>
        `;
    }
}
