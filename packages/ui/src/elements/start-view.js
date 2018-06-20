import "../styles/shared.js";
import { BaseElement, html } from "./base.js";
import { applyMixins, wait, passwordStrength } from "@padlock/core/lib/util.js";
import { isTouch, getAppStoreLink, checkForUpdates } from "@padlock/core/lib/platform.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { track } from "@padlock/core/lib/tracking.js";
import * as stats from "@padlock/core/lib/stats.js";
import "./input.js";
import "./loading-button.js";
import { DataMixin, LocaleMixin, DialogMixin, AnimationMixin, SyncMixin } from "../mixins";

class StartView extends applyMixins(BaseElement, DataMixin, LocaleMixin, DialogMixin, AnimationMixin, SyncMixin) {
    static get template() {
        return html`
        <style include="shared">

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

            :host(:not([_mode="get-started"])) .get-started,
            :host(:not([_mode="unlock"])) .unlock {
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
                <pl-input id="passwordInput" type="password" class="tap" select-on-focus="" on-enter="_unlock" no-tab="[[ open ]]" placeholder="[[ \$l('Enter Master Password') ]]"></pl-input>

                <pl-loading-button id="unlockButton" on-click="_unlock" class="tap" label="[[ \$l('Unlock') ]]" no-tab="[[ open ]]">
                    <pl-icon icon="forward"></pl-icon>
                </pl-loading-button>
            </div>

        </main>

        <main class="get-started">

            <pl-icon icon="logo" class="hero animate-in animate-out"></pl-icon>

            <div class="get-started-steps">

                <div class\$="get-started-step [[ _getStartedClass(_getStartedStep, 0) ]]">

                    <div class="welcome-title animate-in">[[ \$l("Welcome to Padlock!") ]]</div>
                    <div class="welcome-subtitle animate-in">[[ \$l("Let's get you set up! This will only take a couple of seconds.") ]]</div>

                    <pl-loading-button on-click="_startSetup" class="form-box tiles-2 animate-in tap start-button" no-tab="[[ open ]]">
                        <div>[[ \$l("Get Started") ]]</div>
                        <pl-icon icon="forward"></pl-icon>
                    </pl-loading-button>

                </div>

                <div class\$="get-started-step [[ _getStartedClass(_getStartedStep, 1) ]]">

                    <div class="form-box tiles-2">
                        <pl-input id="emailInput" type="email" select-on-focus="" no-tab="[[ open ]]" class="tap" on-enter="_enterEmail" placeholder="[[ \$l('Enter Email Address') ]]"></pl-input>

                        <pl-loading-button id="emailButton" on-click="_enterEmail" class="tap" no-tab="[[ open ]]">
                            <pl-icon icon="forward"></pl-icon>
                        </pl-loading-button>
                    </div>

                    <div class="hint">
                        <pl-icon icon="cloud"></pl-icon>
                        <span inner-h-t-m-l="[[ _getStartedHint(0) ]]"></span>
                    </div>

                    <button class="skip" on-click="_skipEmail">[[ \$l("Use Offline") ]]</button>

                </div>

                <div class\$="get-started-step [[ _getStartedClass(_getStartedStep, 2) ]]">

                    <div class="form-box tiles-2">
                        <pl-input id="codeInput" required="" select-on-focus="" no-tab="[[ open ]]" class="tap" on-enter="_enterCode" placeholder="[[ \$l('Enter Login Code') ]]"></pl-input>

                        <pl-loading-button id="codeButton" on-click="_enterCode" class="tap" no-tab="[[ open ]]">
                            <pl-icon icon="forward"></pl-icon>
                        </pl-loading-button>
                    </div>

                    <div class="hint">
                        <pl-icon icon="mail"></pl-icon>
                        <span inner-h-t-m-l="[[ \$l('Check your inbox! An email was sent to **{0}** containing your login code.', settings.syncEmail) ]]"></span>
                    </div>

                    <button class="skip" on-click="_cancelActivation">[[ \$l("Cancel") ]]</button>

                </div>

                <div class\$="get-started-step [[ _getStartedClass(_getStartedStep, 3) ]]" hidden\$="[[ !_hasCloudData ]]">

                    <div>
                        <div class="form-box tiles-2">

                            <pl-input id="cloudPwdInput" class="tap" type="password" select-on-focus="" no-tab="[[ open ]]" on-enter="_enterCloudPassword" placeholder="[[ \$l('Enter Master Password') ]]"></pl-input>

                            <pl-loading-button id="cloudPwdButton" on-click="_enterCloudPassword" class="tap" no-tab="[[ open ]]">
                                <pl-icon icon="forward"></pl-icon>
                            </pl-loading-button>

                        </div>
                    </div>

                    <div class="hint">
                        <pl-icon icon="lock"></pl-icon>
                        <span inner-h-t-m-l="[[ \$l('Please enter the master password for the account **{0}**!', settings.syncEmail) ]]"></span>
                    </div>

                    <button class="skip" on-click="_forgotCloudPassword">[[ \$l("I Forgot My Password") ]]</button>

                </div>

                <div class\$="get-started-step [[ _getStartedClass(_getStartedStep, 3) ]]" hidden\$="[[ _hasCloudData ]]">

                    <div>
                        <div class="form-box tiles-2">

                            <pl-input id="newPasswordInput" class="tap" type="password" select-on-focus="" no-tab="[[ open ]]" on-enter="_enterNewPassword" value="{{ newPwd }}" placeholder="[[ \$l('Enter Master Password') ]]"></pl-input>

                            <pl-loading-button on-click="_enterNewPassword" class="tap" no-tab="[[ open ]]">
                                <pl-icon icon="forward"></pl-icon>
                            </pl-loading-button>

                        </div>

                        <div class="strength-meter">[[ _displayPwdStrength ]]</div>
                    </div>

                    <div class="hint">
                        <pl-icon icon="lock"></pl-icon>
                        <span inner-h-t-m-l="[[ _getStartedHint(1) ]]"></span>
                    </div>

                    <div on-click="_openPwdHowto" class="hint choose-password">[[ \$l("How do I choose a good master password?") ]]</div>

                </div>

                <div class\$="get-started-step [[ _getStartedClass(_getStartedStep, 4) ]]">

                    <div class="form-box tiles-2">

                        <pl-input id="confirmPasswordInput" class="tap" type="password" select-on-focus="" no-tab="[[ open ]]" on-enter="_confirmNewPassword" placeholder="[[ \$l('Confirm Master Password') ]]"></pl-input>

                        <pl-loading-button on-click="_confirmNewPassword" class="tap" no-tab="[[ open ]]">
                            <pl-icon icon="forward"></pl-icon>
                        </pl-loading-button>

                    </div>

                    <div class="hint">
                        <pl-icon icon="lock"></pl-icon>
                        <span inner-h-t-m-l="[[ _getStartedHint(2) ]]" <="" span="">
                    </span></div>

                </div>

                <div class\$="get-started-step [[ _getStartedClass(_getStartedStep, 5) ]]">

                    <div class="welcome-title animate-out">[[ \$l("All done!") ]]</div>
                    <div class="welcome-subtitle animate-out">[[ \$l("You're all set! Enjoy using Padlock!") ]]</div>

                    <pl-loading-button id="getStartedButton" on-click="_finishSetup" class="form-box tiles-2 animate-out tap start-button" no-tab="[[ open ]]">
                        <span>[[ \$l("Finish Setup") ]]</span>
                        <pl-icon icon="forward"></pl-icon>
                    </pl-loading-button>

                </div>

            </div>

            <div class="get-started-thumbs animate-in animate-out">
                <div class\$="[[ _getStartedClass(_getStartedStep, 0) ]]" on-click="_goToStep"></div>
                <div class\$="[[ _getStartedClass(_getStartedStep, 1) ]]" on-click="_goToStep"></div>
                <div class\$="[[ _getStartedClass(_getStartedStep, 3) ]]" on-click="_goToStep"></div>
                <div class\$="[[ _getStartedClass(_getStartedStep, 4) ]]" on-click="_goToStep"></div>
                <div class\$="[[ _getStartedClass(_getStartedStep, 5) ]]" on-click="_goToStep"></div>
            </div>

        </main>
`;
    }

    static get is() {
        return "pl-start-view";
    }

    static get properties() {
        return {
            newPwd: String,
            open: {
                type: Boolean,
                value: false,
                reflectToAttribute: true,
                observer: "_openChanged"
            },
            _getStartedStep: {
                type: Number,
                value: 0
            },
            _hasData: {
                type: Boolean
            },
            _hasCloudData: {
                type: Boolean,
                value: false
            },
            _mode: {
                type: String,
                reflectToAttribute: true,
                computed: "_computeMode(_hasData)"
            },
            _pwdStrength: {
                type: Object
            },
            _displayPwdStrength: {
                type: String,
                computed: "_computeDisplayPwdStrength(_pwdStrength.score)"
            }
        };
    }

    static get observers() {
        return ["_updatePwdStrength(newPwd)"];
    }

    constructor() {
        super();
        this._failCount = 0;
    }

    async ready() {
        super.ready();
        await this.dataReady();
        await this.reset();
        if (!isTouch() && this._hasData) {
            this.$.passwordInput.focus();
        }
        this._openChanged();
    }

    reset() {
        this.$.passwordInput.value = "";
        this.$.emailInput.value = "";
        this.$.newPasswordInput.value = "";
        this.$.confirmPasswordInput.value = "";
        this.$.cloudPwdInput.value = "";
        this.$.unlockButton.stop();
        this.$.getStartedButton.stop();
        this._failCount = 0;
        this._getStartedStep = 0;
        this._hasCloudData = false;
        return this._checkHasData();
    }

    focus() {
        this.$.passwordInput.focus();
    }

    _openChanged() {
        if (this.open) {
            this.animateCascade(this.root.querySelectorAll(`main.${this._mode} .animate-out`), {
                animation: "fade",
                duration: 400,
                fullDuration: 600,
                initialDelay: 0,
                fill: "forwards",
                easing: "cubic-bezier(1, 0, 0.2, 1)",
                clear: 3000
            });
        } else {
            this.animateCascade(this.root.querySelectorAll(`main.${this._mode} .animate-in`), {
                animation: "reveal",
                duration: 1000,
                fullDuration: 1500,
                initialDelay: 300,
                fill: "backwards",
                clear: 3000
            });
        }
    }

    _startSetup() {
        this._getStartedStep = 1;
        if (!isTouch()) {
            this.$.emailInput.focus();
        }

        track("Setup: Start");
    }

    _enterEmail() {
        this.$.emailInput.blur();
        if (this.$.emailInput.invalid) {
            this.alert(this.$.emailInput.validationMessage || $l("Please enter a valid email address!"), {
                type: "warning"
            }).then(() => this.$.emailInput.focus());
            return;
        }

        this.$.emailButton.start();
        stats.set({ pairingSource: "Setup" });

        this.connectCloud(this.$.emailInput.value)
            .then(() => {
                this.$.emailButton.success();
                this._getStartedStep = 2;
                this.$.codeInput.value = "";
                if (!isTouch()) {
                    this.$.codeInput.focus();
                }
            })
            .catch(() => this.$.emailButton.fail());

        track("Setup: Email", { Skipped: false, Email: this.$.emailInput.value });
    }

    _enterCode() {
        if (this._checkingCode) {
            return;
        }

        if (this.$.codeInput.invalid) {
            this.alert($l("Please enter the login code sent to you via email!"), { type: "warning" });
            return;
        }

        this._checkingCode = true;

        this.$.codeButton.start();
        this.activateToken(this.$.codeInput.value)
            .then(success => {
                if (success) {
                    return this.hasCloudData().then(hasData => {
                        this._checkingCode = false;
                        this.$.codeButton.success();
                        this._hasCloudData = hasData;
                        return this._connected();
                    });
                } else {
                    this._checkingCode = false;
                    this._rumble();
                    this.$.codeButton.fail();
                }
            })
            .catch(e => {
                this._checkingCode = false;
                this._rumble();
                this.$.codeButton.fail();
                this._handleCloudError(e);
            });

        track("Setup: Code", { Email: this.$.emailInput.value });
    }

    _connected() {
        setTimeout(() => {
            this._getStartedStep = 3;
            if (!isTouch()) {
                this.$.newPasswordInput.focus();
            }
        }, 50);
    }

    _cancelActivation() {
        this.cancelConnect();
        this.$.codeInput.value = "";
        this._getStartedStep = 1;
    }

    _skipEmail() {
        this.$.emailInput.value = "";
        this._getStartedStep = 3;
        if (!isTouch()) {
            this.$.newPasswordInput.focus();
        }

        track("Setup: Email", { Skipped: true });
    }

    async _enterNewPassword() {
        this.$.newPasswordInput.blur();
        const pwd = this.$.newPasswordInput.value;

        if (!pwd) {
            this.alert("Please enter a master password!").then(() => this.$.newPasswordInput.focus());
            return;
        }

        const next = () => {
            this._getStartedStep = 4;
            if (!isTouch()) {
                this.$.confirmPasswordInput.focus();
            }

            track("Setup: Choose Password");
        };

        const strength = await passwordStrength(pwd);
        if (strength.score < 2) {
            this.choose(
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
            ).then(choice => {
                switch (choice) {
                    case 0:
                        this._openPwdHowto();
                        break;
                    case 1:
                        this.$.newPasswordInput.focus();
                        break;
                    case 2:
                        next();
                        break;
                }
            });
            return;
        }

        next();
    }

    _confirmNewPassword() {
        this.$.confirmPasswordInput.blur();
        if (this.$.confirmPasswordInput.value !== this.$.newPasswordInput.value) {
            this.choose(
                $l("The password you entered does not match the original one!"),
                [$l("Try Again"), $l("Change Password")],
                { type: "warning" }
            ).then(choice => {
                switch (choice) {
                    case 0:
                        this.$.confirmPasswordInput.focus();
                        break;
                    case 1:
                        this._getStartedStep = 3;
                        this.$.newPasswordInput.focus();
                        break;
                }
            });
            return;
        }

        this._getStartedStep = 5;

        track("Setup: Confirm Password");
    }

    _computeMode() {
        return this._hasData ? "unlock" : "get-started";
    }

    async _checkHasData() {
        this._hasData = await this.hasData();
    }

    _finishSetup() {
        this._initializeData();

        track("Setup: Finish");
    }

    _initializeData() {
        this.$.getStartedButton.start();
        if (this._initializing) {
            return;
        }
        this._initializing = true;

        const password = this.cloudSource.password || this.$.newPasswordInput.value;
        this.cloudSource.password = password;

        const promises = [this.initData(password), wait(1000)];

        if (this.settings.syncConnected && !this._hasCloudData) {
            promises.push(this.collection.save(this.cloudSource));
        }

        Promise.all(promises).then(() => {
            this.$.getStartedButton.success();
            this.$.newPasswordInput.blur();
            this._initializing = false;
        });
    }

    _promptResetData(message) {
        this.prompt(message, $l("Type 'RESET' to confirm"), "text", $l("Reset App")).then(value => {
            if (value == null) {
                return;
            }
            if (value.toUpperCase() === "RESET") {
                this.resetData();
            } else {
                this.alert($l("You didn't type 'RESET'. Refusing to reset the app."));
            }
        });
    }

    _unlock() {
        const password = this.$.passwordInput.value;

        if (!password) {
            this.alert($l("Please enter your password!")).then(() => this.$.passwordInput.focus());
            return;
        }

        this.$.passwordInput.blur();
        this.$.unlockButton.start();

        if (this._unlocking) {
            return;
        }
        this._unlocking = true;

        Promise.all([this.loadData(password), wait(1000)])
            .then(() => {
                this.$.unlockButton.success();
                this._unlocking = false;
            })
            .catch(e => {
                this.$.unlockButton.fail();
                this._unlocking = false;
                switch (e.code) {
                    case "decryption_failed":
                        this._rumble();
                        this._failCount++;
                        if (this._failCount > 2) {
                            this.promptForgotPassword().then(doReset => {
                                if (doReset) {
                                    this.resetData();
                                }
                            });
                        } else {
                            this.$.passwordInput.focus();
                        }
                        break;
                    case "unsupported_container_version":
                        this.confirm(
                            $l(
                                "It seems the data stored on this device was saved with a newer version " +
                                    "of Padlock and can not be opened with the version you are currently running. " +
                                    "Please install the latest version of Padlock or reset the data to start over!"
                            ),
                            $l("Check For Updates"),
                            $l("Reset Data")
                        ).then(confirmed => {
                            if (confirmed) {
                                checkForUpdates();
                            } else {
                                this._promptResetData(
                                    $l(
                                        "Are you sure you want to reset the app? " +
                                            "WARNING: This will delete all your data!"
                                    )
                                );
                            }
                        });
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
            });
    }

    async _updatePwdStrength(newPwd) {
        this._pwdStrength = newPwd ? await passwordStrength(newPwd) : null;
    }

    _computeDisplayPwdStrength(score = -1) {
        const strength = score === -1 ? "" : score < 2 ? $l("weak") : score < 4 ? $l("medium") : $l("strong");
        return strength && $l("strength: {0}", strength);
    }

    _getStartedHint(step) {
        return [
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
    }

    _getStartedClass(currStep, step) {
        return currStep > step ? "left" : currStep < step ? "right" : "center";
    }

    _goToStep(e) {
        const s = Array.from(this.root.querySelectorAll(".get-started-thumbs > *")).indexOf(e.target);
        if (s < this._getStartedStep) {
            this._getStartedStep = s;
        }
    }

    _openProductPage() {
        getAppStoreLink().then(link => window.open(link, "_system"));
    }

    _openPwdHowto() {
        window.open("https://padlock.io/howto/choose-master-password/", "_system");
    }

    _rumble() {
        this.animateElement(this.root.querySelector(`main.${this._mode} .hero`), {
            animation: "rumble",
            duration: 200,
            clear: true
        });
    }

    _enterCloudPassword() {
        if (this._restoringCloud) {
            return;
        }

        const password = this.$.cloudPwdInput.value;

        if (!password) {
            this.alert($l("Please enter your password!")).then(() => this.$.cloudPwdInput.focus());
            return;
        }

        this.$.cloudPwdInput.blur();
        this.$.cloudPwdButton.start();
        this._restoringCloud = true;

        this.cloudSource.password = password;
        this.collection
            .fetch(this.cloudSource)
            .then(() => {
                this.$.cloudPwdButton.success();
                this._restoringCloud = false;
                this._getStartedStep = 5;
            })
            .catch(e => {
                this.$.cloudPwdButton.fail();
                this._restoringCloud = false;

                if (e.code === "decryption_failed") {
                    this._rumble();
                } else {
                    this._handleCloudError(e);
                }
            });

        track("Setup: Remote Password", { Email: this.settings.syncEmail });
    }

    _forgotCloudPassword() {
        this.forgotCloudPassword().then(() => {
            this._hasCloudData = false;
            this._connected();
        });
    }
}

window.customElements.define(StartView.is, StartView);
