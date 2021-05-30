import { countries } from "@padloc/locale/src/countries";
import { translate as $l } from "@padloc/locale/src/translate";
import { BillingInfo } from "@padloc/core/src/billing";
import { shared } from "../styles";
import { dialog, alert } from "../lib/dialog";
import { app } from "../globals";
import "./icon";
import { Button } from "./button";
import { BillingDialog } from "./billing-dialog";
import { customElement, property, query } from "lit/decorators";
import { html, LitElement } from "lit";

@customElement("pl-billing-info")
export class BillingInfoElement extends LitElement {
    @property({ attribute: false })
    billing: BillingInfo | null = null;

    @query("#editButton")
    private _editButton: Button;

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

    static styles = [shared];

    render() {
        if (!this.billing) {
            return html``;
        }

        const billing = this.billing!;
        const country = countries.find((c) => c.code === billing.address.country);
        const postalCode = billing.address.postalCode;
        const city = billing.address.city;

        return html`
            <div class="relative padded card">
                ${billing.paymentMethod
                    ? html`
                          <div class="margined center-aligning spacing horizontal layout">
                              <pl-icon icon="credit"></pl-icon>

                              <div class="stretch">
                                  ${billing.paymentMethod
                                      ? html` <div>${billing.paymentMethod.name}</div> `
                                      : html` <div class="" @click=${this._update}>${$l("Add Payment Method")}</div> `}
                              </div>

                              <pl-button id="editButton" class="slim transparent" @click=${this._update}>
                                  <pl-icon icon="edit"></pl-icon>
                              </pl-button>
                          </div>
                      `
                    : html`
                          <pl-button id="editButton" class="transparent" @click=${this._update}>
                              <pl-icon icon="credit" class="right-margined"></pl-icon>

                              <div>${$l("Add Payment Method")}</div>
                          </pl-button>
                      `}
                ${billing.email || billing.address.name
                    ? html`
                          <div class="margined spacing horizontal layout">
                              <pl-icon icon="address"></pl-icon>

                              <div class="stretch">
                                  <div class="bold">${billing.email}</div>
                                  <div>${billing.address.name}</div>
                                  <div>${billing.address.street}</div>
                                  <div>${postalCode ? `${postalCode}, ` : ""} ${city}</div>
                                  <div>${country ? `${country.name}` : ""}</div>
                              </div>
                          </div>
                      `
                    : html``}
                ${billing.discount
                    ? html`
                          <div class="margined spacing horizontal layout">
                              <pl-icon icon="discount"></pl-icon>

                              <div class="data discount">${billing.discount.name}</div>
                          </div>
                      `
                    : html``}
            </div>
        `;
    }
}
