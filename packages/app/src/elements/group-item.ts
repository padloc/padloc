import { Group } from "@padloc/core/src/org";
import { shared } from "../styles";
import { BaseElement, element, html, css, property } from "./base";
import "./icon";

@element("pl-group-item")
export class GroupItem extends BaseElement {
    @property()
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

                <div class="stretch collapse">
                    <div class="bold ellipsis">${this.group.name}</div>

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
        `;
    }
}
