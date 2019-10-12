import { translate as $l } from "@padloc/locale/src/translate";
import { Org } from "@padloc/core/src/org";
import { Invite } from "@padloc/core/src/invite";
import { app } from "../globals";
import { element, property, html, css, query } from "./base";
import { Input } from "./input";
import { Dialog } from "./dialog";
import { LoadingButton } from "./loading-button";
import "./icon";

@element("pl-create-invites-dialog")
export class CreateInvitesDialog extends Dialog<Org, Invite[]> {
    @property()
    private _emails: string[] = [];

    @property()
    private _error: string = "";

    private _org: Org;

    private _maxEmails = 50;

    @query("pl-input")
    private _emailInput: Input;

    @query("#submitButton")
    private _submitButton: LoadingButton;

    private _isValid(email: string) {
        return /\S+@\S+\.\S+/.test(email);
    }

    private _input() {
        const emails = this._emailInput.value.split(/[,;\s]+/);
        this._emails = [...new Set([...this._emails, ...emails.slice(0, -1).filter(e => !!e)])];
        this._emailInput.value = emails[emails.length - 1];
        this.requestUpdate();
    }

    private _enter() {
        const emails = this._emailInput.value.split(/[,;\s]+/);
        this._emails = [...new Set([...this._emails, ...emails.filter(e => !!e)])];
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
        this._emails = this._emails.filter(e => e !== email);
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

        if (this._emails.some(email => !this._isValid(email))) {
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
            :host {
                text-align: center;
            }

            .inner {
                background: var(--color-quaternary);
            }

            .message {
                font-size: var(--font-size-small);
                margin: 0px 20px 8px 20px;
            }

            .tags {
                flex-wrap: wrap;
                margin: 8px;
                padding: 12px 12px 6px 12px;
                justify-content: center;
                position: relative;
            }

            .tags > * {
                margin-bottom: 6px;
            }

            .tag > pl-icon {
                font-size: var(--font-size-micro);
                margin: 0 -3px 0 0;
            }

            pl-input {
                text-align: left;
                background: transparent;
                font-size: var(--font-size-small);
                padding: 4px 8px;
            }

            .email-count {
                font-weight: bold;
                position: absolute;
                bottom: 8px;
                right: 8px;
                margin: 0;
                font-size: var(--font-size-tiny);
            }

            .email-count[warning] {
                color: var(--color-negative);
            }

            .error.item {
                padding: 8px;
                color: var(--color-negative);
            }
        `
    ];

    renderContent() {
        return html`
            <h1>${$l("Invite New Members")}</h1>

            <div class="message">
                ${$l(
                    "Please enter up to {0} email addresses of the persons you would like to invite, separated by spaces or commas!",
                    this._maxEmails.toString()
                )}
            </div>

            <div class="tags item" @click=${() => this._emailInput.focus()}>
                ${this._emails.map(
                    email => html`
                        <div class="tag ${this._isValid(email) ? "" : "warning"}">
                            <div>${email}</div>
                            <pl-icon icon="cancel" class="tap" @click=${() => this._remove(email)}></pl-icon>
                        </div>
                    `
                )}

                <pl-input
                    .placeholder=${$l("Enter Email Address")}
                    type="email"
                    @enter=${this._enter}
                    @input=${this._input}
                    @blur=${this._enter}
                    @keydown=${this._keydown}
                ></pl-input>

                <div class="email-count" ?warning=${this._emails.length > this._maxEmails}>
                    ${this._emails.length}/${this._maxEmails}
                </div>
            </div>

            <div class="item error" ?hidden=${!this._error}>${this._error}</div>

            <div class="actions">
                <pl-loading-button id="submitButton" @click=${this._submit} class="primary tap">
                    ${$l("Submit")}
                </pl-loading-button>
                <button @click=${this.dismiss} class="tap">
                    ${$l("Cancel")}
                </button>
            </div>
        `;
    }
}
