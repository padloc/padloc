import { Group } from "@padloc/core/src/org";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { shared } from "../styles";
import "./icon";

@customElement("pl-group-item")
export class GroupItem extends LitElement {
    @property({ attribute: false })
    group: Group;

    static styles = [shared];

    render() {
        return html`
            <div class="horizontal spacing center-aligning layout">
                <pl-icon class="large" icon="group"></pl-icon>

                <div class="stretch">
                    <div class="bold ellipsis">${this.group.name}</div>

                    <div class="small top-half-margined">
                        <div class="tiny tags">
                            <div class="tag">
                                <pl-icon icon="user" class="inline"></pl-icon>
                                ${this.group.members.length}
                            </div>

                            <div class="tag">
                                <pl-icon icon="vaults" class="inline"></pl-icon>
                                ${this.group.vaults.length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
