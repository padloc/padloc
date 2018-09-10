import { localize as $l } from "@padlock/core/lib/locale.js";
import { Session, AccountInfo } from "@padlock/core/lib/auth.js";
import { formatDateFromNow } from "@padlock/core/lib/util.js";
import { deviceDescription } from "@padlock/core/lib/platform.js";
import { Store } from "@padlock/core/lib/store.js";
import { app, router } from "../init.js";
import { shared } from "../styles";
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
        this.requestRender();
    }

    _shouldRender() {
        return !!app.account;
    }

    _render() {
        const { stats, sessions } = app;
        const account = app.account!;
        const isSynching = false;
        const lastSync = stats.lastSync && formatDateFromNow(stats.lastSync);
        const stores = app.stores.filter(s => s.isMember(account));

        return html`
        ${shared}

        <style>

            :host {
                display: flex;
                flex-direction: column;
                @apply --fullbleed;
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
                width: 0;
            }

            .account-email {
                font-weight: bold;
                margin-bottom: 5px;
                @apply --ellipsis;
            }

            .account-sync {
                width: 70px;
                height: auto;
                font-size: 25px;
                border-left: solid 1px rgba(0, 0, 0, 0.1);
                align-self: stretch;
            }

            .store {
                height: var(--row-height);
                display: flex;
                align-items: center;
                border-bottom: solid 1px var(--border-color);
            }

            .store pl-toggle {
                --toggle-width: 40px;
                --toggle-height: 30px;
                margin-right: 10px;
            }

            .store-name {
                padding: 10px 15px;
                font-weight: bold;
                @apply --ellipsis;
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
                @apply --ellipsis;
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

            <pl-icon icon="close" class="tap" on-click="${() => router.go("")}"></pl-icon>

            <div class="title">${$l("My Account")}</div>

            <pl-icon icon="logout" class="tap" on-click="${() => this._logout()}"></pl-icon>

        </header>

        <main>

            <section>

                <div class="account">

                    <pl-fingerprint key="${account.publicKey}"></pl-fingerprint>

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
                        spin?="${isSynching}"
                        on-click="${() => app.synchronize()}">
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

                ${stores.map(store => {
                    const { members, name, collection } = store;
                    const currMember = store.getMember(account)!;
                    return html`
                    <div class="store tap" on-click="${() => this._openStore(store)}">

                        <div class="store-name">${name}</div>

                        <div class="tags small">

                            <div class="tag">

                                <pl-icon icon="group"></pl-icon>

                                <div>${members.filter(m => m.status === "active").length}</div>

                            </div>

                            <div class="tag">

                                <pl-icon icon="record"></pl-icon>

                                <div>${collection.size}</div>

                            </div>

                            <div class="tag warning" hidden?="${currMember.status !== "removed"}">

                                <pl-icon icon="removeuser"></pl-icon>

                                <div>${$l("access revoked")}</div>

                            </div>

                        </div>

                        <div class="spacer"></div>

                        <pl-toggle
                            hidden?="${currMember.status !== "active"}"
                            active="${!app.settings.hideStores.includes(store.id)}"
                            on-click="${(e: Event) => this._toggleStore(store, e)}"></pl-toggle>

                        <pl-icon icon="forward" hidden?="${currMember.status === "active"}"></pl-icon>

                    </div>
                `;
                })}

                <button class="tap" on-click="${() => this._createStore()}">${$l("Create Group")}</button>

            </section>

            <section>

                <div class="section-header">${$l("{0} Active Sessions", sessions.length.toString())}</div>

                <div class="sessions">

                    ${sessions.map(
                        (session: Session) => html`
                        <div class="session">

                            <div class="session-label">
                                <div class="session-description">${deviceDescription(session.device)}</div>
                                <div class="session-hint">${
                                    app.session && session.id == app.session.id
                                        ? $l("Current Session")
                                        : $l("last active {0}", formatDateFromNow(session.lastUsed || ""))
                                }</div>
                            </div>

                            <pl-icon
                                icon="delete"
                                class="tap"
                                on-click="${() => this._revokeSession(session)}"
                                disabled?="${app.session && session.id === app.session.id}">
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

    private async _openStore(store: Store) {
        router.go(`store/${store.id}`);
    }

    private _toggleStore(store: Store, e: Event) {
        app.toggleStore(store);
        e && e.stopPropagation();
    }

    private async _createStore() {
        const id = await prompt($l("Please enter a name for your new group!"), {
            placeholder: $l("Enter Group Name"),
            confirmLabel: $l("Create Group"),
            cancelLabel: "",
            validate: async name => {
                if (!name) {
                    throw "Please enter a name!";
                }

                const store = await app.createStore(name);
                return store.id;
            }
        });
        if (id) {
            router.go(`store/${id}`);
        }
    }

    async _openAccount(account: AccountInfo) {
        await getDialog("pl-account-dialog").show(account);
    }
}

window.customElements.define("pl-account-view", AccountView);
