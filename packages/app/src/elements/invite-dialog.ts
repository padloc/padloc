import { until } from "lit-html/directives/until.js";
import { Invite } from "@padloc/core/lib/invite.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { formatDateFromNow } from "../util.js";
import { app } from "../init";
import { shared } from "../styles";
import { alert, dialog } from "../dialog.js";
import { element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";
import { LoadingButton } from "./loading-button.js";
import { Input } from "./input.js";
import { MemberDialog } from "./member-dialog.js";

@element("pl-invite-dialog")
export class InviteDialog extends Dialog<Invite, void> {
    @property()
    invite: Invite | null = null;

    @query("#acceptButton")
    private _acceptButton: LoadingButton;
    @query("#resendButton")
    private _resendButton: LoadingButton;
    @query("#deleteButton")
    private _deleteButton: LoadingButton;
    @query("#confirmButton")
    private _confirmButton: LoadingButton;
    @query("#codeInput")
    private _codeInput: Input;

    @dialog("pl-member-dialog")
    private _memberDialog: MemberDialog;

    @property()
    private _verified: boolean | undefined;
    @property()
    private _errorMessage: string = "";

    private get _enableActions(): boolean {
        return !!this.invite && !this.invite.expired && !this.invite.accepted && this._verified !== false;
    }

    async show(invite: Invite): Promise<void> {
        this._errorMessage = "";
        this.invite = invite;
        this._verified = await invite.verify();
        return super.show();
    }

    shouldUpdate() {
        return !!this.invite;
    }

    renderContent() {
        const { email, expires, expired, org, accepted, purpose } = this.invite!;
        const forMe = email === app.account!.email;

        const status =
            this._verified === false
                ? { icon: "error", class: "warning", text: $l("The invite could not be validated.") }
                : expired
                ? { icon: "time", class: "warning", text: $l("This invite has expired") }
                : accepted
                ? { icon: "check", class: "", text: $l("Accepted") }
                : {
                      icon: "time",
                      class: "",
                      text: until(
                          (async () => {
                              return $l("expires {0}", await formatDateFromNow(expires));
                          })()
                      )
                  };

        return html`
            ${shared}

            <style>
                :host {
                    text-align: center;
                }

                h1 {
                    display: block;
                    text-align: center;
                }

                .invite {
                    overflow: hidden;
                }

                .invite-text {
                    font-size: var(--font-size-small);
                    margin: 20px;
                }

                .invite-text.small {
                    font-size: var(--font-size-tiny);
                }

                .invite-text.error {
                    color: var(--color-error);
                    text-shadow: none;
                    font-weight: bold;
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

                .tag.org {
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

            <div class="invite">
                <pl-icon icon="cancel" class="tap close-button" @click=${() => this.done()}></pl-icon>

                <h1>${purpose === "confirm_membership" ? $l("Confirm Membership") : $l("Organization Invite")}</h1>

                <div class="tags">
                    <div class="tag org highlight">
                        <pl-icon icon="org"></pl-icon>

                        <div>${org!.name}</div>
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

                <div class="actions">
                    ${forMe ? this._inviteeActions() : this._adminActions()}
                </div>
            </div>
        `;
    }

    private _inviteeBody() {
        const { org, purpose } = this.invite!;
        const { _enableActions } = this;
        return html`
            <div class="invite-text">
                ${$l(
                    purpose === "confirm_membership"
                        ? "Please confirm your membership for the {0} organization."
                        : "You've been invited to join the {0} organization.",
                    org!.name
                )}
            </div>

            <pl-input
                class="code-input tiles-2"
                id="codeInput"
                ?hidden=${!_enableActions}
                @enter=${() => this._accept()}
                label="${$l("Enter Confirmation Code")}"
            >
            </pl-input>

            <div class="invite-text error" ?hidden=${!this._errorMessage}>
                ${this._errorMessage}
            </div>

            <div class="invite-text small" ?hidden=${!_enableActions}>
                ${$l(
                    "If you haven't received the confirmation code yet, please ask an " +
                        "admin of the organization to provide it to you!"
                )}
            </div>
        `;
    }

    _inviteeActions() {
        return html`
            <pl-loading-button
                id="acceptButton"
                class="tap primary"
                ?hidden=${!this._enableActions}
                @click=${() => this._accept()}
            >
                ${$l(this.invite!.purpose === "confirm_membership" ? "Confirm" : "Accept")}
            </pl-loading-button>
        `;
    }

    _adminBody() {
        const { _enableActions } = this;
        const { email, secret, purpose } = this.invite!;
        return html`
            <div class="invite-text">
                ${$l(
                    purpose === "confirm_membership"
                        ? "A membership confirmation request was sent to:"
                        : "An invite was sent to:"
                )}
            </div>

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
        const { accepted, expired, purpose } = this.invite!;
        return html`
            <pl-loading-button
                ?hidden=${!accepted}
                ?disabled=${!accepted || expired || !this._verified}
                id="confirmButton"
                class="tap primary"
                @click=${() => this._confirm()}
            >
                <pl-icon icon="invite"></pl-icon>

                <div>${$l(purpose === "confirm_membership" ? "Confirm Member" : "Add Member")}</div>
            </pl-loading-button>

            <pl-loading-button id="deleteButton" class="tap negative" @click=${() => this._delete()}>
                <pl-icon icon="delete"></pl-icon>

                <div>${$l("Delete")}</div>
            </pl-loading-button>

            <pl-loading-button ?hidden=${accepted} id="resendButton" class="tap" @click=${() => this._resend()}>
                <pl-icon icon="mail"></pl-icon>

                <div>${$l("Resend")}</div>
            </pl-loading-button>
        `;
    }

    private async _delete() {
        if (this._deleteButton.state === "loading") {
            return;
        }
        this._deleteButton.start();
        try {
            await app.deleteInvite(this.invite!);
            this._deleteButton.success();
            this.done();
        } catch (e) {
            this._deleteButton.fail();
            throw e;
        }
        this.done();
    }

    private async _resend() {
        if (this._resendButton.state === "loading") {
            return;
        }
        this._resendButton.start();
        let org = app.getOrg(this.invite!.org!.id)!;
        try {
            await app.deleteInvite(this.invite!);
            this.invite = await app.createInvite(org!, this.invite!.email, this.invite!.purpose);
            this._verified = await this.invite.verify();
            this._resendButton.success();
        } catch (e) {
            this._resendButton.fail();
            throw e;
        }
    }

    private async _accept() {
        if (this._acceptButton.state === "loading") {
            return;
        }

        if (!this._codeInput.value) {
            this._errorMessage = $l("Please enter a confirmation code!");
            this.rumble();
            return;
        }

        this._acceptButton.start();
        try {
            const success = await app.acceptInvite(this.invite!, this._codeInput.value.toLowerCase());
            if (success) {
                this._acceptButton.success();
                this.done();
                alert(
                    $l(
                        "You have successfully accepted the invite. You'll be notified once you've been granted access."
                    ),
                    { type: "success" }
                );
            } else {
                this._acceptButton.fail();
                this._errorMessage = $l("Wrong confirmation code. Please try again!");
                this.rumble();
                return;
            }
        } catch (e) {
            this._acceptButton.fail();
            this._errorMessage = e.message || $l("Something went wrong. Please try again later!");
            this.rumble();
        }
    }

    private async _confirm() {
        if (this._confirmButton.state === "loading") {
            return;
        }
        this._confirmButton.start();
        try {
            const member = await app.confirmInvite(this.invite!);
            this._confirmButton.success();

            this.open = false;

            await this._memberDialog.show({ org: app.getOrg(this.invite!.org!.id)!, member });

            this.done();
        } catch (e) {
            this._confirmButton.fail();
            throw e;
        }
    }
}
