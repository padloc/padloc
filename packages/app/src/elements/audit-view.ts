import { translate as $l } from "@padloc/locale/src/translate";
import { app } from "../globals";
import { StateMixin } from "../mixins/state";
import { View } from "./view";
import { customElement, query } from "lit/decorators.js";
import { css, html } from "lit";
import { Routing } from "../mixins/routing";
import { Audit } from "./audit";

@customElement("pl-audit-view")
export class Settings extends StateMixin(Routing(View)) {
    readonly routePattern = /^audit/;

    @query("pl-audit")
    private _audit: Audit;

    handleRoute() {
        this._audit?.audit();
    }

    shouldUpdate() {
        return !!app.account;
    }

    static styles = [
        ...View.styles,
        css`
            pl-audit {
                width: 100%;
            }
        `,
    ];

    render() {
        return html`
            <div class="fullbleed vertical layout">
                <header class="padded spacing center-aligning horizontal layout">
                    <pl-button
                        class="transparent skinny menu-button header-title"
                        @click=${() =>
                            this.dispatchEvent(new CustomEvent("toggle-menu", { composed: true, bubbles: true }))}
                    >
                        <div class="half-margined horizontal spacing center-aligning layout text-left-aligning">
                            <pl-icon icon="shield-check"></pl-icon>
                            <div class="stretch ellipsis">${$l("Password Audit")}</div>
                        </div>
                    </pl-button>
                </header>
                <pl-scroller class="stretch">
                    <div class="layout padded">
                        <pl-audit></pl-audit>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
