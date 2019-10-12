import { translate as $l } from "@padloc/locale/src/translate";
import { Org } from "@padloc/core/src/org";
import { Plan, BillingInfo, UpdateBillingParams } from "@padloc/core/src/billing";
import { dialog } from "../lib/dialog";
import { app } from "../globals";
import { element, html, property, css, query } from "./base";
import { Dialog } from "./dialog";
import { LoadingButton } from "./loading-button";
import "./card-input";
import { BillingDialog } from "./billing-dialog";
import { ChoosePlanDialog } from "./choose-plan-dialog";
import { Input } from "./input";

@element("pl-create-org-dialog")
export class CreateOrgDialog extends Dialog<Plan | null, Org> {
    @property()
    plan: Plan | null = null;

    @property()
    quantity: number = 1;

    @property()
    private _updateBillingParams: UpdateBillingParams | null = null;

    @property()
    private _error = "";

    @property()
    private _org: Org | null = null;

    @query("#nameInput")
    private _nameInput: Input;

    @query("#quantityInput")
    private _quantityInput: Input;

    @query("#submitButton")
    private _submitButton: LoadingButton;

    @dialog("pl-billing-dialog")
    private _billingDialog: BillingDialog;

    @dialog("pl-choose-plan-dialog")
    private _choosePlanDialog: ChoosePlanDialog;

    async show(plan: Plan | null) {
        this.plan = plan;
        this.quantity = (plan && plan.min) || 1;
        this._updateBillingParams = null;
        this._org = null;
        return super.show();
    }

    private async _submit() {
        if (this._submitButton.state === "loading") {
            return;
        }

        const name = this._nameInput.value;

        if (!name) {
            this._error = $l("Please enter an organization name!");
            return;
        }

        this._error = "";
        this._submitButton.start();

        if (!this._org) {
            try {
                this._org = await app.createOrg(name);
            } catch (e) {
                this._error = e.message || $l("Something went wrong. Please try again later!");
                this._submitButton.fail();
                return;
            }
        }

        if (this.plan) {
            const params = this._updateBillingParams || new UpdateBillingParams();
            params.plan = this.plan.id;
            params.members = this.quantity;
            params.org = this._org.id;
            try {
                await app.updateBilling(params);
            } catch (e) {
                this._error = e.message || $l("Something went wrong. Please try again later!");
                this._submitButton.fail();
                return;
            }
        }

        const org = (this._org = app.getOrg(this._org.id)!);

        // Create first vault and group
        if (org.quota.groups) {
            const everyone = await app.createGroup(org, "Everyone", [org.getMember(app.account!)!]);
            await app.createVault("Main", org, [], [{ name: everyone.name, readonly: false }]);
        } else {
            await app.createVault("Main", org, [{ id: app.account!.id, readonly: false }]);
        }

        this._submitButton.success();
        this.done(org);
    }

    private async _updateQuantity() {
        const quantity = parseInt(this._quantityInput.value);
        const { min, max } = this.plan!;
        if (!isNaN(quantity) && quantity >= min && quantity <= max) {
            this.quantity = quantity;
        }
    }

    private async _updateBillingInfo() {
        this.open = false;
        const billingInfo = new BillingInfo();
        billingInfo.address.name = this._nameInput.value;
        const billing = await this._billingDialog.show({
            billingInfo
        });

        if (billing) {
            this._updateBillingParams = billing;
            this._error = "";
        }

        this.open = true;
    }

    private async _changePlan() {
        this.open = false;
        const plan = await this._choosePlanDialog.show();
        if (plan) {
            this.plan = plan;
        }
        this.open = true;
    }

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                background: var(--color-quaternary);
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

            .plan-trial {
                font-size: 1.2rem;
                margin-bottom: 8px;
            }

            .plan-then {
                font-size: var(--font-size-tiny);
                margin-bottom: 8px;
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

    private _renderBilling(plan: Plan) {
        const monthlyPrice = Math.round((this.quantity * plan.cost) / 12);
        const paymentMethod = this._updateBillingParams && this._updateBillingParams.paymentMethod;

        return html`
            <div class="plan item">
                <pl-icon class="tap edit-plan-icon" icon="edit" @click=${this._changePlan}></pl-icon>

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
        `;
    }

    renderContent() {
        const plan = this.plan;
        const color = (plan && plan.color) || "var(--color-primary)";

        return html`
            <header>
                <pl-icon></pl-icon>
                <div class="title flex">${$l("Create Organization")}</div>
                <pl-icon icon="cancel" class="tap" @click=${this.dismiss}></pl-icon>
            </header>

            <div class="content" style=${`--color-highlight: ${color}; --color-highlight-text: var(--color-tertiary);`}>
                <pl-input
                    id="nameInput"
                    class="item"
                    .label=${$l("Organization Name")}
                    .value=${(this._org && this._org.name) || ""}
                ></pl-input>

                ${plan ? this._renderBilling(plan) : html``}

                <div class="error item" ?hidden="${!this._error}">
                    ${this._error}
                </div>

                <pl-loading-button id="submitButton" class="tap primary" @click=${this._submit}>
                    ${$l("Create")}
                </pl-loading-button>
            </div>
        `;
    }
}
