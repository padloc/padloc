import { OrgMember, OrgRole } from "@padloc/core/src/org";
import { translate as $l } from "@padloc/locale/src/translate";
import { shared } from "../styles";
import { BaseElement, element, html, css, property } from "./base";
import "./randomart";

@element("pl-member-item")
export class MemberItem extends BaseElement {
    @property()
    member: OrgMember;

    @property()
    hideRole: boolean = false;

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                align-items: center;
                padding: 8px;
            }

            pl-fingerprint {
                color: var(--color-secondary);
                --color-background: var(--color-tertiary);
                width: 45px;
                height: 45px;
                border-radius: 100%;
                border: solid 1px var(--border-color);
                margin-right: 8px;
            }

            .member-info {
                flex: 1;
                width: 0;
            }

            .name-wrapper {
                display: flex;
            }

            .name-wrapper > .tags {
                margin: 0 0 0 4px;
            }

            .member-name {
                font-weight: bold;
                flex: 1;
                width: 0;
            }

            .member-email {
                font-size: 90%;
            }
        `
    ];

    render() {
        const isAdmin = this.member.role === OrgRole.Admin;
        const isOwner = this.member.role === OrgRole.Owner;
        const isSuspended = this.member.role === OrgRole.Suspended;

        return html`
            <pl-fingerprint .key=${this.member.publicKey}></pl-fingerprint>

            <div class="member-info">
                <div class="name-wrapper">
                    <div class="member-name ellipsis">${this.member.name}</div>
                    ${!this.hideRole && isOwner
                        ? html`
                              <div class="small tags">
                                  <div class="tag">${$l("Owner")}</div>
                              </div>
                          `
                        : !this.hideRole && isAdmin
                        ? html`
                              <div class="small tags">
                                  <div class="tag">${$l("Admin")}</div>
                              </div>
                          `
                        : !this.hideRole && isSuspended
                        ? html`
                              <div class="small tags">
                                  <div class="tag warning">${$l("Suspended")}</div>
                              </div>
                          `
                        : ""}
                </div>

                <div class="member-email ellipsis">${this.member.email}</div>
            </div>
        `;
    }
}
