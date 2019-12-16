import { translate as $l } from "@padloc/locale/src/translate";
import { ErrorCode } from "@padloc/core/src/error";
import { generatePassphrase } from "@padloc/core/src/diceware";
import { passwordStrength, isTouch } from "../lib/util";
import { app, router } from "../globals";
import { element, html, css, property, query } from "./base";
import { StartForm } from "./start-form";
import { Input } from "./input";
import { PasswordInput } from "./password-input";
import { LoadingButton } from "./loading-button";
import { Generator } from "./generator";
import { alert, choose, prompt, dialog } from "../lib/dialog";
import { mixins } from "../styles";
import "./logo";

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
            const [org, id] = inviteString.split(",");
            return { org, id };
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
    private _repeatPasswordInput: PasswordInput;
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
        setTimeout(() => (this._logo.reveal = true), 500);
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

        if (step === "password" && !this._password) {
            this._generatePassphrase();
        }

        setTimeout(() => this.requestUpdate(), 10);
    }

    private async _generatePassphrase() {
        this._password = await generatePassphrase(4, " ", [app.state.device.locale]);
        const wrapper = this.$(".master-password");
        wrapper.classList.add("reveal");
        setTimeout(() => wrapper.classList.remove("reveal"), 2000);
    }

    static styles = [
        ...StartForm.styles,
        css`
            h1 {
                display: block;
                text-align: center;
                margin: 20px 10px;
            }

            .master-password-form {
                max-width: 500px;
            }

            .title {
                max-width: 310px;
                margin: 30px auto;
                font-size: var(--font-size-small);
                font-weight: bold;
                letter-spacing: 0.5px;
                padding: 0 10px;
            }

            #submitButton {
                margin-bottom: 30px;
            }

            .login-wrapper {
                font-size: var(--font-size-small);
                padding: 8px;
                margin: 8px 0;
                opacity: 0.7;
            }

            .link {
                text-decoration: underline;
                cursor: pointer;
                font-weight: bold;
            }

            pl-input:not([focused]) + .hint {
                color: rgba(0, 0, 0, 0.2);
                text-shadow: none;
            }

            .master-password {
                position: relative;
                background: var(--shade-2-color);
                font-family: var(--font-family-mono);
                font-size: 120%;
                padding: 20px;
                overflow-wrap: break-word;
            }

            .master-password-cover {
                ${mixins.fullbleed()}
                height: 2em;
                line-height: 2em;
                margin: auto;
                font-weight: bold;
                text-shadow: none;
                color: rgba(0, 0, 0, 0.3);
            }

            .master-password:hover {
                background: var(--shade-3-color);
            }

            .master-password > * {
                transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
            }

            .master-password:not(:hover):not(.reveal) .master-password-value,
            .master-password:hover .master-password-cover,
            .master-password.reveal .master-password-cover {
                opacity: 0;
                transform: scale(0);
            }

            .hint.subtle {
                opacity: 0.5;
            }

            [focused] + .hint.subtle {
                opacity: 1;
            }

            .password-actions {
                margin: -20px 0 30px 0;
            }

            .password-action {
                padding: 6px 10px;
                margin: 0 4px;
                font-size: var(--font-size-tiny);
                font-weight: 600;
            }
        `
    ];

    render() {
        return html`
            <div class="wrapper" hidden>
                <div flex></div>

                <form>
                    <pl-logo class="animate"></pl-logo>

                    <div class="title animate">
                        ${$l("Welcome to Padloc! Let's get you started by creating an account for you.")}
                    </div>

                    <pl-input
                        id="emailInput"
                        type="email"
                        required
                        .label=${$l("Email Address")}
                        .value=${this._email}
                        class="tiles-2 animate"
                        @enter=${() => this._submitEmail()}
                    >
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
                        @enter=${() => this._submitEmail()}
                    >
                    </pl-input>

                    <div class="hint animate">
                        ${$l("What should we call you?")}
                    </div>

                    <pl-loading-button
                        id="submitEmailButton"
                        class="tap tiles-3 animate"
                        @click=${() => this._submitEmail()}
                    >
                        ${$l("Continue")}
                    </pl-loading-button>
                </form>

                <div flex></div>

                <div class="login-wrapper animate">
                    ${$l("Already have an account?")}
                    <span class="link" @click=${() => router.go("login")}>${$l("Sign In")}</span>
                </div>
            </div>

            <div class="wrapper" hidden>
                <div flex></div>

                <form>
                    <h1 class="animate">${$l("You've Got Mail!")}</h1>

                    <div class="hint animate">
                        ${$l(
                            "To verify your email address, please enter the confirmation code we sent to {0}.",
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
                        @enter=${() => this._verifyEmail()}
                    >
                    </pl-input>

                    <pl-loading-button
                        id="verifyEmailButton"
                        class="tap tiles-3 animate"
                        @click=${() => this._verifyEmail()}
                    >
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
                                "Please memorize it and never reveal it to anyone (not even us)! " +
                                "We recommend writing it down on a piece of paper and " +
                                "storing it somewhere safe, at least until you have it safely memorized."
                        )}
                    </div>

                    <div class="master-password animate">
                        <div class="master-password-value">
                            <span>${this._password}</span>
                        </div>

                        <div class="master-password-cover">
                            ${isTouch() ? $l("[Tap To Reveal]") : $l("[Hover To Reveal]")}
                        </div>
                    </div>

                    <div class="hint animate">
                        ${$l(
                            "This random passphrase was generated just for you and is designed " +
                                "to be both secure and easy to remember. Don't like it?"
                        )}
                    </div>

                    <div class="password-actions animate">
                        <button type="button" class="password-action tap" @click=${this._generatePassphrase}>
                            ${$l("Try Another One")}
                        </button>
                        or
                        <button type="button" class="password-action tap" @click=${this._editMasterPassword}>
                            ${$l("Choose Your Own")}
                        </button>
                    </div>

                    <pl-password-input
                        id="repeatPasswordInput"
                        required
                        .label=${$l("Repeat Master Password")}
                        class="tiles-2 animate repeat-master-password"
                        @enter=${() => this._submitPassword()}
                    >
                    </pl-password-input>

                    <pl-loading-button
                        id="submitPasswordButton"
                        class="tap tiles-3 animate"
                        @click=${() => this._submitPassword()}
                    >
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

        if (!this._emailInput.reportValidity()) {
            return;
        }

        const email = this._emailInput.value;
        const name = this._nameInput.value;

        if (this._verificationToken) {
            router.go("signup/password", { ...router.params, email, name });
        } else {
            this._submitEmailButton.start();
            try {
                await app.requestEmailVerification(email);
                this._submitEmailButton.success();
                router.go("signup/verify", { ...router.params, email, name });
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
            if (e.code === ErrorCode.EMAIL_VERIFICATION_TRIES_EXCEEDED) {
                alert($l("Maximum number of tries exceeded! Please resubmit and try again!"), { type: "warning" });
                router.go("signup");
                return;
            }
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
                    const choice = await choose(
                        $l("An account with this email address already exists!"),
                        [$l("Login"), $l("Change Email")],
                        { type: "warning" }
                    );
                    if (choice === 0) {
                        router.go("login");
                    } else {
                        const { verify, ...params } = router.params;
                        router.go("signup", params);
                        this._emailInput.focus();
                    }
                    return;
                default:
                    throw e;
            }
        }

        this._password = "";
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
