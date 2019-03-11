import { until } from "lit-html/directives/until";
import { Invite } from "@padloc/core/lib/invite.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { formatDateFromNow } from "../util.js";
import { shared } from "../styles";
import { app } from "../init";
import { BaseElement, element, html, property } from "./base.js";
import "./icon.js";

@element("pl-invite-item")
export class InviteItem extends BaseElement {
    @property()
    invite: Invite;

    shoudUpdate() {
        return !!this.invite;
    }

    render() {
        const inv = this.invite!;
        const account = app.account!;
        const org = app.getOrg(inv.org.id)!;

        const status = inv.expired
            ? { icon: "time", class: "warning", text: $l("expired") }
            : inv.accepted
            ? { icon: "check", class: "highlight", text: $l("accepted") }
            : {
                  icon: "time",
                  class: "",
                  text: (async () => $l("expires {0}", await formatDateFromNow(inv.expires)))()
              };

        let secret = Promise.resolve("");

        if (org.isAdmin(account)) {
            const unlockOrg = org.unlock(account);
            secret = (async () => {
                await unlockOrg;
                await inv.unlock(org.invitesKey);
                return inv.secret;
            })();
        }

        return html`
            ${shared}

            <style>
                :host {
                    display: flex;
                    align-items: center;
                    padding: 4px 0;
                }

                .icon {
                    font-size: 120%;
                    margin: 10px;
                    background: #eee;
                    border: solid 1px #ddd;
                    width: 45px;
                    height: 45px;
                }

                .tags {
                    margin: 4px 0;
                }

                .invite-info {
                    flex: 1;
                    width: 0;
                }

                .invite:hover {
                    background: #fafafa;
                }

                .invite .tags {
                    padding: 0;
                    margin: 0;
                }

                .invite-email {
                    font-weight: bold;
                    margin-bottom: 4px;
                }

                .invite-code {
                    text-align: center;
                    margin-right: 15px;
                }

                .invite-code-label {
                    font-weight: bold;
                    font-size: var(--font-size-micro);
                }

                .invite-code-value {
                    font-size: 140%;
                    font-family: var(--font-family-mono);
                    font-weight: bold;
                    text-transform: uppercase;
                    cursor: text;
                    user-select: text;
                    letter-spacing: 2px;
                }
            </style>

            <pl-icon class="icon" icon="mail"></pl-icon>

            <div class="invite-info">
                <div class="invite-email ellipsis">${inv.email}</div>

                <div class="tags small">
                    <div class="tag ${status.class}">
                        <pl-icon icon="${status.icon}"></pl-icon>

                        <div>${until(status.text)}</div>
                    </div>
                </div>
            </div>

            <div class="invite-code">
                <div class="invite-code-label">${$l("Confirmation Code:")}</div>

                <div class="invite-code-value">${until(secret)}</div>
            </div>
        `;
    }
}
