import { localize as $l, countries } from "@padloc/core/lib/locale";
import { BillingInfo, UpdateBillingInfoParams } from "@padloc/billing/lib/api";
import { billing } from "../init";
import { loadScript } from "../util";
import { element, html, property, query, css } from "./base";
import { Dialog } from "./dialog";
import { LoadingButton } from "./loading-button";
import { Input } from "./input";
import { Select } from "./select";

const stripeLoaded = loadScript("https://js.stripe.com/v3/", "Stripe");

@element("pl-billing-dialog")
export class BillingDialog extends Dialog<BillingInfo, BillingInfo> {
    @property()
    stripePubKey = "pk_test_jTF9rjIV9LyiyJ6ir2ARE8Oy";

    @property()
    condensed: boolean = false;

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

    private _stripe: any;
    private _cardElement: any;

    async show(info: BillingInfo) {
        this._billingInfo = info;
        this._editingPaymentMethod = !this._billingInfo.paymentMethod;
        return super.show();
    }

    async connectedCallback() {
        super.connectedCallback();

        const Stripe = await stripeLoaded;

        const stripe = (this._stripe = Stripe(this.stripePubKey));
        const elements = stripe.elements({
            fonts: [
                {
                    cssSrc: "https://fonts.googleapis.com/css?family=Nunito"
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
                this._editingPaymentMethod = false;
            }
        });
    }

    private async _editPaymentMethod() {
        this._editingPaymentMethod = true;
        await this.updateComplete;
        this._cardElement.focus();
    }

    private async _submitCard() {
        if (this._submitButton.state === "loading") {
            return;
        }

        this._error = "";
        this._submitButton.start();

        const { token, error } = await this._stripe.createToken(this._cardElement, {
            name: this._nameInput.value,
            address_line1: this._streetInput.value,
            address_zip: this._zipInput.value,
            address_city: this._cityInput.value,
            address_country: this._countrySelect.selected.code
        });

        if (error) {
            this._error = error.message;
            this._submitButton.fail();
            return;
        }

        try {
            const info = await billing.updateBillingInfo(null, new UpdateBillingInfoParams({ source: token.id }));
            this._submitButton.success();
            this.done(info);
        } catch (e) {
            this._error = e.message || $l("Something went wrong. Please try again later!");
            this._submitButton.fail();
        }
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

            .error {
                background: var(--color-negative);
                color: var(--color-tertiary);
                padding: 8px;
                text-align: center;
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
        `
    ];

    renderContent() {
        if (!this._billingInfo) {
            return html``;
        }

        const paymentMethod = this._billingInfo.paymentMethod;

        return html`
            <h1>${$l("Add Billing Info")}</h1>

            <div class="message">
                ${$l(
                    "Add your billing info now so you're all set to keep using Padloc once the trial period is over. Don't worry, you won't be charged yet!"
                )}
            </div>

            <label>${$l("Payment Details")}</label>

            <pl-input id="nameInput" class="item" .placeholder=${$l("Name On Card")}></pl-input>

            <div class="card-wrapper item" ?hidden=${!this._editingPaymentMethod}>
                <slot></slot>
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

            <label>${$l("Country Or Region")}</label>

            <pl-select
                class="item"
                id="countrySelect"
                .options=${countries.map(c => Object.assign(c, { toString: () => c.name }))}
            ></pl-select>

            <div ?hidden="condensed">
                <label>${$l("Billing Address")}</label>

                <pl-input id="nameInput" class="item" .placeholder=${$l("Name")}></pl-input>

                <pl-input id="streetInput" class="item" .placeholder=${$l("Address")}></pl-input>

                <div class="city-wrapper">
                    <pl-input id="zipInput" class="item" .placeholder=${$l("Postal Code")}></pl-input>

                    <pl-input id="cityInput" class="item" .placeholder=${$l("City")}></pl-input>
                </div>

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
                    ?hidden=${this._isBusiness}
                ></pl-input>

                <div class="error item" ?hidden="${!this._error}">
                    ${this._error}
                </div>
            </div>

            <label>Coupon</label>

            <pl-input class="item" id="couponInput" placeholder=${$l("Coupon Code")}></pl-input>

            <div class="actions">
                <pl-loading-button class="primary tap" id="submitButton" @click=${this._submitCard}>
                    ${$l("Submit")}
                </pl-loading-button>

                <button class="tap" @click=${() => this.done(this._billingInfo)} ?hidden=${this.condensed}>
                    ${$l("Cancel")}
                </button>
            </div>
        `;
    }

    renderAfter() {
        return html`
            <button class="tap skip-button" @click=${() => this.done(this._billingInfo)} ?hidden=${!this.condensed}>
                ${$l("Add Later")}
            </button>
        `;
    }
}
