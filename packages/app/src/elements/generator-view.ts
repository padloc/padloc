import { translate as $l } from "@padloc/locale/src/translate";
import { app } from "../globals";
import { StateMixin } from "../mixins/state";
import { View } from "./view";
import { customElement, query } from "lit/decorators.js";
import { css, html } from "lit";
import { Routing } from "../mixins/routing";
import { Generator } from "./generator";

@customElement("pl-generator-view")
export class Settings extends StateMixin(Routing(View)) {
    readonly routePattern = /^generator/;

    @query("pl-generator")
    private _generator: Generator;

    handleRoute() {
        this._generator.generate();
    }

    shouldUpdate() {
        return !!app.account;
    }

    static styles = [
        ...View.styles,
        css`
            pl-generator {
                width: 100%;
                max-width: 30em;
            }
        `,
    ];

    render() {
        return html`
            <div class="fullbleed vertical layout">
                <header class="padded spacing center-aligning horizontal layout">
                    <pl-button
                        class="transparent skinny"
                        @click=${() =>
                            this.dispatchEvent(new CustomEvent("toggle-menu", { composed: true, bubbles: true }))}
                    >
                        <div class="half-margined horizontal spacing center-aligning layout text-left-aligning">
                            <pl-icon icon="generate"></pl-icon>
                            <div class="stretch ellipsis">${$l("Password Generator")}</div>
                        </div>
                    </pl-button>
                </header>
                <pl-scroller class="stretch">
                    <div class="centering vertical layout fill">
                        <pl-generator></pl-generator>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
