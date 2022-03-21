// import { translate as $l } from "@padloc/locale/src/translate";
import { animateElement } from "../lib/animation";
import { customElement, state, queryAll } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

import { shared, mixins } from "../styles";
import { Routing } from "../mixins/routing";

// TODO: Improve UI
// TODO: Improve UX
// TODO: Use translations

@customElement("pl-audit")
export class Audit extends Routing(LitElement) {
    @state()
    private _reusedPasswordCount: number = 0;

    @state()
    private _weakPasswordCount: number = 0;

    @state()
    private _compromisedPasswordCount: number = 0;

    @queryAll(".count")
    private _countElements: HTMLDivElement[];

    static styles = [
        shared,
        css`
            :host {
                display: block;
            }

            .count {
                min-height: 5em;
            }

            ${mixins.hover(".count")}
        `,
    ];

    render() {
        const { _reusedPasswordCount, _weakPasswordCount, _compromisedPasswordCount } = this;
        return html`
            <div class="padded layout">
                <div class="vertical spacing">
                    <h3>
                        Here you can see some counts for passwords you should change, as they might be easier to be
                        easily guessed.
                    </h3>
                    <p class="subtle">Click a count to view the affected items.</p>
                    <div class="horizontal spacing margined layout">
                        <div
                            class="count click padded margined box layout centering"
                            @click=${() => this.go("items", { auditReused: "true" })}
                        >
                            ${_reusedPasswordCount} reused passwords
                        </div>
                        <div
                            class="count click padded margined box layout centering"
                            @click=${() => this.go("items", { auditWeak: "true" })}
                        >
                            ${_weakPasswordCount} weak passwords
                        </div>
                        <div
                            class="count click padded margined box layout centering"
                            @click=${() => this.go("items", { auditCompromised: "true" })}
                        >
                            ${_compromisedPasswordCount} compromised passwords
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    firstUpdated() {
        // TODO: When/why is this necessary?
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this.audit());
    }

    async audit() {
        // TODO: Actually check items and run counts
        this._reusedPasswordCount = Math.floor(Math.random() * 10);
        this._weakPasswordCount = Math.floor(Math.random() * 10);
        this._compromisedPasswordCount = Math.floor(Math.random() * 10);

        // TODO: Store last audit date and audit match booleans in items

        this._countElements.forEach((countElement) => {
            animateElement(countElement, { animation: "bounce" });
        });
    }
}
