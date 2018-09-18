import { Invite } from "@padlock/core/lib/invite.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { formatDateFromNow } from "@padlock/core/lib/util.js";
import { app } from "../init";
import { shared, mixins } from "../styles";
import { alert } from "../dialog.js";
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
    @query("#deleteButton") private _deleteButton: LoadingButton;
    @query("#codeInput") private _codeInput: Input;

    private _resolve: (() => void) | null;
    @property() private _verified: boolean | undefined;

    private get _enableActions(): boolean {
        return !!this.invite && !this.invite.expired && !this.invite.accepted && this._verified !== false;
    }

    async show(invite: Invite): Promise<void> {
        this.invite = invite;
        this._verified = await invite.verify();
        this.requestUpdate();
        await this.updateComplete;
        this._dialog.open = true;
        return new Promise<void>(resolve => {
            this._resolve = resolve;
        });
    }

    shouldUpdate() {
        return !!this.invite;
    }

    render() {
        const { email, expires, expired, group, accepted } = this.invite!;
        const forMe = email === app.account!.email;

        const status =
            this._verified === false
                ? { icon: "error", class: "warning", text: $l("The invite could not be validated.") }
                : expired
                    ? { icon: "time", class: "warning", text: $l("This invite has expired") }
                    : accepted
                        ? { icon: "check", class: "", text: $l("You have accepted the invite.") }
                        : { icon: "time", class: "", text: $l("expires {0}", formatDateFromNow(expires)) };

        return html`
            ${shared}

            <style>
                :host {
                    text-align: center;
                }

                .invite {
                    overflow: hidden;
                    ${mixins.gradientHighlight()}
                }

                .invite-text {
                    font-size: var(--font-size-small);
                    margin: 20px;
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

            <pl-dialog @dialog-dismiss=${() => this._done()}>
                <div class="invite">

                    <pl-icon icon="cancel" class="tap close-button" @click=${() => this._done()}></pl-icon>

                    <h1>${$l("Group Invite")}</h1>

                    <div class="tags">

                        <div class="tag group">

                            <pl-icon icon="group"></pl-icon>

                            <div>${group!.name}</div>

                        </div>

                    </div>

                    ${forMe ? this._inviteeBody() : this._adminBody()}

                    <div class="tags">

                        <div class="tag ${status.class}">

                            <pl-icon icon="${status.icon}"></pl-icon>

                            <div>${status.text}</div>

                        </div>

                    </div>

                    <div class="invite-text" ?hidden=${!forMe || !accepted}>
                        ${$l(
                            "Please wait for an admin to complete the process. " +
                                "You will be notified as soon as you receive access."
                        )}
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
        const { _enableActions } = this;
        return html`
            <div class="invite-text">
                ${$l("You've been invited to join the {0} group.", group!.name)}
            </div>

            <pl-input
                class="code-input tiles-2"
                id="codeInput"
                ?hidden=${!_enableActions}
                @enter=${() => this._accept()}
                label="${$l("Enter Confirmation Code")}">
            </pl-input>

            <div class="invite-text small" ?hidden=${!_enableActions}>
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
                ?hidden=${!this._enableActions}
                @click=${() => this._accept()}>
                ${$l("Accept")}
            </pl-loading-button>
        `;
    }

    _adminBody() {
        const { _enableActions } = this;
        const { email, secret } = this.invite!;
        return html`
            <div class="invite-text">${$l("An invite was sent to:")}</div>

            <div class="invite-email">${email}</div>

            <div class="invite-text" ?hidden=${!_enableActions}>
                ${$l(
                    "They will also need the following confirmation code, which " +
                        "you should communicate to them separately:"
                )}
            </div>

            <div class="invite-code" ?hidden=${!_enableActions}>${secret}</div>
        `;
    }

    _adminActions() {
        return html`
            <pl-loading-button
                id="resendButton"
                class="tap"
                @click=${() => this._resend()}>

                <pl-icon icon="mail"></pl-icon>

                <div>${$l("Resend")}</div>

            </pl-loading-button>

            <pl-loading-button
                id="deleteButton"
                class="tap"
                @click=${() => this._delete()}>

                <pl-icon icon="delete"></pl-icon>

                <div>${$l("Delete")}</div>

            </pl-loading-button>
        `;
    }

    private _done() {
        this._resolve && this._resolve();
        this._resolve = null;
        this._dialog.open = false;
    }

    private async _delete() {
        this._deleteButton.start();
        try {
            await app.deleteInvite(this.invite!);
            this._deleteButton.success();
            this._done();
        } catch (e) {
            this._deleteButton.fail();
            throw e;
        }
        this._done();
    }

    private async _resend() {
        this._resendButton.start();
        const store = await app.getStore(this.invite!.group!.id);
        try {
            this.invite = await app.createInvite(store!, this.invite!.email);
            this._verified = await this.invite.verify();
            this._resendButton.success();
        } catch (e) {
            this._resendButton.fail();
            throw e;
        }
    }

    private async _accept() {
        this._acceptButton.start();
        const success = await app.acceptInvite(this.invite!, this._codeInput.value.toLowerCase());
        if (success) {
            this._acceptButton.success();
            this._done();
            alert(
                $l("You have successfully accepted the invite. You'll be notified once you've been granted access."),
                { type: "success" }
            );
        } else {
            this._acceptButton.fail();
            this._dialog.open = false;
            await alert($l("Verification failed! Did you enter the correct confirmation code?"), { type: "warning" });
            this._dialog.open = true;
        }
    }
}
