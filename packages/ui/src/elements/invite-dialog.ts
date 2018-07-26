import { SharedStore } from "@padlock/core/lib/data.js";
import { PublicAccount } from "@padlock/core/lib/auth.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { ErrorCode } from "@padlock/core/lib/error.js";
import { app } from "../init.js";
import sharedStyles from "../styles/shared.js";
import { alert, prompt, getDialog } from "../dialog.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";
import { ToggleButton } from "./toggle-button.js";
import "./loading-button.js";
import "./account-dialog.js";

@element("pl-invite-dialog")
export class InviteDialog extends BaseElement {
    @property() store: SharedStore | null = null;

    @query("pl-dialog") private _dialog: Dialog;
    @query("#permRead") private _permRead: ToggleButton;
    @query("#permWrite") private _permWrite: ToggleButton;
    @query("#permManage") private _permManage: ToggleButton;

    private _resolve: (() => void) | null;

    _shouldRender() {
        return !!this.store;
    }

    _render({ store }: this) {
        const trusted = app.mainStore.trustedAccounts.filter(
            acc =>
                !store!.accessors.some(a => a.email === acc.email) &&
                !store!.invites.some(inv => inv.recipient.email === acc.email)
        );

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

                .permissions {
                    display: flex;
                    justify-content: center;
                }

                .permissions pl-toggle-button {
                    --toggle-width: 33px;
                    --toggle-height: 22px;
                    --color-highlight: var(--color-primary);
                    padding: 0 8px;
                    font-weight: bold;
                    font-size: var(--font-size-small);
                }

            </style>

            <pl-dialog>

                <div class="title">

                    <pl-icon icon="invite"></pl-icon>

                    <div>${$l("Invite To '{0}'...", store!.name)}</div>

                </div>

                <div class="permissions">

                    <pl-toggle-button id="permRead" label="${$l("read")}" reverse active></pl-toggle-button>

                    <pl-toggle-button id="permWrite" label="${$l("write")}" reverse></pl-toggle-button>

                    <pl-toggle-button id="permManage" label="${$l("manage")}" reverse></pl-toggle-button>

                </div>

                ${trusted.map(
                    acc => html`
                    <pl-account-item
                        class="tap"
                        account="${acc}"
                        on-click="${() => this._selectAccount(acc)}">
                    </pl-account-item>
                `
                )}

                <button class="tap" on-click="${() => this._inviteNew()}">
                    ${$l("Invite New User...")}
                </button>

            </pl-dialog>
        `;
    }

    async show(store: SharedStore) {
        this.store = store;
        this.requestRender();
        await this.renderComplete;
        this._permRead.active = true;
        this._permWrite.active = false;
        this._permManage.active = false;
        this._dialog.open = true;
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    private _done() {
        this._resolve && this._resolve();
        this._resolve = null;
        this._dialog.open = false;
    }

    async _selectAccount(account: PublicAccount) {
        this._dialog.open = false;
        const store = this.store!;

        const confirmed = await getDialog("pl-account-dialog").show(account, $l("Invite To '{0}'", store.name));

        if (!confirmed) {
            this._dialog.open = true;
            return;
        }

        await app.createInvite(store, account, {
            read: this._permRead.active,
            write: this._permWrite.active,
            manage: this._permManage.active
        });

        this._done();
    }

    async _inviteNew() {
        this._dialog.open = false;
        const email = await prompt(
            $l("Please enter the email address of the user you would like to share this with!"),
            {
                placeholder: $l("Enter Email Address"),
                confirmLabel: $l("Submit"),
                validate: async (email, input) => {
                    if (!email || input.invalid) {
                        throw $l("Please enter a valid email address!");
                    }
                    return email;
                }
            }
        );

        if (!email) {
            this._dialog.open = true;
            return;
        }

        try {
            const account = await app.client.getAccount(email);
            await this._selectAccount(account);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                await alert($l("This account does not exist!"));
                this._dialog.open = true;
            } else {
                throw e;
            }
        }
    }
}
