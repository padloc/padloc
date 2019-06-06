import { localize as $l } from "@padloc/core/lib/locale";
import { Org } from "@padloc/core/lib/org";
import { Plan, UpdateBillingParams } from "@padloc/core/lib/billing";
import { dialog } from "../dialog";
import { app } from "../init";
import { element, html, property, css, query } from "./base";
import { Dialog } from "./dialog";
import { LoadingButton } from "./loading-button";
import "./card-input";
import { ChoosePlanDialog } from "./choose-plan-dialog";
import { Input } from "./input";

@element("pl-update-subscription-dialog")
export class UpdateSubscriptionDialog extends Dialog<Org, void> {
    @property()
    org: Org | null = null;

    @property()
    plan: Plan | null = null;

    @property()
    quantity: number = 1;

    @property()
    private _error = "";

    @query("#quantityInput")
    private _quantityInput: Input;

    @query("#submitButton")
    private _submitButton: LoadingButton;

    @dialog("pl-choose-plan-dialog")
    private _choosePlanDialog: ChoosePlanDialog;

    async show(org: Org) {
        this.org = org;
        const sub = org.billing!.subscription!;
        this.plan = sub.plan;
        this.quantity = sub.members;
        return super.show();
    }

    private async _submit() {
        if (this._submitButton.state === "loading") {
            return;
        }

        this._error = "";
        this._submitButton.start();

        const params = new UpdateBillingParams({
            plan: this.plan!.id,
            members: this.quantity,
            org: this.org!.id
        });
        try {
            await app.updateBilling(params);
            this._submitButton.success();
            this.done();
        } catch (e) {
            this._error = e.message || $l("Something went wrong. Please try again later!");
            this._submitButton.fail();
        }
    }

    private async _updateQuantity() {
        const quantity = parseInt(this._quantityInput.value);
        const { min, max } = this.plan!;
        if (!isNaN(quantity) && quantity >= min && quantity <= max) {
            this.quantity = quantity;
        }
    }

    private async _changePlan() {
        this.open = false;
        this.plan = await this._choosePlanDialog.show();
        this.open = true;
    }

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                background: transparent;
                box-shadow: none;
            }

            .wrapper {
                flex: 1;
                background: var(--color-quaternary);
                border-radius: var(--border-radius);
                margin: 12px;
                overflow: hidden;
                text-align: center;
            }

            .plan {
                text-align: center;
                padding: 20px;
                background: var(--color-highlight);
                color: var(--color-highlight-text);
                display: flex;
                flex-direction: column;
                position: relative;
            }

            .plan-name {
                font-size: 1.7rem;
                margin-bottom: 8px;
                font-weight: bold;
            }

            .plan-price {
                letter-spacing: 0.1em;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                font-weight: bold;
                font-size: 1rem;
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
            }

            .plan-fineprint {
                font-size: var(--font-size-tiny);
                opacity: 0.7;
                margin: 4px 0 -4px 0;
            }

            pl-loading-button {
                font-weight: bold;
            }

            pl-loading-button.primary {
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

            .quantity-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 8px;
            }

            .quantity-label {
                font-weight: bold;
                padding: 12px;
                font-size: 1.2em;
                text-align: left;
            }

            .quantity-input {
                width: 60px;
                height: 45px;
                margin: 0;
                font-weight: bold;
                font-size: 1.5rem;
            }

            .quantity-minmax {
                font-size: var(--font-size-micro);
                opacity: 0.5;
                text-align: right;
                padding: 12px;
            }

            .edit-plan-icon {
                position: absolute;
                top: 8px;
                right: 8px;
            }
        `
    ];

    renderContent() {
        const plan = this.plan;

        if (!plan) {
            return html``;
        }

        const color = plan.color;
        const monthlyPrice = Math.round((this.quantity * plan.cost) / 12);

        return html`
            <div class="wrapper" style=${`--color-highlight: ${color}; --color-highlight-text: var(--color-tertiary);`}>
                <h1>${$l("Update Subscription")}</h1>

                <div class="plan item">
                    <pl-icon class="tap edit-plan-icon" icon="edit" @click=${this._changePlan}></pl-icon>

                    <div class="plan-name">
                        ${plan.name}
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

                    <div class="plan-fineprint">
                        (${$l("USD, billed annually")})
                    </div>

                    <div class="flex"></div>
                </div>

                <div class="quantity-wrapper" ?hidden=${plan.max < 2}>
                    <div class="quantity-minmax flex">
                        <div>${$l("{0} min", plan.min.toString())}</div>
                        <div>${$l("{0} max", plan.max.toString())}</div>
                    </div>
                    <pl-input
                        id="quantityInput"
                        class="quantity-input item"
                        type="number"
                        .value=${this.quantity}
                        .min=${plan.min}
                        .max=${plan.max}
                        @input=${this._updateQuantity}
                        @blur=${() => (this._quantityInput.value = this.quantity.toString())}
                    ></pl-input>
                    <div class="quantity-label flex">
                        ${$l("Seats")}
                    </div>
                </div>

                <div class="error item" ?hidden="${!this._error}">
                    ${this._error}
                </div>

                <div class="actions">
                    <pl-loading-button id="submitButton" class="tap primary" @click=${this._submit}>
                        ${$l("Update")}
                    </pl-loading-button>

                    <button class="tap" @click=${() => this.done()}>${$l("Cancel")}</button>
                </div>
            </div>
        `;
    }
}
