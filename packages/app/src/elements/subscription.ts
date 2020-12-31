import { translate as $l } from "@padloc/locale/src/translate";
import { Org } from "@padloc/core/src/org";
import { PlanType, SubscriptionStatus, UpdateBillingParams } from "@padloc/core/src/billing";
import { shared } from "../styles";
import { dialog, alert, choose, confirm } from "../lib/dialog";
import { fileSize, loadScript } from "../lib/util";
import { app } from "../globals";
import { StateMixin } from "../mixins/state";
import { BaseElement, element, property, html, css, query } from "./base";
import "./icon";
import { Button } from "./button";
import { UpdateSubscriptionDialog } from "./update-subscription-dialog";
import { BillingDialog } from "./billing-dialog";

@element("pl-subscription")
export class OrgSubscription extends StateMixin(BaseElement) {
    @property()
    org: Org | null = null;

    @dialog("pl-update-subscription-dialog")
    private _updateSubscriptionDialog: UpdateSubscriptionDialog;

    @dialog("pl-billing-dialog")
    private _billingDialog: BillingDialog;

    @query("#editButton")
    private _editButton: Button;

    @query("#paymentButton")
    private _paymentButton: Button;

    @query("#authButton")
    private _authButton: Button;

    @query("#downgradeButton")
    private _downgradeButton: Button;

    private get _billing() {
        return this.org ? this.org.billing : app.account && app.account.billing;
    }

    private get _subscription() {
        return this._billing && this._billing.subscription;
    }

    private async _update() {
        const sub = this._subscription;

        if (this.org) {
            if (!sub) {
                this._updatePlan();
                return;
            }
        } else {
            if (!sub || sub.plan.type === PlanType.Free) {
                this.dispatch("get-premium");
                return;
            }
        }

        const canceled = sub.status === SubscriptionStatus.Canceled;
        const choices = canceled ? [$l("Resume Subscription")] : [$l("Cancel Subscription")];

        if (this.org) {
            choices.push($l("Update Plan"));
        }

        const choice = await choose("", choices);

        switch (choice) {
            case 0:
                return canceled ? this._resumeSubscription() : this._cancelSubscription();
            case 1:
                return this._updateSubscriptionDialog.show(this.org!);
        }
    }

    private _updatePlan() {
        this.org ? this._updateSubscriptionDialog.show(this.org) : this.dispatch("get-premium");
    }

    private async _downgrade() {
        if (this.org) {
            throw "Can only downgrade subscription for private account!";
        }

        if (this._downgradeButton.state === "loading") {
            return;
        }

        const confirmed = await confirm(
            $l("Are you sure you want to downgrade to the Free Plan?"),
            $l("Downgrade"),
            $l("Cancel"),
            { type: "destructive", title: "Downgrade" }
        );

        if (!confirmed) {
            return;
        }

        this._downgradeButton.start();
        try {
            await app.updateBilling(new UpdateBillingParams({ planType: PlanType.Free }));
            this._downgradeButton.success();
        } catch (e) {
            this._downgradeButton.fail();
            alert(e.message || $l("Something went wrong. Please try again later!"), { type: "warning" });
        }
    }

    private async _updateBilling() {
        if (this._paymentButton.state === "loading") {
            return;
        }

        const billingInfo = this._billing!;

        const params = await this._billingDialog.show({ billingInfo });
        if (params) {
            this._paymentButton.start();
            try {
                await app.updateBilling(params);
                this._paymentButton.success();
            } catch (e) {
                this._paymentButton.fail();
                alert(e.message || $l("Something went wrong. Please try again later!"), { type: "warning" });
                throw e;
            }
        }
    }

    private async _do(fn: () => Promise<any>) {
        if (this._editButton.state === "loading") {
            return;
        }

        this._editButton.start();
        try {
            await fn();
            this._editButton.success();
        } catch (e) {
            this._editButton.fail();
            alert(e.message || $l("Something went wrong. Please try again later!"), { type: "warning" });
        }
    }

    private async _cancelSubscription() {
        this._do(() =>
            app.updateBilling(new UpdateBillingParams({ org: (this.org && this.org.id) || undefined, cancel: true }))
        );
    }

    private async _resumeSubscription() {
        this._do(() =>
            app.updateBilling(new UpdateBillingParams({ org: (this.org && this.org.id) || undefined, cancel: false }))
        );
    }

    private async _authenticatePayment() {
        const stripePubKey = app.state.billingProvider && app.state.billingProvider.config.publicKey;

        if (!stripePubKey || this._authButton.state === "loading") {
            return;
        }

        this._authButton.start();

        let error: string = "";
        try {
            const Stripe = await loadScript("https://js.stripe.com/v3/", "Stripe");
            const stripe = Stripe(stripePubKey);
            const result = await stripe.handleCardPayment(this._subscription!.paymentRequiresAuth);
            error = result.error && result.error.message;
            await app.updateBilling(new UpdateBillingParams());
        } catch (e) {
            error = e.message || $l("Something went wrong. Please try again later!");
        }

        if (error) {
            alert(error);
            this._authButton.fail();
        } else {
            this._authButton.success();
        }
    }

    static styles = [
        shared,
        css`
            .quota {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                grid-gap: var(--spacing);
            }

            .edit-button {
                position: absolute;
                top: var(--spacing);
                right: var(--spacing);
                z-index: 1;
            }
        `,
    ];

    private _renderAccountQuota() {
        const account = app.account!;
        const privateItemQuota = app.getItemsQuota();
        const privateItemCount = (app.mainVault && app.mainVault.items.size) || 0;
        return html`
            <div ?warning=${privateItemQuota !== -1 && privateItemCount >= privateItemQuota}>
                <pl-icon icon="list" class="large"></pl-icon>

                <div class="small">
                    ${privateItemQuota === -1 ? $l("Unlimited") : `${privateItemCount} / ${privateItemQuota}`}
                </div>
            </div>

            <div ?warning=${account.usedStorage >= account.quota.storage * 1e9 - 5e6}>
                <pl-icon icon="storage" class="large"></pl-icon>

                <div class="small">${fileSize(account.usedStorage)} / ${account.quota.storage} GB</div>
            </div>
        `;
    }

    private _renderOrgQuota() {
        const org = this.org!;
        const quota = org.quota;
        return html`
            <div class="${quota.members !== -1 && org.members.length >= quota.members ? "red" : ""}">
                <pl-icon icon="members" class="large"></pl-icon>

                <div class="small">
                    ${quota.members === -1 ? $l("Unlimited") : `${org.members.length} / ${quota.members}`}
                </div>
            </div>

            <div ?warning=${quota.groups !== -1 && org.groups.length >= quota.groups}>
                <pl-icon icon="group" class="large"></pl-icon>

                <div class="small">
                    ${quota.groups === -1 ? $l("Unlimited") : `${org.groups.length} / ${quota.groups}`}
                </div>
            </div>

            <div ?warning=${quota.vaults !== -1 && org.vaults.length >= quota.vaults}>
                <pl-icon icon="vaults" class="large"></pl-icon>

                <div class="small">
                    ${quota.vaults === -1 ? $l("Unlimited") : `${org.vaults.length} / ${quota.vaults}`}
                </div>
            </div>

            <div ?warning=${quota.storage !== -1 && org.usedStorage >= quota.storage * 1e9 - 5e6}>
                <pl-icon icon="storage" class="large"></pl-icon>

                <div class="small">
                    ${quota.storage === -1 ? $l("Unlimited") : `${fileSize(org.usedStorage)} / ${quota.storage} GB`}
                </div>
            </div>
        `;
    }

    render() {
        if (!app.account) {
            return html``;
        }

        const account = app.account!;
        const billing = this.org ? this.org.billing : account.billing;
        const sub = billing && billing.subscription;

        const trialDays =
            sub && sub.trialEnd
                ? Math.max(0, Math.ceil((sub.trialEnd.getTime() - Date.now()) / 1000 / 60 / 60 / 24))
                : 0;

        const periodDays =
            sub && sub.periodEnd
                ? Math.max(0, Math.ceil((sub.periodEnd.getTime() - Date.now()) / 1000 / 60 / 60 / 24))
                : 0;

        return html`
            <div class="padded text-centering spacing vertical relative layout card">
                <div class="large margined bold">${(sub && sub.plan.name) || $l("No Plan Selected")}</div>

                <div class="quota">
                    ${this.org ? this._renderOrgQuota() : this._renderAccountQuota()}
                    ${sub
                        ? html`
                              <div>
                                  <pl-icon icon="dollar" class="large"></pl-icon>

                                  <div class="small">
                                      ${$l("{0} / Year", ((sub.members * sub.plan.cost) / 100).toFixed(2))}
                                  </div>
                              </div>

                              ${sub.status === SubscriptionStatus.Canceled
                                  ? html`
                                        <div warning>
                                            <pl-icon icon="time" class="large"></pl-icon>

                                            <div class="small">
                                                ${$l("Canceled ({0} days left)", periodDays.toString())}
                                            </div>
                                        </div>
                                    `
                                  : sub.status === SubscriptionStatus.Inactive
                                  ? html`
                                        <div class="quota-item red">
                                            <pl-icon icon="error" class="large"></pl-icon>

                                            <div class="small">
                                                ${sub.paymentRequiresAuth
                                                    ? $l("Authentication Required")
                                                    : $l("Inactive")}
                                            </div>
                                        </div>
                                    `
                                  : sub.status === SubscriptionStatus.Trialing
                                  ? html`
                                        <div ?warning=${trialDays < 3}>
                                            <pl-icon icon="time" class="large"></pl-icon>

                                            <div class="small">
                                                ${$l("Trialing ({0} days left)", trialDays.toString())}
                                            </div>
                                        </div>
                                    `
                                  : html``}
                          `
                        : ""}
                </div>

                ${sub && sub.paymentError
                    ? html` <div class="padded inverted red card">${sub.paymentError}</div> `
                    : ""}
                ${!sub
                    ? html` <pl-button class="primary" @click=${this._updatePlan}> ${$l("Choose Plan")} </pl-button> `
                    : sub.paymentRequiresAuth
                    ? html`
                          <pl-button id="authButton" class="primary" @click=${this._authenticatePayment}
                              >${$l("Complete Payment")}</pl-button
                          >
                      `
                    : sub.status === SubscriptionStatus.Inactive
                    ? html`
                          <pl-button id="paymentButton" class="primary" @click=${this._updateBilling}>
                              ${$l("Add Payment Method")}
                          </pl-button>

                          <pl-button id="downgradeButton" @click=${this._downgrade} ?hidden=${!!this.org}>
                              ${$l("Downgrade To Free Plan")}
                          </pl-button>
                      `
                    : this.org || sub.plan.type !== PlanType.Free
                    ? html`
                          <pl-button id="editButton" class="edit-button slim transparent" @click=${this._update}>
                              <pl-icon icon="edit"></pl-icon>
                          </pl-button>
                      `
                    : html` <pl-button class="primary" @click=${this._update}> ${$l("Get Premium")} </pl-button> `}
            </div>
        `;
    }
}
