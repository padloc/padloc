import { translate as $l } from "@padloc/locale/src/translate";
import { ErrorCode } from "@padloc/core/src/error";
import { app, router } from "../globals";
import { StartForm } from "./start-form";
import { Input } from "./input";
import { PasswordInput } from "./password-input";
import { Button } from "./button";
import { alert, confirm } from "../lib/dialog";
import "./logo";
import { customElement, query, state } from "lit/decorators.js";
import { html } from "lit";

@customElement("pl-login")
export class Login extends StartForm {
    readonly routePattern = /^login/;

    @state()
    private _errorMessage: string;

    @query("#emailInput")
    private _emailInput: Input;

    @query("#passwordInput")
    private _passwordInput: PasswordInput;

    @query("#loginButton")
    private _loginButton: Button;

    private _failedCount = 0;

    handleRoute() {
        if (!this._authToken) {
            this.redirect("start");
        }
    }

    async reset() {
        await this.updateComplete;
        this._emailInput.value = router.params.email || "";
        this._passwordInput.value = "";
        this._loginButton.stop();
        this._failedCount = 0;
        super.reset();
        this._passwordInput.focus();
    }

    static styles = [...StartForm.styles];

    render() {
        return html`
            <div class="fullbleed centering layout">
                <form>
                    <pl-logo class="animated"></pl-logo>

                    <pl-input
                        id="emailInput"
                        type="email"
                        required
                        readonly
                        .label=${$l("Email Address")}
                        class="animated click"
                        @enter=${() => this._submit()}
                        @click=${() => this.go("start")}
                    >
                    </pl-input>

                    <pl-password-input
                        id="passwordInput"
                        required
                        select-on-focus
                        .label=${$l("Master Password")}
                        class="animated"
                        @enter=${() => this._submit()}
                    >
                    </pl-password-input>

                    <pl-button id="loginButton" class="animated" @click=${() => this._submit()}>
                        ${$l("Login")}
                    </pl-button>

                    ${this._errorMessage
                        ? html`
                              <div class="red inverted padded text-centering animated card">${this._errorMessage}</div>
                          `
                        : ""}
                </form>
            </div>
        `;
    }

    private async _accountDoesntExist(email: string) {
        const signup = await confirm(
            $l("An account with this email address does not exist!"),
            $l("Sign Up"),
            $l("Cancel"),
            {
                icon: "info",
            }
        );
        if (signup) {
            router.go("start", { email });
        }
    }

    private async _submit(): Promise<void> {
        if (this._loginButton.state === "loading") {
            return;
        }

        if (!this._emailInput.reportValidity()) {
            return;
        }

        this._emailInput.blur();
        this._passwordInput.blur();

        const email = this._emailInput.value;
        let password = this._passwordInput.value;

        if (this._emailInput.invalid) {
            await alert($l("Please enter a valid email address!"));
            this.go("start");
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
            let addTrustedDevice = false;
            if (!this._deviceTrusted) {
                addTrustedDevice = await confirm(
                    $l("Do you want to add this device as a trusted device?"),
                    $l("Yes"),
                    $l("No"),
                    { title: $l("Add Trusted Device") }
                );
            }
            await app.login(email, password, this._authToken, addTrustedDevice);
            this._loginButton.success();
            this.go("");
        } catch (e: any) {
            switch (e.code) {
                case ErrorCode.AUTHENTICATION_REQUIRED:
                    this._loginButton.stop();

                    await alert($l("We failed to verify your email address. Please start over!"), {
                        type: "warning",
                        title: $l("Authentication Failed"),
                    });

                    this.go("start", { email });

                    // if (!verify.hasAccount) {
                    //     if (verify.hasLegacyAccount) {
                    //         this._migrateAccount(email, password, verify.legacyToken!, verify.token);
                    //     } else {
                    //         this._accountDoesntExist(email);
                    //     }
                    //     return;
                    // }

                    return;
                case ErrorCode.INVALID_CREDENTIALS:
                    this._errorMessage = $l("Wrong master password. Please try again!");
                    this._loginButton.fail();
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
                    return;
                case ErrorCode.NOT_FOUND:
                    this._loginButton.fail();
                    this._accountDoesntExist(email);
                    return;
                default:
                    alert(e.message, { type: "warning" });
                    throw e;
            }
        }
    }
}
