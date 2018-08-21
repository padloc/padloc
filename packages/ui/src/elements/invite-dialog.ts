import { PublicAccount } from "@padlock/core/lib/auth.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import sharedStyles from "../styles/shared.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";

@element("pl-invite-dialog")
export class InviteDialog extends BaseElement {
    @property() accounts: PublicAccount[] = [];

    @query("pl-dialog") private _dialog: Dialog;

    private _resolve: ((acc: PublicAccount | null | "new") => void) | null;

    _render({ accounts }: this) {
        return html`
            <style>
                ${sharedStyles}

                .title {
                    padding: 10px 15px;
                    text-align: center;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
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

            <pl-dialog on-dialog-dismiss="${() => this._done(null)}">

                <div class="title">

                    <pl-icon icon="user"></pl-icon>

                    <div>${$l("Select An Account:")}</div>

                </div>

                ${accounts.map(
                    acc => html`
                    <pl-account-item
                        class="tap"
                        account="${acc}"
                        on-click="${() => this._done(acc)}">
                    </pl-account-item>
                `
                )}

                <button class="tap" on-click="${() => this._done("new")}">
                    ${$l("Invite New User...")}
                </button>

            </pl-dialog>
        `;
    }

    async show(accounts: PublicAccount[]): Promise<PublicAccount | null | "new"> {
        this.accounts = accounts;
        this.requestRender();
        await this.renderComplete;
        this._dialog.open = true;
        return new Promise<PublicAccount | null | "new">(resolve => {
            this._resolve = resolve;
        });
    }

    private _done(account: PublicAccount | null | "new") {
        this._resolve && this._resolve(account);
        this._resolve = null;
        this._dialog.open = false;
    }
}
