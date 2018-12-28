import { localize as $l } from "@padloc/core/lib/locale.js";
import { Session } from "@padloc/core/lib/session.js";
import { AccountInfo } from "@padloc/core/lib/account.js";
import { deviceDescription } from "@padloc/core/lib/platform.js";
import { Vault } from "@padloc/core/lib/vault.js";
import { formatDateFromNow } from "../util.js";
import { app, router } from "../init.js";
import { shared, mixins } from "../styles";
import { animateCascade } from "../animation.js";
import { getDialog, confirm, alert, prompt } from "../dialog.js";
import { html, listen } from "./base.js";
import { View } from "./view.js";
import "./icon.js";
import "./toggle-button.js";
import "./fingerprint.js";
import "./account-item.js";

export class AccountView extends View {
    @listen("account-changed", app)
    @listen("synchronize", app)
    @listen("stats-changed", app)
    _accountChanged() {
        this.requestUpdate();
    }

    shouldUpdate() {
        return !!app.account;
    }

    render() {
        const { stats } = app;
        const account = app.account!;
        const sessions = [...account.sessions];
        const isSynching = false;
        const lastSync = stats.lastSync && formatDateFromNow(stats.lastSync);
        const vaults = app.vaults;

        return html`
        ${shared}

        <style>

            :host {
                display: flex;
                flex-direction: column;
                ${mixins.fullbleed()}
            }

            main {
                background: var(--color-quaternary);
            }

            button, pl-toggle-button {
                display: block;
                width: 100%;
                box-sizing: border-box;
            }

            .account {
                height: 90px;
                display: flex;
                align-items: center;
            }

            .account pl-fingerprint {
                width: 50px;
                height: 50px;
                border-radius: 100%;
                border: solid 1px var(--border-color);
                margin: 15px;
            }

            .account-info {
                flex: 1;
                min-width: 0;
            }

            .account-email {
                font-weight: bold;
                margin-bottom: 5px;
                ${mixins.ellipsis()}
            }

            .account-sync {
                width: 70px;
                height: auto;
                font-size: 25px;
                border-left: solid 1px rgba(0, 0, 0, 0.1);
                align-self: stretch;
            }

            .vault {
                height: var(--row-height);
                display: flex;
                align-items: center;
                border-bottom: solid 1px var(--border-color);
            }

            .vault pl-toggle {
                --toggle-width: 40px;
                --toggle-height: 30px;
                margin-right: 10px;
            }

            .vault-name {
                padding: 10px 15px;
                font-weight: bold;
                ${mixins.ellipsis()}
            }

            .session {
                display: flex;
                align-items: center;
                border-bottom: solid 1px rgba(0, 0, 0, 0.1);
            }

            .session-label {
                padding: 10px 15px;
                flex: 1;
            }

            .session-description {
                ${mixins.ellipsis()}
            }

            .session pl-icon {
                width: 50px;
                height: auto;
                align-self: stretch;
            }

            .session-hint {
                font-size: var(--font-size-tiny);
            }

            pl-icon[icon=refresh][spin] {
                background: transparent !important;
                pointer-events: none;
            }

            pl-icon[spin]::after, pl-icon[spin]::before {
                display: none !important;
            }
        </style>

        <header>

            <pl-icon icon="close" class="tap" @click=${() => router.go("")}></pl-icon>

            <div class="title">${$l("My Account")}</div>

            <pl-icon icon="logout" class="tap" @click=${() => this._logout()}></pl-icon>

        </header>

        <main>

            <section>

                <div class="account">

                    <pl-fingerprint .key=${account.publicKey}></pl-fingerprint>

                    <div class="account-info">

                        <div class="account-email">${account.email}</div>

                        <div class="tags small">

                            <div class="tag">

                                <pl-icon icon="refresh"></pl-icon>

                                <div>${lastSync}</div>

                            </div>

                        </div>

                    </div>

                    <pl-icon
                        class="account-sync tap"
                        icon="refresh"
                        ?spin=${isSynching}
                        @click=${() => app.synchronize()}>
                    </pl-icon>

                </div>

                <div class="unlock-feature-hint" hidden>
                    ${$l("Upgrade to enable synchronization!")}
                </div>

            </section>

            <section>

                <div class="section-header">

                    <pl-icon icon="group"></pl-icon>

                    <div>${$l("Groups")}</div>

                </div>

                ${vaults.map(vault => {
                    const { members, name, items } = vault;
                    return html`
                    <div class="vault tap" @click=${() => this._openVault(vault)}>

                        <div class="vault-name">${name}</div>

                        <div class="tags small">

                            <div class="tag">

                                <pl-icon icon="group"></pl-icon>

                                <div>${members.size}</div>

                            </div>

                            <div class="tag">

                                <pl-icon icon="record"></pl-icon>

                                <div>${items.size}</div>

                            </div>

                        </div>

                        <div class="spacer"></div>

                    </div>
                `;
                })}

                <button class="tap" @click=${() => this._createVault()}>${$l("Create Group")}</button>

            </section>

            <section>

                <div class="section-header">${$l("{0} Active Sessions", sessions.length.toString())}</div>

                <div class="sessions">

                    ${sessions.map(
                        async (session: Session) => html`
                        <div class="session">

                            <div class="session-label">
                                <div class="session-description">${deviceDescription(session.device)}</div>
                                <div class="session-hint">${
                                    app.session && session.id == app.session.id
                                        ? $l("Current Session")
                                        : $l("last active {0}", await formatDateFromNow(session.lastUsed || ""))
                                }</div>
                            </div>

                            <pl-icon
                                icon="delete"
                                class="tap"
                                @click=${() => this._revokeSession(session)}
                                ?disabled=${app.session && session.id === app.session.id}>
                            </pl-icon>

                        </div>`
                    )}

                </div>

            </section>

        </main>

        <div class="rounded-corners"></div>
`;
    }

    _activated() {
        animateCascade(this.$$("section:not([hidden])"), { initialDelay: 200 });
        if (app.loggedIn) {
            app.syncAccount();
        }
    }

    private async _logout() {
        const confirmed = await confirm($l("Are you sure you want to log out?"), $l("Log Out"));
        if (confirmed) {
            app.logout();
        }
    }

    private async _revokeSession(session: Session) {
        const confirmed = await confirm(
            $l('Do you want to revoke access to for the device "{0}"?', deviceDescription(session.device))
        );
        if (confirmed) {
            await app.revokeSession(session);
            alert($l("Access for {0} revoked successfully!", deviceDescription(session.device)), {
                type: "success"
            });
        }
    }

    private async _openVault(vault: Vault) {
        router.go(`vault/${vault.id}`);
    }

    private async _createVault() {
        const id = await prompt($l("Please enter a name for your new group!"), {
            placeholder: $l("Enter Group Name"),
            confirmLabel: $l("Create Group"),
            cancelLabel: "",
            validate: async name => {
                if (!name) {
                    throw "Please enter a name!";
                }

                const vault = await app.createVault(name);
                return vault.id;
            }
        });
        if (id) {
            router.go(`vault/${id}`);
        }
    }

    async _openAccount(account: AccountInfo) {
        await getDialog("pl-account-dialog").show(account);
    }
}

window.customElements.define("pl-account-view", AccountView);
