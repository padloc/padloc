import "./button";
import "./scroller";
import { css, html, LitElement } from "lit";
import { StateMixin } from "../mixins/state";
import { customElement, query } from "lit/decorators.js";
import { shared } from "../styles";
import { app, router } from "../globals";
import { translate as $l } from "@padloc/locale/src/translate";
import { prompt, confirm } from "../lib/dialog";
import { Input } from "./input";
import { Routing } from "../mixins/routing";

@customElement("pl-settings-account")
export class SettingsAccount extends Routing(StateMixin(LitElement)) {
    routePattern = /^settings\/account/;

    get hasChanges() {
        return !!app.account && this._nameInput && app.account.name !== this._nameInput.value;
    }

    @query("#nameInput")
    private _nameInput: Input;

    private async _updateName() {
        await app.updateAccount(async (account) => (account.name = this._nameInput.value));
    }

    private _resetName() {
        this._nameInput.value = app.account?.name || "";
        this.requestUpdate();
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
                        <h2 class="margined section-header">${$l("Profile")}</h2>

                        <div class="padded start-aligning spacing horizontal layout">
                            <div class="vertical layout" style="width: 6.5em;">
                                <pl-fingerprint class="giant" .key=${app.account.publicKey}></pl-fingerprint>
                            </div>

                            <div class="stretch spacing vertical layout">
                                <pl-input .label=${$l("Email")} .value=${app.account.email} disabled></pl-input>

                                <pl-input
                                    id="nameInput"
                                    .label=${$l("Display Name")}
                                    .value=${app.account.name}
                                    @input=${() => this.requestUpdate()}
                                ></pl-input>

                                <pl-drawer .collapsed=${!this.hasChanges}>
                                    <div class="horizontal spacing evenly stretching layout">
                                        <pl-button class="primary" @click=${this._updateName}>${$l("Save")}</pl-button>
                                        <pl-button @click=${this._resetName}>${$l("Cancel")}</pl-button>
                                    </div>
                                </pl-drawer>
                            </div>
                        </div>

                        <h2 class="margined section-header top-margined">${$l("Current Session")}</h2>

                        <pl-button @click=${() => this._logout()}>${$l("Log Out")}</pl-button>

                        <h2 class="margined section-header top-margined">${$l("Danger Zone")}</h2>

                        <pl-button @click=${() => this._deleteAccount()} class="negative">
                            ${$l("Delete Account")}
                        </pl-button>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
