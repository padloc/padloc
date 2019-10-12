import { translate as $l } from "@padloc/locale/src/translate";
import { ErrorCode } from "@padloc/core/src/error";
import { EmailVerificationPurpose } from "@padloc/core/src/email-verification";
import { app, router } from "../globals";
import { element, html, css, property, query } from "./base";
import { StartForm } from "./start-form";
import { Input } from "./input";
import { LoadingButton } from "./loading-button";
import { alert, choose, prompt } from "../lib/dialog";
import { passwordStrength } from "../lib/util";

@element("pl-recover")
export class Recover extends StartForm {
    @property()
    private _weakPassword = false;

    private get _email() {
        return router.params.email || "";
    }

    @query("#emailInput")
    private _emailInput: Input;
    @query("#passwordInput")
    private _passwordInput: Input;
    @query("#repeatPasswordInput")
    private _repeatPasswordInput: Input;
    @query("#submitButton")
    private _submitButton: LoadingButton;

    async reset() {
        this._passwordInput.value = "";
        this._repeatPasswordInput.value = "";
        this._submitButton.stop();
        super.reset();
    }

    static styles = [
        ...StartForm.styles,
        css`
            h1 {
                display: block;
                text-align: center;
                margin: 30px;
            }

            .title {
                width: 300px;
                margin: 30px auto;
                font-size: var(--font-size-small);
                font-weight: bold;
                letter-spacing: 0.5px;
                padding: 0 10px;
            }

            #submitButton {
                margin-bottom: 30px;
            }

            .login {
                text-decoration: underline;
                cursor: pointer;
            }

            .recovery-notes {
                text-align: left;
                padding: 20px;
                margin: 10px;
            }

            .recovery-notes ul {
                list-style: disc;
            }

            .recovery-notes li {
                margin: 10px 20px 0 20px;
                background: transparent;
                border: none;
            }
        `
    ];

    render() {
        return html`
            <div flex></div>

            <form>
                <h1 class="animate">${$l("Recover Account")}</h1>

                <div class="title animate">
                    ${$l("Please enter your email address and new master password.")}
                </div>

                <pl-input
                    id="emailInput"
                    type="email"
                    required
                    .label=${$l("Email Address")}
                    .value=${this._email}
                    class="tiles-2 animate"
                    @enter=${() => this._submit()}
                >
                </pl-input>

                <pl-input
                    id="passwordInput"
                    type="password"
                    required
                    .label=${$l("New Master Password")}
                    class="tiles-2 animate"
                    @change=${() => this._updatePwdStrength()}
                    @enter=${() => this._submit()}
                >
                </pl-input>

                <div class="error note" ?hidden=${!this._weakPassword}>${$l("WARNING: Weak Password!")}</div>

                <pl-input
                    id="repeatPasswordInput"
                    type="password"
                    required
                    .label=${$l("Repeat Master Password")}
                    class="tiles-2 animate"
                    @enter=${() => this._submit()}
                >
                </pl-input>

                <div class="error note animate recovery-notes">
                    ${$l(
                        "IMPORTANT, READ CAREFULLY: Padloc is designed in a way that makes it impossible " +
                            "for us to access the data encrypted in any of your vaults even if we wanted to. " +
                            "While this is essential to ensuring the security of your data, it also has the " +
                            "following implications:"
                    )}
                    <ul>
                        <li>
                            ${$l(
                                "Any data stored in your private vault can not be recovered and will be permantently lost."
                            )}
                        </li>
                        <li>
                            ${$l(
                                "All your organization memberships will be suspended temporarily until " +
                                    "confirmed by the organization owner."
                            )}
                        </li>
                        <li>
                            ${$l(
                                "All members of organizations you own will be suspended temporarily until " +
                                    "confirmed by you."
                            )}
                        </li>
                    </ul>
                </div>

                <pl-loading-button id="submitButton" class="tap animate" @click=${() => this._submit()}>
                    ${$l("Recover Account")}
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

        await app.requestEmailVerification(email, EmailVerificationPurpose.Recover);

        return this._recover(email, password);
    }

    private async _recover(email: string, password: string): Promise<void> {
        this._submitButton.start();

        const verify = await prompt(
            $l(
                "To complete the account recovery process, please enter " +
                    "the confirmation code sent to your email address!"
            ),
            {
                placeholder: "Enter Verification Code",
                confirmLabel: "Submit",
                validate: async (code: string) => {
                    try {
                        return await app.completeEmailVerification(email, code);
                    } catch (e) {
                        if (e.code === ErrorCode.EMAIL_VERIFICATION_TRIES_EXCEEDED) {
                            alert($l("Maximum number of tries exceeded! Please resubmit and try again!"), {
                                type: "warning"
                            });
                            return "";
                        }
                        throw e.message || e.code || e.toString();
                    }
                }
            }
        );

        if (!verify) {
            this._submitButton.stop();
            return;
        }

        try {
            await app.recoverAccount({ email, password, verify });
            this._submitButton.success();
            await alert($l("Account recovery successful!"), { type: "success" });
        } catch (e) {
            this._submitButton.fail();
            throw e;
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
}
