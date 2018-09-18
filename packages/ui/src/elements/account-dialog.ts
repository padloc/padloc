import { localize as $l } from "@padlock/core/lib/locale.js";
import { AccountInfo } from "@padlock/core/lib/auth.js";
import { shared, mixins } from "../styles";
import { app } from "../init.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";
import "./fingerprint.js";

@element("pl-account-dialog")
export class AccountDialog extends BaseElement {
    @property() account: AccountInfo | null = null;
    @property() action: string = "";

    @query("pl-dialog") private _dialog: Dialog;

    private _resolve: ((doAction: boolean) => void) | null;

    shouldUpdate() {
        return !!this.account;
    }

    render() {
        const account = this.account!;
        const { id, email, name, publicKey } = account;
        const isOwnAccount = app.account && app.account.id === id;

        return html`
        ${shared}

        <style>

            :host {
                --pl-dialog-inner: {
                    ${mixins.gradientHighlight()}
                };
            }

            .header {
                padding: 20px;
                display: flex;
                align-items: center;
            }

            .email {
                font-weight: bold;
            }

            .email, .name {
                font-size: 110%;
                line-height: 30px;
                word-wrap: break-word;
                white-space: pre-wrap;
                text-align: center;
            }

            pl-fingerprint {
                --color-background: var(--color-foreground);
                color: var(--color-secondary);
                width: 100px;
                height: 100px;
                border: solid 2px var(--color-background);
                border-radius: 100%;
                margin: 30px auto 15px auto;
                box-shadow: rgba(0, 0, 0, 0.2) 0 2px 2px;
                transition: border-radius 0.3s;
            }

            pl-fingerprint:hover {
                border-radius: 5px;
            }

            pl-fingerprint:not(:hover) + .fingerprint-hint {
                visibility: hidden;
            }

            .fingerprint-hint {
                font-size: var(--font-size-micro);
                text-decoration: underline;
                text-align: center;
                margin-top: -13px;
                margin-bottom: -2px;
                text-shadow: none;
                color: var(--color-highlight);
                font-weight: bold;
            }

            .tags {
                margin: 15px 20px 20px 20px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .tag {
                background: var(--color-foreground);
                color: var(--color-highlight);
                text-shadow: none;
                box-shadow: rgba(0, 0, 0, 0.2) 0 1px 1px;
                margin-bottom: 6px;
            }

            .close-icon {
                position: absolute;
                top: 0;
                right: 0;
            }

        </style>

        <pl-dialog @dialog-dismiss=${() => this._done()}>

            <pl-icon class="close-icon tap" icon="close" @click=${() => this._done()}></pl-icon>

            <pl-fingerprint .key=${publicKey}></pl-fingerprint>

            <div class="fingerprint-hint">${$l("What is this?")}</div>

            <div>

                <div class="name">${name}</div>

                <div class="email">${email}</div>

                <div class="tags small">

                    <div class="tag" ?hidden=${!isOwnAccount}>

                        <pl-icon icon="user"></pl-icon>

                        <div>${$l("This Is You")}</div>

                    </div>

                    ${app.stores.filter(s => s.isMember(account!)).map(
                        s => html`
                            <div class="tag">

                                <pl-icon icon="group"></pl-icon>

                                <div>${s.name}</div>

                            </div>`
                    )}
                </div>

            </div>

        </pl-dialog>
`;
    }

    private _done(doAction = false) {
        this._resolve && this._resolve(doAction);
        this._dialog.open = false;
    }

    async show(account: AccountInfo, action = "") {
        this.account = account;
        this.action = action;
        await this.updateComplete;
        this._dialog.open = true;
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }
}
