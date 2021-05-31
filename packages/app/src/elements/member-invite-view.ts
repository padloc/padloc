import { until } from "lit/directives/until";
import { translate as $l } from "@padloc/locale/src/translate";
import { formatDateFromNow } from "../lib/util";
import { shared } from "../styles";
import { app } from "../globals";
import { alert } from "../lib/dialog";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { Button } from "./button";
import { Input } from "./input";
import "./icon";
import "./scroller";
import { customElement, property, query } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

@customElement("pl-invite-view")
export class InviteView extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/invites(?:\/([^\/]+))?/;

    @property()
    inviteId: string;

    @property()
    orgId: string;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    private get _invite() {
        return this._org && this._org.getInvite(this.inviteId);
    }

    private get _enableActions(): boolean {
        return !!this._invite && !this._invite.expired && !this._invite.accepted;
    }

    @query("#acceptButton")
    private _acceptButton: Button;

    @query("#resendButton")
    private _resendButton: Button;

    @query("#deleteButton")
    private _deleteButton: Button;

    @query("#confirmButton")
    private _confirmButton: Button;

    @query("#codeInput")
    private _codeInput: Input;

    handleRoute([orgId, inviteId]: [string, string]) {
        this.orgId = orgId;
        this.inviteId = inviteId;
    }

    static styles = [
        shared,
        css`
            :host {
                position: relative;
                background: var(--color-background);
            }
        `,
    ];

    private async _delete() {
        if (this._deleteButton.state === "loading") {
            return;
        }
        this._deleteButton.start();
        try {
            await app.deleteInvite(this._invite!);
            this._deleteButton.success();
        } catch (e) {
            this._deleteButton.fail();
            alert(e.message, { type: "warning" });
        }
    }

    private async _resend() {
        if (this._resendButton.state === "loading") {
            return;
        }
        this._resendButton.start();
        let org = app.getOrg(this._invite!.org!.id)!;
        try {
            await app.deleteInvite(this._invite!);
            const newInvite = (await app.createInvites(org!, [this._invite!.email], this._invite!.purpose))[0];
            this.go(`orgs/${this.orgId}/invites/${newInvite.id}`, undefined, true);
            this._resendButton.success();
        } catch (e) {
            this._resendButton.fail();
            alert(e.message, { type: "warning" });
        }
    }

    private async _accept() {
        if (this._acceptButton.state === "loading") {
            return;
        }

        if (!this._codeInput.value) {
            alert($l("Please enter a confirmation code!"));
            return;
        }

        this._acceptButton.start();
        try {
            const success = await app.acceptInvite(this._invite!, this._codeInput.value.toLowerCase());
            if (success) {
                this._acceptButton.success();
                alert(
                    $l(
                        "You have successfully accepted the invite. You'll be notified once you've been granted access."
                    ),
                    { type: "success" }
                );
            } else {
                this._acceptButton.fail();
                alert($l("Wrong confirmation code. Please try again!"));
                return;
            }
        } catch (e) {
            this._acceptButton.fail();
            alert(e.message, { type: "warning" });
        }
    }

    private async _confirm() {
        if (this._confirmButton.state === "loading") {
            return;
        }
        this._confirmButton.start();
        try {
            const member = await app.confirmInvite(this._invite!);
            this._confirmButton.success();

            this.go(`orgs/${this.orgId}/members/${member.id}`);
        } catch (e) {
            this._confirmButton.fail();
            alert(e.message, { type: "warning" });
            throw e;
        }
    }

    render() {
        const { email, expires, expired, org, accepted, purpose } = this._invite!;
        const forMe = email === app.account!.email;

        const status = expired
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
                  ),
              };

        return html`
            <div class="fullbleed vertical layout">
                <header class="padded horizontal center-aligning layout">
                    <div class="stretch large padded">
                        ${purpose === "confirm_membership" ? $l("Membership Confirmation") : $l("Organization Invite")}
                    </div>
                </header>

                ${org.name}

                <ptc-scroller class="stretch">
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

                    ${this._inviteeBody()}

                    <div class="actions">${forMe ? this._inviteeActions() : this._adminActions()}</div>
                </ptc-scroller>
            </div>
        `;
    }

    private _inviteeBody() {
        const { org, purpose } = this._invite!;
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

            <div class="invite-text small" ?hidden=${!_enableActions}>
                ${$l(
                    "If you haven't received the confirmation code yet, please ask the organization owner " +
                        "to provide it to you!"
                )}
            </div>
        `;
    }

    _inviteeActions() {
        return html`
            <pl-button
                id="acceptButton"
                class="tap primary"
                ?hidden=${!this._enableActions}
                @click=${() => this._accept()}
            >
                ${$l(this._invite!.purpose === "confirm_membership" ? "Confirm" : "Accept")}
            </pl-button>
        `;
    }

    _adminBody() {
        const { _enableActions } = this;
        const { email, secret, purpose } = this._invite!;
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
        const { accepted, expired, purpose } = this._invite!;
        return html`
            <pl-button
                ?hidden=${!accepted}
                ?disabled=${!accepted || expired}
                id="confirmButton"
                class="tap primary"
                @click=${() => this._confirm()}
            >
                <pl-icon icon="invite"></pl-icon>

                <div>${$l(purpose === "confirm_membership" ? "Confirm" : "Add Member")}</div>
            </pl-button>

            <pl-button id="deleteButton" class="tap negative" @click=${() => this._delete()}>
                <pl-icon icon="delete"></pl-icon>

                <div>${$l("Delete")}</div>
            </pl-button>

            <pl-button ?hidden=${accepted} id="resendButton" class="tap" @click=${() => this._resend()}>
                <pl-icon icon="mail"></pl-icon>

                <div>${$l("Resend")}</div>
            </pl-button>
        `;
    }
}
