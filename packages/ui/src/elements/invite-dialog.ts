import { Invite } from "@padlock/core/lib/invite.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { formatDateFromNow } from "@padlock/core/lib/util.js";
import { app } from "../init";
import { shared } from "../styles";
import { BaseElement, element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";
import { LoadingButton } from "./loading-button.js";
import { Input } from "./input.js";

@element("pl-invite-dialog")
export class InviteDialog extends BaseElement {
    @property() invite: Invite | null = null;

    @query("pl-dialog") private _dialog: Dialog;
    @query("#acceptButton") private _acceptButton: LoadingButton;
    @query("#resendButton") private _resendButton: LoadingButton;
    @query("#cancelButton") private _cancelButton: LoadingButton;
    @query("#codeInput") private _codeInput: Input;

    private _resolve: (() => void) | null;
    @property() private _verified: boolean;

    private get _valid(): boolean {
        return !!this.invite && !this.invite.expired && this.invite.status !== "canceled" && this._verified;
    }

    async show(invite: Invite): Promise<void> {
        this.invite = invite;
        this._verified = await invite.verify();
        this.requestRender();
        await this.renderComplete;
        this._dialog.open = true;
        return new Promise<void>(resolve => {
            this._resolve = resolve;
        });
    }

    _shouldRender() {
        return !!this.invite;
    }

    _render() {
        const { email, expires, expired, canceled, group } = this.invite!;
        const forMe = email === app.account!.email;

        const status = !this._verified
            ? { icon: "error", class: "warning", text: $l("The invite could not be validated.") }
            : canceled
                ? { icon: "cancel", class: "warning", text: $l("The invite was canceled") }
                : expired
                    ? { icon: "time", class: "warning", text: $l("This invite has expired") }
                    : { icon: "time", class: "", text: $l("expires {0}", formatDateFromNow(expires)) };
        return html`
            ${shared}

            <style>
                :host {
                    text-align: center;
                }

                .invite {
                    overflow: hidden;
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                }

                .invite-text {
                    font-size: var(--font-size-small);
                    margin: 10px 20px;
                }

                .invite-text.small {
                    font-size: var(--font-size-tiny);
                }

                .invite-email {
                    font-size: 120%;
                    margin: 15px;
                    font-weight: bold;
                }

                .invite-code {
                    font-size: 200%;
                    font-family: var(--font-family-mono);
                    text-transform: uppercase;
                    margin: 20px;
                    letter-spacing: 5px;
                    font-weight: bold;
                    user-select: text;
                    cursor: text;
                }

                .tags {
                    justify-content: center;
                    overflow: visible;
                    margin: 20px 0;
                }

                .tag {
                    background: var(--color-foreground);
                    color: var(--color-highlight);
                    text-shadow: none;
                    box-shadow: rgba(0, 0, 0, 0.2) 0 2px 2px;
                }

                .tag.group {
                    font-size: var(--font-size-small);
                    padding: 4px 16px;
                }

                .code-input {
                    border-radius: 8px;
                    margin: 15px;
                }

                .close-button {
                    position: absolute;
                    top: 0;
                    right: 0;
                }
            </style>

            <pl-dialog on-dialog-dismiss="${() => this._done()}">
                <div class="invite">

                    <pl-icon icon="cancel" class="tap close-button" on-click="${() => this._done()}"></pl-icon>

                    <h1>${$l("Group Invite")}</h1>

                    <div class="tags">

                        <div class="tag group">

                            <pl-icon icon="group"></pl-icon>

                            <div>${group!.name}</div>

                        </div>

                    </div>

                    ${forMe ? this._inviteeBody() : this._adminBody()}

                    <div class="tags">

                        <div class$="tag ${status.class}">

                            <pl-icon icon="${status.icon}"></pl-icon>

                            <div>${status.text}</div>

                        </div>

                    </div>

                    <div layout class="tiles tiles-2">

                    ${forMe ? this._inviteeActions() : this._adminActions()}

                    </div>

                </div>

            </pl-dialog>
        `;
    }

    private _inviteeBody() {
        const { group } = this.invite!;
        const { _valid } = this;
        return html`
            <div class="invite-text">
                ${$l(
                    "You've been invited to join the {0} group. To accept the invite, " +
                        "please enter the confirmation code:",
                    group!.name
                )}
            </div>

            <pl-input
                class="code-input tiles-2"
                id="codeInput"
                disabled?="${!_valid}"
                label="${$l("Enter Confirmation Code")}">
            </pl-input>

            <div class="invite-text small">
                ${$l(
                    "If you haven't received the confirmation code yet, please ask an " +
                        "admin of the group to provide it to you!"
                )}
            </div>
        `;
    }

    _inviteeActions() {
        return html`
            <pl-loading-button
                id="acceptButton"
                class="tap"
                disabled?="${!this._valid}"
                on-click="${() => this._accept()}">
                ${$l("Accept")}
            </pl-loading-button>
        `;
    }

    _adminBody() {
        const { email, secret } = this.invite!;
        return html`
                <div class="invite-text">${$l("An invite was sent to:")}</div>

                <div class="invite-email">${email}</div>

                <div class="invite-text">
                    ${$l(
                        "They will also need the following confirmation code, which " +
                            "you should communicate to them separately:"
                    )}
                </div>

                <div class="invite-code">${secret}</div>
        `;
    }

    _adminActions() {
        return html`
            <pl-loading-button
                id="resendButton"
                class="tap"
                on-click="${() => this._resend()}">

                <pl-icon icon="mail"></pl-icon>

                <div>${$l("Resend")}</div>

            </pl-loading-button>

            <pl-loading-button
                id="cancelButton"
                class="tap"
                disabled?="${!this._valid}"
                on-click="${() => this._cancel()}">

                <pl-icon icon="cancel"></pl-icon>

                <div>${$l("Cancel")}</div>

            </pl-loading-button>
        `;
    }

    private _done() {
        this._resolve && this._resolve();
        this._resolve = null;
        this._dialog.open = false;
    }

    private async _cancel() {
        this._cancelButton.start();
        try {
            await app.cancelInvite(this.invite!);
            this._cancelButton.success();
        } catch (e) {
            this._cancelButton.fail();
            throw e;
        }
        this._done();
    }

    private async _resend() {
        this._resendButton.start();
        const store = await app.getStore(this.invite!.group!.id);
        try {
            this.invite = await app.createInvite(store!, this.invite!.email);
            this._resendButton.success();
        } catch (e) {
            this._resendButton.fail();
            throw e;
        }
    }

    private async _accept() {
        this._acceptButton.start();
        try {
            await app.acceptInvite(this.invite!, this._codeInput.value);
            this._acceptButton.success();
        } catch (e) {
            this._acceptButton.fail();
        }
    }
}
