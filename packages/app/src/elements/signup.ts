import { localize as $l } from "@padloc/core/lib/locale.js";
import { ErrorCode } from "@padloc/core/lib/error.js";
import { generatePassphrase } from "@padloc/core/lib/diceware.js";
import { isTouch } from "@padloc/core/lib/platform.js";
import { passwordStrength } from "../util.js";
import { app, router } from "../init.js";
import { element, html, property, query } from "./base.js";
import { StartForm, sharedStyles } from "./start-form.js";
import { Input } from "./input.js";
import { LoadingButton } from "./loading-button.js";
import { Generator } from "./generator.js";
import { alert, choose, prompt, dialog } from "../dialog.js";
import { mixins } from "../styles";
import "./logo.js";

const steps = ["", "verify", "password"];

@element("pl-signup")
export class Signup extends StartForm {
    @property()
    private _password: string = "";

    private get _email() {
        return router.params.email || "";
    }

    private get _name() {
        return router.params.name || "";
    }

    private get _verificationToken() {
        return router.params.verify || "";
    }

    private get _invite() {
        const inviteString = router.params.invite;
        if (inviteString) {
            const [vault, id] = inviteString.split(",");
            return { vault, id };
        } else {
            return undefined;
        }
    }

    private _step = "start";

    @query("#emailInput")
    private _emailInput: Input;
    @query("#nameInput")
    private _nameInput: Input;
    @query("#codeInput")
    private _codeInput: Input;
    @query("#repeatPasswordInput")
    private _repeatPasswordInput: Input;
    @query("#submitEmailButton")
    private _submitEmailButton: LoadingButton;
    @query("#verifyEmailButton")
    private _verifyEmailButton: LoadingButton;
    @query("#submitPasswordButton")
    private _submitPasswordButton: LoadingButton;

    @dialog("pl-generator")
    private _generator: Generator;

    async reset() {
        this._repeatPasswordInput.value = "";
        this._codeInput.value = "";
        this._submitEmailButton.stop();
        this._verifyEmailButton.stop();
        this._submitPasswordButton.stop();
        this._password = await generatePassphrase();
    }

    async goToStep(step = "") {
        const i = steps.indexOf(step);
        if (i === -1) {
            return;
        }
        const iPrev = steps.indexOf(this._step);

        const wrappers = this.$$(".wrapper");
        const wrapper = wrappers[i] as HTMLElement;
        const prevWrapper = wrappers[iPrev] as HTMLElement;
        wrapper.removeAttribute("hidden");
        this._animateIn(wrapper.querySelectorAll(".animate"));
        if (prevWrapper && prevWrapper !== wrapper) {
            this._animateOut(prevWrapper.querySelectorAll(".animate"));
            setTimeout(() => prevWrapper.setAttribute("hidden", ""), 1000);
        }
        this._step = step;
    }

    render() {
        return html`
            ${sharedStyles}

            <style>
                h1 {
                    display: block;
                    text-align: center;
                    margin: 20px 10px;
                }

                .master-password-form {
                    max-width: 500px;
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

                pl-input:not([focused]) + .hint {
                    color: rgba(0, 0, 0, 0.2)
                    text-shadow: none;
                }

                .master-password {
                    position: relative;
                    background: var(--shade-2-color);
                    font-family: var(--font-family-mono);
                    font-size: 130%;
                    padding: 20px 40px;
                    overflow-wrap: break-word;
                }

                .master-password-cover {
                    ${mixins.fullbleed()}
                    height: 1em;
                    margin: auto;
                    font-weight: bold;
                    text-shadow: none;
                    color: rgba(0, 0, 0, 0.3);
                }

                .master-password-edit {
                    font-size: 80%;
                    width: 35px;
                    height: 35px;
                    vertical-align: middle;
                    position: absolute;
                    right: 5px;
                    top: 0;
                    bottom: 0;
                    margin: auto;
                    z-index: 1;
                    text-shadow: none;
                    color: rgba(0, 0, 0, 0.3);
                }

                .master-password:not(:hover) .master-password-value,
                .master-password:not(:hover) .master-password-edit,
                .master-password:hover .master-password-cover {
                    opacity: 0;
                }
            </style>

            <div class="wrapper" hidden>

                <div flex></div>

                <form>

                    <pl-logo class="animate"></pl-logo>

                    <div class="title animate">
                        ${$l(
                            "Welcome to Padloc! Let's get you started by creating an account for you. Already have one?"
                        )}
                        <span class="login" @click=${() => router.go("login")}>➔ Sign In</span>
                    </div>

                    <pl-input
                        id="emailInput"
                        type="email"
                        required
                        .label=${$l("Email Address")}
                        .value=${this._email}
                        class="tiles-2 animate"
                        @enter=${() => this._submitEmail()}>
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
                        .value=${this._name}
                        class="tiles-2 animate"
                        @enter=${() => this._submitEmail()}>
                    </pl-input>

                    <div class="hint animate">
                        ${$l("What should we call you?")}
                    </div>

                    <pl-loading-button id="submitEmailButton" class="tap tiles-3 animate" @click=${() =>
                        this._submitEmail()}>
                        ${$l("Continue")}
                    </pl-loading-button>

                </form>

                <div flex></div>

            </div>

            <div class="wrapper" hidden>

                <div flex></div>

                <form>

                    <h1 class="animate">${$l("Confirm Your Email Address")}</h1>

                    <div class="hint animate">
                        ${$l(
                            "Check your inbox! We sent you confirmation code to {0}. " +
                                "Please enter the code below to confirm your email address!",
                            this._email
                        )}
                    </div>

                    <pl-input
                        id="codeInput"
                        type="number"
                        pattern="[0-9]*"
                        required
                        .label=${$l("Confirmation Code")}
                        class="tiles-2 animate"
                        @enter=${() => this._verifyEmail()}>
                    </pl-input>

                    <pl-loading-button
                        id="verifyEmailButton"
                        class="tap tiles-3 animate"
                        @click=${() => this._verifyEmail()}>
                        ${$l("Continue")}
                    </pl-loading-button>

                </form>

                <div flex></div>

            </div>

            <div class="wrapper" hidden>

                <div flex></div>

                <form class="master-password-form">

                    <h1 class="animate">
                        <div>${$l("Say hello to your")}</div>
                        <strong>${$l("Master Password")}</strong>
                    </h1>

                    <div class="hint animate">
                        ${$l(
                            "It's the last password you'll ever have to remember! " +
                                "Your master password is used to protect your data and should not be known to anyone but you. " +
                                "Without it, nobody will be able to access your data - not even us!"
                        )}
                    </div>

                    <div class="master-password animate">

                        <div class="master-password-value">

                            <span>${this._password}</span>

                        </div>

                        <pl-icon
                            icon="edit"
                            class="master-password-edit tap"
                            @click=${this._editMasterPassword}>
                        </pl-icon>

                        <div class="master-password-cover">
                            ${isTouch() ? $l("[Tap To Reveal]") : $l("[Hover To Reveal]")}
                        </div>

                    </div>

                    <pl-input
                        id="repeatPasswordInput"
                        type="password"
                        required
                        .label=${$l("Repeat Master Password")}
                        class="tiles-2 animate repeat-master-password"
                        @enter=${() => this._submitPassword()}>
                    </pl-input>

                    <div class="hint" hidden>
                        ${$l(
                            "For privacy and security reasons we don't keep " +
                                "a record of you password which means we won't be able to help you recover your " +
                                "data in case you forget it. We recommend writing it down on a piece of paper and " +
                                "storing it somewhere safe, at least until you have it safely memorized."
                        )}
                    </div>

                    <pl-loading-button id="submitPasswordButton" class="tap tiles-3 animate" @click=${() =>
                        this._submitPassword()}>
                        ${$l("Continue")}
                    </pl-loading-button>

                </form>

                <div flex></div>

            </div>
        `;
    }

    private async _submitEmail() {
        if (this._submitEmailButton.state === "loading") {
            return;
        }

        this._emailInput.blur();

        if (this._emailInput.invalid) {
            await alert($l("Please enter a valid email address!"), {
                type: "warning"
            });
            return;
        }

        const email = this._emailInput.value;
        const name = this._nameInput.value;

        if (this._verificationToken) {
            router.go("signup/password");
        } else {
            this._submitEmailButton.start();
            try {
                await app.requestEmailVerification(email);
                this._submitEmailButton.success();
                router.go("signup/verify", { email, name });
            } catch (e) {
                this._submitEmailButton.fail();
                throw e;
            }
        }
    }

    private async _verifyEmail() {
        if (this._verifyEmailButton.state === "loading") {
            return;
        }

        this._verifyEmailButton.start();
        try {
            const verify = await app.completeEmailVerification(this._email, this._codeInput.value);
            this._verifyEmailButton.success();
            router.go("signup/password", { ...router.params, verify });
        } catch (e) {
            this._verifyEmailButton.fail();
            throw e;
        }
    }

    private async _submitPassword() {
        if (this._submitPasswordButton.state === "loading") {
            return;
        }

        if (this._password !== this._repeatPasswordInput.value) {
            await alert($l("You didn't repeat your master password correctly. Try again!"), { type: "warning" });
            return;
        }

        const email = this._email;
        const name = this._name;
        const password = this._password;

        this._submitPasswordButton.start();

        try {
            await app.signup({ email, password, name, verify: this._verificationToken, invite: this._invite });
            this._submitPasswordButton.success();
            this.done();
        } catch (e) {
            this._submitPasswordButton.fail();
            switch (e.code) {
                case ErrorCode.ACCOUNT_EXISTS:
                    const choice = await choose($l("An account with this email address already exists!"), [
                        $l("Login"),
                        $l("Change Email")
                    ]);
                    if (choice === 0) {
                        this.dispatch("cancel");
                    } else {
                        router.go("signup", { name });
                        this._emailInput.focus();
                    }
                    return;
                default:
                    throw e;
            }
        }
    }

    private async _editMasterPassword(): Promise<void> {
        const choice = await choose(
            $l("We recommend using a randomly generated password that is both strong and easy to remember."),
            [$l("Keep This One"), $l("Generate Another"), $l("Choose My Own")],
            { title: $l("Want A Different Master Password?") }
        );

        let newPwd;

        switch (choice) {
            case 0:
                break;
            case 1:
                newPwd = await this._generator.show();
                break;
            case 2:
                newPwd = await prompt(
                    $l("We recommend using a randomly generated password that is both strong and easy to remember."),
                    { title: $l("Choose Own Master Password"), label: $l("Enter Master Password"), type: "password" }
                );
                break;
        }

        if (newPwd) {
            const strength = await passwordStrength(newPwd);

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
                        hideIcon: true,
                        preventDismiss: true
                    }
                );
                if (choice === 0) {
                    return this._editMasterPassword();
                }
            }

            this._password = newPwd;
        }
    }
}
