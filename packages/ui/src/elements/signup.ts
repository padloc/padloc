import { localize as $l } from "@padloc/core/lib/locale.js";
import { ErrorCode } from "@padloc/core/lib/error.js";
import { passwordStrength } from "../util.js";
import { app } from "../init.js";
import { element, html, property, query } from "./base.js";
import { StartForm, sharedStyles } from "./start-form.js";
import { Input } from "./input.js";
import { LoadingButton } from "./loading-button.js";
import { alert, choose, prompt } from "../dialog.js";
import "./logo.js";

@element("pl-signup")
export class Signup extends StartForm {
    verificationCode: string;

    @property()
    private _weakPassword = false;

    @query("#emailInput")
    private _emailInput: Input;
    @query("#nameInput")
    private _nameInput: Input;
    @query("#passwordInput")
    private _passwordInput: Input;
    @query("#repeatPasswordInput")
    private _repeatPasswordInput: Input;
    @query("#submitButton")
    private _submitButton: LoadingButton;

    async reset() {
        this._emailInput.value = (this.invite && this.invite.email) || "";
        this._emailInput.checkValidity();
        this._passwordInput.value = "";
        this._repeatPasswordInput.value = "";
        this._submitButton.stop();
        this._weakPassword = false;
        super.reset();
    }

    render() {
        const { _weakPassword } = this;
        return html`
            ${sharedStyles}

            <style include="shared">

                .title {
                    width: 300px;
                    margin: 30px auto;
                    font-size: var(--font-size-small);
                    font-weight: bold;
                    letter-spacing: 0.5px;
                    padding: 0 10px;
                }

                .hint {
                    font-size: var(--font-size-tiny);
                    box-sizing: border-box;
                    max-height: 100px;
                    padding: 0 10px;
                    margin-bottom: 30px;
                    transition: color 0.2s;
                    text-shadow: none;
                }

                .hint.warning {
                    color: var(--color-error);
                    font-weight: bold;
                    margin: 0;
                    padding: 0;
                }

                #submitButton {
                    margin-bottom: 30px;
                }

                .login {
                    text-decoration: underline;
                    cursor: pointer;
                }

                pl-input:not([focused]) + .hint {
                    color: rgba(0, 0, 0, 0.2)
                }
            </style>

            <div flex></div>

            <form>

                <pl-logo class="animate"></pl-logo>

                <div class="title animate">
                    ${$l("Welcome to Padloc! Let's get you started by creating an account for you. Already have one?")}
                    <span class="login" @click=${() => this._login()}>➔ Sign In</span>
                </div>

                <pl-input
                    id="emailInput"
                    type="email"
                    required
                    .label=${$l("Email Address")}
                    class="tiles-2 animate"
                    @enter=${() => this._submit()}>
                </pl-input>

                <div class="hint animate">
                    ${$l(
                        "Your email address serves as your username and allows us to get in touch with you. " +
                            "Don't worry, we would never send you any spam!"
                    )}
                </div>

                <pl-input
                    id="nameInput"
                    .label=${$l("Your Name")}
                    class="tiles-2 animate"
                    @enter=${() => this._submit()}>
                </pl-input>

                <div class="hint animate">
                    ${$l("What should we call you?")}
                </div>

                <pl-input
                    id="passwordInput"
                    type="password"
                    required
                    .label=${$l("Master Password")}
                    class="tiles-2 animate"
                    @change=${() => this._updatePwdStrength()}
                    @enter=${() => this._submit()}>
                </pl-input>

                <div class="hint animate">
                    ${$l(
                        "Your master password is a single passphrase used to protect your data. " +
                            "Without it, nobody will be able to access your data - not even us!"
                    )}
                </div>

                <div class="hint warning animate" ?hidden=${!_weakPassword}>${$l("WARNING: Weak Password!")}</div>

                <pl-input
                    id="repeatPasswordInput"
                    type="password"
                    required
                    .label=${$l("Repeat Master Password")}
                    class="tiles-2 animate"
                    @enter=${() => this._submit()}>
                </pl-input>

                <div class="hint animate">
                    ${$l(
                        "Don't forget your master password! For privacy and security reasons we don't keep " +
                            "a record of you password which means we won't be able to help you recover your " +
                            "data in case you forget it."
                    )}
                </div>

                <pl-loading-button id="submitButton" class="tap tiles-3 animate" @click=${() => this._submit()}>
                    ${$l("Create Account")}
                </pl-loading-button>

            </form>

            <div flex></div>
        `;
    }

    private async _submit() {
        if (this._submitButton.state === "loading") {
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

        if (this._passwordInput.value !== this._repeatPasswordInput.value) {
            await alert($l("You didn't repeat your master password correctly. Try again!"), { type: "warning" });
            return;
        }

        const email = this._emailInput.value;
        const password = this._passwordInput.value;
        const name = this._nameInput.value;

        const strength = await passwordStrength(password);
        if (strength.score < 2) {
            const choice = await choose(
                $l(
                    "The password you entered is weak which makes it easier for attackers to break " +
                        "the encryption used to protect your data. Try to use a longer password or include a " +
                        "variation of uppercase, lowercase and special characters as well as numbers!"
                ),
                [$l("Learn More"), $l("Choose Different Password"), $l("Use Anyway")],
                {
                    type: "warning",
                    title: $l("WARNING: Weak Password"),
                    hideIcon: true,
                    preventDismiss: true
                }
            );
            switch (choice) {
                case 0:
                    this._openPwdHowTo();
                    return;
                case 1:
                    this._passwordInput.focus();
                    return;
            }
        }

        if (!this.verificationCode) {
            await app.verifyEmail(email);
        }

        return this._signup(email, password, name);
    }

    private async _signup(email: string, password: string, name: string): Promise<void> {
        this._submitButton.start();

        if (!this.verificationCode) {
            this.verificationCode = await prompt(
                $l(
                    "One last step! To verify your email address, please enter " +
                        "the verification code from the email we just sent you!"
                ),
                { placeholder: "Enter Verification Code", confirmLabel: "Submit" }
            );

            if (this.verificationCode === null) {
                this._submitButton.stop();
                return;
            }
        }

        try {
            await app.signup({ email, password, name, verify: this.verificationCode, invite: this.invite });
            this._submitButton.success();
            this.done();
        } catch (e) {
            this.verificationCode = "";
            this._submitButton.fail();
            switch (e.code) {
                case ErrorCode.EMAIL_VERIFICATION_FAILED:
                    switch (
                        await choose(
                            $l(
                                "We failed to verify your email address. Please make sure to " +
                                    "enter the verification code we sent you via email!"
                            ),
                            [$l("Try Again"), $l("Resend Email"), $l("Cancel")],
                            { type: "warning", title: $l("Invalid Validation Code!") }
                        )
                    ) {
                        case 0:
                            return this._signup(email, password, name);
                        case 1:
                            return this._submit();
                        default:
                            return;
                    }
                case ErrorCode.ACCOUNT_EXISTS:
                    const choice = await choose($l("An account with this email address already exists!"), [
                        $l("Login"),
                        $l("Change Email")
                    ]);
                    if (choice === 0) {
                        this.dispatch("cancel");
                    } else {
                        this._emailInput.focus();
                    }
                    return;
                default:
                    throw e;
            }
        }
    }

    private async _updatePwdStrength() {
        const pwd = this._passwordInput.value;
        const result = await passwordStrength(pwd);
        const score = result.score;
        this._weakPassword = score < 3;
    }

    private _openPwdHowTo() {
        window.open("https://padlock.io/howto/choose-master-password/", "_system");
    }

    private _login() {
        this.dispatch("login");
    }
}
