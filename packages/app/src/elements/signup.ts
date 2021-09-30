import { translate as $l } from "@padloc/locale/src/translate";
import { ErrorCode } from "@padloc/core/src/error";
import { generatePassphrase } from "@padloc/core/src/diceware";
import { passwordStrength, isTouch } from "../lib/util";
import { app, router } from "../globals";
import { StartForm } from "./start-form";
import { Input } from "./input";
import { PasswordInput } from "./password-input";
import { Button } from "./button";
import { Generator } from "./generator";
import { alert, choose, prompt, dialog } from "../lib/dialog";
import { mixins } from "../styles";
import "./logo";
import { customElement, query, state } from "lit/decorators.js";
import { css, html } from "lit";

const steps = ["", "password"];

@customElement("pl-signup")
export class Signup extends StartForm {
    readonly routePattern = /^signup(?:\/([^\/]*))?/;

    @state()
    private _password: string = "";

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
    @query("#repeatPasswordInput")
    private _repeatPasswordInput: PasswordInput;
    @query("#submitEmailButton")
    private _submitNameButton: Button;
    @query("#submitPasswordButton")
    private _submitPasswordButton: Button;

    @dialog("pl-generator")
    private _generator: Generator;

    async reset() {
        this._repeatPasswordInput.value = "";
        this._submitNameButton.stop();
        this._submitPasswordButton.stop();
        super.reset();
    }

    async handleRoute([step]: [string]) {
        if (!this._authToken) {
            this.redirect("start");
        }

        const i = steps.indexOf(step);
        if (i === -1) {
            this.redirect(`signup/${steps[0]}`);
            return;
        }

        const iPrev = steps.indexOf(this._step);

        if (!this.renderRoot.querySelector(".wrapper")) {
            await this.updateComplete;
        }

        const wrappers = this.renderRoot.querySelectorAll(".wrapper");
        const wrapper = wrappers[i] as HTMLElement;
        const prevWrapper = wrappers[iPrev] as HTMLElement;
        wrapper.removeAttribute("hidden");
        this._animateIn(wrapper.querySelectorAll(".animated"));
        if (prevWrapper && prevWrapper !== wrapper) {
            this._animateOut(prevWrapper.querySelectorAll(".animated"));
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
        const wrapper = this.renderRoot.querySelector(".master-password")!;
        wrapper.classList.add("reveal");
        setTimeout(() => wrapper.classList.remove("reveal"), 2000);
    }

    static styles = [
        ...StartForm.styles,
        css`
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
                font-size: var(--font-size-large);
                --button-padding: 1em;
                overflow-wrap: break-word;
            }

            .master-password-cover {
                ${mixins.fullbleed()};
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
                margin-bottom: 1em;
            }

            .password-action {
                margin: 0 0.5em;
                font-size: var(--font-size-tiny);
                font-weight: 600;
            }
        `,
    ];

    render() {
        return html`
            <div class="wrapper vertical layout" hidden>
                <div class="stretch"></div>

                <form>
                    <pl-logo class="animated"></pl-logo>

                    <div class="title animated">
                        ${$l("Welcome to Padloc! Let's get you started by creating an account for you.")}
                    </div>

                    <pl-input
                        id="emailInput"
                        type="email"
                        required
                        .label=${$l("Email Address")}
                        .value=${this._email}
                        class="animated click"
                        readonly
                        @click=${() => this.go("start")}
                    >
                    </pl-input>

                    <div class="hint animated">
                        ${$l(
                            "Your email address serves as your username and allows us to get in touch with you. " +
                                "Don't worry, we would never send you any spam!"
                        )}
                    </div>

                    <pl-input
                        id="nameInput"
                        .label=${$l("Your Name")}
                        .value=${this._name}
                        class="tiles-2 animated"
                        @enter=${() => this._submitName()}
                    >
                    </pl-input>

                    <div class="hint animated">${$l("What should we call you?")}</div>

                    <pl-button id="submitEmailButton" class="animated" @click=${() => this._submitName()}>
                        ${$l("Continue")}
                    </pl-button>
                </form>

                <div class="stretch"></div>

                <div class="login-wrapper animated">
                    ${$l("Already have an account?")}
                    <span class="link" @click=${() => router.go("login")}>${$l("Sign In")}</span>
                </div>
            </div>

            <div class="wrapper centering layout" hidden>
                <form class="master-password-form">
                    <h1 class="huge text-centering animated">
                        <div>${$l("Say hello to your")}</div>
                        <strong>${$l("Master Password")}</strong>
                    </h1>

                    <div class="hint animated">
                        ${$l(
                            "It's the last password you'll ever have to remember! " +
                                "Please memorize it and never reveal it to anyone (not even us)! " +
                                "We recommend writing it down on a piece of paper and " +
                                "storing it somewhere safe, at least until you have it safely memorized."
                        )}
                    </div>

                    <pl-button class="master-password animated">
                        <div class="master-password-value">
                            <span>${this._password}</span>
                        </div>

                        <div class="master-password-cover">
                            ${isTouch() ? $l("[Tap To Reveal]") : $l("[Hover To Reveal]")}
                        </div>
                    </pl-button>

                    <div class="hint animated">
                        ${$l(
                            "This random passphrase was generated just for you and is designed " +
                                "to be both secure and easy to remember. Don't like it?"
                        )}
                    </div>

                    <div class="password-actions animated centering layout">
                        <pl-button class="password-action" @click=${this._generatePassphrase}>
                            ${$l("Try Another One")}
                        </pl-button>
                        <div class="margined">or</div>
                        <pl-button class="password-action" @click=${this._editMasterPassword}>
                            ${$l("Choose Your Own")}
                        </pl-button>
                    </div>

                    <pl-password-input
                        id="repeatPasswordInput"
                        required
                        .label=${$l("Repeat Master Password")}
                        class="tiles-2 animated repeat-master-password"
                        @enter=${() => this._submitPassword()}
                    >
                    </pl-password-input>

                    <pl-button id="submitPasswordButton" class="animated" @click=${() => this._submitPassword()}>
                        ${$l("Continue")}
                    </pl-button>
                </form>
            </div>
        `;
    }

    private async _submitName() {
        if (this._submitNameButton.state === "loading") {
            return;
        }

        if (!this._emailInput.reportValidity()) {
            return;
        }

        const email = this._emailInput.value;
        const name = this._nameInput.value;

        router.go("signup/password", { ...router.params, email, name });
    }

    private async _submitPassword() {
        if (this._submitPasswordButton.state === "loading") {
            return;
        }

        if (this._password !== this._repeatPasswordInput.value) {
            await alert($l("You didn't repeat your master password correctly. Try again!"), {
                type: "warning",
                title: "Incorrect Master Password",
            });
            return;
        }

        const email = this._email;
        const name = this._name;
        const password = this._password;

        this._submitPasswordButton.start();

        try {
            await app.signup({ email, password, name, verify: this._authToken, invite: this._invite });
            this._submitPasswordButton.success();
            this.go("items");
            // setTimeout(() => this.go(""), 1000);
        } catch (e) {
            this._submitPasswordButton.fail();
            switch (e.code) {
                case ErrorCode.ACCOUNT_EXISTS:
                    this._accountExists();
                    return;
                default:
                    alert(e.message, { type: "warning" });
                    throw e;
            }
        }

        this._password = "";
    }

    private async _accountExists() {
        const choice = await choose(
            $l("An account with this email address already exists!"),
            [$l("Login"), $l("Change Email")],
            { type: "warning", title: $l("Account Exists") }
        );
        if (choice === 0) {
            router.go("login");
        } else {
            const { verify, ...params } = router.params;
            router.go("signup", params);
            this._emailInput.focus();
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
                        preventDismiss: true,
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
