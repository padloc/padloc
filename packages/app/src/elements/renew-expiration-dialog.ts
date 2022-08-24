import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { differenceInDays } from "date-fns";
import { translate as $l } from "@padloc/locale/src/translate";
import { FIELD_DEFS, FieldType } from "@padloc/core/src/item";
import { prompt } from "../lib/dialog";
import { Dialog } from "./dialog";
import "./button";
import "./icon";

@customElement("pl-renew-expiration-dialog")
export class RenewExpirationDialog extends Dialog<boolean, number> {
    private _hideRemovalButton = false;

    renderContent() {
        return html`
            <div class="padded vertical spacing layout">
                <h1 class="big margined text-centering">
                    <pl-icon icon="expired" class="inline"></pl-icon>
                    ${this._hideRemovalButton ? $l("Add Expiration Date") : $l("Update Expiration Date")}
                </h1>

                <div class="margined">${$l("Expire in...")}</div>

                <div class="vertical stretching spacing layout">
                    ${this._hideRemovalButton
                        ? ""
                        : html`<pl-button @click=${() => this.done(-1)}> ${$l("Never")} </pl-button>`}
                    <pl-button @click=${() => this.done(30)}> ${$l("1 Month")} </pl-button>
                    <pl-button @click=${() => this.done(90)}> ${$l("3 Months")} </pl-button>
                    <pl-button @click=${() => this.done(365)}> ${$l("1 Year")} </pl-button>
                    <pl-button @click=${() => this._promptCustomDate()}> ${$l("Custom Date")} </pl-button>
                    <pl-button class="transparent" @click=${this.dismiss}> ${$l("Cancel")} </pl-button>
                </div>
            </div>
        `;
    }

    async show(hideRemovalButton = false) {
        await this.updateComplete;
        this._hideRemovalButton = hideRemovalButton;
        return super.show();
    }

    private async _promptCustomDate() {
        this.open = false;
        const newDate: string = await prompt(
            html` <div class="break-words">${$l(`When should this item expire?`)}</div>`,
            {
                title: $l("New Expiration Date"),
                placeholder: $l("Enter New Expiration Date"),
                confirmLabel: $l("Update"),
                type: "date",
                pattern: FIELD_DEFS[FieldType.Date].pattern.toString(),
            }
        );
        this.open = true;

        if (newDate) {
            const days = Math.abs(differenceInDays(new Date(), new Date(newDate))) + 1;
            this.done(days);
        }
    }
}
