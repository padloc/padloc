import "../styles/shared.js";
import { applyMixins } from "@padlock/core/lib/util.js";
import { getClipboard } from "@padlock/core/lib/platform.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import * as imp from "@padlock/core/lib/import.js";
import "./dialog-export.js";
import "./icon.js";
import "./slider.js";
import "./toggle-button.js";
import { LocaleMixin, DialogMixin, StateMixin, AnimationMixin, SyncMixin } from "../mixins";
import {
    isCordova,
    getReviewLink,
    isTouch,
    getDesktopSettings,
    checkForUpdates,
    saveDBAs,
    loadDB,
    isElectron
} from "@padlock/core/lib/platform.js";
import { LitElement, html } from "@polymer/lit-element";
import sharedStyles from "../styles/shared.js";

class SettingsView extends applyMixins(LitElement, StateMixin, LocaleMixin, DialogMixin, AnimationMixin, SyncMixin) {
    static get properties() {
        return { settings: Object };
    }

    _stateChanged(state) {
        this.settings = state.settings;
        this.requestRender();
    }

    _render({ settings = {} }) {
        console.log("render", arguments);
        // const settings = props.state && props.state.settings;
        const isDesktop = isElectron();
        const isSubValid = false;
        const isTrialExpired = false;
        const isSubCanceled = false;
        // const dbPath = desktopSettings.dbPath;
        const dbPath = "";

        return html`
        <style>
            ${sharedStyles}

            @keyframes beat {
                0% { transform: scale(1); }
                5% { transform: scale(1.4); }
                15% { transform: scale(1); }
            }

            :host {
                @apply --fullbleed;
                display: flex;
                flex-direction: column;
            }

            main {
                background: var(--color-quaternary);
            }

            section {
                transform: translate3d(0, 0, 0);
            }

            section .info {
                display: block;
                font-size: var(--font-size-small);
                text-align: center;
                line-height: normal;
                padding: 15px;
                height: auto;
            }

            button {
                width: 100%;
                box-sizing: border-box;
            }

            button > pl-icon {
                position: absolute;
            }

            pl-toggle-button {
                display: block;
            }

            input[type="file"] {
                display: none;
            }

            label {
                line-height: 0;
            }

            .padlock-heart {
                display: inline-block;
                margin: 0 5px;
                animation: beat 5s infinite;
            }

            .padlock-heart::before {
                font-family: "FontAwesome";
                content: "\\f004";
            }

            .made-in {
                font-size: var(--font-size-tiny);
                margin-top: 3px;
            }

            .db-path {
                font-weight: bold;
                margin-top: 5px;
                word-wrap: break-word;
                font-size: var(--font-size-tiny);
            }

            #customUrlInput:not([invalid]) + .url-warning {
                display: none;
            }

            .url-warning {
                font-size: var(--font-size-small);
                text-align: center;
                padding: 15px;
                border-top: solid 1px var(--border-color);
                color: var(--color-error);
            }

            .feature-locked {
                font-size: var(--font-size-tiny);
                color: var(--color-error);
                margin: -14px 15px 12px 15px;
            }
        </style>

        <header>
            <pl-icon icon="close" class="tap" on-click="${e => this._back(e)}"></pl-icon>
            <div class="title">${$l("Settings")}</div>
            <pl-icon></pl-icon>
        </header>

        <main>

            <section>

                <div class="section-header">${$l("Auto Lock")}</div>
                <pl-toggle-button id="autoLock" active="${settings.autoLock}" label="${$l(
            "Lock Automatically"
        )}" class="tap" reverse="" on-change="${e => this._updateSettings(e)}"></pl-toggle-button>
                <pl-slider min="1" max="10" value="${settings.autoLockDelay}" step="1" unit="${$l(" min")}" label="${$l(
            "After"
        )}" hidden$="${!settings.autoLock}" on-change="${e => this._updateSettings(e)}"></pl-slider>

            </section>

            <section>
                <div class="section-header">${$l("Synchronization")}</div>
                <div disabled$="${!isSubValid}">
                    <pl-toggle-button active="${settings.syncAuto}" label="${$l(
            "Sync Automatically"
        )}" reverse="" class="tap" on-change="${e => this._updateSettings(e)}"></pl-toggle-button>
                    <div class="feature-locked" hidden$="${settings.syncConnected}">${$l(
            "Log in to enable auto sync!"
        )}</div>
                    <div class="feature-locked" hidden$="${!isTrialExpired}">${$l("Upgrade to enable auto sync!")}</div>
                    <div class="feature-locked" hidden$="${!isSubCanceled}">${$l("Upgrade to enable auto sync!")}</div>
                </div>
                <pl-toggle-button active="${settings.syncCustomHost}" label="${$l(
            "Use Custom Server"
        )}" reverse="" on-change="${e => this._customHostChanged(e)}" class="tap" disabled$="${
            settings.syncConnected
        }"></pl-toggle-button>
                <div class="tap" hidden$="${!settings.syncCustomHost}" disabled$="${settings.syncConnected}">
                    <pl-input id="customUrlInput" placeholder="${$l("Enter Custom URL")}" value="${
            settings.syncHostUrl
        }" pattern="^https://[^\\s/$.?#].[^\\s]*$" required="" on-change="${e => this._updateSettings(e)}"></pl-input>
                    <div class="url-warning">
                        <strong>${$l("Invalid URL")}</strong> -
                        ${$l(
                            "Make sure that the URL is of the form https://myserver.tld:port. Note that a https connection is required."
                        )}
                    </div>
                </div>
            </section>

            <section>
                <button on-click="${e => this._changePassword(e)}" class="tap">${$l("Change Master Password")}</button>
                <button on-click="${e => this._resetData(e)}" class="tap">${$l("Reset App")}</button>
                <button class="tap" on-click="${e => this._import(e)}">${$l("Import...")}</button>
                <button class="tap" on-click="${e => this._export(e)}">${$l("Export...")}
            </button></section>

            <section hidden$="${!isDesktop}">
                <div class="section-header">${$l("Updates")}</div>
                <pl-toggle-button id="autoUpdatesButton" label="${$l(
                    "Automatically Install Updates"
                )}" class="tap" reverse="" on-change="${e => this._desktopSettingsChanged(e)}"></pl-toggle-button>
                <pl-toggle-button id="betaReleasesButton" label="${$l(
                    "Install Beta Releases"
                )}" class="tap" reverse="" on-change="${e => this._desktopSettingsChanged(e)}"></pl-toggle-button>
                <button on-click="${e => this._checkForUpdates(e)}" class="tap">${$l("Check For Updates...")}</button>
            </section>

            <section hidden$="${!isDesktop}">
                <div class="section-header">${$l("Database")}</div>
                <div class="info">
                    <div>${$l("Current Location:")}</div>
                    <div class="db-path">${dbPath}</div>
                </div>
                <button on-click="${e => this._saveDBAs(e)}" class="tap">${$l("Change Location...")}</button>
                <button on-click="${e => this._loadDB(e)}" class="tap">${$l("Load Different Database...")}</button>
            </section>

            <section>
                <button class="info tap" on-click="${e => this._openSource(e)}">
                    <div><strong>Padlock ${settings.version}</strong></div>
                    <div class="made-in">Made with ♥ in Germany</div>
                </button>
                <button on-click="${e => this._openWebsite(e)}" class="tap">${$l("Website")}</button>
                <button on-click="${e => this._sendMail(e)}" class="tap">${$l("Support")}</button>
                <button on-click="${e => this._promptReview(e)}" class="tap">
                    <span>${$l("I")}</span><div class="padlock-heart"></div><span>Padlock</span>
                </button>
            </section>
        </main>

        <div class="rounded-corners"></div>

        <input type="file" name="importFile" id="importFile" on-change="${e =>
            this._importFile(e)}" accept="text/plain,.csv,.pls,.set" hidden="">
`;
    }

    // connectedCallback() {
    //     super.connectedCallback();
    //     if (isElectron()) {
    //         const desktopSettings = getDesktopSettings().get();
    //         this.$.autoUpdatesButton.active = desktopSettings.autoDownloadUpdates;
    //         this.$.betaReleasesButton.active = desktopSettings.allowPrerelease;
    //     }
    // }

    animate() {
        this.animateCascade(this.shadowRoot.querySelectorAll("section"), { initialDelay: 200 });
    }

    _updateSettings() {
        this.app.updateSettings({
            autoLock: this.shadowRoot.querySelector("#autoLock").active
        });
    }

    _back() {
        this.dispatchEvent(new CustomEvent("settings-back"));
    }

    //* Opens the change password dialog and resets the corresponding input elements
    _changePassword() {
        let newPwd;
        return this.promptPassword(
            this.password,
            $l("Are you sure you want to change your master password? Enter your " + "current password to continue!"),
            $l("Confirm"),
            $l("Cancel")
        )
            .then(success => {
                if (success) {
                    return this.prompt(
                        $l("Now choose a new master password!"),
                        $l("Enter New Password"),
                        "password",
                        $l("Confirm"),
                        $l("Cancel"),
                        false,
                        val => {
                            if (val === "") {
                                return Promise.reject($l("Please enter a password!"));
                            }
                            return Promise.resolve(val);
                        }
                    );
                } else {
                    return Promise.reject();
                }
            })
            .then(pwd => {
                if (pwd === null) {
                    return Promise.reject();
                }
                newPwd = pwd;
                return this.promptPassword(pwd, $l("Confirm your new master password!"), $l("Confirm"), $l("Cancel"));
            })
            .then(success => {
                if (success) {
                    return this.setPassword(newPwd);
                } else {
                    return Promise.reject();
                }
            })
            .then(() => {
                if (this.settings.syncConnected) {
                    return this.confirm(
                        $l(
                            "Do you want to update the password for you online account {0} as well?",
                            this.settings.syncEmail
                        ),
                        $l("Yes"),
                        $l("No")
                    ).then(confirmed => {
                        if (confirmed) {
                            return this.setRemotePassword(this.password);
                        }
                    });
                }
            })
            .then(() => {
                this.alert($l("Master password changed successfully."), { type: "success" });
            });
    }

    _openWebsite() {
        window.open("https://padlock.io", "_system");
    }

    _sendMail() {
        window.open("mailto:support@padlock.io", "_system");
    }

    _openGithub() {
        window.open("https://github.com/maklesoft/padlock/", "_system");
    }

    _resetData() {
        this.promptPassword(
            this.password,
            $l(
                "Are you sure you want to delete all your data and reset the app? Enter your " +
                    "master password to continue!"
            ),
            $l("Reset App")
        ).then(success => {
            if (success) {
                return this.resetData();
            }
        });
    }

    _import() {
        const options = [$l("From Clipboard")];
        if (!isCordova()) {
            options.push($l("From File"));
        }
        this.choose($l("Please choose an import method!"), options, { preventDismiss: false, type: "question" }).then(
            choice => {
                switch (choice) {
                    case 0:
                        this._importFromClipboard();
                        break;
                    case 1:
                        this.$.importFile.click();
                        break;
                }
            }
        );
    }

    _importFile() {
        const file = this.$.importFile.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            this._importString(reader.result).catch(e => {
                switch (e.code) {
                    case "decryption_failed":
                        this.alert($l("Failed to open file. Did you enter the correct password?"), { type: "warning" });
                        break;
                    case "unsupported_container_version":
                        this.confirm(
                            $l(
                                "It seems the data you are trying to import was exported from a " +
                                    "newer version of Padlock and can not be opened with the version you are " +
                                    "currently running."
                            ),
                            $l("Check For Updates"),
                            $l("Cancel"),
                            { type: "info" }
                        ).then(confirmed => {
                            if (confirmed) {
                                checkForUpdates();
                            }
                        });
                        break;
                    case "invalid_csv":
                        this.alert($l("Failed to recognize file format."), { type: "warning" });
                        break;
                    default:
                        this.alert($l("Failed to open file."), { type: "warning" });
                        throw e;
                }
            });
            this.$.importFile.value = "";
        };
        reader.readAsText(file);
    }

    _importFromClipboard() {
        getClipboard()
            .then(str => this._importString(str))
            .catch(e => {
                switch (e.code) {
                    case "decryption_failed":
                        this.alert($l("Failed to decrypt data. Did you enter the correct password?"), {
                            type: "warning"
                        });
                        break;
                    default:
                        this.alert(
                            $l(
                                "No supported data found in clipboard. Please make sure to copy " +
                                    "you data to the clipboard first (e.g. via ctrl + C)."
                            ),
                            { type: "warning" }
                        );
                }
            });
    }

    async _importString(rawStr) {
        const isPadlock = imp.isFromPadlock(rawStr);
        const isSecuStore = imp.isFromSecuStore(rawStr);
        const isLastPass = imp.isFromLastPass(rawStr);
        const isCSV = await imp.isCSV(rawStr);
        return Promise.resolve()
            .then(() => {
                if (isPadlock || isSecuStore) {
                    return this.prompt(
                        $l("This file is protected by a password."),
                        $l("Enter Password"),
                        "password",
                        $l("Confirm"),
                        $l("Cancel")
                    );
                }
            })
            .then(pwd => {
                if (pwd === null) {
                    return;
                }

                if (isPadlock) {
                    return imp.fromPadlock(rawStr, pwd);
                } else if (isSecuStore) {
                    return imp.fromSecuStore(rawStr, pwd);
                } else if (isLastPass) {
                    return imp.fromLastPass(rawStr);
                } else if (isCSV) {
                    return this.choose(
                        $l(
                            "The data you want to import seems to be in CSV format. Before you continue, " +
                                "please make sure that the data is structured according to Padlocks specific " +
                                "requirements!"
                        ),
                        [$l("Review Import Guidelines"), $l("Continue"), $l("Cancel")],
                        { type: "info" }
                    ).then(choice => {
                        switch (choice) {
                            case 0:
                                window.open("https://padlock.io/howto/import/#importing-from-csv", "_system");
                                // Reopen dialog for when the user comes back from the web page
                                return this._importString(rawStr);
                            case 1:
                                return imp.fromCSV(rawStr);
                            case 2:
                                return;
                        }
                    });
                } else {
                    throw new imp.ImportError("invalid_csv");
                }
            })
            .then(records => {
                if (records) {
                    this.addRecords(records);
                    this.dispatch("data-imported", { records: records });
                    this.alert($l("Successfully imported {0} records.", records.length), { type: "success" });
                }
            });
    }

    _isMobile() {
        return isCordova();
    }

    _isTouch() {
        return isTouch();
    }

    _openSource() {
        window.open("https://github.com/maklesoft/padlock/", "_system");
    }

    _autoLockInfo() {
        return this.$l(
            "Tell Padlock to automatically lock the app after a certain period of " +
                "inactivity in case you leave your device unattended for a while."
        );
    }

    _peekValuesInfo() {
        return this.$l(
            "If enabled allows peeking at field values in the record list " +
                "by moving the mouse cursor over the corresponding field."
        );
    }

    _resetDataInfo() {
        return this.$l(
            "Want to start fresh? Reseting Padlock will delete all your locally stored data and settings " +
                "and will restore the app to the state it was when you first launched it."
        );
    }

    _promptReview() {
        this.choose(
            $l(
                "So glad to hear you like our app! Would you mind taking a second to " +
                    "let others know what you think about Padlock?"
            ),
            [$l("Rate Padlock"), $l("No Thanks")]
        ).then(choice => {
            if (choice === 0) {
                getReviewLink(0).then(link => window.open(link, "_system"));
            }
        });
    }

    _desktopSettingsChanged() {
        getDesktopSettings().set({
            autoDownloadUpdates: this.$.autoUpdatesButton.active,
            allowPrerelease: this.$.betaReleasesButton.active
        });
    }

    _checkForUpdates() {
        checkForUpdates();
    }

    _saveDBAs() {
        saveDBAs();
    }

    _loadDB() {
        loadDB();
    }

    _export() {
        const exportDialog = this.getSingleton("pl-dialog-export");
        exportDialog.export(this.records);
    }

    _autoSyncInfoText() {
        return $l(
            "Enable Auto Sync to automatically synchronize your data with " +
                "your Padlock online account every time you make a change!"
        );
    }

    _customHostChanged() {
        if (this.settings.syncCustomHost) {
            this.confirm(
                $l(
                    "Are you sure you want to use a custom server for synchronization? " +
                        "This option is only recommended for advanced users!"
                ),
                $l("Continue")
            ).then(confirmed => {
                if (confirmed) {
                    this._updateSettings();
                } else {
                    this.set("settings.syncCustomHost", false);
                }
            });
        } else {
            this._updateSettings();
        }
    }
}

window.customElements.define("pl-settings-view", SettingsView);
