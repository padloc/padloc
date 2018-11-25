import { localize as $l } from "@padlock/core/lib/locale.js";
import { ErrorCode } from "@padlock/core/lib/error.js";
import { app } from "../init.js";
import { element, html, query } from "./base.js";
import { StartForm, sharedStyles } from "./start-form.js";
import { Input } from "./input.js";
import { LoadingButton } from "./loading-button.js";
import { alert } from "../dialog.js";
import "./logo.js";

@element("pl-login")
export class Login extends StartForm {
    @query("#emailInput")
    private _emailInput: Input;
    @query("#passwordInput")
    private _passwordInput: Input;
    @query("#loginButton")
    private _loginButton: LoadingButton;

    async reset() {
        await this.updateComplete;
        this._emailInput.value = (this.invite && this.invite.email) || "";
        this._emailInput.checkValidity();
        this._passwordInput.value = "";
        this._loginButton.stop();
        super.reset();
    }

    render() {
        return html`
            ${sharedStyles}

            <style>
                .hint {
                    font-size: var(--font-size-tiny);
                    box-sizing: border-box;
                    transition: max-height 0.3s;
                    max-height: 100px;
                    margin: 40px 0 -20px 0;
                }

                button.signup {
                    background: none;
                    border: none;
                    height: auto;
                    line-height: normal;
                    font-weight: bold;
                    height: var(--row-height);
                }
            </style>

            <div flex></div>

            <form>

                <pl-logo class="animate"></pl-logo>

                <pl-input
                    id="emailInput"
                    type="email"
                    required
                    .label=${$l("Email Adress")}
                    class="tiles-2 animate tap"
                    @enter=${() => this._submit()}>
                </pl-input>

                <pl-input
                    id="passwordInput"
                    type="password"
                    required
                    .label=${$l("Master Password")}
                    class="tiles-2 animate tap"
                    @enter=${() => this._submit()}>
                </pl-input>

                <pl-loading-button id="loginButton" class="tap tiles-3 animate" @click=${() => this._submit()}>
                    ${$l("Login")}
                </pl-loading-button>

                <div class="hint animate">
                    ${$l("New to Padlock?")}
                </div>

                <button
                    type="button"
                    class="tap signup animate"
                    @click=${() => this.dispatch("signup")}>
                        ${$l("Sign Up Now")}
                </button>

            </form>

            <div flex></div>
        `;
    }

    private async _submit() {
        if (this._loginButton.state === "loading") {
            return;
        }

        this._emailInput.blur();
        this._passwordInput.blur();

        if (this._emailInput.invalid) {
            await alert(this._emailInput.validationMessage || $l("Please enter a valid email address!"), {
                type: "warning"
            });
            return;
        }

        if (!this._passwordInput.value) {
            await alert($l("Please enter a master password!"), { type: "warning" });
            return;
        }

        this._loginButton.start();
        try {
            await app.login(this._emailInput.value, this._passwordInput.value);
            this._loginButton.success();
            this.done();
        } catch (e) {
            this._loginButton.fail();
            if (e.code !== ErrorCode.INVALID_CREDENTIALS) {
                throw e;
            }
            alert($l("Wrong username or password. Please try again!"), { type: "warning" });
        }
    }
}
