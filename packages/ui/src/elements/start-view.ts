import { LitElement, html } from "@polymer/lit-element";
import { wait, passwordStrength, toggleAttribute } from "@padlock/core/lib/util.js";
import { isTouch, getAppStoreLink, checkForUpdates } from "@padlock/core/lib/platform.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { track } from "@padlock/core/lib/tracking.js";
import { ErrorCode } from "@padlock/core/lib/error.js";
import { app } from "../init.js";
import { choose, prompt, alert, confirm, promptForgotPassword } from "../dialog.js";
import { animateElement, animateCascade } from "../animation.js";
import sharedStyles from "../styles/shared.js";
import "./input.js";
import "./loading-button.js";

export class StartView extends LitElement {
    static get properties() {
        return {
            open: Boolean,
            _hasCloudData: Boolean,
            _pwdStrength: Object,
            _currStep: Number
        };
    }

    connectedCallback() {
        super.connectedCallback();
        // TODO: make sure handler gets called at least once
        app.addEventListener("unlock", () => (this.open = true));
        app.addEventListener("lock", () => {
            this.open = false;
            this.reset();
        });
    }

    async ready() {
        super.ready();
        await app.loaded;
        this.reset();
        if (!isTouch() && app.initialized) {
            this.shadowRoot.querySelector("#passwordInput").focus();
        }
    }

    reset() {
        this.shadowRoot.querySelector("#passwordInput").value = "";
        this.shadowRoot.querySelector("#emailInput").value = "";
        this.shadowRoot.querySelector("#newPasswordInput").value = "";
        this.shadowRoot.querySelector("#confirmPasswordInput").value = "";
        this.shadowRoot.querySelector("#cloudPwdInput").value = "";
        this.shadowRoot.querySelector("#unlockButton").stop();
        this.shadowRoot.querySelector("#getStartedButton").stop();
        this._failCount = 0;
        this._currStep = 0;
        this._hasCloudData = false;
        this.open = false;
    }

    _render(props: any) {
        const open = props.open;
        const email = (props.account && props.account.email) || "";

        return html`
        <style include="shared">
            ${sharedStyles}

            @keyframes reveal {
                from { transform: translate(0, 30px); opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes fade {
                to { transform: translate(0, -200px); opacity: 0; }
            }

            :host {
                --color-background: var(--color-primary);
                --color-foreground: var(--color-tertiary);
                --color-highlight: var(--color-secondary);
                @apply --fullbleed;
                @apply --scroll;
                color: var(--color-foreground);
                display: flex;
                flex-direction: column;
                z-index: 5;
                text-align: center;
                text-shadow: rgba(0, 0, 0, 0.15) 0 2px 0;
                background: linear-gradient(180deg, #59c6ff 0%, #077cb9 100%);
                transform: translate3d(0, 0, 0);
                transition: transform 0.4s cubic-bezier(1, 0, 0.2, 1);
            }

            main {
                @apply --fullbleed;
                background: transparent;
                min-height: 510px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .form-box {
                width: 300px;
                border-radius: 12px;
                overflow: hidden;
                display: flex;
                margin-top: 20px;
                transform: translate3d(0, 0, 0);
            }

            .hero {
                display: block;
                font-size: 110px;
                height: 120px;
                width: 120px;
                margin-bottom: 30px;
                color: rgba(255, 255, 255, 0.9);
            }

            .welcome-title {
                font-size: 120%;
                font-weight: bold;
                padding: 10px;
            }

            .welcome-subtitle {
                width: 300px;
                padding: 10px;
            }

            .start-button {
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-weight: bold;
                height: auto;
            }

            .start-button pl-icon {
                position: relative;
                top: 2px;
                width: 30px;
            }

            .form-box pl-input, .form-box .input-wrapper {
                flex: 1;
                text-align: center;
            }

            .form-box pl-loading-button {
                width: var(--row-height);
            }

            .strength-meter {
                font-size: 12px;
                font-weight: bold;
                margin-top: 10px;
                margin-bottom: -15px;
                height: 16px;
            }

            .hint {
                font-size: var(--font-size-tiny);
                width: 305px;
                margin-top: 40px;
            }

            .hint pl-icon {
                width: 1em;
                height: 1em;
                vertical-align: middle;
            }

            :host(:not([mode="get-started"])) .get-started,
            :host(:not([mode="unlock"])) .unlock {
                display: none;
            }

            .get-started-steps {
                width: 100%;
                height: 270px;
                position: relative;
            }

            .get-started-step {
                @apply --fullbleed;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .get-started-step:not(.center) {
                pointer-events: none;
            }

            .get-started-step > * {
                transform: translate3d(0, 0, 0);
                transition: transform 0.5s cubic-bezier(0.60, 0.2, 0.1, 1.2), opacity 0.3s;
            }

            .get-started-step > :nth-child(2) {
                transition-delay: 0.1s;
            }

            .get-started-step > :nth-child(3) {
                transition-delay: 0.2s;
            }

            .get-started-step:not(.center) > * {
                opacity: 0;
            }

            .get-started-step.left > * {
                transform: translate3d(-200px, 0, 0);
            }

            .get-started-step.right > * {
                transform: translate3d(200px, 0, 0);
            }

            .get-started-thumbs {
                position: absolute;
                bottom: 20px;
                display: flex;
                justify-content: center;
                width: 100%;
            }

            .get-started-thumbs > * {
                background: var(--color-foreground);
                width: 10px;
                height: 10px;
                border-radius: 100%;
                margin: 5px;
                cursor: pointer;
            }

            .get-started-thumbs > .right {
                opacity: 0.3;
            }

            button.skip {
                background: none;
                border: none;
                height: auto;
                line-height: normal;
                font-weight: bold;
                margin-top: 40px;
            }

            .version {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 20px;
                margin: auto;
                font-size: var(--font-size-small);
                color: rgba(0, 0, 0, 0.25);
                text-shadow: none;
                cursor: pointer;
            }

            .hint.choose-password {
                margin-top: 30px;
                width: 160px;
                text-decoration: underline;
                font-weight: bold;
                cursor: pointer;
            }

            :host([open]) {
                pointer-events: none;
            }

            :host([open]) {
                transition-delay: 0.4s;
                transform: translate3d(0, -100%, 0);
            }
        </style>

        <main class="unlock">

            <pl-icon icon="logo" class="hero animate-in animate-out"></pl-icon>

            <div class="form-box tiles-2 animate-in animate-out">

                <pl-input
                    id="passwordInput"
                    type="password"
                    class="tap"
                    select-on-focus=""
                    on-enter="${() => this._unlock()}"
                    no-tab="${open}"
                    placeholder="${$l("Enter Master Password")}">
                </pl-input>

                <pl-loading-button
                    id="unlockButton"
                    on-click="${() => this._unlock()}"
                    class="tap"
                    label="${$l("Unlock")}"
                    no-tab="${open}">

                    <pl-icon icon="forward"></pl-icon>

                </pl-loading-button>

            </div>

        </main>

        <main class="get-started">

            <pl-icon icon="logo" class="hero animate-in animate-out"></pl-icon>

            <div class="get-started-steps">

                <div class$="get-started-step ${this._getStartedClass(0)}">

                    <div class="welcome-title animate-in">${$l("Welcome to Padlock!")}</div>

                    <div class="welcome-subtitle animate-in">
                        ${$l("Let's get you set up! This will only take a couple of seconds.")}
                    </div>

                    <pl-loading-button
                        on-click="${() => this._startSetup()}"
                        class="form-box tiles-2 animate-in tap start-button"
                        no-tab="${props.open}">

                        <div>${$l("Get Started")}</div>

                        <pl-icon icon="forward"></pl-icon>

                    </pl-loading-button>

                </div>

                <div class$="get-started-step ${this._getStartedClass(1)}">

                    <div class="form-box tiles-2">

                        <pl-input
                            id="emailInput"
                            type="email"
                            select-on-focus=""
                            no-tab="${open}"
                            class="tap"
                            on-enter="${() => this._enterEmail()}"
                            placeholder="${$l("Enter Email Address")}">
                        </pl-input>

                        <pl-loading-button
                            id="emailButton"
                            on-click="${() => this._enterEmail()}"
                            class="tap"
                            no-tab="${open}">

                            <pl-icon icon="forward"></pl-icon>

                        </pl-loading-button>

                    </div>

                    <div class="hint">

                        <pl-icon icon="cloud"></pl-icon>

                        <span>${this._getStartedHint(0)}</span>

                    </div>

                    <button class="skip" on-click="${() => this._skipEmail()}">${$l("Use Offline")}</button>

                </div>

                <div class$="get-started-step ${this._getStartedClass(2)}">

                    <div class="form-box tiles-2">

                        <pl-input
                            id="codeInput"
                            required
                            select-on-focus
                            no-tab="${open}"
                            class="tap"
                            on-enter="${() => this._enterCode()}"
                            placeholder="${$l("Enter Login Code")}">
                        </pl-input>

                        <pl-loading-button
                            id="codeButton"
                            on-click="${() => this._enterCode()}"
                            class="tap"
                            no-tab="${open}">

                            <pl-icon icon="forward"></pl-icon>

                        </pl-loading-button>

                    </div>

                    <div class="hint">

                        <pl-icon icon="mail"></pl-icon>

                        <span>
                            ${html`${$l(
                                "Check your inbox! An email was sent to **{0}** containing your login code.",
                                email
                            )}`}
                        </span>
                    </div>

                    <button class="skip" on-click="${() => this._cancelActivation()}">${$l("Cancel")}</button>

                </div>

                <div class$="get-started-step ${this._getStartedClass(3)}" hidden?="${!props._hasCloudData}">

                    <div>

                        <div class="form-box tiles-2">

                            <pl-input
                                id="cloudPwdInput"
                                class="tap"
                                type="password"
                                select-on-focus
                                no-tab="${open}"
                                on-enter="${() => this._enterCloudPassword()}"
                                placeholder="${$l("Enter Master Password")}">
                            </pl-input>

                            <pl-loading-button
                                id="cloudPwdButton"
                                on-click="${() => this._enterCloudPassword()}"
                                class="tap"
                                no-tab="${open}">

                                <pl-icon icon="forward"></pl-icon>

                            </pl-loading-button>

                        </div>

                    </div>

                    <div class="hint">

                        <pl-icon icon="lock"></pl-icon>

                        <span>
                            ${html`${$l("Please enter the master password for the account **{0}**!", email)}`}
                        </span>
                    </div>

                    <button class="skip" on-click="${() => this._forgotCloudPassword()}">
                        ${$l("I Forgot My Password")}
                    </button>

                </div>

                <div class$="get-started-step ${this._getStartedClass(3)}" hidden?="${props._hasCloudData}">

                    <div>

                        <div class="form-box tiles-2">

                            <pl-input
                                id="newPasswordInput"
                                class="tap"
                                type="password"
                                select-on-focus
                                no-tab="${open}"
                                on-enter="${() => this._enterNewPassword()}"
                                on-change="${() => this._updatePwdStrength()}"
                                placeholder="${$l("Enter Master Password")}">
                            </pl-input>

                            <pl-loading-button
                                on-click="${() => this._enterNewPassword()}"
                                class="tap"
                                no-tab="${open}">

                                <pl-icon icon="forward"></pl-icon>

                            </pl-loading-button>

                        </div>

                        <div class="strength-meter">${props._pwdStrength}</div>

                    </div>

                    <div class="hint">

                        <pl-icon icon="lock"></pl-icon>

                        <span>${this._getStartedHint(1)}</span>

                    </div>

                    <div on-click="${() => this._openPwdHowto()}" class="hint choose-password">
                        ${$l("How do I choose a good master password?")}
                    </div>

                </div>

                <div class$="get-started-step ${this._getStartedClass(4)}">

                    <div class="form-box tiles-2">

                        <pl-input
                            id="confirmPasswordInput"
                            class="tap"
                            type="password"
                            select-on-focus=""
                            no-tab="${open}"
                            on-enter="${() => this._confirmNewPassword()}"
                            placeholder="${$l("Confirm Master Password")}">
                        </pl-input>

                        <pl-loading-button on-click="${() => this._confirmNewPassword()}" class="tap" no-tab="${open}">

                            <pl-icon icon="forward"></pl-icon>

                        </pl-loading-button>

                    </div>

                    <div class="hint">

                        <pl-icon icon="lock"></pl-icon>

                        <span>${this._getStartedHint(2)}></span>

                    </div>

                </div>

                <div class$="get-started-step ${this._getStartedClass(5)}">

                    <div class="welcome-title animate-out">${$l("All done!")}</div>

                    <div class="welcome-subtitle animate-out">${$l("You're all set! Enjoy using Padlock!")}</div>

                    <pl-loading-button
                        id="getStartedButton"
                        on-click="${() => this._finishSetup()}"
                        class="form-box tiles-2 animate-out tap start-button"
                        no-tab="${open}">

                        <span>${$l("Finish Setup")}</span>

                        <pl-icon icon="forward"></pl-icon>

                    </pl-loading-button>

                </div>

            </div>

            <div class="get-started-thumbs animate-in animate-out">

                <div class$="${this._getStartedClass(0)}" on-click="${() => this._goToStep(0)}"></div>

                <div class$="${this._getStartedClass(1)}" on-click="${() => this._goToStep(1)}"></div>

                <div class$="${this._getStartedClass(3)}" on-click="${() => this._goToStep(3)}"></div>

                <div class$="${this._getStartedClass(4)}" on-click="${() => this._goToStep(4)}"></div>

                <div class$="${this._getStartedClass(5)}" on-click="${() => this._goToStep(5)}"></div>

            </div>

        </main>
`;
    }

    _didRender(_: any, changed: any) {
        this.setAttribute("mode", app.initialized ? "unlock" : "get-started");
        // TODO: Why is that assertion necessary?
        toggleAttribute((this as any) as Element, "open", this.open);

        if (changed && changed.open === true) {
            animateCascade(this.shadowRoot.querySelectorAll(`main.${this.mode} .animate-out`), {
                animation: "fade",
                duration: 400,
                fullDuration: 600,
                initialDelay: 0,
                fill: "forwards",
                easing: "cubic-bezier(1, 0, 0.2, 1)",
                clear: 3000
            });
        } else if (changed && changed.open === false) {
            animateCascade(this.shadowRoot.querySelectorAll(`main.${this.mode} .animate-in`), {
                animation: "reveal",
                duration: 1000,
                fullDuration: 1500,
                initialDelay: 300,
                fill: "backwards",
                clear: 3000
            });
        }
    }

    focus() {
        this.shadowRoot.querySelector("#passwordInput").focus();
    }

    _startSetup() {
        this._currStep = 1;
        if (!isTouch()) {
            this.shadowRoot.querySelector("#emailInput").focus();
        }

        track("Setup: Start");
    }

    _enterEmail() {
        this.shadowRoot.querySelector("#emailInput").blur();
        if (this.shadowRoot.querySelector("#emailInput").invalid) {
            this.alert(
                this.shadowRoot.querySelector("#emailInput").validationMessage ||
                    $l("Please enter a valid email address!"),
                {
                    type: "warning"
                }
            ).then(() => this.shadowRoot.querySelector("#emailInput").focus());
            return;
        }

        this.shadowRoot.querySelector("#emailButton").start();
        app.setStats({ pairingSource: "Setup" });

        this.connectCloud(this.shadowRoot.querySelector("#emailInput").value)
            .then(() => {
                this.shadowRoot.querySelector("#emailButton").success();
                this._currStep = 2;
                this.shadowRoot.querySelector("#codeInput").value = "";
                if (!isTouch()) {
                    this.shadowRoot.querySelector("#codeInput").focus();
                }
            })
            .catch(() => this.shadowRoot.querySelector("#emailButton").fail());

        track("Setup: Email", { Skipped: false, Email: this.shadowRoot.querySelector("#emailInput").value as string });
    }

    async _enterCode() {
        if (this._checkingCode) {
            return;
        }

        if (this.shadowRoot.querySelector("#codeInput").invalid) {
            this.alert($l("Please enter the login code sent to you via email!"), { type: "warning" });
            return;
        }

        this._checkingCode = true;

        this.shadowRoot.querySelector("#codeButton").start();
        try {
            await app.activateSession(this.shadowRoot.querySelector("#codeInput").value);
            const hasData = false;
            // TODO: Figure out way to check for data
            this._checkingCode = false;
            this.shadowRoot.querySelector("#codeButton").success();
            this._hasCloudData = hasData;
            return this._connected();
        } catch (e) {
            this._checkingCode = false;
            this._rumble();
            this.shadowRoot.querySelector("#codeButton").fail();
            // TODO: handle cloud error
        }

        track("Setup: Code", { Email: this.shadowRoot.querySelector("#emailInput").value });
    }

    _connected() {
        setTimeout(() => {
            this._currStep = 3;
            if (!isTouch()) {
                this.shadowRoot.querySelector("#newPasswordInput").focus();
            }
        }, 50);
    }

    async _cancelActivation() {
        await app.logout();
        this.shadowRoot.querySelector("#codeInput").value = "";
        this._currStep = 1;
    }

    _skipEmail() {
        this.shadowRoot.querySelector("#emailInput").value = "";
        this._currStep = 3;
        if (!isTouch()) {
            this.shadowRoot.querySelector("#newPasswordInput").focus();
        }

        track("Setup: Email", { Skipped: true });
    }

    async _enterNewPassword() {
        this.shadowRoot.querySelector("#newPasswordInput").blur();
        const pwd = this.shadowRoot.querySelector("#newPasswordInput").value;

        if (!pwd) {
            this.alert("Please enter a master password!").then(() =>
                this.shadowRoot.querySelector("#newPasswordInput").focus()
            );
            return;
        }

        const next = () => {
            this._currStep = 4;
            if (!isTouch()) {
                this.shadowRoot.querySelector("#confirmPasswordInput").focus();
            }

            track("Setup: Choose Password");
        };

        const strength = await passwordStrength(pwd);
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
                    hideIcon: true
                }
            );
            switch (choice) {
                case 0:
                    this._openPwdHowto();
                    break;
                case 1:
                    this.shadowRoot.querySelector("#newPasswordInput").focus();
                    break;
                case 2:
                    next();
                    break;
            }
            return;
        }

        next();
    }

    async _confirmNewPassword() {
        const pwdInput = this.shadowRoot.querySelector("#confirmPasswordInput");
        const confPwdInput = this.shadowRoot.querySelector("#confirmPasswordInput");

        confPwdInput.blur();

        if (pwdInput.value !== confPwdInput.value) {
            const choice = await choose(
                $l("The password you entered does not match the original one!"),
                [$l("Try Again"), $l("Change Password")],
                { type: "warning" }
            );

            switch (choice) {
                case 0:
                    this.shadowRoot.querySelector("#confirmPasswordInput").focus();
                    break;
                case 1:
                    this._currStep = 3;
                    this.shadowRoot.querySelector("#newPasswordInput").focus();
                    break;
            }
        }

        this._currStep = 5;

        track("Setup: Confirm Password");
    }

    _finishSetup() {
        this._initializeData();
        track("Setup: Finish");
    }

    async _initializeData() {
        this.shadowRoot.querySelector("#getStartedButton").start();
        if (this._initializing) {
            return;
        }
        this._initializing = true;

        await Promise.all([app.init(this.shadowRoot.querySelector("#newPasswordInput").value), wait(1000)]);
        this.shadowRoot.querySelector("#getStartedButton").success();
        this.shadowRoot.querySelector("#newPasswordInput").blur();
        this._initializing = false;
    }

    async _promptResetData(message: string) {
        const input = await prompt(message, $l("Type 'RESET' to confirm"), "text", $l("Reset App"));
        if (input == null) {
            return;
        }
        if (input.toUpperCase() === "RESET") {
            await app.reset();
        } else {
            alert($l("You didn't type 'RESET'. Refusing to reset the app."));
        }
    }

    async _unlock() {
        const password = this.shadowRoot.querySelector("#passwordInput").value;

        if (!password) {
            await alert($l("Please enter your password!"));
            this.shadowRoot.querySelector("#passwordInput").focus();
            return;
        }

        this.shadowRoot.querySelector("#passwordInput").blur();
        this.shadowRoot.querySelector("#unlockButton").start();

        if (this._unlocking) {
            return;
        }
        this._unlocking = true;

        try {
            await Promise.all([app.unlock(password), wait(1000)]);
            this.shadowRoot.querySelector("#unlockButton").success();
            this._unlocking = false;
        } catch (e) {
            this.shadowRoot.querySelector("#unlockButton").fail();
            this._unlocking = false;
            switch (e.code) {
                case ErrorCode.DECRYPTION_FAILED:
                    this._rumble();
                    this._failCount++;
                    if (this._failCount > 2) {
                        const doReset = promptForgotPassword();
                        if (doReset) {
                            await app.reset();
                        }
                    } else {
                        this.shadowRoot.querySelector("#passwordInput").focus();
                    }
                    break;
                case ErrorCode.UNSUPPORTED_CONTAINER_VERSION:
                    const confirmed = await confirm(
                        $l(
                            "It seems the data stored on this device was saved with a newer version " +
                                "of Padlock and can not be opened with the version you are currently running. " +
                                "Please install the latest version of Padlock or reset the data to start over!"
                        ),
                        $l("Check For Updates"),
                        $l("Reset Data")
                    );

                    if (confirmed) {
                        checkForUpdates();
                    } else {
                        this._promptResetData(
                            $l("Are you sure you want to reset the app? " + "WARNING: This will delete all your data!")
                        );
                    }
                    break;
                default:
                    this._promptResetData(
                        $l(
                            "An error occured while loading your data! If the problem persists, please try " +
                                "resetting or reinstalling the app!"
                        )
                    );
                    throw e;
            }
        }
    }

    async _updatePwdStrength() {
        const pwd = this.shadowRoot.querySelector("#newPasswordInput").value;

        if (!pwd) {
            this._pwdStrength = "";
            return;
        }

        const result = await passwordStrength(pwd);
        const score = result.score;
        const strength = score === -1 ? "" : score < 2 ? $l("weak") : score < 4 ? $l("medium") : $l("strong");
        this._pwdStrength = strength && $l("strength: {0}", strength);
    }

    _getStartedHint(step: number) {
        const text = [
            $l(
                "Logging in will unlock advanced features like automatic backups and seamless " +
                    "synchronization between all your devices!"
            ),
            $l(
                "Your **master password** is a single passphrase used to protect your data. " +
                    "Without it, nobody will be able to access your data - not even us!"
            ),
            $l(
                "**Don't forget your master password!** For privacy and security reasons we never store your " +
                    "password anywhere which means we won't be able to help you recover your data in case you forget " +
                    "it. We recommend writing it down on a piece of paper and storing it somewhere safe."
            )
        ][step];
        //TODO: Make sure <strong> tags are rendered correctly
        return html`${text}`;
    }

    _getStartedClass(step: number) {
        const currStep = this._currStep;
        return currStep > step ? "left" : currStep < step ? "right" : "center";
    }

    _goToStep(s: number) {
        if (s < this._currStep) {
            this._currStep = s;
        }
    }

    async _openProductPage() {
        const link = await getAppStoreLink();
        window.open(link, "_system");
    }

    _openPwdHowto() {
        window.open("https://padlock.io/howto/choose-master-password/", "_system");
    }

    _rumble() {
        const mode = app.initialized ? "unlock" : "get-started";
        animateElement(this.shadowRoot.querySelector(`main.${mode} .hero`), {
            animation: "rumble",
            duration: 200,
            clear: true
        });
    }

    async _enterCloudPassword() {
        if (this._restoringCloud) {
            return;
        }

        const password = this.shadowRoot.querySelector("#cloudPwdInput").value;

        if (!password) {
            await alert($l("Please enter your password!"));
            this.shadowRoot.querySelector("#cloudPwdInput").focus();
            return;
        }

        this.shadowRoot.querySelector("#cloudPwdInput").blur();
        this.shadowRoot.querySelector("#cloudPwdButton").start();
        this._restoringCloud = true;

        // TODO: Restore from cloud
        // this.collection
        //     .fetch(this.cloudSource)
        //     .then(() => {
        //         this.shadowRoot.querySelector("#cloudPwdButton").success();
        //         this._restoringCloud = false;
        //         this._currStep = 5;
        //     })
        //     .catch(e => {
        //         this.shadowRoot.querySelector("#cloudPwdButton").fail();
        //         this._restoringCloud = false;
        //
        //         if (e.code === "decryption_failed") {
        //             this._rumble();
        //         } else {
        //             this._handleCloudError(e);
        //         }
        //     });

        track("Setup: Remote Password", { Email: this.settings.syncEmail });
    }

    _forgotCloudPassword() {
        // TODO: Forgot cloud password
        // await promptForgotPassword();
        // this._hasCloudData = false;
        // this._connected();
    }
}

window.customElements.define("pl-start-view", StartView);
