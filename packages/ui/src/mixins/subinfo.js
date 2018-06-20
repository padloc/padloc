import { isFuture } from "@padlock/core/lib/util";
import { localize as $l } from "@padlock/core/lib/locale.js";

export function SubInfoMixin(superClass) {
    return class SyncMixin extends superClass {
        static get properties() {
            return {
                remainingTrialDays: {
                    type: Number,
                    computed: "_computeRemainingTrialDays(account.subscription.trialEnd)"
                },
                promo: {
                    type: Object,
                    computed: "_getPromo(account.promo, subStatus)"
                },
                subStatus: {
                    type: String,
                    computed: "identity(account.subscription.status)",
                    value: ""
                }
            };
        }

        isTrialing() {
            return this.subStatus === "trialing";
        }

        isTrialExpired() {
            return this.subStatus === "trial_expired";
        }

        isSubCanceled() {
            return this.subStatus === "canceled";
        }

        isSubUnpaid() {
            const s = this.subStatus;
            return s === "unpaid" || s === "past_due";
        }

        isSubActive() {
            return this.subStatus === "active";
        }

        isSubValid() {
            const s = this.subStatus;
            return this.settings.syncConnected && (!s || s === "active" || s === "trialing");
        }

        trialingMessage() {
            return $l(
                "Your trial period ends in {0} days. Upgrade now to continue using online features like " +
                    "synchronization and automatic backups!",
                this.remainingTrialDays
            );
        }

        trialExpiredMessage() {
            return $l(
                "Your free trial has expired. Upgrade now to continue using advanced features like " +
                    "automatic online backups and seamless synchronization between devices!"
            );
        }

        subUnpaidMessage() {
            return $l(
                "Your last payment has failed. Please contact your card provider " + "or update your payment method!"
            );
        }

        subCanceledMessage() {
            return $l(
                "Your subscription has been canceled. Reactivate it now to continue using advanced " +
                    "features like automatic online backups and seamless synchronization between devices!"
            );
        }

        _computeRemainingTrialDays(trialEnd) {
            var now = new Date().getTime() / 1000;
            trialEnd = trialEnd ? parseInt(trialEnd, 10) : now;
            return Math.max(0, Math.ceil((trialEnd - now) / 60 / 60 / 24));
        }

        _getPromo() {
            const promo = this.account && this.account.promo;
            const promoActive =
                !this.isSubActive() && promo && (!promo.redeemWithin || isFuture(promo.created, promo.redeemWithin));
            return promoActive ? promo : null;
        }
    };
}
