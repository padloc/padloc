import { formatDateFromNow } from "@padlock/core/lib/util.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { checkForUpdates } from "@padlock/core/lib/platform.js";
import { SubInfoMixin } from ".";
import "../elements/dialog-payment.js";
import "../elements/dialog-promo.js";

export function SyncMixin(superClass) {
    return class SyncMixin extends SubInfoMixin(superClass) {
        static get properties() {
            return {
                isSynching: {
                    type: Boolean,
                    value: false,
                    notify: true
                },
                lastSync: String,
                account: {
                    type: Object,
                    computed: "identity(app.client.account)"
                },
                session: {
                    type: Object,
                    computed: "identity(app.client.session)"
                }
            };
        }

        constructor() {
            super();
            this.listen("sync-start", () => this._syncStart());
            this.listen("sync-success", () => this._syncSuccess());
            this.listen("sync-fail", () => this._syncFail());
            this.listen("account-changed", () => this.notifyPath("account"));
            this.listen("session-changed", () => this.notifyPath("session"));
            this._updateLastSync();
            setInterval(() => this._updateLastSync(), 60000);
        }

        _syncStart() {
            this.set("isSynching", true);
            this.saveCall("syncStart");
        }

        _syncSuccess() {
            this._updateLastSync();
            this.set("isSynching", false);
            this.saveCall("syncSuccess");
        }

        _syncFail() {
            this.set("isSynching", false);
            this.saveCall("syncFail");
        }

        async login(email) {
            await this.app.login(email.toLowerCase());
            this.dispatch("sync-connect-start", { email: email });
            this.dispatch("session-changed");
        }

        async activateSession(code) {
            await this.app.activateSession(code);
            this.dispatch("sync-connect-success");
            this.dispatch("session-changed");
            this.dispatch("account-changed");
        }

        cancelConnect() {
            this.app.session = undefined;
            this.dispatch("session-changed");
            this.dispatch("sync-connect-cancel");
        }

        async logout() {
            await this.app.logout();
            this.dispatch("sync-disconnect");
            this.dispatch("session-changed");
            this.dispatch("account-changed");
        }

        synchronize(auto) {
            if (!this.app.isLoggedIn || (auto === true && !this.isSubValid())) {
                return;
            }

            if (this._chainedSync) {
                // There is already a chained sync promise, so just return that one
                return this._chainedSync;
            }

            if (this._currentSync) {
                // There is already a synchronization in process. wait for the current sync to finish
                // before starting a new one.
                const chained = (this._chainedSync = this._currentSync.then(() => {
                    this._chainedSync = null;
                    return this.synchronize();
                }));
                return chained;
            }

            const sync = (this._currentSync = this._synchronize(auto).then(
                () => (this._currentSync = null),
                () => (this._currentSync = null)
            ));
            return sync;
        }

        isActivationPending() {
            return this.app.session && !this.app.session.active;
        }

        promptLoginCode() {
            return this.prompt(
                $l("Check your email! We sent your login code to {0}.", this.settings.email),
                $l("Enter Login Code"),
                "text",
                $l("Confirm"),
                $l("Cancel"),
                true,
                async code => {
                    if (code === null) {
                        // Dialog canceled
                        this.cancelConnect();
                        return Promise.resolve(null);
                    } else if (code == "") {
                        return Promise.reject("Please enter a valid login code!");
                    } else {
                        try {
                            await this.activateSession(code);
                            return true;
                        } catch (e) {
                            return Promise.reject($l("Invalid login code. Try again!"));
                        }
                    }
                }
            );
        }

        loginInfoText() {
            return $l(
                "Log in now to unlock advanced features like automatic online backups and " +
                    "seamless synchronization between devices!"
            );
        }

        async _synchronize(auto) {
            auto = auto === true;
            this.dispatch("sync-start", { auto: auto });

            await this.app.remoteStorage.get(this.app.mainStore);
            await this.app.storage.set(this.app.mainStore);
            await this.app.remoteStorage.set(this.app.mainstore);
            this.dispatch("records-changed");
            this.dispatch("settings-changed");
            this.dispatch("sync-success", { auto: auto });

            // if (cloudSource.password !== this.password) {
            //     return this.choose(
            //         $l(
            //             "The master password you use locally does not match the one of your " +
            //                 "online account {0}. What do you want to do?",
            //             this.settings.syncEmail
            //         ),
            //         [$l("Update Local Password"), $l("Update Online Password"), $l("Keep Both Passwords")]
            //     ).then(choice => {
            //         switch (choice) {
            //             case 0:
            //                 this.setPassword(cloudSource.password).then(() => {
            //                     this.alert($l("Local password updated successfully."), { type: "success" });
            //                 });
            //                 break;
            //             case 1:
            //                 this.setRemotePassword(this.password);
            //                 break;
            //         }
            //     });
            // }
            // .catch(e => {
            //     this.dispatch("settings-changed");
            //     if (this._handleCloudError(e)) {
            //         this.dispatch("records-changed");
            //         this.dispatch("sync-success", { auto: auto });
            //     } else {
            //         this.dispatch("sync-fail", { auto: auto, error: e });
            //     }
            // });
        }

        _computeRemainingTrialDays(trialEnd) {
            var now = new Date().getTime() / 1000;
            trialEnd = trialEnd ? parseInt(trialEnd, 10) : now;
            return Math.max(0, Math.ceil((trialEnd - now) / 60 / 60 / 24));
        }

        _handleCloudError(e) {
            switch (e.code) {
                case "account_not_found":
                case "invalid_auth_token":
                case "expired_auth_token":
                    this.settings.syncConnected = false;
                    this.settings.syncAuto = false;
                    this.settings.syncToken = "";
                    this.settings.syncEmail = "";
                    this.settings.syncReadonly = false;
                    this.dispatch("settings-changed");
                    this.alert($l("You've been logged out of your Padlock online account. Please login in again!"));
                    return false;
                case "deprecated_api_version":
                    this.confirm(
                        $l(
                            "A newer version of Padlock is available now! Update now to keep using " +
                                "online features (you won't be able to sync with your account until then)!"
                        ),
                        $l("Update Now"),
                        $l("Cancel"),
                        { type: "info" }
                    ).then(confirm => {
                        if (confirm) {
                            checkForUpdates();
                        }
                    });
                    return false;
                case "rate_limit_exceeded":
                    this.alert($l("It seems are servers are over capacity right now. Please try again later!"));
                    return false;
                case "invalid_container_data":
                case "invalid_key_params":
                    this.alert(
                        $l(
                            "The data received from your online account seems to be corrupt and " +
                                "cannot be decrypted. This might be due to a network error but could " +
                                "also be the result of someone trying to compromise your connection to " +
                                "our servers. If the problem persists, please notify Padlock support!"
                        ),
                        { type: "warning" }
                    );
                    return false;
                case "decryption_failed":
                case "encryption_failed":
                    // Decryption failed. This means that the local master
                    // password does not match the one that was used for encrypting the remote data so
                    // we need to prompt the user for the correct password.
                    this.prompt(
                        $l("Please enter the master password for the online account {0}.", this.settings.syncEmail),
                        $l("Enter Master Password"),
                        "password",
                        $l("Submit"),
                        $l("Forgot Password"),
                        true,
                        pwd => {
                            if (!pwd) {
                                return Promise.reject($l("Please enter a password!"));
                            }
                            cloudSource.password = pwd;
                            return this.collection
                                .fetch(cloudSource)
                                .then(() => true)
                                .catch(e => {
                                    if (e.code == "decryption_failed") {
                                        throw $l("Incorrect password. Please try again!");
                                    } else {
                                        this._handleCloudError(e);
                                        return false;
                                    }
                                });
                        }
                    ).then(success => {
                        if (success === null) {
                            this.forgotCloudPassword().then(() => this.synchronize());
                        }
                        if (success) {
                            this.synchronize();
                        }
                    });
                    return false;
                case "unsupported_container_version":
                    this.confirm(
                        $l(
                            "It seems the data stored on Padlock Cloud was saved with a newer version of Padlock " +
                                "and can not be opened with the version you are currently running. Please " +
                                "install the latest version of Padlock on this device!"
                        ),
                        $l("Check For Updates"),
                        $l("Cancel")
                    ).then(confirmed => {
                        if (confirmed) {
                            checkForUpdates();
                        }
                    });
                    return false;
                case "subscription_required":
                    return true;
                case "failed_connection":
                    this.alert(
                        $l(
                            "Looks like we can't connect to our servers right now. Please check your internet " +
                                "connection and try again!"
                        ),
                        { type: "warning", title: $l("Failed Connection") }
                    );
                    return false;
                default:
                    this.confirm(
                        (e && e.message) || $l("Something went wrong. Please try again later!"),
                        $l("Contact Support"),
                        $l("Dismiss"),
                        { type: "warning" }
                    ).then(confirmed => {
                        if (confirmed) {
                            window.open(`mailto:support@padlock.io?subject=Server+Error+(${e.code})`);
                        }
                    });
                    return false;
            }
        }

        forgotCloudPassword() {
            throw "not implemented";
            // return this.promptForgotPassword().then(doReset => {
            //     if (doReset) {
            //         return this.cloudSource.clear();
            //     }
            // });
        }

        _updateLastSync() {
            return (this.lastSync = formatDateFromNow(this.app.stats.lastSync));
        }

        buySubscription(source) {
            if (!this._plansPromise) {
                this._plansPromise = this.cloudSource.source.getPlans();
            }
            this._plansPromise.then(plans => this.openPaymentDialog(plans[0], source)).then(success => {
                if (success) {
                    this.refreshAccount();
                    this.alert($l("Congratulations, your upgrade was successful! Enjoy using Padlock!"), {
                        type: "success"
                    });
                }
            });
        }

        updatePaymentMethod(source) {
            this.openPaymentDialog(null, source).then(success => {
                if (success) {
                    this.refreshAccount();
                    this.alert($l("Payment method updated successfully!"), { type: "success" });
                }
            });
        }

        openPaymentDialog(plan, source) {
            return this.lineUpDialog("pl-dialog-payment", dialog => {
                dialog.plan = plan;
                dialog.stripePubKey = this.settings.stripePubKey;
                dialog.source = this.cloudSource.source;
                dialog.remainingTrialDays = this.remainingTrialDays;
                dialog.promo = this.promo;
                return dialog.show(source);
            });
        }

        reactivateSubscription() {
            return this.cloudSource.source
                .subscribe()
                .then(() => {
                    this.refreshAccount();
                    this.alert($l("Subscription reactivated successfully!"), { type: "success" });
                })
                .catch(e => this._handleCloudError(e));
        }

        async refreshAccount() {
            await this.app.refreshAccount();
            this.dispatch("account-changed");
        }

        cancelSubscription() {
            return this.confirm(
                $l(
                    "Are you sure you want to cancel your subscription? You won't be able " +
                        "to continue using advanced features like automatic online backups and seamless " +
                        "synchronization between devices!"
                ),
                $l("Cancel Subscription"),
                $l("Don't Cancel"),
                { type: "warning" }
            ).then(confirmed => {
                if (confirmed) {
                    this.cloudSource.source.cancelSubscription().then(() => {
                        this.refreshAccount();
                        this.alert($l("Subscription canceled successfully."), { type: "success" });
                    });
                }
            });
        }

        alertPromo() {
            return this.lineUpDialog("pl-dialog-promo", dialog => {
                dialog.promo = this.promo;
                return dialog.show();
            }).then(redeem => {
                if (redeem) {
                    this.buySubscription("App - Promo (Alert)");
                }
            });
        }
    };
}
