import { countries } from "@padloc/locale/src/countries";
import { translate as $l } from "@padloc/locale/src/translate";
import { BillingInfo } from "@padloc/core/src/billing";
import { shared } from "../styles";
import { dialog, alert } from "../lib/dialog";
import { app } from "../globals";
import { BaseElement, element, property, html, css, query } from "./base";
import "./icon";
import { LoadingButton } from "./loading-button";
import { BillingDialog } from "./billing-dialog";

@element("pl-billing-info")
export class BillingInfoElement extends BaseElement {
    @property()
    billing: BillingInfo | null = null;

    @query("#editButton")
    private _editButton: LoadingButton;

    @dialog("pl-billing-dialog")
    private _billingDialog: BillingDialog;

    private async _update() {
        if (this._editButton.state === "loading") {
            return;
        }

        const billingInfo = this.billing!;

        const params = await this._billingDialog.show({ billingInfo });
        if (params) {
            this._editButton.start();
            try {
                await app.updateBilling(params);
                this._editButton.success();
            } catch (e) {
                this._editButton.fail();
                alert(e.message || $l("Something went wrong. Please try again later!"), { type: "warning" });
                throw e;
            }
        }
    }

    static styles = [
        shared,
        css`
            :host {
                padding: 8px;
                display: grid;
                grid-template-columns: 36px 1fr;
                position: relative;
            }

            .payment-method,
            .billing-email,
            .discount {
                font-weight: bold;
            }

            .data {
                margin: 8px 6px;
            }

            .edit-button {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 1;
            }

            .missing {
                opacity: 0.7;
                cursor: pointer;
            }

            .data-icon {
                width: 36px;
            }
        `
    ];

    render() {
        if (!this.billing) {
            return html``;
        }

        const billing = this.billing!;
        const country = countries.find(c => c.code === billing.address.country);
        const postalCode = billing.address.postalCode;
        const city = billing.address.city;

        return html`
            <pl-loading-button id="editButton" class="edit-button tap icon" @click=${this._update}>
                <pl-icon icon="edit"></pl-icon>
            </pl-loading-button>

            <pl-icon icon="credit" class="data-icon"></pl-icon>

            <div class="data payment-method">
                ${billing.paymentMethod
                    ? html`
                          <div>
                              ${billing.paymentMethod.name}
                          </div>
                      `
                    : html`
                          <div class="missing" @click=${this._update}>
                              ${$l("Add Payment Method")}
                          </div>
                      `}
            </div>

            ${billing.email || billing.address.name
                ? html`
                      <pl-icon icon="address" class="data-icon"></pl-icon>

                      <div class="data">
                          <div class="billing-email">${billing.email}</div>
                          <div class="billing-name">${billing.address.name}</div>
                          <div class="billing-street">${billing.address.street}</div>
                          <div class="billing-city">
                              ${postalCode ? `${postalCode}, ` : ""} ${city ? `${city}, ` : ""}
                              ${country ? `${country.name}` : ""}
                          </div>
                      </div>
                  `
                : html``}
            ${billing.discount
                ? html`
                      <pl-icon icon="discount" class="data-icon"></pl-icon>

                      <div class="data discount">
                          ${billing.discount.name}
                      </div>
                  `
                : html``}
        `;
    }
}
