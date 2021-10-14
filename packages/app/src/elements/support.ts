import { translate as $l } from "@padloc/locale/src/translate";
import { StateMixin } from "../mixins/state";
import { View } from "./view";
import { customElement } from "lit/decorators.js";
import { css, html } from "lit";
import { Routing } from "../mixins/routing";
import "./markdown-content";
import content from "assets/support.md";

@customElement("pl-support")
export class Support extends StateMixin(Routing(View)) {
    readonly routePattern = /^support/;

    static styles = [
        ...View.styles,
        css`
            pl-markdown-content {
                display: block;
                width: 100%;
                max-width: 25em;
                padding: 1em;
                box-sizing: border-box;
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
                            <pl-icon icon="support"></pl-icon>
                            <div class="stretch ellipsis">${$l("Support")}</div>
                        </div>
                    </pl-button>
                </header>
                <pl-scroller class="stretch">
                    <pl-markdown-content .content=${content}></pl-markdown-content>
                </pl-scroller>
            </div>
        `;
    }
}
