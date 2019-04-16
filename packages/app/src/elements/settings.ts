import { localize as $l } from "@padloc/core/lib/locale.js";
import { shared, mixins } from "../styles";
import { alert, confirm, prompt, dialog } from "../dialog";
import { app } from "../init.js";
import { StateMixin } from "../mixins/state.js";
import { element, html, css, query, listen } from "./base.js";
import { View } from "./view.js";
import "./icon.js";
import { Slider } from "./slider.js";
import { ToggleButton } from "./toggle-button.js";
import { ImportDialog } from "./import-dialog.js";
import { ExportDialog } from "./export-dialog.js";
import "./fingerprint.js";

@element("pl-settings")
export class Settings extends StateMixin(View) {
    @query("input[type='file']")
    _fileInput: HTMLInputElement;

    @dialog("pl-import-dialog")
    _importDialog: ImportDialog;

    @dialog("pl-export-dialog")
    _exportDialog: ExportDialog;

    shouldUpdate() {
        return !!app.account;
    }

    static styles = [
        shared,
        css`
            :host {
                ${mixins.fullbleed()}
                display: flex;
                flex-direction: column;
                background: var(--color-quaternary);
                border-radius: var(--border-radius);
            }

            h1 {
                display: block;
                text-align: center;
            }

            .wrapper {
                max-width: 500px;
                margin: 0 auto;
                padding: 0 8px 8px 8px;
            }

            button {
                display: block;
            }

            .item {
                width: 100%;
                box-sizing: border-box;
                margin: 8px 0;
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
                min-width: 0;
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
        `
    ];

    render() {
        const { settings } = app;
        const account = app.account!;

        return html`
            <header class="narrow">
                <pl-icon class="tap menu-button" icon="menu" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

                <div class="title flex">${$l("Settings")}</div>

                <pl-icon></pl-icon>
            </header>

            <main>
                <div class="wrapper">
                    <h1>${$l("Account")}</h1>

                    <div class="account item">
                        <pl-fingerprint .key=${account.publicKey}></pl-fingerprint>

                        <div class="account-info">
                            <div class="account-name">${account.name}</div>

                            <div class="account-email">${account.email}</div>
                        </div>

                        <pl-icon class="tap" icon="edit" @click=${() => this._editAccount()}></pl-icon>
                    </div>

                    <button class="tap item" @click=${() => this._logout()}>${$l("Log Out")}</button>

                    <button class="tap item" @click=${() => this._changePassword()}>
                        ${$l("Change Master Password")}
                    </button>

                    <h1>${$l("Auto Lock")}</h1>

                    <pl-toggle-button
                        id="autoLockButton"
                        .active=${settings.autoLock}
                        .label=${$l("Lock Automatically")}
                        class="item tap"
                        reverse
                    >
                    </pl-toggle-button>

                    <pl-slider
                        id="autoLockDelaySlider"
                        .min="1"
                        .max="10"
                        .step="1"
                        .value=${settings.autoLockDelay}
                        .unit=${$l(" min")}
                        .label=${$l("After")}
                        ?hidden=${!settings.autoLock}
                        class="item"
                    >
                    </pl-slider>

                    <h1>${$l("Import / Export")}</h1>

                    <button class="item tap" @click=${() => this._import()}>${$l("Import...")}</button>

                    <button class="item tap" @click=${() => this._export()}>${$l("Export...")}</button>

                    <h1>${$l("Support")}</h1>

                    <button @click=${() => this._openWebsite()} class="item tap">${$l("Website")}</button>

                    <button @click=${() => this._sendMail()} class="item tap">${$l("Contact Support")}</button>
                </div>
            </main>

            <input type="file" accept="text/plain,.csv,.pls,.set" hidden @change=${() => this._importFile()} />
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
                    await app.updateAccount(async account => (account.name = name));
                }
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
        const success = await prompt($l("Please enter your current password!"), {
            title: $l("Change Master Password"),
            label: $l("Enter Current Password"),
            type: "password",
            validate: async pwd => {
                try {
                    await app.account!.unlock(pwd);
                } catch (e) {
                    throw $l("Wrong password! Please try again!");
                }

                return pwd;
            }
        });

        if (!success) {
            return;
        }

        const newPwd = await prompt($l("Now choose a new master password!"), {
            title: $l("Change Master Password"),
            label: $l("Enter New Password"),
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

        const confirmed = await prompt($l("Please confirm your new password!"), {
            title: $l("Change Master Password"),
            label: $l("Repeat New Password"),
            type: "password",
            validate: async pwd => {
                if (pwd !== newPwd) {
                    throw "Wrong password! Please try again!";
                }

                return pwd;
            }
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
        window.open("mailto:support@padloc.io", "_system");
    }

    private async _import() {
        this._fileInput.click();
    }

    private async _importFile() {
        const file = this._fileInput.files![0];
        const reader = new FileReader();
        reader.onload = async () => {
            await this._importDialog.show(reader.result as string);
            this._fileInput.value = "";
        };

        reader.readAsText(file);
    }

    private _export() {
        this._exportDialog.show();
    }
}
