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

@element("pl-settings")
export class Settings extends BaseElement {
    @query("#importFile")
    _fileInput: HTMLInputElement;

    @listen("settings-changed", app)
    @listen("account-changed", app)
    _refresh() {
        this.requestUpdate();
    }

    shouldUpdate() {
        return !!app.account;
    }

    render() {
        const { settings } = app;
        const account = app.account!;

        return html`
        ${shared}

        <style>
            :host {
                ${mixins.fullbleed()}
                display: flex;
                flex-direction: column;
                background: var(--color-tertiary);
            }

            h1 {
                display: block;
                text-align: center;
            }

            main {
                width: 100%;
                max-width: 500px;
                margin: 0 auto;
                padding: 15px;
            }

            button {
                display: block;
            }

            .box {
                background: #fafafa;
                border-radius: 8px;
                border: solid 1px #eee;
                margin-bottom: 8px;
                box-sizing: border-box;
                width: 100%;
            }

            .account {
                font-size: 110%;
                display: flex;
                align-items: center;
            }

            pl-fingerprint {
                width: 60px;
                height: 60px;
                border-radius: 100%;
                border: solid 1px var(--border-color);
                margin: 15px;
            }

            .account-info {
                flex: 1;
                padding-right: 18px;
            }

            .account-email {
                ${mixins.ellipsis()}
            }

            .account-email {
                font-weight: bold;
                ${mixins.ellipsis()}
            }

            .account pl-icon {
                width: 50px;
                height: 50px;
                margin: 5px;
            }
        </style>

        <header class="narrow">

            <pl-icon class="tap menu-button" icon="menu" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

            <div class="title">${$l("Settings")}</div>

            <pl-icon></pl-icon>

        </header>

        <main>

            <h1>${$l("Account")}</h1>

            <div class="account box">

                <pl-fingerprint .key=${account.publicKey}></pl-fingerprint>

                <div class="account-info">

                    <div class="account-name">${account.name}</div>

                    <div class="account-email">${account.email}</div>

                </div>

                <pl-icon class="tap" icon="edit" @click=${() => this._editAccount()}></pl-icon>

                </div>

            </div>

            <button class="tap box" @click=${() => this._logout()}>${$l("Log Out")}</button>

            <button class="tap box" @click=${() => this._changePassword()}>${$l("Change Master Password")}</button>

            <h1>${$l("Auto Lock")}</h1>

            <pl-toggle-button
                id="autoLockButton"
                .active="${settings.autoLock}"
                label="${$l("Lock Automatically")}"
                class="box tap"
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
                class="box">
            </pl-slider>

            <h1>${$l("Import / Export")}</h1>

            <button class="box tap" @click=${() => this._import()}>${$l("Import...")}</button>

            <button class="box tap" @click=${() => this._export()}>${$l("Export...")}</button>

            <h1>${$l("Support")}</h1>

            <button @click=${() => this._openWebsite()} class="box tap">${$l("Website")}</button>

            <button @click=${() => this._sendMail()} class="box tap">${$l("Contact Support")}</button>

            <button @click=${() => this._promptReview()} class="box tap" hidden>

                <span>${$l("I")}</span><div class="padlock-heart"></div><span>Padlock</span>

            </button>

        </main>
`;
    }

    @listen("change")
    _updateSettings() {
        app.setSettings({
            autoLock: (this.$("#autoLockButton") as ToggleButton).active,
            autoLockDelay: (this.$("#autoLockDelaySlider") as Slider).value
        });
    }

    _editAccount() {
        const account = app.account!;

        prompt("", {
            title: $l("Edit Profile"),
            confirmLabel: $l("Save"),
            value: account.name,
            label: $l("Name"),
            validate: async (name: string) => {
                if (!name) {
                    throw $l("Please enter a name!");
                }
                if (name === account.name) {
                    return name;
                }
                account.setName(name);
                await app.syncAccount();
                return name;
            }
        });
    }

    async _logout() {
        const confirmed = await confirm($l("Do you really want to log out?"), $l("Log Out"));
        if (confirmed) {
            app.logout();
        }
    }

    //* Opens the change password dialog and resets the corresponding input elements
    private async _changePassword() {
        const success = await promptPassword(app.account!.password, {
            title: $l("Change Master Password"),
            message: $l("Please enter your current password!")
        });

        if (!success) {
            return;
        }

        const newPwd = await prompt($l("Now choose a new master password!"), {
            title: $l("Change Master Password"),
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

        const confirmed = await promptPassword(newPwd, {
            title: $l("Change Master Password"),
            message: $l("Confirm your new master password!")
        });

        if (!confirmed) {
            return;
        }

        await app.changePassword(newPwd);
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
