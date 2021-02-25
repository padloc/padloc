import { countries } from "@padloc/locale/src/countries";
import { translate as $l } from "@padloc/locale/src/translate";
import { BillingInfo, BillingAddress, UpdateBillingParams } from "@padloc/core/src/billing";
import { loadScript } from "../lib/util";
import { app } from "../globals";
import { element, html, property, query } from "./base";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Select } from "./select";
import Nunito from "../../assets/fonts/Nunito-Regular.ttf";
import "./scroller";

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
    private _submitButton: Button;

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
        if (app.state.billingProvider && !this._stripe) {
            this._initStripe();
        }
        return super.show();
    }

    private async _initStripe() {
        const stripePubKey = app.state.billingProvider && app.state.billingProvider.config.publicKey;

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
                    weight: 400,
                },
            ],
        });
        const card = (this._cardElement = elements.create("card", {
            iconStyle: "solid",
            hidePostalCode: true,
            style: {
                base: {
                    fontFamily: '"Nunito", "Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: "antialiased",
                    fontSize: "18px",
                },
            },
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
                source: token.id,
            };
        }

        const address = new BillingAddress().fromRaw({
            name: this._nameInput.value,
            street: this._streetInput.value,
            postalCode: this._zipInput.value,
            city: this._cityInput.value,
            country: this._countrySelect.selected.code,
        });

        const coupon = this._couponInput.value;

        this.done(
            new UpdateBillingParams({
                account: this._billingInfo!.account,
                org: this._billingInfo!.org,
                email: this._emailInput.value,
                address,
                paymentMethod,
                coupon,
            })
        );
    }

    static styles = [...Dialog.styles];

    renderContent() {
        const billingInfo = this._billingInfo || new BillingInfo();

        let { email, address, paymentMethod, discount } = billingInfo;

        email = email || (app.account!.billing && app.account!.billing.email) || app.account!.email;
        const name = address.name || app.account!.name;

        const countryOptions = [
            { code: "", toString: () => $l("Select A Country") },
            ...countries.map((c) => Object.assign(c, { toString: () => c.name })),
        ];

        return html`
            <header class="center-aligning padded horizontal layout">
                <div class="large bold horizontally-padded stretch">${this.dialogTitle}</div>
                <pl-button class="slim transparent" @click=${() => this.done()}>
                    <pl-icon icon="cancel"></pl-icon>
                </pl-button>
            </header>

            <pl-scroller class="stretch">
                ${!app.billingEnabled
                    ? html`
                          <div class="double-padded text-centering small">
                              ${$l(
                                  'To update your billing info and payment method, please log in through our website (found under "Settings") ' +
                                      "or contact us at "
                              )}
                              <a href="mailto:support@padloc.app">support@padloc.app</a>!
                          </div>
                      `
                    : html`
                          <div class="padded spacing vertical layout">
                              <div class="small double-padded" ?hidden=${!this.message}>${this.message}</div>

                              <h4 class="margined">${$l("Payment Details")}</h4>

                              <div class="padded card" ?hidden=${!this._editingPaymentMethod}>
                                  <slot></slot>
                              </div>

                              <div class="padded inverted red card" ?hidden="${!this._error}">${this._error}</div>

                              ${paymentMethod
                                  ? html`
                                        <div
                                            class="spacing padded horizontal center-aligning layout card"
                                            ?hidden=${this._editingPaymentMethod}
                                        >
                                            <pl-icon icon="credit"></pl-icon>
                                            <div class="stretch">${paymentMethod.name}</div>
                                            <pl-button
                                                class="slim transparent negatively-margined"
                                                @click=${this._editPaymentMethod}
                                            >
                                                <pl-icon icon="edit"></pl-icon>
                                            </pl-button>
                                        </div>
                                    `
                                  : html``}
                              ${!this.condensed
                                  ? html`
                                        <h4 class="margined">${$l("Billing Address")}</h4>

                                        <pl-input
                                            id="emailInput"
                                            .type="email"
                                            .label=${$l("Billing Email")}
                                            .value=${email}
                                        ></pl-input>

                                        <pl-input
                                            id="nameInput"
                                            class="item"
                                            .label=${$l("Name")}
                                            .value=${name}
                                        ></pl-input>

                                        <pl-input
                                            id="streetInput"
                                            .label=${$l("Address")}
                                            .value=${address.street}
                                        ></pl-input>

                                        <div class="spacing evenly stretching horizontal layout">
                                            <pl-input
                                                id="zipInput"
                                                .label=${$l("Postal Code")}
                                                .value=${address.postalCode}
                                            ></pl-input>

                                            <pl-input
                                                id="cityInput"
                                                .label=${$l("City")}
                                                .value=${address.city}
                                            ></pl-input>
                                        </div>

                                        <pl-select
                                            id="countrySelect"
                                            .label=${$l("Country")}
                                            .options=${countryOptions}
                                            .selected=${countryOptions.find((c) => c.code === address.country)}
                                        ></pl-select>

                                        <h4 class="margined">${$l("Tax Info")}</h4>

                                        <pl-toggle-button
                                            reverse
                                            .label=${$l("This is a business")}
                                            value=${this._isBusiness}
                                            @change=${(e: CustomEvent) => (this._isBusiness = e.detail.value)}
                                        ></pl-toggle-button>

                                        <pl-input
                                            id="taxIdInput"
                                            .label=${$l("Tax ID")}
                                            ?hidden=${!this._isBusiness}
                                        ></pl-input>
                                    `
                                  : ""}

                              <h4 class="margined">Coupon</h4>

                              <div class="discount" ?hidden=${!discount}>
                                  <span class="name">${discount && discount.name}</span>
                                  <span class="subtle mono">(${discount && discount.coupon})</span>
                              </div>

                              <pl-input id="couponInput" label=${$l("Coupon Code")} ?hidden=${!!discount}></pl-input>
                          </div>
                      `}
            </pl-scroller>

            <footer class="padded horizontal evenly stretching spacing horizontal layout">
                <pl-button class="primary" id="submitButton" @click=${this._submit}> ${this.submitLabel} </pl-button>

                <pl-button @click=${() => this.done()} ?hidden=${this.condensed}> ${$l("Cancel")} </pl-button>
            </footer>
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
