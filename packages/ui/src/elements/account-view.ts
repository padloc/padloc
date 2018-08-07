import { localize as $l } from "@padlock/core/lib/locale.js";
import { Session, PublicAccount } from "@padlock/core/lib/auth.js";
import { formatDateFromNow } from "@padlock/core/lib/util.js";
import { Store } from "@padlock/core/lib/data.js";
import { ErrorCode } from "@padlock/core/lib/error.js";
import { app, router } from "../init.js";
import sharedStyles from "../styles/shared.js";
import * as messages from "../messages.js";
import { animateCascade } from "../animation.js";
import { getDialog, confirm, alert, prompt } from "../dialog.js";
import { html, query, listen } from "./base.js";
import { View } from "./view.js";
import "./icon.js";
import { Input } from "./input.js";
import { LoadingButton } from "./loading-button.js";
// import "./promo.js";
import "./toggle-button.js";
import "./fingerprint.js";
import "./account-item.js";

export class AccountView extends View {
    @query("#emailInput") private _emailInput: Input;
    @query("#loginButton") private _loginButton: LoadingButton;

    @listen("account-changed", app)
    @listen("synchronize", app)
    @listen("stats-changed", app)
    _accountChanged() {
        this.requestRender();
    }

    _render() {
        const { account, stats, loggedIn } = app;
        const subStatus = (account && account.subscription && account.subscription.status) || "";
        const email = (account && account.email) || "";
        const promo = account && account.promo;
        const publicKey = (account && account.publicKey) || "";
        // TODO: Compute remaining trial days
        const trialDays = 30;
        const isSynching = false;
        const lastSync = stats.lastSync && formatDateFromNow(stats.lastSync);
        const sessions = (account && account.sessions) || [];
        const paymentSource = account && account.paymentSource;
        const paymentSourceLabel = paymentSource && `${paymentSource.brand} •••• •••• •••• ${paymentSource.lastFour}`;
        const trustedAccounts = app.mainStore.trustedAccounts;

        return html`
        <style>
            ${sharedStyles}

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

            section {
                transform: translate3d(0, 0, 0);
            }

            .login {
                @apply --fullbleed;
                background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                color: var(--color-background);
                text-shadow: rgba(0, 0, 0, 0.2) 0px 2px 0px;
                display: flex;
                flex-direction: column;
                align-items: center;
                z-index: 1;
                padding: 0 20px;
                transform: translate3d(0, 0, 0);
            }

            .login > * {
                width: 100%;
                max-width: 400px;
                box-sizing: border-box;
            }

            .login .back-button {
                position: absolute;
                width: 50px;
                height: 50px;
                top: 0;
                left: 0;
                font-size: 120%;
            }

            .login .icons {
                position: relative;
                height: 100px;
                overflow: visible;
            }

            .login .icons > * {
                @apply --fullbleed;
                margin: auto;
                width: 90px;
                height: 90px;
                bottom: 0;
                font-size: 50px;
            }

            .login .icons pl-icon[icon="cloud"] {
                width: 300px;
                height: 300px;
                font-size: 230px;
                text-shadow: rgba(0, 0, 0, 0.2) 0 -2px 5px;
                bottom: -30px;
            }

            .login .icons pl-icon[icon="mobile"] {
                transform: translate(-110px, -100px) rotate(-30deg)
            }

            .login .icons pl-icon[icon="desktop"] {
                transform: translate(100px, -100px) rotate(15deg)
            }

            .login .title {
                font-size: 150%;
                text-align: center;
                font-weight: bold;
            }

            .login .text {
                padding: 15px;
                font-size: var(--font-size-small);
                text-align: center;
            }

            .login pl-input {
                height: var(--row-height);
                background: var(--shade-2-color);
                border-radius: 12px;
                margin: 10px 0;
                text-align: center;
                overflow: hidden;
                transform: translate3d(0, 0, 0);
            }

            .login pl-loading-button {
                font-weight: bold;
                border-radius: 12px;
                overflow: hidden;
                will-change: transform:
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

            .store-join {
                background: var(--color-highlight);
                color: var(--color-background);
                height: 40px;
                border-radius: 40px;
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

            <pl-icon icon="close" class="tap" on-click="${() => router.back()}"></pl-icon>

            <div class="title">${$l("My Account")}</div>

            <pl-icon icon="logout" class="tap" on-click="${() => this._logout()}"></pl-icon>

        </header>

        <main>

            <section class="highlight dark" hidden?="${!promo}">

                <pl-promo
                    promo="${promo}"
                    on-promo-redeem="${() => app.buySubscription("App - Promo")}"
                    on-promo-expired="${() => this._promoExpired()}">
                </pl-promo>

            </section>

            <section class="highlight tiles warning" hidden?="${subStatus !== "trialing"}">

                <div class="info">

                    <pl-icon class="info-icon" icon="time"></pl-icon>

                    <div class="info-body">

                        <div class="info-title">${$l("Trialing ({0} days left)", trialDays.toString())}</div>

                        <div class="info-text">${messages.trialingMessage(trialDays)}</div>

                    </div>

                </div>

                <button class="tap" on-click="${() => app.buySubscription("App - Trialing")}">
                    ${$l("Upgrade Now")}
                </button>

            </section>

            <section class="highlight tiles warning" hidden?="${subStatus !== "trial_expired"}">

                <div class="info">

                    <pl-icon class="info-icon" icon="error"></pl-icon>

                    <div class="info-body">

                        <div class="info-title">${$l("Trial Expired")}</div>

                        <div class="info-text">${messages.trialExpiredMessage()}</div>

                    </div>

                </div>

                <button class="tap" on-click="${() => app.buySubscription("App - Trial Expired")}">
                    ${$l("Upgrade Now")}
                </button>

            </section>

            <section class="highlight tiles warning" hidden?="${subStatus !== "unpaid"}">

                <div class="info">

                    <pl-icon class="info-icon" icon="error"></pl-icon>

                    <div class="info-body">

                        <div class="info-title">${$l("Payment Failed")}</div>

                        <div class="info-text">${messages.subUnpaidMessage()}</div>

                    </div>

                </div>

                <button class="tap" on-click="${() => app.updatePaymentMethod("App - Payment Failed")}">
                    ${$l("Update Payment Method")}
                </button>

                <button class="tap" on-click="${() => this._contactSupport()}">${$l("Contact Support")}</button>

            </section>

            <section class="highlight tiles warning" hidden?="${subStatus !== "canceled"}">

                <div class="info">

                    <pl-icon class="info-icon" icon="error"></pl-icon>

                    <div class="info-body">

                        <div class="info-title">${$l("Subscription Canceled")}</div>

                        <div class="info-text">${messages.subCanceledMessage()}</div>

                    </div>

                </div>

                <button class="tap" on-click="${() => app.reactivateSubscription()}">
                    ${$l("Reactivate Subscription")}
                </button>

            </section>

            <section hidden?="${!loggedIn}">

                <div class="account">

                    <pl-fingerprint key="${publicKey}"></pl-fingerprint>

                    <div class="account-info">

                        <div class="account-email">${email}</div>

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

            <section hidden?="${!loggedIn}">

                <div class="section-header">

                    <pl-icon icon="group"></pl-icon>

                    <div>${$l("Groups")}</div>

                </div>

                ${app.sharedStores.map(store => {
                    const { accessors, accessorStatus, name, records } = store;
                    return html`
                    <div class="store tap" on-click="${() => this._openStore(store)}">

                        <div class="store-name">${name}</div>

                        <div class="tags small">

                            <div class="tag" hidden?="${accessorStatus !== "active"}">

                                <pl-icon icon="group"></pl-icon>

                                <div>${accessors.filter(a => a.status === "active").length}</div>

                            </div>

                            <div class="tag" hidden?="${accessorStatus !== "active"}">

                                <pl-icon icon="record"></pl-icon>

                                <div>${records.length}</div>

                            </div>

                            <div class="tag highlight" hidden?="${accessorStatus !== "invited"}">

                                <pl-icon icon="time"></pl-icon>

                                <div>${$l("invited")}</div>

                            </div>

                            <div class="tag warning" hidden?="${accessorStatus !== "removed"}">

                                <pl-icon icon="removeuser"></pl-icon>

                                <div>${$l("access revoked")}</div>

                            </div>

                            <div class="tag warning" hidden?="${accessorStatus !== "rejected"}">

                                <pl-icon icon="removeuser"></pl-icon>

                                <div>${$l("access rejected")}</div>

                            </div>

                            <div class="tag highlight" hidden?="${accessorStatus !== "requested"}">

                                <pl-icon icon="time"></pl-icon>

                                <div>${$l("access requested")}</div>

                            </div>

                        </div>

                        <div class="spacer"></div>

                        <pl-toggle
                            hidden?="${accessorStatus !== "active"}"
                            active="${!app.settings.hideStores.includes(store.id)}"
                            on-click="${(e: Event) => this._toggleStore(store, e)}"></pl-toggle>

                        <pl-icon icon="forward" hidden?="${accessorStatus === "active"}"></pl-icon>

                    </div>
                `;
                })}

                <button class="tap" on-click="${() => this._createSharedStore()}">${$l("Create Group")}</button>

            </section>

            <section>

                <div class="section-header">

                    <pl-icon icon="trusted"></pl-icon>

                    <div>${$l("Trusted Users", trustedAccounts.length.toString())}</div>

                </div>

                ${trustedAccounts.map(
                    acc => html`
                        <pl-account-item
                            account="${acc}"
                            class="tap"
                            on-click="${() => this._openAccount(acc)}">
                        </pl-account-item>`
                )}

                <button class="tap" on-click="${() => this._addTrustedAccount()}">${$l("Add Trusted User")}</button>

            </section>

            <section hidden?="${!loggedIn}">

                <div class="section-header">${$l("{0} Sessions Connected", sessions.length.toString())}</div>

                <div class="sessions">

                    ${sessions.map(
                        (session: Session) => html`
                        <div class="section-row">

                            <div class="section-row-label">${session.device.description}</div>

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

            <section hidden?="${!paymentSource}">

                <div class="section-header">${$l("Billing")}</div>

                <button class="tap" on-click="${() => app.updatePaymentMethod("App - Billing")}">
                    ${paymentSourceLabel}
                </button>

                <button class="tap" on-click="${() => app.cancelSubscription()}" hidden?="${subStatus !== "active"}">
                    ${$l("Cancel Subscription")}
                </button>
            </section>

        </main>

        <div class="login" hidden?="${loggedIn}">

            <pl-icon icon="close" class="back-button tap" on-click="${() => router.go("")}"></pl-icon>

            <div class="spacer"></div>

            <div class="title">${$l("Padlock Online")}</div>

            <div class="text">${messages.loginInfoText()}</div>

            <pl-input
                id="emailInput"
                type="email"
                placeholder="${$l("Enter Email Address")}"
                value="${email}"
                select-on-focus
                required
                on-enter="${() => this._loginButton.click()}"
                class="tap">
            </pl-input>

            <pl-loading-button id="loginButton" class="tap" on-click="${() => this._login()}">
                ${$l("Log In")}
            </pl-loading-button>

            <div class="spacer"></div>

            <div class="icons">

                <pl-icon icon="mobile"></pl-icon>

                <pl-icon icon="desktop"></pl-icon>

                <pl-icon icon="cloud"></pl-icon>

            </div>

        </div>

        <div class="rounded-corners"></div>
`;
    }

    _activated() {
        animateCascade(this.$$("section:not([hidden])"), { initialDelay: 200 });
        if (app.loggedIn) {
            app.syncAccount();
        }
    }

    focusEmailInput() {
        this._emailInput.focus();
    }

    private async _logout() {
        const confirmed = await confirm($l("Are you sure you want to log out?"), $l("Log Out"));
        if (confirmed) {
            app.logout();
        }
    }

    private async _login() {
        if (this._loginButton.state === "loading") {
            return;
        }

        this._loginButton.start();

        if (this._emailInput.invalid) {
            alert($l("Please enter a valid email address!")).then(() => this._emailInput.focus());
            this._loginButton.fail();
            return;
        }

        try {
            await app.login(this._emailInput.value);
            this._loginButton.success();
            await this._promptLoginCode();
            if (app.session && app.session.active) {
                app.synchronize();
            }
        } catch (e) {
            // TODO: Handle error
            this._loginButton.fail();
        }
    }

    private async _promptLoginCode() {
        const result = await prompt($l("Check your email! We sent your login code to {0}.", this._emailInput.value), {
            placeholder: $l("Enter Login Code"),
            validate: async (code: string) => {
                if (code == "") {
                    throw $l("Please enter a valid login code!");
                }
                try {
                    await app.activateSession(code);
                } catch (e) {
                    // TODO: Handle Server Error
                    throw $l("Invalid login code. Try again!");
                }
                return code;
            }
        });
        if (!result) {
            app.logout();
        }
    }

    private async _revokeSession(session: Session) {
        const confirmed = await confirm(
            $l('Do you want to revoke access to for the device "{0}"?', session.device.description)
        );
        if (confirmed) {
            await app.revokeSession(session.id);
            alert($l("Access for {0} revoked successfully!", session.device.description), {
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

    private _createSharedStore() {
        prompt($l("Please enter a name for your new group!"), {
            placeholder: $l("Enter Group Name"),
            confirmLabel: $l("Create Group"),
            cancelLabel: "",
            validate: async name => {
                if (!name) {
                    throw "Please enter a name!";
                }

                await app.createSharedStore(name);

                return name;
            }
        });
    }

    async _addTrustedAccount() {
        const email = await prompt($l("Enter the email address of the person you would like to add!"), {
            confirmLabel: $l("Submit"),
            placeholder: $l("Enter Email Address"),
            cancelLabel: "",
            type: "email",
            validate: async (val, input) => {
                if (!val || input.invalid) {
                    throw $l("Please enter a valid email address!");
                }

                return val;
            }
        });

        if (!email) {
            return;
        }

        try {
            const account = await app.client.getAccount(email);
            this._openAccount(account);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                alert("There is no account with this email address!");
            } else {
                throw e;
            }
        }
    }

    private _contactSupport() {
        window.open("mailto:support@padlock.io", "_system");
    }

    private _promoExpired() {
        // TODO: Do something?
    }

    async _openAccount(account: PublicAccount) {
        await getDialog("pl-account-dialog").show(account);
    }
}

window.customElements.define("pl-account-view", AccountView);
