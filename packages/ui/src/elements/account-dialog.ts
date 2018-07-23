import { localize as $l } from "@padlock/core/lib/locale.js";
import { PublicAccount } from "@padlock/core/lib/auth.js";
import sharedStyles from "../styles/shared.js";
import { app } from "../init.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";
import { LoadingButton } from "./loading-button.js";
import "./fingerprint.js";

@element("pl-account-dialog")
export class AccountDialog extends BaseElement {
    @property() account: PublicAccount;

    @query("pl-dialog") private _dialog: Dialog;
    @query("pl-loading-button") private _button: LoadingButton;

    private _resolve: (() => void) | null;

    _shouldRender() {
        return !!this.account;
    }

    _render({ account }: this) {
        const { email, publicKey } = account!;

        return html`
        <style>

            ${sharedStyles}

            :host {
                --pl-dialog-inner: {
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                };
            }

            .email {
                font-weight: bold;
                text-align: center;
                padding: 15px;
            }

            pl-fingerprint {
                --color-background: var(--color-foreground);
                color: var(--color-secondary);
                width: 250px;
                height: 250px;
                margin: 15px auto;
                border: solid 2px;
                border-radius: 20px;
            }

        </style>

        <pl-dialog on-dialog-dismiss="${() => this._dismiss()}">

            <div class="email">${email}</div>

            <pl-fingerprint key="${publicKey}" symbols></pl-fingerprint>

            <pl-loading-button on-click="${() => this._addTrusted()}">${$l("Add To Trusted Users")}</pl-loading-button>

        </pl-dialog>
`;
    }

    async _addTrusted() {
        if (this._button.state === "loading") {
            return;
        }

        this._button.start();
        try {
            await app.addTrustedAccount(this.account);
            this._button.success();
            this._dismiss();
        } catch (e) {
            // TODO handle error
            this._button.fail();
        }
    }

    private _dismiss() {
        this._resolve && this._resolve();
        this._dialog.open = false;
    }

    async show(account: PublicAccount) {
        this.account = account;
        await this.renderComplete;
        this._dialog.open = true;
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }
}
