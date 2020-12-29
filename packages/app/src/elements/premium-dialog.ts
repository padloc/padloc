import { unsafeHTML } from "lit-html/directives/unsafe-html";
import { translate as $l } from "@padloc/locale/src/translate";
import { BillingInfo, Plan, PlanType, UpdateBillingParams } from "@padloc/core/src/billing";
import { dialog } from "../lib/dialog";
import { mixins } from "../styles";
import { app } from "../globals";
import { element, html, property, css, query } from "./base";
import { Dialog } from "./dialog";
import { Button } from "./button";
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
    private _submitButton: Button;

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
                account: app.account!.id,
            });

        params.plan = this.plan!.id;

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
            app.state.billingProvider && app.state.billingProvider.plans.find((p) => p.type === PlanType.Premium);
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
            billingInfo: Object.assign(new BillingInfo(), { account: app.account!.id }),
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
                overflow: hidden;
            }

            .plan-header {
                background: var(--color-highlight);
                color: var(--color-highlight-text);
                position: relative;
            }

            .close-button {
                position: absolute;
                top: var(--spacing);
                right: var(--spacing);
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
                margin-bottom: 1em;
            }

            .plan-fineprint {
                font-size: var(--font-size-tiny);
                opacity: 0.8;
            }

            .quantity {
                font-size: 1.6rem;
                margin-top: 20px;
            }

            pl-button {
                font-weight: bold;
            }

            pl-button.primary {
                --button-background: var(--color-highlight);
                --button-foreground: var(--color-highlight-text);
                font-weight: bold;
            }

            .error {
                color: var(--color-negative);
                padding: var(--spacing);
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
                flex: 1;
                ${mixins.scroll()}
            }

            .features > * {
                padding: 10px 15px;
            }

            .features > :not(:last-child) {
                border-bottom: solid 1px var(--color-shade-1);
            }
        `,
    ];

    renderContent() {
        if (!this.plan || !app.account) {
            return html``;
        }

        const plan = this.plan;
        const monthlyPrice = Math.round(plan.cost / 12);
        const paymentMethod =
            (this._updateBillingParams && this._updateBillingParams.paymentMethod) ||
            (app.account.billing && app.account.billing.paymentMethod);

        const trialDaysLeft = app.account.billing ? app.account.billing.trialDaysLeft : 30;

        return html`
            <div
                class="rounded spacing vertical layout plan"
                style=${plan.color
                    ? `--color-highlight: ${plan.color}; --color-highlight-text: var(--color-white);`
                    : ""}
            >
                <div class="double-padded vertical center-aligning layout plan-header">
                    <pl-button class="close-button slim transparent" @click=${() => this.done()}>
                        <pl-icon icon="cancel"></pl-icon>
                    </pl-button>

                    <div class="plan-name">${plan.name}</div>

                    <div class="flex"></div>

                    <div class="plan-trial" ?hidden=${!trialDaysLeft}>
                        ${$l("Free For {0} Days", trialDaysLeft.toString())}
                    </div>

                    <div class="plan-then" ?hidden=${!trialDaysLeft}>${$l("then")}</div>

                    <div class="plan-price">
                        <div class="plan-price-currency">$</div>
                        <div class="plan-price-dollars">${Math.floor(monthlyPrice / 100)}</div>
                        <div class="plan-price-cents">.${(monthlyPrice % 100).toString().padEnd(2, "0")}</div>
                    </div>

                    <div class="plan-unit">${$l("per month")}</div>

                    <div class="flex"></div>

                    <div class="plan-fineprint">${$l("USD, billed annually")}</div>
                </div>

                <ul class="text-centering features">
                    ${plan.features.map(
                        (feature) => html`
                            <li>${unsafeHTML(feature.replace(/\*\*(.+)\*\*/g, "<strong>$1</strong>"))}</li>
                        `
                    )}
                </ul>

                <pl-button class="horizontally-margined" @click=${this._updateBillingInfo}>
                    <pl-icon icon="credit" class="right-margined"></pl-icon>
                    ${paymentMethod
                        ? html` <div>${paymentMethod.name}</div> `
                        : html` <div>${$l("Add Billing Info")}</div> `}
                </pl-button>

                <div class="horizontally-margined padded inverted red card" ?hidden="${!this._error}">
                    ${this._error}
                </div>

                <pl-button
                    id="submitButton"
                    class="horizontally-margined bottom-margined primary"
                    @click=${this._submit}
                >
                    ${trialDaysLeft ? $l("Start Trial") : $l("Buy Now")}
                </pl-button>
            </div>
        `;
    }
}
