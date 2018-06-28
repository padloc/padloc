import "../styles/shared.js";
import { BaseElement, html } from "./base.js";
import "./icon.js";
import "./input.js";
import "./loading-button.js";
import "./promo.js";
import "./toggle-button.js";

import { LocaleMixin, DialogMixin, NotificationMixin, DataMixin, SyncMixin, AnimationMixin } from "../mixins";

import { applyMixins } from "@padlock/core/lib/util.js";
import { localize as $l } from "@padlock/core/lib/locale.js";

class CloudView extends applyMixins(
    BaseElement,
    DataMixin,
    SyncMixin,
    LocaleMixin,
    DialogMixin,
    NotificationMixin,
    AnimationMixin
) {
    static get template() {
        return html`
        <style include="shared">
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
            <pl-icon icon="close" class="tap" on-click="_back"></pl-icon>
            <div class="title">[[ \$l("My Account") ]]</div>
            <pl-icon icon="logout" class="tap" on-click="_logout"></pl-icon>
        </header>

        <main>

            <section class="highlight dark" hidden\$="[[ !truthy(promo) ]]">
                <pl-promo promo="[[ promo ]]" data-source="App - Promo" on-promo-redeem="_buySubscription" on-promo-expired="_promoExpired"></pl-promo>
            </section>

            <section class="highlight tiles warning" hidden\$="[[ !isTrialing(subStatus) ]]">
                <div class="info">
                    <pl-icon class="info-icon" icon="time"></pl-icon>
                    <div class="info-body">
                        <div class="info-title">[[ \$l("Trialing ({0} days left)", remainingTrialDays) ]]</div>
                        <div class="info-text">[[ trialingMessage(remainingTrialDays) ]]</div>
                    </div>
                </div>
                <button class="tap" on-click="_buySubscription" data-source="App - Trialing">[[ \$l("Upgrade Now") ]]</button>
            </section>

            <section class="highlight tiles warning" hidden\$="[[ !isTrialExpired(subStatus) ]]">
                <div class="info">
                    <pl-icon class="info-icon" icon="error"></pl-icon>
                    <div class="info-body">
                        <div class="info-title">[[ \$l("Trial Expired") ]]</div>
                        <div class="info-text">[[ trialExpiredMessage() ]]</div>
                    </div>
                </div>
                <button class="tap" on-click="_buySubscription" data-source="App - Trial Expired">[[ \$l("Upgrade Now") ]]</button>
            </section>

            <section class="highlight tiles warning" hidden\$="[[ !isSubUnpaid(subStatus) ]]">
                <div class="info">
                    <pl-icon class="info-icon" icon="error"></pl-icon>
                    <div class="info-body">
                        <div class="info-title">[[ \$l("Payment Failed") ]]</div>
                        <div class="info-text">[[ subUnpaidMessage() ]]</div>
                    </div>
                </div>
                <button class="tap" on-click="_updatePaymentMethod" data-source="App - Payment Failed">[[ \$l("Update Payment Method") ]]</button>
                <button class="tap" on-click="_contactSupport">[[ \$l("Contact Support") ]]</button>
            </section>

            <section class="highlight tiles warning" hidden\$="[[ !isSubCanceled(subStatus) ]]">
                <div class="info">
                    <pl-icon class="info-icon" icon="error"></pl-icon>
                    <div class="info-body">
                        <div class="info-title">[[ \$l("Subscription Canceled") ]]</div>
                        <div class="info-text">[[ subCanceledMessage() ]]</div>
                    </div>
                </div>
                <button class="tap" on-click="reactivateSubscription">[[ \$l("Reactivate Subscription") ]]</button>
            </section>

            <section class="highlight hidden\$=" [[="" !settings.syncconnected="" ]]"="">
                <div class="account tiles">
                    <div class="account-info">
                        <div class="account-email">[[ settings.syncEmail ]]</div>
                        <div class="account-stats">
                            <pl-icon icon="record"></pl-icon>
                            <span>[[ records.length ]]</span>
                            <pl-icon icon="mobile"></pl-icon>
                            <span>[[ account.devices.length ]]</span>
                            <pl-icon icon="refresh"></pl-icon>
                            <span>[[ lastSync ]]</span>
                        </div>
                    </div>
                    <pl-icon class="account-sync tap" icon="refresh" spin\$="[[ isSynching ]]" on-click="synchronize" disabled\$="[[ !isSubValid(subStatus) ]]"></pl-icon>
                </div>
                <div class="unlock-feature-hint" hidden\$="[[ isSubValid(subStatus) ]]">[[ \$l("Upgrade to enable synchronization!") ]]</div>
            </section>

            <section hidden\$="[[ !settings.syncConnected ]]">
                <div class="section-header">[[ \$l("{0} Devices Connected", account.devices.length) ]]</div>
                <div class="devices">
                    <template is="dom-repeat" items="[[ account.devices ]]">
                        <div class="section-row">
                            <div class="section-row-label">[[ item.description ]]</div>
                            <pl-icon icon="delete" class="tap" on-click="_revokeDevice" disabled\$="[[ _isCurrentDevice(item) ]]"></pl-icon>
                        </div>
                    </template>
                </div>
            </section>

            <section hidden\$="[[ !truthy(account.paymentSource) ]]">
                <div class="section-header">[[ \$l("Billing") ]]</div>
                <button class="tap" on-click="_updatePaymentMethod" data-source="App - Billing">[[ _paymentSourceLabel(account.paymentSource) ]]</button>
                <button class="tap" on-click="cancelSubscription" hidden\$="[[ !isSubActive(subStatus) ]]">[[ \$l("Cancel Subscription") ]]</button>
            </section>

        </main>

        <div class="login" hidden\$="[[ settings.syncConnected ]]">

            <pl-icon icon="close" class="back-button tap" on-click="_back"></pl-icon>

            <div class="spacer"></div>

            <div class="title">[[ \$l("Padlock Online") ]]</div>

            <div class="text">[[ loginInfoText() ]]</div>

            <pl-input id="emailInput" type="email" placeholder="[[ \$l('Enter Email Address') ]]" value="[[ settings.syncEmail ]]" select-on-focus="" required="" on-enter="_login" class="tap"></pl-input>

            <pl-loading-button id="loginButton" class="tap" on-click="_login">[[ \$l("Log In") ]]</pl-loading-button>

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

    static get is() {
        return "pl-cloud-view";
    }

    static get properties() {}

    ready() {
        super.ready();
        // this.listen("data-loaded", () => this.animate());
        // this.listen("sync-connect-start", () => this.animate());
        // this.listen("sync-connect-cancel", () => this.animate());
        // this.listen("sync-connect-success", () => this.animate());
        // this.listen("sync-disconnect", () => this.animate());
        // this.listen("sync-connect-success", () => this.refreshAccount());
    }

    animate() {
        if (this.settings.syncConnected) {
            this.animateCascade(this.root.querySelectorAll("section:not([hidden])"), { initialDelay: 200 });
        }
    }

    focusEmailInput() {
        this.$.emailInput.focus();
    }

    _back() {
        this.dispatchEvent(new CustomEvent("cloud-back"));
    }

    _logout() {
        this.confirm($l("Are you sure you want to log out?"), $l("Log Out")).then(confirmed => {
            if (confirmed) {
                this.disconnectCloud();
            }
        });
    }

    _login() {
        if (this._submittingEmail) {
            return;
        }

        this.$.loginButton.start();

        if (this.$.emailInput.invalid) {
            this.alert($l("Please enter a valid email address!")).then(() => this.$.emailInput.focus());
            this.$.loginButton.fail();
            return;
        }

        this._submittingEmail = true;

        this.connectCloud(this.$.emailInput.value)
            .then(() => {
                this._submittingEmail = false;
                this.$.loginButton.success();
                return this.promptLoginCode();
            })
            .then(() => {
                if (this.settings.syncConnected) {
                    this.synchronize();
                }
            })
            .catch(() => {
                this._submittingEmail = false;
                this.$.loginButton.fail();
            });
    }

    _isCurrentDevice(device) {
        return this.settings.syncId === device.tokenId;
    }

    _revokeDevice(e) {
        const device = e.model.item;
        this.confirm($l('Do you want to revoke access to for the device "{0}"?', device.description)).then(
            confirmed => {
                if (confirmed) {
                    this.cloudSource.source.revokeAuthToken(device.tokenId).then(() => {
                        this.refreshAccount();
                        this.alert($l("Access for {0} revoked successfully!", device.description), { type: "success" });
                    });
                }
            }
        );
    }

    _contactSupport() {
        window.open("mailto:support@padlock.io", "_system");
    }

    _paymentSourceLabel() {
        const s = this.account && this.account.paymentSource;
        return s && `${s.brand} •••• •••• •••• ${s.lastFour}`;
    }

    _buySubscription(e) {
        this.buySubscription(e.target.dataset.source);
    }

    _updatePaymentMethod(e) {
        this.updatePaymentMethod(e.target.dataset.source);
    }

    _promoExpired() {
        this.dispatch("settings-changed");
    }
}

window.customElements.define(CloudView.is, CloudView);
