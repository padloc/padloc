import { html } from "@polymer/lit-element";
import { getClipboard } from "@padlock/core/lib/platform.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { Record } from "@padlock/core/lib/data.js";
import { Err, ErrorCode } from "@padlock/core/lib/error.js";
import * as imp from "@padlock/core/lib/import.js";
import {
    isCordova,
    getReviewLink,
    getDesktopSettings,
    checkForUpdates,
    saveDBAs,
    loadDB,
    isElectron
} from "@padlock/core/lib/platform.js";
import sharedStyles from "../styles/shared.js";
import { View } from "./view.js";
import { promptPassword, alert, choose, confirm, prompt } from "../dialog";
import { animateCascade } from "../animation";
import { app } from "../init.js";
import "./dialog-export.js";
import "./icon.js";
import "./slider.js";
import "./toggle-button.js";

class SettingsView extends View {
    _render() {
        const { settings, account, session } = app;
        const isDesktop = isElectron();
        const subStatus = (account && account.subscription && account.subscription.status) || "";
        const loggedIn = session && session.active;
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
            <pl-icon icon="close" class="tap" on-click="${() => this._back()}"></pl-icon>
            <div class="title">${$l("Settings")}</div>
            <pl-icon></pl-icon>
        </header>

        <main>

            <section>

                <div class="section-header">${$l("Auto Lock")}</div>

                <pl-toggle-button
                    id="autoLockButton"
                    active="${settings.autoLock}"
                    label="${$l("Lock Automatically")}"
                    class="tap"
                    reverse
                    on-change="${() => this._updateSettings()}"
                ></pl-toggle-button>

                <pl-slider
                    id="autoLockDelaySlider"
                    min="1"
                    max="10"
                    step="1" 
                    value="${settings.autoLockDelay}"
                    unit="${$l(" min")}"
                    label="${$l("After")}"
                    hidden?="${!settings.autoLock}"
                    on-change="${() => this._updateSettings()}"
                ></pl-slider>

            </section>

            <section>

                <div class="section-header">${$l("Synchronization")}</div>

                <div disabled$="${subStatus !== "active" && subStatus !== "trialing"}">

                    <pl-toggle-button
                        id="autoSyncButton"
                        active="${settings.autoSync}"
                        label="${$l("Sync Automatically")}"
                        reverse
                        class="tap"
                        on-change="${() => this._updateSettings()}"
                    ></pl-toggle-button>

                    <div class="feature-locked" hidden?="${loggedIn}">
                        ${$l("Log in to enable auto sync!")}
                    </div>

                    <div class="feature-locked" hidden?="${subStatus !== "trial_expired"}">
                        ${$l("Upgrade to enable auto sync!")}
                    </div>

                    <div class="feature-locked" hidden?="${subStatus !== "canceled"}">
                        ${$l("Upgrade to enable auto sync!")}
                    </div>

                </div>

                <pl-toggle-button
                    id="customServerButton"
                    active="${settings.customServer}"
                    label="${$l("Use Custom Server")}"
                    reverse 
                    on-change="${() => this._toggleCustomServer()}"
                    class="tap"
                ></pl-toggle-button>

                <div class="tap" hidden?="${!settings.customServer}" disabled$="${loggedIn}">

                    <pl-input
                        id="customServerUrlInput"
                        placeholder="${$l("Enter Custom URL")}"
                        value="${settings.customServerUrl}"
                        pattern="^https://[^\\s/$.?#].[^\\s]*$"
                        required
                        on-change="${() => this._updateSettings()}"
                    ></pl-input>

                    <div class="url-warning">
                        <strong>${$l("Invalid URL")}</strong> -
                        ${$l(
                            "Make sure that the URL is of the form https://myserver.tld:port. Note that a https connection is required."
                        )}
                    </div>

                </div>

            </section>

            <section>

                <button on-click="${() => this._changePassword()}" class="tap">${$l("Change Master Password")}</button>

                <button on-click="${() => this._resetData()}" class="tap">${$l("Reset App")}</button>

                <button class="tap" on-click="${() => this._import()}">${$l("Import...")}</button>

                <button class="tap" on-click="${() => this._export()}">${$l("Export...")}

            </button></section>

            <section hidden?="${!isDesktop}">

                <div class="section-header">${$l("Updates")}</div>

                <pl-toggle-button
                    id="autoUpdatesButton"
                    label="${$l("Automatically Install Updates")}"
                    class="tap"
                    reverse
                    on-change="${() => this._desktopSettingsChanged()}"
                ></pl-toggle-button>

                <pl-toggle-button
                    id="betaReleasesButton"
                    label="${$l("Install Beta Releases")}"
                    class="tap"
                    reverse
                    on-change="${() => this._desktopSettingsChanged()}"
                ></pl-toggle-button>

                <button on-click="${() => this._checkForUpdates()}" class="tap">${$l("Check For Updates...")}</button>

            </section>

            <section hidden?="${!isDesktop}">

                <div class="section-header">${$l("Database")}</div>

                <div class="info">

                    <div>${$l("Current Location:")}</div>

                    <div class="db-path">${dbPath}</div>

                </div>

                <button on-click="${() => this._saveDBAs()}" class="tap">${$l("Change Location...")}</button>

                <button on-click="${() => this._loadDB()}" class="tap">${$l("Load Different Database...")}</button>

            </section>

            <section>

                <button class="info tap" on-click="${() => this._openSource()}">

                    <div><strong>Padlock ${settings.version}</strong></div>

                    <div class="made-in">Made with ♥ in Germany</div>

                </button>

                <button on-click="${() => this._openWebsite()}" class="tap">${$l("Website")}</button>

                <button on-click="${() => this._sendMail()}" class="tap">${$l("Support")}</button>

                <button on-click="${() => this._promptReview()}" class="tap">

                    <span>${$l("I")}</span><div class="padlock-heart"></div><span>Padlock</span>

                </button>

            </section>

        </main>

        <div class="rounded-corners"></div>

        <input
            type="file"
            name="importFile"
            id="importFile"
            on-change="${() => this._importFile()}"
            accept="text/plain,.csv,.pls,.set"
            hidden
        >
`;
    }

    get fileInput() {
        return this.shadowRoot.querySelector("#importFile");
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
        animateCascade(this.shadowRoot.querySelectorAll("section"), { initialDelay: 200 });
    }

    _updateSettings() {
        app.setSettings({
            autoLock: this.shadowRoot.querySelector("#autoLockButton").active,
            autoLockDelay: this.shadowRoot.querySelector("#autoLockDelaySlider").value,
            autoSync: this.shadowRoot.querySelector("#autoSyncButton").active,
            customServer: this.shadowRoot.querySelector("#customServerButton").active,
            customServerUrl: this.shadowRoot.querySelector("#customServerUrlInput").value
        });
    }

    _back() {
        this.dispatchEvent(new CustomEvent("settings-back"));
    }

    //* Opens the change password dialog and resets the corresponding input elements
    async _changePassword() {
        const success = await promptPassword(
            this.password,
            $l("Are you sure you want to change your master password? Enter your current password to continue!"),
            $l("Confirm"),
            $l("Cancel")
        );

        if (!success) {
            return;
        }

        const newPwd = await prompt(
            $l("Now choose a new master password!"),
            $l("Enter New Password"),
            "password",
            $l("Confirm"),
            $l("Cancel"),
            false,
            async (val: string) => {
                if (val === "") {
                    throw $l("Please enter a password!");
                }
                return val;
            }
        );

        if (newPwd === null) {
            return;
        }

        const confirmed = await promptPassword(
            newPwd,
            $l("Confirm your new master password!"),
            $l("Confirm"),
            $l("Cancel")
        );

        if (!confirmed) {
            return;
        }

        await this.app.setPassword(newPwd);
        // if (this.settings.syncConnected) {
        //         return this.confirm(
        //             $l(
        //                 "Do you want to update the password for you online account {0} as well?",
        //                 this.settings.syncEmail
        //             ),
        //             $l("Yes"),
        //             $l("No")
        //         ).then(confirmed => {
        //             if (confirmed) {
        //                 return this.setRemotePassword(this.password);
        //             }
        //         });
        //     }
        // })
        alert($l("Master password changed successfully."), { type: "success" });
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

    async _resetData() {
        const confirmed = await promptPassword(
            this.app.password!,
            $l(
                "Are you sure you want to delete all your data and reset the app? Enter your " +
                    "master password to continue!"
            ),
            $l("Reset App")
        );

        if (confirmed) {
            return this.app.reset();
        }
    }

    async _import() {
        const options = [$l("From Clipboard")];
        if (!isCordova()) {
            options.push($l("From File"));
        }
        const choice = await choose($l("Please choose an import method!"), options, {
            preventDismiss: false,
            type: "question"
        });
        switch (choice) {
            case 0:
                this._importFromClipboard();
                break;
            case 1:
                this.fileInput.click();
                break;
        }
    }

    async _importFile() {
        const file = this.fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await this._importString(reader.result);
            } catch (e) {
                switch (e.code) {
                    case "decryption_failed":
                        alert($l("Failed to open file. Did you enter the correct password?"), { type: "warning" });
                        break;
                    case "unsupported_container_version":
                        const confirmed = await confirm(
                            $l(
                                "It seems the data you are trying to import was exported from a " +
                                    "newer version of Padlock and can not be opened with the version you are " +
                                    "currently running."
                            ),
                            $l("Check For Updates"),
                            $l("Cancel"),
                            { type: "info" }
                        );
                        if (confirmed) {
                            checkForUpdates();
                        }
                        break;
                    case "invalid_csv":
                        alert($l("Failed to recognize file format."), { type: "warning" });
                        break;
                    default:
                        alert($l("Failed to open file."), { type: "warning" });
                        throw e;
                }
            }

            this.fileInput.value = "";
        };

        reader.readAsText(file);
    }

    async _importFromClipboard() {
        try {
            await this._importString(await getClipboard());
        } catch (e) {
            switch (e.code) {
                case "decryption_failed":
                    alert($l("Failed to decrypt data. Did you enter the correct password?"), {
                        type: "warning"
                    });
                    break;
                default:
                    alert(
                        $l(
                            "No supported data found in clipboard. Please make sure to copy " +
                                "you data to the clipboard first (e.g. via ctrl + C)."
                        ),
                        { type: "warning" }
                    );
            }
        }
    }

    async _importString(rawStr: string): Promise<void> {
        const isPadlock = imp.isFromPadlock(rawStr);
        const isLastPass = imp.isFromLastPass(rawStr);
        const isCSV = await imp.isCSV(rawStr);
        let records: Record[] = [];

        if (isPadlock) {
            const pwd = await prompt(
                $l("This file is protected by a password."),
                $l("Enter Password"),
                "password",
                $l("Confirm"),
                $l("Cancel")
            );

            if (pwd === null) {
                return;
            }
            records = await imp.fromPadlock(rawStr, pwd);
        } else if (isLastPass) {
            records = await imp.fromLastPass(rawStr);
        } else if (isCSV) {
            const choice = await choose(
                $l(
                    "The data you want to import seems to be in CSV format. Before you continue, " +
                        "please make sure that the data is structured according to Padlocks specific " +
                        "requirements!"
                ),
                [$l("Review Import Guidelines"), $l("Continue"), $l("Cancel")],
                { type: "info" }
            );
            switch (choice) {
                case 0:
                    window.open("https://padlock.io/howto/import/#importing-from-csv", "_system");
                    // Reopen dialog for when the user comes back from the web page
                    return this._importString(rawStr);
                case 1:
                    records = await imp.fromCSV(rawStr);
                    break;
                case 2:
                    return;
            }
        } else {
            throw new Err(ErrorCode.INVALID_CSV);
        }

        if (records.length) {
            this.app.addRecords(records);
            // this.dispatch("data-imported", { records: records });
            alert($l("Successfully imported {0} records.", records.length.toString()), { type: "success" });
        }
    }

    _isMobile() {
        return isCordova();
    }

    _openSource() {
        window.open("https://github.com/maklesoft/padlock/", "_system");
    }

    _autoLockInfo() {
        return $l(
            "Tell Padlock to automatically lock the app after a certain period of " +
                "inactivity in case you leave your device unattended for a while."
        );
    }

    _peekValuesInfo() {
        return $l(
            "If enabled allows peeking at field values in the record list " +
                "by moving the mouse cursor over the corresponding field."
        );
    }

    _resetDataInfo() {
        return $l(
            "Want to start fresh? Reseting Padlock will delete all your locally stored data and settings " +
                "and will restore the app to the state it was when you first launched it."
        );
    }

    async _promptReview() {
        const choice = await choose(
            $l(
                "So glad to hear you like our app! Would you mind taking a second to " +
                    "let others know what you think about Padlock?"
            ),
            [$l("Rate Padlock"), $l("No Thanks")]
        );
        if (choice === 0) {
            window.open(await getReviewLink(0), "_system");
        }
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

    async _toggleCustomServer() {
        if (app.session && app.session.active) {
            return this.alert($l("Please log out of the current server first!"));
        }

        const customHost = this.shadowRoot.querySelector("#customServerButton").active;
        if (customHost) {
            const confirmed = this.confirm(
                $l(
                    "Are you sure you want to use a custom server for synchronization? " +
                        "This option is only recommended for advanced users!"
                ),
                $l("Continue")
            );

            if (confirmed) {
                this._updateSettings();
            } else {
                this.requestRender();
            }
        } else {
            this._updateSettings();
        }
    }
}

window.customElements.define("pl-settings-view", SettingsView);
