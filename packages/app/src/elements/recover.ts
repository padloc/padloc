import { translate as $l } from "@padloc/locale/src/translate";
import { AuthPurpose } from "@padloc/core/src/auth";
import { app, router } from "../globals";
import { StartForm } from "./start-form";
import { Input } from "./input";
import { Button } from "./button";
import { alert, choose } from "../lib/dialog";
import { passwordStrength } from "../lib/util";
import { customElement, query, state } from "lit/decorators.js";
import { html } from "lit";
import { authenticate } from "@padloc/core/src/platform";

@customElement("pl-recover")
export class Recover extends StartForm {
    readonly routePattern = /^recover/;

    @state()
    private _weakPassword = false;

    @query("#emailInput")
    private _emailInput: Input;

    @query("#passwordInput")
    private _passwordInput: Input;

    @query("#repeatPasswordInput")
    private _repeatPasswordInput: Input;

    @query("#submitButton")
    private _submitButton: Button;

    async reset() {
        this._passwordInput.value = "";
        this._repeatPasswordInput.value = "";
        this._submitButton.stop();
        super.reset();
    }

    static styles = [...StartForm.styles];

    render() {
        return html`
            <div class="fullbleed center-justifying vertical layout">
                <div class="fit scrolling center-aligning vertical layout">
                    <form class="padded spacing vertical layout">
                        <pl-button
                            class="small inline slim horizontal spacing center-aligning layout transparent back-button animated"
                            @click=${() => router.go("login")}
                            style="align-self: flex-start"
                        >
                            <pl-icon icon="backward"></pl-icon>
                            <div>${$l("Back To Login")}</div>
                        </pl-button>

                        <h1 class="huge animated text-centering">${$l("Recover Account")}</h1>

                        <div class="padded text-centering small animated">
                            ${$l("Please enter your email address and new master password.")}
                        </div>

                        <pl-input
                            id="emailInput"
                            type="email"
                            required
                            .label=${$l("Email Address")}
                            .value=${this._email}
                            class="animated"
                            @enter=${() => this._submit()}
                        >
                        </pl-input>

                        <pl-input
                            id="passwordInput"
                            type="password"
                            required
                            .label=${$l("New Master Password")}
                            class="animated"
                            @change=${() => this._updatePwdStrength()}
                            @enter=${() => this._submit()}
                        >
                        </pl-input>

                        <div class="negative inverted padded text-centering card" ?hidden=${!this._weakPassword}>
                            ${$l("WARNING: Weak Password!")}
                        </div>

                        <pl-input
                            id="repeatPasswordInput"
                            type="password"
                            required
                            .label=${$l("Repeat Master Password")}
                            class="animated"
                            @enter=${() => this._submit()}
                        >
                        </pl-input>

                        <div
                            class="negative inverted double-padded text-centering small card text-left-aligning recovery-notes animated"
                        >
                            ${$l(
                                "IMPORTANT, READ CAREFULLY: Padloc is designed in a way that makes it impossible " +
                                    "for us to access the data encrypted in any of your vaults even if we wanted to. " +
                                    "While this is essential to ensuring the security of your data, it also has the " +
                                    "following implications:"
                            )}
                            <div class="spacer"></div>
                            <ul class="bullets">
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

                        <pl-button id="submitButton" class="animated" @click=${() => this._submit()}>
                            ${$l("Recover Account")}
                        </pl-button>
                    </form>
                </div>
            </div>
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
                type: "warning",
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
                [$l("Choose Different Password"), $l("Use Anyway")],
                {
                    type: "warning",
                    title: $l("WARNING: Weak Password"),
                    preventDismiss: true,
                }
            );
            switch (choice) {
                case 0:
                    this._passwordInput.focus();
                    return;
            }
        }

        return this._recover(email, password);
    }

    private async _recover(email: string, password: string): Promise<void> {
        this._submitButton.start();
        try {
            const { token } = await authenticate({ email, purpose: AuthPurpose.Recover });
            await app.recoverAccount({ email, password, verify: token });
            this._submitButton.success();
            await alert($l("Account recovery successful!"), { title: $l("Account Revovery"), type: "success" });
            router.go("");
        } catch (e) {
            this._submitButton.fail();
            await alert(e.message, { type: "warning", title: $l("Authentication Failed") });
            throw e;
        }
    }

    private async _updatePwdStrength() {
        const pwd = this._passwordInput.value;
        const result = await passwordStrength(pwd);
        const score = result.score;
        this._weakPassword = score < 3;
    }
}
