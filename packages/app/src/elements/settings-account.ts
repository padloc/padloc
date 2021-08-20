import "./button";
import "./scroller";
import { css, html, LitElement } from "lit";
import { StateMixin } from "../mixins/state";
import { customElement } from "lit/decorators.js";
import { shared } from "../styles";
import { app, router } from "../globals";
import { translate as $l } from "@padloc/locale/src/translate";
import { prompt, confirm } from "../lib/dialog";

@customElement("pl-settings-account")
export class SettingsAccount extends StateMixin(LitElement) {
    private _editAccount() {
        // const account = app.account!;
        // prompt("", {
        //     title: $l("Edit Profile"),
        //     confirmLabel: $l("Save"),
        //     value: account.name,
        //     label: $l("Name"),
        //     validate: async (name: string) => {
        //         if (!name) {
        //             throw $l("Please enter a name!");
        //         }
        //         if (name !== account.name) {
        //             await app.updateAccount(async (account) => (account.name = name));
        //         }
        //         return name;
        //     },
        // });
    }

    static styles = [
        shared,
        css`
            pl-fingerprint {
                width: 3em;
                height: 3em;
                border-radius: 100%;
                border: solid 1px var(--border-color);
            }
        `,
    ];

    private async _logout() {
        const confirmed = await confirm($l("Do you really want to log out?"), $l("Log Out"));
        if (confirmed) {
            await app.logout();
            router.go("login");
        }
    }

    private async _deleteAccount() {
        const success = await prompt($l("Please enter your master password to proceed."), {
            title: $l("Delete Account"),
            label: $l("Enter Master Password"),
            type: "password",
            validate: async (pwd) => {
                try {
                    await app.account!.unlock(pwd);
                } catch (e) {
                    throw $l("Wrong password! Please try again!");
                }

                return pwd;
            },
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
                validate: async (val) => {
                    if (val !== "DELETE") {
                        throw $l("Type 'DELETE' to confirm");
                    }

                    try {
                        await app.deleteAccount();
                    } catch (e) {
                        throw e.message || $l("Something went wrong. Please try again later!");
                    }

                    return val;
                },
            }
        );

        if (deleted) {
            router.go("");
        }
    }

    render() {
        if (!app.account) {
            return;
        }
        return html`
            <div class="fullbleed vertical layout stretch background">
                <header class="padded center-aligning horizontal layout">
                    <pl-button class="transparent back-button" @click=${() => router.go("settings")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <pl-icon icon="user" class="left-margined vertically-padded wide-only"></pl-icon>
                    <div class="padded stretch ellipsis">${$l("Account")}</div>
                </header>

                <pl-scroller class="stretch">
                    <div class="padded spacing vertical layout">
                        <div class="padded center-aligning spacing horizontal layout">
                            <pl-fingerprint .key=${app.account.publicKey}></pl-fingerprint>

                            <div class="stretch">
                                <div>${app.account.name}</div>

                                <div class="bold">${app.account.email}</div>
                            </div>

                            <pl-button class="round transparent" @click=${() => this._editAccount()}>
                                <pl-icon icon="edit"></pl-icon>
                            </pl-button>
                        </div>

                        <pl-button @click=${() => this._logout()}>${$l("Log Out")}</pl-button>

                        <h2 class="large divider top-margined">${$l("Danger Zone")}</h2>

                        <pl-button @click=${() => this._deleteAccount()} class="negative">
                            ${$l("Delete Account")}
                        </pl-button>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
