import { localize as $l } from "@padloc/core/lib/locale.js";
import { ErrorCode } from "@padloc/core/lib/error.js";
import { app, router } from "../init.js";
import { element, html, property, query } from "./base.js";
import { StartForm, sharedStyles } from "./start-form.js";
import { Input } from "./input.js";
import { PasswordInput } from "./password-input.js";
import { LoadingButton } from "./loading-button.js";
import { confirm } from "../dialog.js";
import "./logo.js";

@element("pl-login")
export class Login extends StartForm {
    @property()
    private _errorMessage: string;

    private get _email() {
        return router.params.email || "";
    }

    @query("#emailInput")
    private _emailInput: Input;
    @query("#passwordInput")
    private _passwordInput: PasswordInput;
    @query("#loginButton")
    private _loginButton: LoadingButton;

    private _failedCount = 0;

    async reset() {
        await this.updateComplete;
        this._passwordInput.value = "";
        this._loginButton.stop();
        this._failedCount = 0;
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
                    select-on-focus
                    .label=${$l("Email Adress")}
                    .value=${this._email}
                    class="animate tap"
                    @enter=${() => this._submit()}
                >
                </pl-input>

                <pl-password-input
                    id="passwordInput"
                    required
                    select-on-focus
                    .label=${$l("Master Password")}
                    class="animate tap"
                    @enter=${() => this._submit()}
                >
                </pl-password-input>

                <pl-loading-button id="loginButton" class="tap animate" @click=${() => this._submit()}>
                    ${$l("Login")}
                </pl-loading-button>

                <div class="error note" ?hidden=${!this._errorMessage}>${this._errorMessage}</div>

                <div class="hint animate">
                    ${$l("New to Padlock?")}
                </div>

                <button type="button" class="tap signup animate" @click=${() => router.go("signup")}>
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

        const email = this._emailInput.value;
        const password = this._passwordInput.value;

        if (this._emailInput.invalid) {
            this._errorMessage = $l("Please enter a valid email address!");
            this.rumble();
            this._emailInput.focus();
            return;
        }

        if (!password) {
            this._errorMessage = $l("Please enter your master password!");
            this.rumble();
            this._passwordInput.focus();
            return;
        }

        this._errorMessage = "";
        this._loginButton.start();
        try {
            await app.login(email, password);
            this._loginButton.success();
            this.done();
        } catch (e) {
            this._loginButton.fail();
            if (e.code !== ErrorCode.INVALID_CREDENTIALS) {
                throw e;
            }
            this._errorMessage = $l("Wrong username or password. Please try again!");
            this.rumble();

            this._failedCount++;
            if (this._failedCount > 2) {
                const recover = await confirm(
                    $l("Can't remember your master password?"),
                    $l("Recover Account"),
                    $l("Try Again")
                );
                if (recover) {
                    router.go("recover", { email });
                }
            } else {
                this._passwordInput.focus();
            }
        }
    }
}
