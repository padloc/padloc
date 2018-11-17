import { getClipboard } from "@padlock/core/lib/platform.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { Err, ErrorCode } from "@padlock/core/lib/error.js";
import * as imp from "../import.js";
import { getReviewLink, checkForUpdates } from "@padlock/core/lib/platform.js";
import { shared, mixins } from "../styles";
import { promptPassword, alert, choose, confirm, prompt, exportRecords } from "../dialog";
import { app } from "../init.js";
import { BaseElement, element, html, query, listen } from "./base.js";
import "./icon.js";
import { Slider } from "./slider.js";
import { ToggleButton } from "./toggle-button.js";
import { Input } from "./input.js";

@element("pl-settings")
export class Settings extends BaseElement {
    @query("#importFile")
    _fileInput: HTMLInputElement;

    @listen("settings-changed", app)
    _settingsChanged() {
        this.requestUpdate();
    }

    render() {
        const { settings } = app;

        return html`
        ${shared}

        <style>

            @keyframes beat {
                0% { transform: scale(1); }
                5% { transform: scale(1.4); }
                15% { transform: scale(1); }
            }

            :host {
                ${mixins.fullbleed()}
                display: flex;
                flex-direction: column;
                background: var(--color-tertiary);
            }

            main {
                width: 100%;
                max-width: 500px;
                margin: 0 auto;
                padding: 15px;
            }

            section {
                margin: 20px 0;
                display: flex;
                flex-direction: column;
            }

            section > * {
                background: #fafafa;
                border-radius: 8px;
                border: solid 1px #eee;
                margin-bottom: 8px;
            }

            button {
                width: 100%;
                box-sizing: border-box;
            }

            button > pl-icon {
                position: absolute;
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
        </style>

        <header class="narrow">

            <pl-icon class="tap menu-button" icon="menu" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

            <div class="title">${$l("Settings")}</div>

            <pl-icon></pl-icon>

        </header>

        <main>

            <h1 class="wide">${$l("Settings")}</h1>

            <section>

                <pl-toggle-button
                    id="autoLockButton"
                    .active="${settings.autoLock}"
                    label="${$l("Lock Automatically")}"
                    class="tap"
                    reverse>
                </pl-toggle-button>

                <pl-slider
                    id="autoLockDelaySlider"
                    min="1"
                    max="10"
                    step="1"
                    .value="${settings.autoLockDelay}"
                    unit="${$l(" min")}"
                    label="${$l("After")}"
                    ?hidden=${!settings.autoLock}
                </pl-slider>

            </section>

            <section>

                <button @click=${() => this._changePassword()} class="tap">${$l("Change Master Password")}</button>

            </section>

            <section>

                <button class="tap" @click=${() => this._import()}>${$l("Import...")}</button>

                <button class="tap" @click=${() => this._export()}>${$l("Export...")}</button>
            
            </section>

            <section>

                <button @click=${() => this._openWebsite()} class="tap">${$l("Website")}</button>

                <button @click=${() => this._sendMail()} class="tap">${$l("Support")}</button>

                <button @click=${() => this._promptReview()} class="tap" hidden>

                    <span>${$l("I")}</span><div class="padlock-heart"></div><span>Padlock</span>

                </button>

            </section>

        </main>

        <div class="rounded-corners"></div>

        <input
            type="file"
            name="importFile"
            id="importFile"
            @change=${() => this._importFile()}
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

    @listen("change")
    _updateSettings() {
        app.setSettings({
            autoLock: (this.$("#autoLockButton") as ToggleButton).active,
            autoLockDelay: (this.$("#autoLockDelaySlider") as Slider).value
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
        alert($l("Master password changed successfully."), { type: "success" });
    }

    private _openWebsite() {
        window.open("https://padlock.io", "_system");
    }

    private _sendMail() {
        window.open("mailto:support@padlock.io", "_system");
    }

    private async _import() {
        const options = [$l("From Clipboard")];
        // TODO
        // if (!isCordova()) {
        //     options.push($l("From File"));
        // }
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
            app.addRecords(app.mainVault!, records);
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

    private _export() {
        exportRecords(Array.from(app.mainVault!.collection));
    }
}
