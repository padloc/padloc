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

            .group-name {
                font-weight: bold;
                margin-bottom: 4px;
            }

            .group-info {
                flex: 1;
                width: 0;
            }
        `
    ];

    render() {
        return html`
            <pl-icon class="icon" icon="group"></pl-icon>

            <div class="group-info">
                <div class="group-name ellipsis">${this.group.name}</div>

                <div class="tags small">
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
        `;
    }
}
