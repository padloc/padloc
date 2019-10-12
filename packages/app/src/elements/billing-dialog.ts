import { countries } from "@padloc/locale/src/countries";
import { translate as $l } from "@padloc/locale/src/translate";
import { BillingInfo, BillingAddress, UpdateBillingParams } from "@padloc/core/src/billing";
import { loadScript } from "../lib/util";
import { app } from "../globals";
import { element, html, property, query, css } from "./base";
import { Dialog } from "./dialog";
import { LoadingButton } from "./loading-button";
import { Input } from "./input";
import { Select } from "./select";
import Nunito from "../../assets/fonts/Nunito-Regular.ttf";

interface Params {
    condensed?: boolean;
    title?: string;
    message?: string;
    submitLabel?: string;
    billingInfo: BillingInfo;
}

@element("pl-billing-dialog")
export class BillingDialog extends Dialog<Params, UpdateBillingParams> {
    @property()
    condensed: boolean = false;

    @property()
    dialogTitle = "";

    @property()
    message = "";

    @property()
    submitLabel = "";

    readonly preventDismiss = true;

    @property()
    private _error = "";

    @property()
    private _billingInfo: BillingInfo;

    @property()
    private _editingPaymentMethod: boolean = false;

    @property()
    private _isBusiness: boolean = false;

    @query("#submitButton")
    private _submitButton: LoadingButton;

    @query("#emailInput")
    private _emailInput: Input;

    @query("#nameInput")
    private _nameInput: Input;

    @query("#streetInput")
    private _streetInput: Input;

    @query("#zipInput")
    private _zipInput: Input;

    @query("#cityInput")
    private _cityInput: Input;

    @query("#countrySelect")
    private _countrySelect: Select<{ code: string; name: string }>;

    @query("#couponInput")
    private _couponInput: Input;

    private _stripe: any;
    private _cardElement: any;

    async show({ condensed, title, message, submitLabel, billingInfo }: Params) {
        this.condensed = condensed || false;
        this.dialogTitle = title || $l("Update Billing Info");
        this.message = message || "";
        this.submitLabel = submitLabel || $l("Save");
        this._billingInfo = billingInfo;
        this._editingPaymentMethod = !this._billingInfo || !this._billingInfo.paymentMethod;
        // $l(
        //                     "Add your billing info now so you're all set to keep using Padloc once the trial period is over. Don't worry, you won't be charged yet!"
        //                 )
        return super.show();
    }

    async connectedCallback() {
        super.connectedCallback();

        const stripePubKey = app.billingConfig && app.billingConfig.stripePublicKey;

        if (!stripePubKey) {
            return;
        }

        const Stripe = await loadScript("https://js.stripe.com/v3/", "Stripe");

        const stripe = (this._stripe = Stripe(stripePubKey));
        const elements = stripe.elements({
            fonts: [
                {
                    src: `local("Nunito Regular"), local("Nunito-Regular"), url(${Nunito}) format("truetype")`,
                    family: "Nunito",
                    style: "normal",
                    weight: 400
                }
            ]
        });
        const card = (this._cardElement = elements.create("card", {
            iconStyle: "solid",
            hidePostalCode: true,
            style: {
                base: {
                    fontFamily: '"Nunito", "Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: "antialiased",
                    fontSize: "18px"
                }
            }
        }));
        const cardElement = document.createElement("div");
        this.appendChild(cardElement);
        card.mount(cardElement);

        let cardEmpty = true;
        card.addEventListener("change", (e: any) => {
            this._error = (e.error && e.error.message) || "";
            cardEmpty = e.empty;
        });
        card.addEventListener("blur", () => {
            if (cardEmpty) {
                this._editingPaymentMethod = !this._billingInfo || !this._billingInfo.paymentMethod;
            }
        });
    }

    private async _editPaymentMethod() {
        this._editingPaymentMethod = true;
        await this.updateComplete;
        this._cardElement.focus();
    }

    private async _submit() {
        if (this._submitButton.state === "loading") {
            return;
        }

        this._error = "";

        let paymentMethod;

        if (this._editingPaymentMethod) {
            this._submitButton.start();

            const { token, error } = await this._stripe.createToken(this._cardElement);

            if (error) {
                this._error = error.message;
                this._submitButton.fail();
                return;
            }

            this._submitButton.success();

            paymentMethod = {
                name: `${token.card.brand} •••• •••• •••• ${token.card.last4}`,
                source: token.id
            };
        }

        const address = new BillingAddress().fromRaw({
            name: this._nameInput.value,
            street: this._streetInput.value,
            postalCode: this._zipInput.value,
            city: this._cityInput.value,
            country: this._countrySelect.selected.code
        });

        const coupon = this._couponInput.value;

        this.done(
            new UpdateBillingParams({
                account: this._billingInfo!.account,
                org: this._billingInfo!.org,
                email: this._emailInput.value,
                address,
                paymentMethod,
                coupon
            })
        );
    }

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                background: var(--color-quaternary);
            }

            h1 {
                display: block;
                text-align: center;
            }

            label {
                font-weight: bold;
                margin: 8px 16px;
                font-size: var(--font-size-small);
            }

            .card-wrapper {
                padding: 14px 0 14px 12px;
            }

            .city-wrapper {
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-gap: 8px;
                margin: 8px;
            }

            .city-wrapper > * {
                margin: 0;
            }

            .payment-method {
                display: flex;
                align-items: center;
                padding: 5px;
                font-weight: bold;
            }

            .message {
                font-size: var(--font-size-small);
                padding: 0 20px 10px 20px;
            }

            .skip-button {
                background: none;
                color: var(--color-tertiary);
                margin-top: 8px;
            }

            .discount {
                padding: 12px;
            }

            .discount .name {
                font-weight: bold;
            }

            .discount .coupon {
                opacity: 0.7;
                font-family: var(--font-family-mono);
            }

            .payment-disabled-message {
                padding: 30px;
                text-align: center;
            }
        `
    ];

    renderContent() {
        const billingInfo = this._billingInfo || new BillingInfo();

        let { email, address, paymentMethod, discount } = billingInfo;

        email = email || (app.account!.billing && app.account!.billing.email) || app.account!.email;
        const name = address.name || app.account!.name;

        const countryOptions = [
            { code: "", toString: () => $l("Select A Country") },
            ...countries.map(c => Object.assign(c, { toString: () => c.name }))
        ];

        return html`
            <header>
                <pl-icon></pl-icon>
                <div class="title flex">${this.dialogTitle}</div>
                <pl-icon icon="cancel" class="tap" @click=${() => this.done()}></pl-icon>
            </header>

            <div class="content">
                ${!app.billingConfig || app.billingConfig.disablePayment
                    ? html`
                          <div class="payment-disabled-message">
                              To update your billing info and payment method, please go to
                              <strong>https://web.padloc.app</strong>!
                          </div>
                      `
                    : html`
                          <div class="message">
                              ${this.message}
                          </div>

                          <label>${$l("Payment Details")}</label>

                          <div class="card-wrapper item" ?hidden=${!this._editingPaymentMethod}>
                              <slot></slot>
                          </div>

                          <div class="error item" ?hidden="${!this._error}">
                              ${this._error}
                          </div>

                          ${paymentMethod
                              ? html`
                                    <div class="payment-method item" ?hidden=${this._editingPaymentMethod}>
                                        <pl-icon icon="credit"></pl-icon>
                                        <div class="flex">
                                            ${paymentMethod.name}
                                        </div>
                                        <pl-icon icon="edit" class="tap" @click=${this._editPaymentMethod}></pl-icon>
                                    </div>
                                `
                              : html``}

                          <div ?hidden="condensed">
                              <label>${$l("Billing Address")}</label>

                              <pl-input
                                  id="emailInput"
                                  class="item"
                                  .type="email"
                                  .placeholder=${$l("Billing Email")}
                                  .value=${email}
                              ></pl-input>

                              <pl-input
                                  id="nameInput"
                                  class="item"
                                  .placeholder=${$l("Name")}
                                  .value=${name}
                              ></pl-input>

                              <pl-input
                                  id="streetInput"
                                  class="item"
                                  .placeholder=${$l("Address")}
                                  .value=${address.street}
                              ></pl-input>

                              <div class="city-wrapper">
                                  <pl-input
                                      id="zipInput"
                                      class="item"
                                      .placeholder=${$l("Postal Code")}
                                      .value=${address.postalCode}
                                  ></pl-input>

                                  <pl-input
                                      id="cityInput"
                                      class="item"
                                      .placeholder=${$l("City")}
                                      .value=${address.city}
                                  ></pl-input>
                              </div>

                              <pl-select
                                  class="item"
                                  id="countrySelect"
                                  .options=${countryOptions}
                                  .selected=${countryOptions.find(c => c.code === address.country)}
                              ></pl-select>

                              <label>${$l("Tax Info")}</label>

                              <pl-toggle-button
                                  class="item tap"
                                  reverse
                                  .label=${$l("This is a business")}
                                  value=${this._isBusiness}
                                  @change=${(e: CustomEvent) => (this._isBusiness = e.detail.value)}
                              ></pl-toggle-button>

                              <pl-input
                                  id="taxIdInput"
                                  class="item"
                                  .placeholder=${$l("Tax ID")}
                                  ?hidden=${!this._isBusiness}
                              ></pl-input>
                          </div>

                          <label>Coupon</label>

                          <div class="discount item" ?hidden=${!discount}>
                              <span class="name">${discount && discount.name}</span>
                              <span class="coupon">(${discount && discount.coupon})</span>
                          </div>

                          <pl-input
                              class="item"
                              id="couponInput"
                              placeholder=${$l("Coupon Code")}
                              ?hidden=${!!discount}
                          ></pl-input>

                          <div class="actions">
                              <pl-loading-button class="primary tap" id="submitButton" @click=${this._submit}>
                                  ${this.submitLabel}
                              </pl-loading-button>

                              <button class="tap" @click=${() => this.done()} ?hidden=${this.condensed}>
                                  ${$l("Cancel")}
                              </button>
                          </div>
                      `}
            </div>
        `;
    }

    renderAfter() {
        return html`
            <button class="tap skip-button" @click=${() => this.done()} ?hidden=${!this.condensed}>
                ${$l("Add Later")}
            </button>
        `;
    }
}
