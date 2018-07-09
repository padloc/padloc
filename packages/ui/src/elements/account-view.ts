import { html } from "@polymer/lit-element";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { Session } from "@padlock/core/lib/auth.js";
import { app } from "../init.js";
import sharedStyles from "../styles/shared.js";
import * as messages from "../messages.js";
import { confirm } from "../dialog.js";
import { View } from "./view.js";
import "./icon.js";
import "./input.js";
import "./loading-button.js";
import "./promo.js";
import "./toggle-button.js";

class AccountView extends View {
    connectedCallback() {
        super.connectedCallback();
        app.addEventListener("account-changed", () => this.requestRender());
    }

    _render() {
        const { account } = app;
        const subStatus = (account && account.subscription && account.subscription.status) || "";
        const email = account && account.email;
        const promo = account && account.promo;
        // TODO: Compute remaining trial days
        const trialDays = 30;
        const loggedIn = false;
        const recordCount = 0;
        const isSynching = false;
        const lastSync = "";
        const sessions = (account && account.sessions) || [];
        const paymentSource = account && account.paymentSource;
        const paymentSourceLabel = paymentSource && `${paymentSource.brand} •••• •••• •••• ${paymentSource.lastFour}`;

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
                width: 80px;
                height: 80px;
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
            }

            .account-info {
                flex: 1;
                width: 0;
                padding: 15px;
                text-align: center;
                border-right: solid 1px rgba(0, 0, 0, 0.1);
            }

            .account-email {
                font-size: 110%;
                font-weight: bold;
                @apply --ellipsis;
                margin-bottom: 10px;
            }

            .account-stats {
                font-size: var(--font-size-tiny);
                @apply --ellipsis;
            }

            .account-stats > * {
                vertical-align: middle;
            }

            .account-stats pl-icon {
                width: 16px;
                height: 20px;
            }

            .account-stats pl-icon:not(:first-child) {
                margin-left: 5px;
            }

            .account-sync {
                height: auto;
                width: 70px;
                font-size: 25px;
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

            <pl-icon icon="close" class="tap" on-click="${() => this._back()}"></pl-icon>

            <div class="title">${$l("My Account")}</div>

            <pl-icon icon="logout" class="tap" on-click="${() => this._logout()}"></pl-icon>

        </header>

        <main>

            <section class="highlight dark" hidden?="${!promo}">

                <pl-promo
                    promo="${promo}"
                    on-promo-redeem="${() => this._buySubscription("App - Promo")}"
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

                <button class="tap" on-click="${() => this._buySubscription("App - Trialing")}">
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

                <button class="tap" on-click="${() => this._buySubscription("App - Trial Expired")}">
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

                <button class="tap" on-click="${() => this._updatePaymentMethod("App - Payment Failed")}">
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

                <button class="tap" on-click="${() => this.reactivateSubscription()}">
                    ${$l("Reactivate Subscription")}
                </button>

            </section>

            <section class="highlight" hidden?="${!loggedIn}">

                <div class="account tiles">

                    <div class="account-info">

                        <div class="account-email">${email}</div>

                        <div class="account-stats">

                            <pl-icon icon="record"></pl-icon>

                            <span>${recordCount}</span>

                            <pl-icon icon="mobile"></pl-icon>

                            <span>${sessions.length}</span>

                            <pl-icon icon="refresh"></pl-icon>

                            <span>${lastSync}</span>

                        </div>

                    </div>

                    <pl-icon
                        class="account-sync tap"
                        icon="refresh"
                        spin$="${isSynching}"
                        on-click="${() => this.synchronize()}"
                        disabled?="${subStatus !== "active" && subStatus !== "trialing"}">
                    </pl-icon>

                </div>

                <div class="unlock-feature-hint" hidden?="${subStatus === "active" || subStatus === "trialing"}">
                    ${$l("Upgrade to enable synchronization!")}
                </div>

            </section>

            <section hidden?="${!loggedIn}">

                <div class="section-header">${$l("{0} Sessions Connected", sessions.length.toString())}</div>

                <div class="sessions">

                    ${sessions.map(
                        (session: Session) => html`
                        <div class="section-row">

                            <div class="section-row-label">${session.device!.description}</div>

                            <pl-icon
                                icon="delete"
                                class="tap"
                                on-click="${() => this._revokeSession(session)}"
                                disabled?="${this._isCurrentSession(session)}">
                            </pl-icon>

                        </div>`
                    )}

                </div>

            </section>

            <section hidden?="${!paymentSource}">

                <div class="section-header">${$l("Billing")}</div>

                <button class="tap" on-click="${() => this._updatePaymentMethod("App - Billing")}">
                    ${paymentSourceLabel}
                </button>

                <button class="tap" on-click="${() => this.cancelSubscription()}" hidden?="${subStatus !== "active"}">
                    ${$l("Cancel Subscription")}
                </button>
            </section>

        </main>

        <div class="login" hidden?="${loggedIn}">

            <pl-icon icon="close" class="back-button tap" on-click="${() => this._back()}"></pl-icon>

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
                on-enter="${() => this._login()}"
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

    animate() {
        if (app.session && app.session.active) {
            this.animateCascade(this.root.querySelectorAll("section:not([hidden])"), { initialDelay: 200 });
        }
    }

    focusEmailInput() {
        this.shadowRoot.querySelector("#emailInput").focus();
    }

    _back() {
        this.dispatchEvent(new CustomEvent("account-back"));
    }

    _logout() {
        const confirmed = confirm($l("Are you sure you want to log out?"), $l("Log Out"));
        if (confirmed) {
            app.logout();
        }
    }

    _login() {
        if (this._submittingEmail) {
            return;
        }

        this.$.loginButton.start();

        const emailInput = this.shadowRoot.querySelector("#emailInput");
        if (emailInput.invalid) {
            this.alert($l("Please enter a valid email address!")).then(() => emailInput.focus());
            this.$.loginButton.fail();
            return;
        }

        this._submittingEmail = true;

        this.connectCloud(emailInput.value)
            .then(() => {
                this._submittingEmail = false;
                this.$.loginButton.success();
                return this.promptLoginCode();
            })
            .then(() => {
                if (app.session && app.session.active) {
                    this.synchronize();
                }
            })
            .catch(() => {
                this._submittingEmail = false;
                this.$.loginButton.fail();
            });
    }

    _isCurrentSession(_session: Session) {
        // TODO
        return false;
    }

    async _revokeSession(session: Session) {
        const confirmed = await confirm(
            $l('Do you want to revoke access to for the device "{0}"?', session.device!.description)
        );
        if (confirmed) {
            app.client.revokeSession(session.id).then(() => {
                this.refreshAccount();
                this.alert($l("Access for {0} revoked successfully!", session.device!.description), {
                    type: "success"
                });
            });
        }
    }

    _contactSupport() {
        window.open("mailto:support@padlock.io", "_system");
    }

    _buySubscription(source: string) {
        this.buySubscription(source);
    }

    _updatePaymentMethod(source: String) {
        this.updatePaymentMethod(source);
    }

    _promoExpired() {
        this.dispatch("settings-changed");
    }
}

window.customElements.define("pl-account-view", AccountView);
