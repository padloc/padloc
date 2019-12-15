import { unsafeHTML } from "lit-html/directives/unsafe-html";
import { translate as $l } from "@padloc/locale/src/translate";
import { BillingInfo, Plan, PlanType, UpdateBillingParams } from "@padloc/core/src/billing";
import { dialog } from "../lib/dialog";
import { mixins } from "../styles";
import { app } from "../globals";
import { element, html, property, css, query } from "./base";
import { Dialog } from "./dialog";
import { LoadingButton } from "./loading-button";
import "./card-input";
import { BillingDialog } from "./billing-dialog";

@element("pl-premium-dialog")
export class PremiumDialog extends Dialog<void, void> {
    @property()
    plan: Plan | null = null;

    @property()
    private _error = "";

    @property()
    private _updateBillingParams: UpdateBillingParams | null = null;

    @query("#submitButton")
    private _submitButton: LoadingButton;

    @dialog("pl-billing-dialog")
    private _billingDialog: BillingDialog;

    private async _submit() {
        if (this._submitButton.state === "loading") {
            return;
        }

        this._error = "";
        this._submitButton.start();

        const params =
            this._updateBillingParams ||
            new UpdateBillingParams({
                plan: this.plan!.id,
                account: app.account!.id
            });

        try {
            await app.updateBilling(params);
            this._submitButton.success();
            this.done();
        } catch (e) {
            this._error = e.message || $l("Something went wrong. Please try again later!");
            this._submitButton.fail();
            return;
        }
    }

    async show() {
        const result = super.show();
        const plan =
            app.state.billingProvider && app.state.billingProvider.plans.find(p => p.type === PlanType.Premium);
        if (plan) {
            this.plan = plan;
            this._error = "";
            this._updateBillingParams = null;
        } else {
            this.done();
        }
        return result;
    }

    private async _updateBillingInfo() {
        this.open = false;
        const billing = await this._billingDialog.show({
            billingInfo: Object.assign(new BillingInfo(), { account: app.account!.id })
        });
        if (billing) {
            this._updateBillingParams = billing;
            this._error = "";
        }
        this.open = true;
    }

    static styles = [
        ...Dialog.styles,
        css`
            .plan {
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .inner {
                background: var(--color-quaternary);
                text-align: center;
            }

            .plan-header {
                text-align: center;
                padding: 20px;
                /* background: linear-gradient(180deg, #59c6ff 0%, #077cb9 100%); */
                background: var(--color-highlight);
                color: var(--color-highlight-text);
                display: flex;
                flex-direction: column;
                position: relative;
            }

            .close-icon {
                position: absolute;
                top: 8px;
                right: 8px;
            }

            .plan-name {
                font-size: 2rem;
                margin-bottom: 10px;
                font-weight: bold;
            }

            .plan-trial {
                font-size: 1.5rem;
                margin-bottom: 10px;
            }

            .plan-then {
                font-size: var(--font-size-small);
                margin-bottom: 10px;
            }

            .plan-price {
                letter-spacing: 0.1em;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                font-weight: bold;
                font-size: 1.2rem;
                margin: 5px;
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
                margin-bottom: 15px;
            }

            .plan-fineprint {
                font-size: var(--font-size-tiny);
                opacity: 0.8;
            }

            .quantity {
                font-size: 1.6rem;
                margin-top: 20px;
            }

            pl-loading-button {
                font-weight: bold;
            }

            pl-loading-button.primary {
                margin: 8px;
                background: var(--color-highlight);
                color: var(--color-highlight-text);
                font-weight: bold;
                border-bottom: solid 3px var(--color-shade-2);
            }

            .error {
                color: var(--color-negative);
                padding: 8px;
                text-align: center;
            }

            .payment-method {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 4px;
                font-weight: bold;
                margin-bottom: 0;
            }

            .change-plan {
                background: transparent;
                color: var(--color-tertiary);
                font-weight: bold;
                margin: 4px;
            }

            .features {
                font-size: var(--font-size-small);
                margin-top: 8px;
                flex: 1;
                ${mixins.scroll()}
            }

            .features > * {
                padding: 10px 15px;
            }

            .features > :not(:last-child) {
                border-bottom: solid 1px var(--color-shade-1);
            }
        `
    ];

    renderContent() {
        if (!this.plan) {
            return html``;
        }

        const plan = this.plan;
        const monthlyPrice = Math.round(plan.cost / 12);
        const paymentMethod = this._updateBillingParams && this._updateBillingParams.paymentMethod;

        return html`
            <div
                class="plan"
                style=${plan.color
                    ? `--color-highlight: ${plan.color}; --color-highlight-text: var(--color-tertiary);`
                    : ""}
            >
                <div class="plan-header">
                    <pl-icon class="tap close-icon" icon="cancel" @click=${() => this.done()}></pl-icon>

                    <div class="plan-name">
                        ${plan.name}
                    </div>

                    <div class="flex"></div>

                    <div class="plan-trial">
                        ${$l("Free For {0} Days", (30).toString())}
                    </div>

                    <div class="plan-then">
                        ${$l("then")}
                    </div>

                    <div class="plan-price">
                        <div class="plan-price-currency">$</div>
                        <div class="plan-price-dollars">
                            ${Math.floor(monthlyPrice / 100)}
                        </div>
                        <div class="plan-price-cents">
                            .${(monthlyPrice % 100).toString().padEnd(2, "0")}
                        </div>
                    </div>

                    <div class="plan-unit">
                        ${$l("per month")}
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

                <div class="payment-method item tap" @click=${this._updateBillingInfo}>
                    <pl-icon icon="credit"></pl-icon>
                    ${paymentMethod
                        ? html`
                              <div>
                                  ${paymentMethod.name}
                              </div>
                          `
                        : html`
                              <div>
                                  ${$l("Add Billing Info")}
                              </div>
                          `}
                </div>

                <div class="error item" ?hidden="${!this._error}">
                    ${this._error}
                </div>

                <pl-loading-button id="submitButton" class="tap primary" @click=${this._submit}>
                    ${$l("Start Trial")}
                </pl-loading-button>
            </div>
        `;
    }
}
