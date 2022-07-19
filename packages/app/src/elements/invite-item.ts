import { until } from "lit/directives/until.js";
import { Invite } from "@padloc/core/src/invite";
import { translate as $l } from "@padloc/locale/src/translate";
import { formatDateFromNow } from "../lib/util";
import { shared } from "../styles";
import "./icon";
import { customElement, property } from "lit/decorators.js";
import { html, LitElement } from "lit";

@customElement("pl-invite-item")
export class InviteItem extends LitElement {
    @property({ attribute: false })
    invite: Invite;

    shoudUpdate() {
        return !!this.invite;
    }

    static styles = [shared];

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
                <pl-icon class="large" icon="mail"></pl-icon>

                <div class="stretch">
                    <div class="ellipsis">${inv.email}</div>

                    <div class="small top-half-margined tags">
                        <div class="tiny tag ${status.class}">
                            <pl-icon icon="${status.icon}" class="inline"></pl-icon>
                            ${until(status.text)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
