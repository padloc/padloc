import { Org, OrgMember, OrgRole } from "@padloc/core/src/org";
import { translate as $l } from "@padloc/locale/src/translate";
import { shared } from "../styles";
import { BaseElement, element, html, css, property } from "./base";
import "./randomart";
import "./icon";

@element("pl-member-item")
export class MemberItem extends BaseElement {
    @property()
    member: OrgMember;

    @property()
    org: Org;

    @property()
    hideRole: boolean = false;

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
            <div class="padded spacing horizontal center-aligning horizontal layout">
                <pl-fingerprint .key=${this.member.publicKey}></pl-fingerprint>

                <div class="stretch">
                    <div class="horizontal layout">
                        <div class="bold stretch ellipsis">${this.member.name}</div>

                        <div class="tiny tags">
                            ${groups.map(
                                (group) => html`
                                    <div class="tag">
                                        <pl-icon icon="group"></pl-icon>
                                        ${group.name}
                                    </div>
                                `
                            )}
                            ${!this.hideRole && isOwner
                                ? html` <div class="tag warning">${$l("Owner")}</div> `
                                : !this.hideRole && isAdmin
                                ? html` <div class="tag highlight">${$l("Admin")}</div> `
                                : !this.hideRole && isSuspended
                                ? html` <div class="tag warning">${$l("Suspended")}</div> `
                                : ""}
                        </div>
                    </div>

                    <div class="ellipsis">${this.member.email}</div>
                </div>
            </div>
        `;
    }
}
