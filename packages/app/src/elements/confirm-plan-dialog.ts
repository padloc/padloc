import { localize as $l } from "@padloc/core/lib/locale";
import { Plan, UpdateBillingParams } from "@padloc/core/lib/billing";
import { dialog } from "../dialog";
import { app } from "../init";
import { element, html, property, css, query } from "./base";
import { Dialog } from "./dialog";
import "./slider";
import { LoadingButton } from "./loading-button";
import "./card-input";
import { BillingDialog } from "./billing-dialog";
import { ChoosePlanDialog } from "./choose-plan-dialog";

@element("pl-confirm-plan-dialog")
export class ConfirmPlanDialog extends Dialog<Plan, void> {
    @property()
    plan: Plan | null = null;

    @property()
    quantity: number = 1;

    readonly preventDismiss = true;

    @property()
    private _error = "";

    @query("#submitButton")
    private _submitButton: LoadingButton;

    @dialog("pl-billing-dialog")
    private _billingDialog: BillingDialog;

    @dialog("pl-choose-plan-dialog")
    private _choosePlanDialog: ChoosePlanDialog;

    private async _submit() {
        if (this._submitButton.state === "loading") {
            return;
        }

        this._error = "";
        this._submitButton.start();

        try {
            await app.api.getPrice(
                new UpdateBillingParams({
                    plan: this.plan!.id,
                    members: this.quantity
                })
            );
            this._submitButton.success();
        } catch (e) {
            console.log(e);
            this._submitButton.fail();
        }
    }

    async show(plan: Plan) {
        this.plan = plan;
        const result = super.show();
        return result;
    }

    private async _updateBillingInfo() {
        this.open = false;
        await this._billingDialog.show();
        this.open = true;
    }

    private async _changePlan() {
        this.open = false;
        this.plan = await this._choosePlanDialog.show();
        this.open = true;
    }

    static styles = [
        ...Dialog.styles,
        css`
            .outer {
                padding: 0;
            }

            .inner {
                background: transparent;
                box-shadow: none;
            }

            .plans {
                overflow: auto;
                scroll-snap-type: x mandatory;
                display: flex;
                padding: 20px 50px;
                max-width: 900px;
                margin: 0 auto;
            }

            .plan {
                min-width: 300px;
                flex: 1;
                background: var(--color-quaternary);
                border-radius: var(--border-radius);
                margin-right: 12px;
                overflow: hidden;
                --color-highlight: var(--color-shade-2);
                --color-highlight-text: var(--color-secondary);
                box-shadow: rgba(0, 0, 0, 0.2) 0 0 10px;
                transition: transform 0.2s;
                scroll-snap-align: center;
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

            .plan pl-loading-button.primary {
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
            }

            .change-plan {
                background: transparent;
                color: var(--color-tertiary);
                font-weight: bold;
                margin: 4px;
            }
        `
    ];

    renderBefore() {
        return html`
            <button class="change-plan tap" @click=${this._changePlan}>${$l("Change Plan")}</button>
        `;
    }

    renderContent() {
        if (!this.plan) {
            return html``;
        }

        const plan = this.plan;
        const monthlyPrice = Math.round((this.quantity * plan.cost) / 12);
        const paymentMethod = app.account!.billing.paymentMethod;

        return html`
            <div
                class="plan"
                style=${plan.color
                    ? `--color-highlight: ${plan.color}; --color-highlight-text: var(--color-tertiary);`
                    : ""}
            >
                <div class="plan-header">
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

                <div class="item" ?hidden=${plan.max < 2}>
                    <div class="quantity">
                        <strong>${this.quantity}</strong>
                        ${$l("users")}
                    </div>

                    <pl-slider
                        id="quantitySlider"
                        .value=${this.quantity}
                        .min=${plan.min}
                        .max=${plan.max}
                        hideValue
                        @change=${(e: any) => (this.quantity = e.detail.value)}
                    ></pl-slider>
                </div>

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
