import "../styles/shared.js";
import { LocaleMixin, DialogMixin, NotificationMixin, AnimationMixin, SubInfoMixin } from "../mixins";
import { applyMixins } from "../core/util.js";
import { request } from "../core/ajax.js";
import { track, init } from "../core/tracking.js";
import { localize as $l } from "../core/locale.js";
import { BaseElement, html } from "../elements/base.js";
import "./icon.js";
import "./input.js";
import "./loading-button.js";
import "./dialog-payment.js";
import "./promo.js";
import "./dialog-promo.js";

init({
    request: request,
    urlForPath(path) {
        return `/${path}/`;
    }
});

class Dashboard extends applyMixins(
    BaseElement,
    LocaleMixin,
    DialogMixin,
    NotificationMixin,
    AnimationMixin,
    SubInfoMixin
) {
    static get is() {
        return "pl-dashboard";
    }

    static get template() {
        return html`
    <style include="shared">

        :host {
            display: flex;
            flex-direction: column;
            @apply --fullbleed;
            background: var(--color-quaternary);
        }

        :host:not([ready]) main {
            opacity: 0;
        }

        button {
            display: block;
            width: 100%;
            box-sizing: border-box;
            /* font-weight: bold; */
        }

        .account {
            font-size: 130%;
            font-weight: bold;
            margin: 10px 0;
            overflow-wrap: break-word;
        }

        .subscription-status {
            font-size: 150%;
            font-weight: bold;
            margin: 10px 0;
        }

        header .title.back {
            padding: 0;
            /* margin-left: -10px; */
            font-size: var(--font-size-small);
            flex: none;
        }

        header .back-icon {
            font-size: var(--font-size-small);
            width: 30px;
            margin-right: -20px;
        }

        .title.email {
            text-align: center;
            padding-right: 0;
        }

        .devices {
            line-height: var(--row-height);
        }

        .devices .title {
            text-align: center;
            padding: 0 15px;
            font-weight: bold;
        }

        .device {
            display: flex;
        }

        .device-name {
            flex: 1;
            padding: 0 15px;
            @apply --ellipsis;
        }

        .device > pl-icon {
            width: var(--row-height);
            height: var(--row-height);
        }

        #cardElement {
            height: var(--row-height);
            padding: 15px;
            box-sizing: border-box;
        }

        .payment-method {
            padding-top: 15px;
            padding-bottom: 5px;
            font-weight: bold;
        }

        .buy-subscription {
            text-align: center;
            padding: 30px;
        }

        .subscription-name {
            font-weight: bold;
            font-size: 130%;
        }

        .subscription-features {
            list-style: none;
            padding: 0;
        }

        .subscription-features li::before {
            font-family: "FontAwesome";
            content: "\f00c\ ";
        }

        .price {
            margin: 10px 0;
            font-size: 180%;
            font-weight: bold;
        }

        .small {
            font-size: var(--font-size-small);
        }

        .secure-payment {
            display: block;
            font-size: 12px;
            padding: 5px;
            text-align: center;
            text-shadow: none;
        }

        .secure-payment::before {
            font-family: "FontAwesome";
            content: "\f023\ ";
            vertical-align: middle;
            position: relative;
            top: 1px;
            text-shadow: none;
        }

        .secure-payment > * {
            vertical-align: middle;
        }

        .secure-payment > img {
            height: 20px;
            position: relative;
            top: 1px;
        }

        .card-hint {
            font-size: var(--font-size-small);
        }

        .card-hint:not([error=""]) {
            color: #eb1c26;
            text-shadow: none;
        }

        #cardDialog, #billingDialog, #invoicesDialog {
            --pl-dialog-max-width: 500px;
        }

        #submitButton {
            font-weight: bold;
        }

        #billingForm {
            display: flex;
            flex-direction: column;
        }

        .select-wrapper {
            padding: 0 10px 0 5px;
        }

        #billingForm > input {
            height: var(--row-height);
            padding: 0 15px;
        }

        #billingForm select {
            height: var(--row-height);
            width: 100%;
            text-shadow: inherit;
        }

        .invoices {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .invoices li > a {
            display: block;
            height: var(--row-height);
            line-height: var(--row-height);
            padding: 0 15px;
            text-align: center;
        }

        .info {
            display: flex;
            align-items: center;
        }

        .info-icon {
            width: 80px;
            height: 80px;
            font-size: 60px;
            margin: 10px 0 10px 10px;
        }

        .info-body {
            padding: 20px 15px 20px 10px;
            flex: 1;
        }

        .info-title {
            font-size: 120%;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .info-text {
            font-size: var(--font-size-small);
        }

        .info-2 {
            padding: 15px;
            font-size: var(--font-size-small);
            text-align: center;
            line-height: normal;
        }

        .info-2 a {
            text-decoration: underline;
        }

        @media (min-width: 700px) {
            section {
                width: 670px;
                margin: 15px auto;
                border-left: solid 1px rgba(0, 0, 0, 0.1);
                border-right: solid 1px rgba(0, 0, 0, 0.1);
                border-radius: 8px;
            }
        }
    </style>
    <header>
        <div class="tap" on-click="_back">
            <pl-icon icon="backward" class="back-icon"></pl-icon>
            <pl-icon icon="logo"></pl-icon>
        </div>
        <div class="title email">[[ account.email ]]</div>
        <a href="/logout/">
            <pl-icon icon="logout" class="tap"></pl-icon>
        </a>
    </header>

    <main>

        <section class="highlight dark" hidden$="[[ !truthy(promo) ]]">
            <pl-promo promo="[[ promo ]]" data-source="Dashboard - Promo" on-promo-redeem="_buySubscription" on-promo-expired="_promoExpired"></pl-promo>
        </section>

        <section class="highlight tiles warning" hidden$="[[ !isTrialing(account.subscription.status) ]]">
            <div class="info">
                <pl-icon class="info-icon" icon="time"></pl-icon>
                <div class="info-body">
                    <div class="info-title">[[ $l("Trialing ({0} days left)", remainingTrialDays) ]]</div>
                    <div class="info-text">[[ trialingMessage(remainingTrialDays) ]]</div>
                </div>
            </div>
            <button class="tap" on-click="_buySubscription" data-source="Dashboard - Trialing">[[ $l("Upgrade Now") ]]</button>
        </section>

        <section class="highlight tiles warning" hidden$="[[ !isTrialExpired(account.subscription.status) ]]">
            <div class="info">
                <pl-icon class="info-icon" icon="error"></pl-icon>
                <div class="info-body">
                    <div class="info-title">[[ $l("Trial Expired") ]]</div>
                    <div class="info-text">[[ trialExpiredMessage() ]]</div>
                </div>
            </div>
            <button class="tap" on-click="_buySubscription" data-source="Dashboard - Trial Expired">[[ $l("Upgrade Now") ]]</button>
        </section>

        <section class="highlight tiles warning" hidden$="[[ !isSubUnpaid(account.subscription.status) ]]">
            <div class="info">
                <pl-icon class="info-icon" icon="error"></pl-icon>
                <div class="info-body">
                    <div class="info-title">[[ $l("Payment Failed") ]]</div>
                    <div class="info-text">[[ subUnpaidMessage() ]]</div>
                </div>
            </div>
            <button class="tap" on-click="_updatePaymentMethod" data-source="Dashboard - Payment Failed">[[ $l("Update Payment Method") ]]</button>
            <button class="tap" on-click="_contactSupport">[[ $l("Contact Support") ]]</button>
        </section>

        <section class="highlight tiles warning" hidden$="[[ !isSubCanceled(account.subscription.status) ]]">
            <div class="info">
                <pl-icon class="info-icon" icon="error"></pl-icon>
                <div class="info-body">
                    <div class="info-title">[[ $l("Subscription Canceled") ]]</div>
                    <div class="info-text">[[ subCanceledMessage() ]]</div>
                </div>
            </div>
            <button class="tap" on-click="_reactivateSubscription">[[ $l("Reactivate Subscription") ]]</button>
        </section>

        <section class="devices">
            <div class="title">[[ $l("{0} Paired Devices", account.devices.length) ]]</div>
            <div class="info-2" hidden$="[[ !_hasNoDevices(account.devices) ]]">[[ $l("Looks like you haven't installed the Padlock app on any devices yet!") ]]</div>
            <button class="tap" on-click="_downloadApp" hidden$="[[ !_hasNoDevices(account.devices) ]]">[[ $l("Download App") ]]</button>
            <dom-repeat items="[[ account.devices ]]">
                <template>
                    <div class="device">
                        <div class="device-name">[[ item.description ]]</div>
                        <pl-icon icon="delete" on-click="_revokeDevice"></pl-icon>
                    </div>
                </template>
            </dom-repeat>
        </section>

        <section hidden$="[[ !truthy(account.paymentSource) ]]">
            <div class="section-header">[[ $l("Billing") ]]</div>
            <button class="tap" on-click="_updatePaymentMethod" data-source="App - Billing">[[ _paymentSourceLabel(account.paymentSource) ]]</button>
            <button class="tap" on-click="_cancelSubscription"
                hidden$="[[ !isSubActive(account.subscription.status) ]]">[[ $l("Cancel Subscription") ]]</button>
        </section>

        <section hidden$="[[ _showAdvanced ]]">
            <button class="tap" on-click="_showAdvancedOptions">[[ $l("Advanced Options...") ]]</button>
        </section>

        <div hidden$="[[ !_showAdvanced ]]">

            <section>
                <div class="info-2">[[ _resetDataText() ]]</div>
                <button class="tap" on-click="_resetData">[[ $l("Reset Data") ]]</button>
            </section>

            <section>
                <div class="info-2">
                    Had enough? Deleting your acccount will wipe all your
                    online vault data and personal information from our systems.
                    Your connected devices will be locked out.
                    Any active subscriptions will be canceled immediately.
                    We may retain some billing information and transaction
                    history as required by law (consult our <a
                        href="https://padlock.io/privacy/" target="_blank">Privacy Policy</a>
                    for more information).<br>
                    <strong>Note:</strong> This will not affect data stored locally on your devices. You
                    may continue to use the app offline or wipe your data from your devices manually.
                    </div>
                <pl-loading-button id="deleteAccountButton" class="tap" on-click="_deleteAccount">[[ $l("Delete Account") ]]</pl-loading-button>
            </section>

        </div>

    </main>

    <pl-dialog id="deleteStoreDialog">
        <form action="/deletestore/" method="POST">
            <div class="message">[[ _confirmResetDataText() ]]</div>
            <input type="hidden" name="gorilla.csrf.Token" value="[[ csrfToken ]]">
            <button class="tap tiles-2">[[ $l("Reset Data") ]]</button>
        </form>
    </pl-dialog>

    <pl-dialog id="cancelSubscriptionDialog">
        <form action="/unsubscribe/" method="POST">
            <div class="message">[[ _cancelSubscriptionText() ]]</div>
            <input type="hidden" name="gorilla.csrf.Token" value="[[ csrfToken ]]">
            <button class="tap tiles-2">[[ $l("Cancel Subscription") ]]</button>
        </form>
    </pl-dialog>

    <pl-dialog id="revokeDeviceDialog">
        <form action="/revoke/" method="POST">
            <div class="message">[[ _revokeDeviceMessage ]]</div>
            <input type="hidden" name="gorilla.csrf.Token" value="[[ csrfToken ]]">
            <input type="hidden" name="id" value="[[ _revokedDeviceId ]]">
            <button class="tap tiles-2">[[ $l("Revoke Access") ]]</button>
        </form>
    </pl-dialog>

    <pl-payment-dialog id="paymentDialog" stripe-pub-key="[[ stripePubKey ]]" csrf-token="[[ csrfToken ]]">
    </pl-payment-dialog>
`;
    }

    static get properties() {
        return {
            account: Object,
            action: String,
            token: Object,
            csrfToken: String,
            stripePubKey: String,
            referer: String,

            _showAdvanced: {
                type: Boolean,
                value: false
            }
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.$.paymentDialog.source = this;

        setTimeout(() => {
            this.animateCascade(this.root.querySelectorAll("section"));
            this.setAttribute("ready", "");
        }, 100);

        switch (this.action) {
            case "paired":
                setTimeout(() => {
                    this.notify($l("{0} paired successfully!", this.token.description), "info", 3000);
                }, 500);
                break;
            case "revoked":
                setTimeout(() => {
                    this.notify($l("Access for {0} revoked successfully!", this.token.description), "info", 3000);
                }, 500);
                break;
            case "reset":
                setTimeout(() => this.notify($l("Successfully reset data!"), "info", 3000), 500);
                break;
            case "subscribed":
                setTimeout(() => this.notify($l("Subscription added successfully!"), "info", 3000), 500);
                break;
            case "unsubscribed":
                setTimeout(() => this.notify($l("Subscription canceled successfully!"), "info", 3000), 500);
                break;
            case "payment-updated":
                setTimeout(() => this.notify($l("Payment method updated successfully!"), "info", 3000), 500);
                break;
            case "subscribe":
                if (!this.isSubActive()) {
                    this._buySubscription();
                }
                break;
        }

        if (!localStorage.getItem("firstOpened")) {
            localStorage.setItem("firstOpened", new Date().getTime());

            this.choose(
                $l(
                    "This is where you can manage your Padlock online " +
                        "account and see all your paired devices. You won't be able to access " +
                        "any of your actual data here, though, that can only be done from the Padlock app!"
                ),
                [$l("Got it!")],
                { title: "Welcome To Your Dashboard!", hideIcon: true }
            );
        }

        track("Dashboard: Finish Loading");
    }

    subscribe(stripeToken = "", coupon = "", source = "") {
        const params = new URLSearchParams();
        params.set("stripeToken", stripeToken);
        params.set("coupon", coupon);
        params.set("source", source);
        params.set("gorilla.csrf.Token", this.csrfToken);
        return request(
            "POST",
            "/subscribe/",
            params.toString(),
            new Map().set("Content-Type", "application/x-www-form-urlencoded").set("Accept", "application/json")
        );
    }

    _refreshAccount() {
        return request("GET", "/account/").then(req => (this.account = JSON.parse(req.responseText)));
    }

    _resetDataText() {
        return $l(
            "Want to start from scratch? Here you can reset your online vault data in case " +
                "you lost your master password or simply want to start over. Your connected " +
                "devices, billing information and subscription status will remain unaffected."
        );
    }

    _confirmResetDataText() {
        return $l(
            "Are you sure you want to reset your online vault data? " +
                "This action can not be undone! (Data stored locally on your devices will not be affected)"
        );
    }

    _cancelSubscriptionText() {
        return $l(
            "Are you sure you want to cancel your subscription? Without an active subscription your access " +
                "will be read-only, which means you won't be able to upload any new data or synchronize changes " +
                "between devices!"
        );
    }

    _resetData() {
        this.$.deleteStoreDialog.open = true;
    }

    _revokeDevice(e) {
        this._revokedDeviceId = e.model.item.tokenId;
        this._revokeDeviceMessage = $l('Are you sure you want to revoke access for "{0}"?', e.model.item.description);
        this.$.revokeDeviceDialog.open = true;
    }

    _buySubscription(e) {
        this.$.paymentDialog.promo = this.account.promo;
        this.$.paymentDialog.plan = this.account.plan;
        this.$.paymentDialog.show((e && e.target.dataset.source) || this.referer).then(success => {
            if (success) {
                this._refreshAccount();
                this.alert($l("Congratulations, you've successfully upgraded to Padlock Pro!"), { type: "success" });
            }
        });
    }

    _cancelSubscription() {
        this.$.cancelSubscriptionDialog.open = true;
    }

    _updatePaymentMethod() {
        this.$.paymentDialog.plan = null;
        this.$.paymentDialog.show("Dashboard").then(success => {
            if (success) {
                this._refreshAccount();
                this.notify($l("Payment method updated successfully!"), "info", 2000);
            }
        });
    }

    _back() {
        track("Dashboard: Back", {}).then(() => {
            setTimeout(() => (window.location = "https://padlock.io/"), 200);
        });
        window.location = "padlock://?ref=dashboard";
    }

    _openBillingDialog() {
        this.$.billingDialog.open = true;
    }

    _showInvoices(e) {
        const button = e.target;
        button.start();
        request("GET", "/invoices/", undefined, new Map([["Accept", "application/json"]])).then(res => {
            this._invoices = JSON.parse(res.responseText);
            this.$.invoicesDialog.open = true;
            button.success();
        });
    }

    _formatTimestamp(ts) {
        return new Date(ts * 1000).toLocaleDateString();
    }

    _hasNoDevices() {
        return !this.account.devices.length;
    }

    _downloadApp() {
        window.open("https://padlock.io/downloads/", "_blank");
    }

    _promoExpired() {
        this.notifyPath("account.promo");
    }

    _paymentSourceLabel(s) {
        return s && `${s.brand} •••• •••• •••• ${s.lastFour}`;
    }

    _reactivateSubscription() {
        this.subscribe(undefined, undefined, "Dashboard")
            .then(() => {
                this._refreshAccount();
                this.alert($l("Subscription reactivated successfully!"), { type: "success" });
            })
            .catch(e => this.alert(e.message, { type: "warning" }));
    }

    _deleteAccount() {
        this.prompt(
            $l("Are you sure you want to delete your Padlock online account?"),
            $l("Type 'DELETE' To Confirm"),
            "text",
            $l("Delete Account"),
            $l("Cancel"),
            false,
            val => {
                return val === "DELETE" ? Promise.resolve(true) : Promise.reject("Type 'DELETE' to confirm!");
            }
        ).then(confirmed => {
            if (confirmed === true) {
                this.$.deleteAccountButton.start();
                const params = new URLSearchParams();
                params.set("gorilla.csrf.Token", this.csrfToken);
                request(
                    "POST",
                    "/deleteaccount/",
                    params.toString(),
                    new Map([["Content-Type", "application/x-www-form-urlencoded"], ["Accept", "application/json"]])
                )
                    .then(() => {
                        this.$.deleteAccountButton.success();
                        this.alert("Account deleted successfully. Sorry to see you go!", { type: "success" }).then(() =>
                            window.close()
                        );
                    })
                    .catch(e => {
                        this.$.deleteAccountButton.fail();
                        this.alert(e.message, { type: "warning" });
                    });
            }
        });
    }

    _showAdvancedOptions() {
        this._showAdvanced = true;
    }
}

window.customElements.define(Dashboard.is, Dashboard);
