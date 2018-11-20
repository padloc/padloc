import { AccountInfo } from "@padlock/core/lib/account.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { shared, mixins } from "../styles";
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

                .inner {
                    --color-background: var(--color-tertiary);
                    --color-foreground: var(--var-secondary);
                    text-shadow: none;
                    background: var(--color-background);
                    width: auto;
                    max-width: 100%;
                }

                .title {
                    padding: 10px 15px;
                    text-align: center;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    ${mixins.gradientHighlight()}
                    text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                    color: var(--color-tertiary);
                }

                pl-dialog > * {
                    --color-background: var(--color-tertiary);
                    --color-foreground: var(--color-secondary);
                    background: var(--color-background);
                    color: var(--color-foreground);
                    text-shadow: none;
                }

                pl-dialog > :not(:last-child):not(.title) {
                    border-bottom: solid 1px var(--border-color);
                }

                .hint {
                    padding: 10px;
                    text-align: center;
                    font-size: var(--font-size-small);
                }

            </style>

            <h1>${$l("Select a User")}</h1>

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
