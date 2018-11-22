import { AccountInfo } from "@padlock/core/lib/account.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { shared } from "../styles";
import { element, html, property } from "./base.js";
import { Dialog } from "./dialog.js";

@element("pl-select-account-dialog")
export class SelectAccountDialog extends Dialog<AccountInfo[], AccountInfo> {
    @property()
    accounts: AccountInfo[] = [];

    renderContent() {
        return html`
            ${shared}

            <style>

                h2 {
                    justify-content: center;
                    margin: 20px 10px 10px 10px;
                    font-weight: bold;
                }

                .inner {
                    width: auto;
                    max-width: 100%;
                }

            </style>

            <h2>${$l("Add Member")}</h2>

            ${this.accounts.map(
                acc => html`
                <pl-account-item
                    class="tap"
                    .account=${acc}
                    @click=${() => this.done(acc)}>
                </pl-account-item>
            `
            )}

        `;
    }

    async show(accounts: AccountInfo[]): Promise<AccountInfo> {
        this.accounts = accounts;
        await this.updateComplete;
        return super.show();
    }
}
