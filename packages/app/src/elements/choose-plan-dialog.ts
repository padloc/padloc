import { unsafeHTML } from "lit-html/directives/unsafe-html";
import { translate as $l } from "@padloc/locale/src/translate";
import { Plan, PlanType } from "@padloc/core/src/billing";
import { mixins } from "../styles";
import { app } from "../globals";
import { element, html, property, css } from "./base";
import { Dialog } from "./dialog";

@element("pl-choose-plan-dialog")
export class ChoosePlanDialog extends Dialog<void, Plan> {
    @property()
    private _plans: Plan[] = [];

    async show() {
        const result = super.show();
        this._plans = (await app.api.getPlans())
            .filter(p => [PlanType.Family, PlanType.Team, PlanType.Business].includes(p.type))
            .sort((a, b) => a.type - b.type);
        return result;
    }

    static styles = [
        ...Dialog.styles,
        css`
            h2 {
                color: var(--color-tertiary);
                margin: 0;
            }

            .outer {
                padding: 0;
            }

            .inner {
                background: transparent;
                box-shadow: none;
                max-width: 100%;
                width: 100%;
                ${mixins.scroll()}
                scroll-snap-type: x mandatory;
                white-space: nowrap;
                padding: 12px 24px;
                text-align: center;
                display: block;
            }

            .plans {
                min-width: 100%;
                display: flex;
                padding: 20px 50px;
                box-sizing: border-box;
                justify-content: center;
            }

            .plan {
                flex: 1;
                white-space: normal;
                width: 100%;
                max-width: 330px;
                background: var(--color-tertiary);
                border-radius: var(--border-radius);
                overflow: hidden;
                display: inline-flex;
                flex-direction: column;
                cursor: pointer;
                scroll-snap-align: center;
                text-align: center;
                will-change: transform;
            }

            .plan:not(:last-child) {
                margin-right: 12px;
            }

            .plan-header {
                text-align: center;
                padding: 20px;
                background: var(--color-highlight);
                color: var(--color-highlight-text);
                display: flex;
                height: 250px;
                flex-direction: column;
                position: relative;
            }

            /*
            .plan-header::before {
                content: "";
                ${mixins.fullbleed()}
                background: linear-gradient(rgba(255, 255, 255, 0.2) 0%, rgba(0, 0, 0, 0.2) 100%);
            }
            */

            .plan-name {
                font-size: 2rem;
                margin-bottom: 10px;
                font-weight: bold;
            }

            .plan-description {
                font-size: 1.1rem;
            }

            .plan-price {
                letter-spacing: 0.1em;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                font-weight: bold;
                font-size: 1.2rem;
            }

            .plan-price-currency {
                line-height: 1em;
                margin-top: 0.4em;
            }

            .plan-price-dollars {
                font-size: 3em;
                line-height: 1em;
            }

            .plan-price-cents {
                font-size: 1.5em;
                line-height: 1em;
                margin-top: 0.2em;
            }

            .plan-unit {
                font-size: var(--font-size-small);
            }

            .plan-fineprint {
                font-size: var(--font-size-tiny);
                opacity: 0.8;
            }

            .features {
                font-size: var(--font-size-small);
            }

            .features > * {
                margin: 0;
                padding: 10px 15px;
                border: none;
                border-radius: 0;
            }

            .features > :not(:last-child) {
                border-bottom: solid 1px var(--color-shade-1);
            }

            .plan button {
                margin: 8px;
                background: var(--color-highlight);
                color: var(--color-highlight-text);
                font-weight: bold;
            }

            .tabs {
                color: var(--color-tertiary);
                justify-content: center;
            }
        `
    ];

    private _renderPlan(plan: Plan) {
        const monthlyPrice = Math.round(plan.cost / 12);

        return html`
            <div
                style=${plan.color
                    ? `--color-highlight: ${plan.color}; --color-highlight-text: var(--color-tertiary);`
                    : ""}
                class="plan"
                @click=${() => this.done(plan)}
            >
                <div class="plan-header">
                    <div class="plan-name">
                        ${plan.name}
                    </div>
                    <div class="plan-description">
                        ${unsafeHTML(plan.description.replace(/\*\*(.+)\*\*/g, "<strong>$1</strong>"))}
                    </div>
                    <div class="flex"></div>
                    <div class="plan-price">
                        <div class="plan-price-currency">
                            $
                        </div>
                        <div class="plan-price-dollars">
                            ${Math.floor(monthlyPrice / 100)}
                        </div>
                        <div class="plan-price-cents">
                            .${(monthlyPrice % 100).toString().padEnd(2, "0")}
                        </div>
                    </div>
                    <div class="plan-unit">
                        ${$l("per user / month")}
                    </div>
                    <div class="flex"></div>
                    <div class="plan-fineprint">
                        ${$l("USD, billed annually")}
                    </div>
                </div>

                <ul class="features">
                    ${plan.features.map(
                        feature => html`
                            <li>
                                ${unsafeHTML(feature.replace(/\*\*(.+)\*\*/g, "<strong>$1</strong>"))}
                            </li>
                        `
                    )}
                </ul>

                <div class="flex"></div>

                <button class="tap">
                    ${$l("Try For Free")}
                </button>
            </div>
        `;
    }
    //
    // renderBefore() {
    //     return html`
    //         <h2>${$l("Choose A Plan")}</h2>
    //     `;
    // }

    renderContent() {
        const plans = this._plans;
        return html`
            ${plans.map(plan => this._renderPlan(plan))}
        `;
    }
}
