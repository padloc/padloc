import { until } from "lit-html/directives/until";
import { Invite } from "@padloc/core/src/invite";
import { translate as $l } from "@padloc/locale/src/translate";
import { formatDateFromNow } from "../lib/util";
import { shared } from "../styles";
import "./icon";
import { customElement, property } from "lit/decorators";
import { css, html, LitElement } from "lit";

@customElement("pl-invite-item")
export class InviteItem extends LitElement {
    @property({ attribute: false })
    invite: Invite;

    shoudUpdate() {
        return !!this.invite;
    }

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
        `,
    ];

    render() {
        const inv = this.invite!;

        const status = inv.expired
            ? { icon: "time", class: "warning", text: $l("expired") }
            : inv.accepted
            ? { icon: "check", class: "highlight", text: $l("accepted") }
            : {
                  icon: "time",
                  class: "",
                  text: (async () => $l("{0}", await formatDateFromNow(inv.expires, false)))(),
              };

        return html`
            <div class="horizontal spacing center-aligning layout">
                <pl-icon class="icon" icon="mail"></pl-icon>

                <div class="stretch ellipsis">${inv.email}</div>

                <div class="tiny tag ${status.class}">
                    <pl-icon icon="${status.icon}"></pl-icon>

                    <div>${until(status.text)}</div>
                </div>
            </div>
        `;
    }
}
