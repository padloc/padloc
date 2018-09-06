import { getClipboard } from "@padlock/core/lib/platform.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { Record } from "@padlock/core/lib/data.js";
import { Store } from "@padlock/core/lib/store.js";
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
import { shared } from "../styles";
import { View } from "./view.js";
import { promptPassword, alert, choose, confirm, prompt, exportRecords } from "../dialog";
import { animateCascade } from "../animation";
import { app, router } from "../init.js";
import { element, html, property, query, listen } from "./base.js";
import "./icon.js";
import { Slider } from "./slider.js";
import { ToggleButton } from "./toggle-button.js";
import { Input } from "./input.js";

@element("pl-settings-view")
export class SettingsView extends View {
    @property() store: Store;

    @query("#importFile") _fileInput: HTMLInputElement;

    @listen("settings-changed", app)
    _settingsChanged() {
        this.requestRender();
    }

    _render() {
        const { settings, loggedIn } = app;
        const isDesktop = isElectron();
        const dbPath = "";

        return html`
        ${shared}

        <style>

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

            #customServerUrlInput:not([invalid]) + .url-warning {
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
            <pl-icon icon="close" class="tap" on-click="${() => router.go("")}"></pl-icon>
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
                    reverse>
                </pl-toggle-button>

                <pl-slider
                    id="autoLockDelaySlider"
                    min="1"
                    max="10"
                    step="1"
                    value="${settings.autoLockDelay}"
                    unit="${$l(" min")}"
                    label="${$l("After")}"
                    hidden?="${!settings.autoLock}"
                </pl-slider>

            </section>

            <section>

                <div class="section-header">${$l("Synchronization")}</div>

                <div>

                    <pl-toggle-button
                        id="autoSyncButton"
                        active="${settings.autoSync}"
                        label="${$l("Sync Automatically")}"
                        reverse
                        class="tap">
                    </pl-toggle-button>

                </div>

                <pl-toggle-button
                    id="customServerButton"
                    active="${settings.customServer}"
                    label="${$l("Use Custom Server")}"
                    reverse
                    class="tap"
                    on-change="${(e: CustomEvent) => this._toggleCustomServer(e)}">
                </pl-toggle-button>

                <div class="tap" hidden?="${!settings.customServer}" disabled?="${loggedIn}">

                    <pl-input
                        id="customServerUrlInput"
                        placeholder="${$l("Enter Custom URL")}"
                        value="${settings.customServerUrl}"
                        pattern="^https://[^\\s/$.?#].[^\\s]*$"
                        required>
                    </pl-input>

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
                    on-change="${() => this._desktopSettingsChanged()}">
                </pl-toggle-button>

                <pl-toggle-button
                    id="betaReleasesButton"
                    label="${$l("Install Beta Releases")}"
                    class="tap"
                    reverse
                    on-change="${() => this._desktopSettingsChanged()}">
                </pl-toggle-button>

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

                    <div><strong>Padlock ${app.version}</strong></div>

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
            hidden>
`;
    }

    // connectedCallback() {
    //     // TODO: intergrate electron settings
    //     super.connectedCallback();
    //     if (isElectron()) {
    //         const desktopSettings = getDesktopSettings().get();
    //         this.$.autoUpdatesButton.active = desktopSettings.autoDownloadUpdates;
    //         this.$.betaReleasesButton.active = desktopSettings.allowPrerelease;
    //     }
    // }

    _activated() {
        animateCascade(this.$$("section"), { initialDelay: 200 });
    }

    @listen("change")
    private _updateSettings() {
        app.setSettings({
            autoLock: (this.$("#autoLockButton") as ToggleButton).active,
            autoLockDelay: (this.$("#autoLockDelaySlider") as Slider).value,
            autoSync: (this.$("#autoSyncButton") as ToggleButton).active,
            customServer: (this.$("#customServerButton") as ToggleButton).active,
            customServerUrl: ((this.$("#customServerUrlInput") as any) as Input).value
        });
    }

    //* Opens the change password dialog and resets the corresponding input elements
    private async _changePassword() {
        // TODO
        const success = false;
        // const success =
        //     !app.password ||
        //     (await promptPassword(
        //         app.password,
        //         $l("Are you sure you want to change your master password? Enter your current password to continue!"),
        //         $l("Confirm"),
        //         $l("Cancel")
        //     ));

        if (!success) {
            return;
        }

        const newPwd = await prompt($l("Now choose a new master password!"), {
            placeholder: $l("Enter New Password"),
            type: "password",
            validate: async (val: string) => {
                if (val === "") {
                    throw $l("Please enter a password!");
                }
                return val;
            }
        });

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

        await app.setPassword(newPwd);
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

    private _openWebsite() {
        window.open("https://padlock.io", "_system");
    }

    private _sendMail() {
        window.open("mailto:support@padlock.io", "_system");
    }

    private async _resetData() {
        // TODO
        // const confirmed = await promptPassword(
        //     app.password!,
        //     $l(
        //         "Are you sure you want to delete all your data and reset the app? Enter your " +
        //             "master password to continue!"
        //     ),
        //     $l("Reset App")
        // );
        //
        // if (confirmed) {
        //     return app.reset();
        // }
    }

    private async _import() {
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
                this._fileInput.click();
                break;
        }
    }

    private async _importFile() {
        const file = this._fileInput.files![0];
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await this._importString(reader.result as string);
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

            this._fileInput.value = "";
        };

        reader.readAsText(file);
    }

    private async _importFromClipboard() {
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

    private async _importString(rawStr: string): Promise<void> {
        const isPadlock = imp.isFromPadlock(rawStr);
        const isLastPass = imp.isFromLastPass(rawStr);
        const isCSV = await imp.isCSV(rawStr);
        let records: Record[] = [];

        if (isPadlock) {
            const pwd = await prompt($l("This file is protected by a password."), {
                placeholder: $l("Enter Password"),
                type: "password"
            });

            if (pwd === null) {
                return;
            }

            // TODO: Does not seem to work
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
            app.addRecords(this.store, records);
            // this.dispatch("data-imported", { records: records });
            alert($l("Successfully imported {0} records.", records.length.toString()), { type: "success" });
        }
    }

    private _openSource() {
        window.open("https://github.com/maklesoft/padlock/", "_system");
    }

    private async _promptReview() {
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

    private _desktopSettingsChanged() {
        getDesktopSettings().set({
            autoDownloadUpdates: (this.$("autoUpdatesButton") as ToggleButton).active,
            allowPrerelease: (this.$("betaReleasesButton") as ToggleButton).active
        });
    }

    private _checkForUpdates() {
        checkForUpdates();
    }

    private _saveDBAs() {
        saveDBAs();
    }

    private _loadDB() {
        loadDB();
    }

    private _export() {
        exportRecords(Array.from(this.store.collection));
    }

    private async _toggleCustomServer(e: CustomEvent) {
        const el = e.target as ToggleButton;
        if (app.loggedIn) {
            e.stopPropagation();
            await alert($l("Please log out of the current server first!"));
            el.active = !el.active;
            return;
        }

        if (el.active) {
            const confirmed = confirm(
                $l(
                    "Are you sure you want to use a custom server for synchronization? " +
                        "This option is only recommended for advanced users!"
                ),
                $l("Continue")
            );

            if (confirmed) {
                this._updateSettings();
            } else {
                el.active = false;
            }
        } else {
            this._updateSettings();
        }
    }
}
