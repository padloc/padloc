import { Org, OrgMember, OrgRole } from "@padloc/core/src/org";
import { translate as $l } from "@padloc/locale/src/translate";
import { shared } from "../styles";
import "./randomart";
import "./icon";
import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

@customElement("pl-member-item")
export class MemberItem extends LitElement {
    @property({ attribute: false })
    member: OrgMember;

    @property({ attribute: false })
    org: Org;

    @property({ type: Boolean, attribute: "hide-info" })
    hideInfo: boolean = false;

    static styles = [
        shared,
        css`
            pl-fingerprint {
                width: 2.5em;
                height: 2.5em;
                border-radius: 100%;
                border: solid 1px var(--border-color);
            }
        `,
    ];

    render() {
        const isAdmin = this.member.role === OrgRole.Admin;
        const isOwner = this.member.role === OrgRole.Owner;
        const isSuspended = this.member.role === OrgRole.Suspended;
        const groups =
            (this.org && this.org.getGroupsForMember(this.member).filter((g) => g.name !== "Everyone")) || [];

        return html`
            <div class="spacing horizontal center-aligning horizontal layout">
                <pl-fingerprint .key=${this.member.publicKey}></pl-fingerprint>

                <div class="stretch">
                    <div class="horizontal layout">
                        <div class="bold stretch ellipsis">${this.member.name}</div>

                        <div class="tiny tags">
                            ${this.hideInfo
                                ? ""
                                : html`
                                      ${groups.length === 1
                                          ? html`
                                                <div class="tag">
                                                    <pl-icon icon="group"></pl-icon>
                                                    ${groups[0].name}
                                                </div>
                                            `
                                          : html`
                                                <div class="tag">
                                                    <pl-icon icon="group"></pl-icon>
                                                    ${groups.length}
                                                </div>
                                            `}
                                      ${isOwner
                                          ? html` <div class="tag warning">${$l("Owner")}</div> `
                                          : isAdmin
                                          ? html` <div class="tag highlight">${$l("Admin")}</div> `
                                          : isSuspended
                                          ? html` <div class="tag warning">${$l("Suspended")}</div> `
                                          : ""}
                                  `}
                        </div>
                    </div>

                    <div class="ellipsis">${this.member.email}</div>
                </div>
            </div>
        `;
    }
}
