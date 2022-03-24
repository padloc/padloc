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
        const groups = this.org?.getGroupsForMember(this.member) || [];

        return html`
            <div class="spacing horizontal center-aligning horizontal layout">
                <pl-fingerprint .key=${this.member.publicKey}></pl-fingerprint>

                <div class="stretch">
                    <div class="semibold ellipsis">${this.member.email}</div>

                    <div class="small top-half-margined wrapping spacing horizontal layout">
                        <div>${this.member.name}</div>
                        ${this.hideInfo
                            ? ""
                            : html`
                                  ${!groups.length
                                      ? ""
                                      : groups.length === 1
                                      ? html`
                                            <div class="tiny tag">
                                                <pl-icon icon="group" class="inline"></pl-icon>
                                                ${groups[0].name}
                                            </div>
                                        `
                                      : html`
                                            <div class="tiny tag">
                                                <pl-icon icon="group" class="inline"></pl-icon>
                                                ${groups.length}
                                            </div>
                                        `}
                                  ${isOwner
                                      ? html`
                                            <div class="tiny tag warning">
                                                <pl-icon class="inline" icon="owner"></pl-icon> ${$l("Owner")}
                                            </div>
                                        `
                                      : isAdmin
                                      ? html`
                                            <div class="tiny tag highlight">
                                                <pl-icon class="inline" icon="admin"></pl-icon> ${$l("Admin")}
                                            </div>
                                        `
                                      : isSuspended
                                      ? html` <div class="tiny tag warning">${$l("Suspended")}</div> `
                                      : ""}
                              `}
                    </div>

                    <div class="small"></div>
                </div>
            </div>
        `;
    }
}
