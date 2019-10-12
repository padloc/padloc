import { translate as $l } from "@padloc/locale/src/translate";
import { BillingInfo } from "@padloc/core/src/billing";
import { composeEmail } from "@padloc/core/src/platform";
import { mixins } from "../styles";
import { alert, confirm, prompt, dialog } from "../lib/dialog";
import { app, router } from "../globals";
import { StateMixin } from "../mixins/state";
import { element, html, css, query, listen } from "./base";
import { View } from "./view";
import "./icon";
import { Slider } from "./slider";
import { ToggleButton } from "./toggle-button";
import { ImportDialog } from "./import-dialog";
import { ExportDialog } from "./export-dialog";
import "./billing-info";
import "./randomart";
import "./subscription";

@element("pl-settings")
export class Settings extends StateMixin(View) {
    @query("input[type='file']")
    private _fileInput: HTMLInputElement;

    @dialog("pl-import-dialog")
    private _importDialog: ImportDialog;

    @dialog("pl-export-dialog")
    private _exportDialog: ExportDialog;

    shouldUpdate() {
        return !!app.account;
    }

    static styles = [
        ...View.styles,
        css`
            :host {
                background: var(--color-quaternary);
                display: flex;
                flex-direction: column;
            }

            h3 {
                margin: 18px 8px 12px 8px;
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
                margin: 12px 0;
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
        const { settings, billingConfig } = app;
        const account = app.account!;
        const billing = account.billing || new BillingInfo();

        return html`
            <header>
                <pl-icon class="tap menu-button" icon="menu" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

                <div class="title flex">${$l("Settings")}</div>

                <pl-icon></pl-icon>
            </header>

            <main>
                <div class="wrapper">
                    <h3>${$l("Profile")}</h3>

                    <div class="account item">
                        <pl-fingerprint .key=${account.publicKey}></pl-fingerprint>

                        <div class="account-info">
                            <div class="account-name">${account.name}</div>

                            <div class="account-email">${account.email}</div>
                        </div>

                        <pl-icon class="tap" icon="edit" @click=${() => this._editAccount()}></pl-icon>
                    </div>

                    <h3>${$l("Security")}</h3>

                    <button class="tap item" @click=${() => this._logout()}>${$l("Log Out")}</button>

                    <button class="tap item" @click=${() => this._changePassword()}>
                        ${$l("Change Master Password")}
                    </button>

                    ${billingConfig
                        ? html`
                              <h3>${$l("Subscription")}</h3>

                              <pl-subscription class="item"></pl-subscription>

                              <h3>${$l("Billing Info")}</h3>

                              <pl-billing-info .billing=${billing} class="item"></pl-billing-info>
                          `
                        : html``}

                    <h3>${$l("Auto Lock")}</h3>

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

                    ${app.supportsBiometricUnlock
                        ? html`
                              <h3>${$l("Biometric Unlock")}</h3>
                              <pl-toggle-button
                                  id="biometricUnlockButton"
                                  .active=${app.remembersMasterKey}
                                  .label=${$l("Enable Biometric Unlock")}
                                  class="item tap"
                                  reverse
                                  @change=${this._toggleBiometricUnlock}
                              >
                              </pl-toggle-button>
                          `
                        : ""}

                    <h3>${$l("Import / Export")}</h3>

                    <button class="item tap" @click=${() => this._import()}>${$l("Import...")}</button>

                    <button class="item tap" @click=${() => this._export()}>${$l("Export...")}</button>

                    <h3>${$l("Support")}</h3>

                    <button @click=${() => this._openWebsite()} class="item tap">${$l("Website")}</button>

                    <button @click=${() => this._sendMail()} class="item tap">${$l("Contact Support")}</button>

                    <h3>${$l("Danger Zone")}</h3>

                    <button @click=${() => this._deleteAccount()} class="item tap negative">
                        ${$l("Delete Account")}
                    </button>
                </div>
            </main>

            <input type="file" accept="text/plain,.csv,.pls,.set,.pbes2" hidden @change=${() => this._importFile()} />
        `;
    }

    @listen("change")
    _updateSettings() {
        app.setSettings({
            autoLock: (this.$("#autoLockButton") as ToggleButton).active,
            autoLockDelay: (this.$("#autoLockDelaySlider") as Slider).value
        });
    }

    private _editAccount() {
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
                if (name !== account.name) {
                    await app.updateAccount(async account => (account.name = name));
                }
                return name;
            }
        });
    }

    private async _logout() {
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
        window.open("https://padloc.app", "_system");
    }

    private _sendMail() {
        const email = process.env.PL_SUPPORT_EMAIL || "";
        const subject = "Padloc Support Request";
        const message = `

----- enter your message above -----

NOTE: Below we have included some information about your device that may help
us analyse any problems you may be having. If you're not comfortable sharing
this data simply delete this of the email!

Device Info: ${JSON.stringify(app.state.device.toRaw(), null, 4)}
`;

        composeEmail(email, subject, message);
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

    private async _deleteAccount() {
        const success = await prompt($l("Please enter your master password to proceed."), {
            title: $l("Delete Account"),
            label: $l("Enter Master Password"),
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

        const deleted = await prompt(
            $l(
                "Are you sure you want to delete this account? " +
                    "All associated vaults and the data within them will be lost and any active subscriptions will be canceled immediately. " +
                    "This action can not be undone!"
            ),
            {
                type: "destructive",
                title: $l("Delete Account"),
                confirmLabel: $l("Delete"),
                placeholder: $l("Type 'DELETE' to confirm"),
                validate: async val => {
                    if (val !== "DELETE") {
                        throw $l("Type 'DELETE' to confirm");
                    }

                    try {
                        await app.deleteAccount();
                    } catch (e) {
                        throw e.message || $l("Something went wrong. Please try again later!");
                    }

                    return val;
                }
            }
        );

        if (deleted) {
            router.go("");
        }
    }

    private async _toggleBiometricUnlock(e: Event) {
        e.stopPropagation();
        const toggle = e.target as ToggleButton;
        console.log(toggle.active);
        if (toggle.active) {
            this.dispatch("enable-biometric-auth");
        } else {
            const confirmed = await confirm($l("Are you sure you want to disable biometric unlock?"));
            if (confirmed) {
                await app.forgetMasterKey();
            } else {
                toggle.active = true;
            }
        }
    }
}
