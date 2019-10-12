import { translate as $l } from "@padloc/locale/src/translate";
import { Org } from "@padloc/core/src/org";
import { PlanType, SubscriptionStatus, UpdateBillingParams } from "@padloc/core/src/billing";
import { shared } from "../styles";
import { dialog, alert, choose } from "../lib/dialog";
import { fileSize, loadScript } from "../lib/util";
import { app } from "../globals";
import { StateMixin } from "../mixins/state";
import { BaseElement, element, property, html, css, query } from "./base";
import "./icon";
import { LoadingButton } from "./loading-button";
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
    private _editButton: LoadingButton;

    @query("#paymentButton")
    private _paymentButton: LoadingButton;

    @query("#authButton")
    private _authButton: LoadingButton;

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
        const stripePubKey = app.billingConfig && app.billingConfig.stripePublicKey;

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
            :host {
                display: block;
                position: relative;
                display: flex;
                flex-direction: column;
            }

            .quota {
                margin: 0 12px 12px 12px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            }

            .quota-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 4px;
                font-weight: bold;
                text-align: center;
            }

            .quota-item[warning] {
                color: var(--color-negative);
            }

            .quota-item pl-icon {
                font-size: 150%;
            }

            .quota-item .label {
                font-size: var(--font-size-small);
            }

            .edit-button {
                position: absolute;
                top: 12px;
                right: 12px;
                z-index: 1;
            }

            .missing {
                opacity: 0.7;
                cursor: pointer;
            }

            .plan-name {
                font-size: 150%;
                font-weight: bold;
                margin: 16px 8px;
                text-align: center;
            }

            button {
                font-weight: bold;
            }

            .premium-button {
                margin: 0 12px 12px 12px;
            }
        `
    ];

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

        const itemCount = (app.mainVault && app.mainVault.items.size) || 0;

        return html`
            <div class="plan-name">
                ${(sub && sub.plan.name) || $l("No Plan Selected")}
            </div>

            <div class="quota">
                ${this.org
                    ? html`
                          <div class="quota-item" ?warning=${this.org.members.length >= this.org.quota.members}>
                              <pl-icon icon="members"></pl-icon>

                              <div class="label">
                                  ${this.org.members.length} / ${this.org.quota.members}
                              </div>
                          </div>

                          <div class="quota-item" ?warning=${this.org.groups.length >= this.org.quota.groups}>
                              <pl-icon icon="group"></pl-icon>

                              <div class="label">
                                  ${this.org.groups.length} / ${this.org.quota.groups}
                              </div>
                          </div>

                          <div class="quota-item" ?warning=${this.org.vaults.length >= this.org.quota.vaults}>
                              <pl-icon icon="vaults"></pl-icon>

                              <div class="label">
                                  ${this.org.vaults.length} / ${this.org.quota.vaults}
                              </div>
                          </div>

                          <div
                              class="quota-item"
                              ?warning=${this.org.usedStorage >= this.org.quota.storage * 1e9 - 5e6}
                          >
                              <pl-icon icon="storage"></pl-icon>

                              <div class="label">
                                  ${fileSize(this.org.usedStorage)} / ${this.org.quota.storage} GB
                              </div>
                          </div>
                      `
                    : html`
                          <div
                              class="quota-item"
                              ?warning=${account.quota.items !== -1 && itemCount >= account.quota.items}
                          >
                              <pl-icon icon="list"></pl-icon>

                              <div class="label">
                                  ${account.quota.items === -1
                                      ? $l("Unlimited")
                                      : `${itemCount} / ${account.quota.items}`}
                              </div>
                          </div>

                          <div class="quota-item" ?warning=${account.usedStorage >= account.quota.storage * 1e9 - 5e6}>
                              <pl-icon icon="storage"></pl-icon>

                              <div class="label">
                                  ${fileSize(account.usedStorage)} / ${account.quota.storage} GB
                              </div>
                          </div>
                      `}
                ${sub
                    ? html`
                          <div class="quota-item">
                              <pl-icon icon="dollar"></pl-icon>

                              <div class="label">
                                  ${$l("{0} / Year", ((sub.members * sub.plan.cost) / 100).toFixed(2))}
                              </div>
                          </div>

                          ${sub.status === SubscriptionStatus.Canceled
                              ? html`
                                    <div class="quota-item" warning>
                                        <pl-icon icon="time"></pl-icon>

                                        <div class="label">
                                            ${$l("Canceled ({0} days left)", periodDays.toString())}
                                        </div>
                                    </div>
                                `
                              : sub.status === SubscriptionStatus.Inactive
                              ? html`
                                    <div class="quota-item" warning>
                                        <pl-icon icon="error"></pl-icon>

                                        <div class="label">
                                            ${sub.paymentRequiresAuth ? $l("Authentication Required") : $l("Inactive")}
                                        </div>
                                    </div>
                                `
                              : sub.status === SubscriptionStatus.Trialing
                              ? html`
                                    <div class="quota-item" ?warning=${trialDays < 3}>
                                        <pl-icon icon="time"></pl-icon>

                                        <div class="label">
                                            ${$l("Trialing ({0} days left)", trialDays.toString())}
                                        </div>
                                    </div>
                                `
                              : html``}
                      `
                    : ""}
            </div>

            ${sub && sub.paymentError
                ? html`
                      <div class="error item">${sub.paymentError}</div>
                  `
                : ""}
            ${!sub
                ? html`
                      <button class="premium-button primary tap" @click=${this._updatePlan}>
                          ${$l("Choose Plan")}
                      </button>
                  `
                : sub.paymentRequiresAuth
                ? html`
                      <pl-loading-button
                          id="authButton"
                          class="premium-button primary tap"
                          @click=${this._authenticatePayment}
                          >${$l("Complete Payment")}</pl-loading-button
                      >
                  `
                : sub.status === SubscriptionStatus.Inactive
                ? html`
                      <pl-loading-button
                          id="paymentButton"
                          class="premium-button primary tap"
                          @click=${this._updateBilling}
                      >
                          ${$l("Add Payment Method")}
                      </pl-loading-button>
                  `
                : this.org || sub.plan.type !== PlanType.Free
                ? html`
                      <pl-loading-button id="editButton" class="edit-button tap icon" @click=${this._update}>
                          <pl-icon icon="edit"></pl-icon>
                      </pl-loading-button>
                  `
                : html`
                      <button class="premium-button primary tap" @click=${this._update}>${$l("Get Premium")}</button>
                  `}
        `;
    }
}
