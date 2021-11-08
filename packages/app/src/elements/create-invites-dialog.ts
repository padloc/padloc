import { translate as $l } from "@padloc/locale/src/translate";
import { Org } from "@padloc/core/src/org";
import { Invite } from "@padloc/core/src/invite";
import { app } from "../globals";
import { Input } from "./input";
import { Dialog } from "./dialog";
import { Button } from "./button";
import "./icon";
import { customElement, query, state } from "lit/decorators.js";
import { css, html } from "lit";

@customElement("pl-create-invites-dialog")
export class CreateInvitesDialog extends Dialog<Org, Invite[]> {
    @state()
    private _emails: string[] = [];

    @state()
    private _error: string = "";

    private _org: Org;

    private _maxEmails = 50;

    @query("pl-input")
    private _emailInput: Input;

    @query("#submitButton")
    private _submitButton: Button;

    private _isValid(email: string) {
        return /\S+@\S+\.\S+/.test(email);
    }

    private _input() {
        const emails = this._emailInput.value.split(/[,;\s]+/);
        this._emails = [...new Set([...this._emails, ...emails.slice(0, -1).filter((e) => !!e)])];
        this._emailInput.value = emails[emails.length - 1];
        this.requestUpdate();
    }

    private _enter() {
        const emails = this._emailInput.value.split(/[,;\s]+/);
        this._emails = [...new Set([...this._emails, ...emails.filter((e) => !!e)])];
        this._emailInput.value = "";
        this.requestUpdate();
    }

    private _keydown(e: KeyboardEvent) {
        if (e.key === "Backspace" && !this._emailInput.value) {
            this._emails.pop();
            this.requestUpdate();
        }
    }

    private _remove(email: string) {
        this._emails = this._emails.filter((e) => e !== email);
    }

    private async _submit() {
        if (this._submitButton.state === "loading") {
            return;
        }

        if (!this._emails.length) {
            this._error = $l("Please enter at least one email address!");
            this.rumble();
            return;
        }

        if (this._emails.length > this._maxEmails) {
            this._error = $l("You have entered too many email addresses! Please delete some before submitting!");
            this.rumble();
            return;
        }

        if (this._emails.some((email) => !this._isValid(email))) {
            this._error = $l("Some of the emails you entered appear to be invalid!");
            this.rumble();
            return;
        }

        this._error = "";

        this._submitButton.start();

        try {
            const invites = await app.createInvites(this._org, this._emails);
            this._submitButton.success();
            this.done(invites);
        } catch (e) {
            this._error = e.message || $l("Something went wrong! Please try again later!");
            this._submitButton.fail();
            this.rumble();
        }
    }

    async show(org: Org) {
        this._org = org;
        this._emails = [];
        this._error = "";
        return super.show();
    }

    static styles = [
        ...Dialog.styles,
        css`
            pl-input {
                flex-wrap: wrap;
                padding: 0.2em 0.7em 0.7em 0.7em;
                --input-padding: 0.5em 0 0 0;
            }

            .tag {
                margin-top: 0.5em;
            }

            .tag pl-button {
                margin: -0.2em -0.3em -0.2em 0.3em;
            }

            .email-count {
                font-weight: bold;
                position: absolute;
                bottom: var(--spacing);
                right: var(--spacing);
                margin: 0;
                font-size: var(--font-size-small);
            }

            .email-count[warning] {
                color: var(--color-negative);
            }
        `,
    ];

    renderContent() {
        return html`
            <h1 class="big padded text-centering">${$l("Invite New Members")}</h1>

            <div class="small subtle text-centering horizontally-padded">
                ${$l(
                    "Please enter up to {0} email addresses of the persons you would like to invite, separated by spaces or commas!",
                    this._maxEmails.toString()
                )}
            </div>

            <pl-input
                class="small margined"
                .placeholder=${$l("Enter Email Address")}
                type="email"
                @enter=${this._enter}
                @input=${this._input}
                @blur=${this._enter}
                @keydown=${this._keydown}
            >
                <div class="horizontal wrapping layout" slot="above">
                    ${this._emails.map(
                        (email) => html`
                            <div
                                class="small center-aligning horizontal layout tag ${this._isValid(email)
                                    ? ""
                                    : "warning"}"
                            >
                                <div>${email}</div>
                                <pl-button class="small skinny transparent" @click=${() => this._remove(email)}>
                                    <pl-icon icon="cancel"></pl-icon>
                                </pl-button>
                            </div>
                        `
                    )}
                </div>

                <div class="email-count" ?warning=${this._emails.length > this._maxEmails} slot="after">
                    ${this._emails.length}/${this._maxEmails}
                </div>
            </pl-input>

            <div class="margined padded inverted red card" ?hidden=${!this._error}>${this._error}</div>

            <div class="padded spacing horizontal evenly stretching layout">
                <pl-button id="submitButton" @click=${this._submit} class="primary"> ${$l("Submit")} </pl-button>
                <pl-button @click=${this.dismiss}>${$l("Cancel")}</pl-button>
            </div>
        `;
    }
}
