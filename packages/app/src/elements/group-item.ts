import { Group } from "@padloc/core/src/org";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { shared } from "../styles";
import "./icon";

@customElement("pl-group-item")
export class GroupItem extends LitElement {
    @property({ attribute: false })
    group: Group;

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
                <pl-icon class="icon" icon="group"></pl-icon>

                <div class="stretch">
                    <div class="bold ellipsis">${this.group.name}</div>

                    <div class="small">
                        <div class="tiny tags">
                            <div class="tag">
                                <pl-icon icon="user"></pl-icon>

                                <div>${this.group.members.length}</div>
                            </div>

                            <div class="tag">
                                <pl-icon icon="vaults"></pl-icon>

                                <div>${this.group.vaults.length}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
