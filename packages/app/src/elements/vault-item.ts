import { Org } from "@padloc/core/src/org";
import { VaultID } from "@padloc/core/src/vault";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { shared } from "../styles";
import "./icon";

@customElement("pl-vault-item")
export class VaultItem extends LitElement {
    @property({ attribute: false })
    vault: { id: VaultID; name: string };

    @property({ attribute: false })
    org: Org;

    static styles = [shared];

    render() {
        const groups = this.org.getGroupsForVault(this.vault);
        const members = this.org.getMembersForVault(this.vault);
        return html`
            <div class="horizontal spacing center-aligning horizontally-half-padded layout">
                <pl-icon class="large" icon="vault"></pl-icon>

                <div class="stretch">
                    <div class="semibold ellipsis">${this.vault.name}</div>

                    <div class="small top-half-margined">
                        <div class="tiny tags">
                            <div class="tag">
                                <pl-icon icon="group" class="inline"></pl-icon>
                                ${groups.length}
                            </div>

                            <div class="tag">
                                <pl-icon icon="user" class="inline"></pl-icon>
                                ${members.length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
