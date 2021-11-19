import { until } from "lit/directives/until";
import { translate as $l } from "@padloc/locale/src/translate";
import { Invite } from "@padloc/core/src/invite";
import { formatDateFromNow } from "../lib/util";
import { shared } from "../styles";
import { app } from "../globals";
import { alert, confirm } from "../lib/dialog";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { Button } from "./button";
import { Input } from "./input";
import "./icon";
import "./scroller";
import "./spinner";
import { customElement, query, state } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

@customElement("pl-invite-recipient")
export class InviteRecipient extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^invite\/([^\/]+)\/([^\/]+)/;

    @state()
    private _invite: Invite | null = null;

    @state()
    private _loading = false;

    @query("#submitButton")
    private _submitButton: Button;

    @query("#codeInput")
    private _codeInput: Input;

    async handleRoute([orgId, inviteId]: [string, string]) {
        if (!app.account) {
            return;
        }
        this._loading = true;
        try {
            this._invite = await app.getInvite(orgId, inviteId);
            if (this._invite && this._invite.email !== app.account.email) {
                this.redirect(`orgs/${orgId}/invites/${inviteId}`);
            }
        } catch (e) {
            this._invite = null;
        }
        this._loading = false;
    }

    private async _submit() {
        if (this._submitButton.state === "loading") {
            return;
        }

        if (!this._codeInput.value) {
            alert($l("Please enter a confirmation code!"));
            return;
        }

        this._submitButton.start();
        try {
            const success = await app.acceptInvite(this._invite!, this._codeInput.value.toLowerCase());
            if (success) {
                this._submitButton.success();
                await alert(
                    $l(
                        "You have successfully accepted the invite. You'll be notified once you've been granted access."
                    ),
                    { type: "success", title: $l("Invite Accepted") }
                );
                this.go("");
            } else {
                this._submitButton.fail();
                alert($l("Wrong confirmation code. Please try again!"));
                return;
            }
        } catch (e) {
            this._submitButton.fail();
            alert(e.message || $l("Something went wrong. Please try again later!"), { type: "warning" });
        }
    }

    private async _dismiss() {
        if (
            await confirm($l("Are you sure you want to dismiss this invite?"), $l("Dismiss"), $l("Cancel"), {
                title: $l("Dismiss Invite"),
            })
        ) {
            this.go("");
        }
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

    render() {
        if (this._loading) {
            return html`<div class="fullbleed centering layout">
                <pl-spinner active></pl-spinner>
            </div>`;
        }

        if (!this._invite) {
            return html` <div class="fullbleed vertical layout">
                <header class="padded horizontal center-aligning layout">
                    <pl-button class="transparent slim back-button" @click=${() => this.go("")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>

                    <div class="stretch large padded">${$l("Invite")}</div>
                </header>
                <div class="centering layout stretch">${$l("Invite not found.")}</div>
            </div>`;
        }

        const { expires, expired, accepted, purpose } = this._invite!;

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
                    <pl-button class="transparent slim back-button" @click=${() => this.go("")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>

                    <div class="stretch large padded">${$l("Invite")}</div>

                    <div class="small tag ${status.class}">
                        <pl-icon icon="${status.icon}" class="inline"></pl-icon>
                        ${status.text}
                    </div>
                </header>

                <pl-scroller class="stretch">
                    <div class="center-aligning vertical layout">
                        <div class="max-width-30em">
                            <div class="large spacer"></div>

                            <div class="margined text-centering">
                                ${purpose === "confirm_membership"
                                    ? $l("You've been requested to confirm your membership with")
                                    : $l("You've been invited to join")}
                            </div>

                            <div class="bold big margined centering layout">
                                <div class="tag highlight">
                                    <pl-icon icon="members" class="large"></pl-icon>
                                    <div>${this._invite.org.name}</div>
                                </div>
                            </div>

                            ${accepted || expired
                                ? html`
                                      <div class="double-margined padded red card">
                                          ${accepted
                                              ? $l("You have already accepted this invite!")
                                              : $l("This invite has expired!")}
                                      </div>

                                      <pl-button class="margined" @click=${() => this.go("")}>
                                          ${$l("Dismiss")}
                                      </pl-button>
                                  `
                                : html`
                                      <div class="double-margined text-centering">
                                          ${$l(
                                              "Please enter the confirmation code provided to you by the organization owner!"
                                          )}
                                      </div>

                                      <pl-input
                                          id="codeInput"
                                          class="large margined mono"
                                          .label=${$l("Confirmation Code")}
                                      >
                                      </pl-input>

                                      <div class="horziontal margined evenly stretching spacing horizontal layout">
                                          <pl-button id="submitButton" class="primary" @click=${this._submit}>
                                              ${$l("Submit")}
                                          </pl-button>
                                          <pl-button @click=${this._dismiss}> ${$l("Dismiss")} </pl-button>
                                      </div>
                                  `}
                        </div>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
