import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { differenceInDays } from "date-fns";
import { translate as $l } from "@padloc/locale/src/translate";
import { FIELD_DEFS, FieldType } from "@padloc/core/src/item";
import { getDialog } from "../lib/dialog";
import { Dialog } from "./dialog";
import { PromptDialog } from "./prompt-dialog";

@customElement("pl-renew-expiration-dialog")
export class RenewExpirationDialog extends Dialog<boolean, number> {
    private _hideRemovalButton = false;

    renderContent() {
        return html`
            <div class="padded vertical spacing layout">
                <h1 class="big margined text-centering">
                    ${this._hideRemovalButton ? $l("Add Expiration Date") : $l("Update Expiration Date")}
                </h1>

                <div class="vertical stretching spacing layout">
                    ${this._hideRemovalButton
                        ? ""
                        : html`<pl-button class="negative" @click=${() => this.done(-1)}>
                              ${$l("Remove expiration date")}
                          </pl-button>`}
                    <pl-button @click=${() => this.done(30)}> ${$l("Expire in 1 month")} </pl-button>
                    <pl-button @click=${() => this.done(90)}> ${$l("Expire in 3 months")} </pl-button>
                    <pl-button @click=${() => this.done(365)}> ${$l("Expire in 1 year")} </pl-button>
                    <pl-button @click=${() => this._promptCustomDate()}> ${$l("Expire at a custom date")} </pl-button>
                    <pl-button @click=${this.dismiss}> ${$l("Cancel")} </pl-button>
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
        const promptDialog = (await getDialog("pl-prompt-dialog")) as PromptDialog;

        const message = async () => {
            return html` <div class="break-words">${$l(`When should this item expire?`)}</div>`;
        };

        const newDate: string = await promptDialog.show({
            title: $l("New Expiration Date"),
            placeholder: $l("Enter New Expiration Date"),
            confirmLabel: $l("Update"),
            type: "date",
            pattern: FIELD_DEFS[FieldType.Date].pattern.toString(),
            message: await message(),
        });

        const days = Math.abs(differenceInDays(new Date(), new Date(newDate))) + 1;

        this.done(days);
    }
}
