import { IncomingMessage, ServerResponse } from "http";
import Stripe from "stripe";
import { Storage } from "@padloc/core/src/storage";
import { readBody } from "../transport/http";
import { ConfigParam } from "@padloc/core/src/config";
import { ProvisioningEntry, SimpleProvisioner, SimpleProvisionerConfig } from "./simple";
import {
    AccountFeatures,
    AccountQuota,
    RichContent,
    OrgQuota,
    ProvisioningStatus,
} from "@padloc/core/src/provisioning";

export class StripeProvisionerConfig extends SimpleProvisionerConfig {
    @ConfigParam("string", true)
    secretKey!: string;

    @ConfigParam()
    publicKey!: string;

    @ConfigParam()
    url: string = "";
}

enum Tier {
    Free = "free",
    Premium = "premium",
    Family = "family",
    Team = "team",
    Business = "business",
}

enum PortalAction {
    UpdateSubscription = "update_subscription",
    CancelSubscription = "cancel_subscription",
    ReactivateSubscription = "reactivate_subscription",
    UpdateBillingInfo = "update_billing_info",
    AddPaymentMethod = "add_payment_method",
}

// Noop tag used for syntax highlighting
const html = (strings: TemplateStringsArray, ...keys: any[]): string => {
    return strings.slice(0, strings.length - 1).reduce((p, s, i) => p + s + keys[i], "") + strings[strings.length - 1];
};

export class StripeProvisioner extends SimpleProvisioner {
    private _stripe: Stripe;
    private _products = new Map<
        string,
        { product: Stripe.Product; tier: Tier; priceAnnual?: Stripe.Price; priceMonthly?: Stripe.Price }
    >();
    private _tiers = {
        [Tier.Free]: {
            name: "Free",
            description: "For your basic password management needs.",
            minSeats: undefined,
            maxSeats: undefined,
            features: ["Unlimited vault items", "Unlimited devices"],
            disabledFeatures: [
                "Multi-Factor authentication",
                "Shared vaults",
                "Encrypted file storage",
                "Password audits",
            ],
        },
        [Tier.Premium]: {
            name: "Premium",
            description: "Power up your password manager!",
            minSeats: undefined,
            maxSeats: undefined,
            features: [
                "Unlimited Vault Items",
                "Unlimited Devices",
                "Multi-Factor Authentication",
                "Up to 1GB encrypted file storage",
            ],
            disabledFeatures: ["Shared Vaults"],
        },
        [Tier.Family]: {
            name: "Family",
            description: "Easy and straightforward password management and file storage for the entire familiy.",
            minSeats: 5,
            maxSeats: 10,
            features: [
                "Unlimited Vault Items",
                "Unlimited Devices",
                "Multi-Factor Authentication",
                "Up to 1GB encrypted file storage",
                "Up to 10 Shared Vaults",
            ],
            disabledFeatures: [],
        },
        [Tier.Team]: {
            name: "Team",
            description: "Powerful collaborative password management for your team.",
            minSeats: 5,
            maxSeats: 50,
            features: [
                "Unlimited Vault Items",
                "Unlimited Devices",
                "Multi-Factor Authentication",
                "Up to 5GB encrypted file storage",
                "Up to 10 Shared Vaults",
                "Up to 20 groups for easier permission management",
            ],
            disabledFeatures: [],
        },
        [Tier.Business]: {
            name: "Business",
            description: "Best-in-class online protection for your business.",
            minSeats: 10,
            maxSeats: 200,
            features: [
                "Unlimited Vault Items",
                "Unlimited Devices",
                "Multi-Factor Authentication",
                "Up to 20GB encrypted file storage",
                "Unlimited Vaults",
                "Unlimited Groups",
            ],
            disabledFeatures: [],
        },
    };

    constructor(public readonly config: StripeProvisionerConfig, public readonly storage: Storage) {
        super(config, storage);
        this._stripe = new Stripe(config.secretKey, { apiVersion: "2020-08-27" });
    }

    async init() {
        await this._loadPlans();
        return super.init();
    }

    async accountDeleted(params: { email: string; accountId?: string }): Promise<void> {
        const entry = await this._getProvisioningEntry(params);

        if (!entry.metaData?.customer) {
            return;
        }

        try {
            await this._stripe.customers.del(entry.metaData.customer.id);
            await this.storage.delete(entry);
        } catch (e) {
            // If the customer is already gone we can ignore the error
            if (e.code !== "resource_missing") {
                throw e;
            }
        }
    }

    async getProvisioning(opts: { email: string; accountId?: string | undefined }) {
        await this._syncBilling(opts);
        return super.getProvisioning(opts);
    }

    private _getProduct(tier: Tier) {
        return [...this._products.values()].find((entry) => entry.tier === tier);
    }

    private _getSubscriptionInfo(customer: Stripe.Customer) {
        const subscription = customer.subscriptions?.data[0] || null;
        const item = subscription?.items.data[0];
        const prod = (item && this._products.get(item.price.product as string)) || {
            tier: Tier.Free,
            product: null,
        };
        return {
            ...prod,
            subscription,
            item,
            tierInfo: this._tiers[prod.tier],
            price: item?.price,
        };
    }

    private async _loadPlans() {
        this._products.clear();
        for await (const price of this._stripe.prices.list({ expand: ["data.product"] })) {
            const product = price.product as Stripe.Product;
            const tier = product.metadata.tier as Tier | undefined;
            if (!tier) {
                continue;
            }

            if (!this._products.has(product.id)) {
                this._products.set(product.id, {
                    tier,
                    product,
                });
            }

            this._products.get(product.id)![price.recurring?.interval === "month" ? "priceMonthly" : "priceAnnual"] =
                price;
        }

        console.log(this._products.values());
    }

    private async _getCustomer({ email, accountId, metaData }: ProvisioningEntry) {
        let customer = metaData?.customer as Stripe.Customer | Stripe.DeletedCustomer | undefined;

        // Refresh customer
        if (customer) {
            customer = await this._stripe.customers.retrieve(customer.id, {
                expand: ["subscriptions", "tax_ids"],
            });
        }

        // Try to find customer with same email address that isn't assoziated with a different account or org
        if (!customer || customer.deleted) {
            const existingCustomers = await this._stripe.customers.list({
                email,
                expand: ["data.subscriptions", "tax_ids"],
            });
            customer = existingCustomers.data.find(
                (c) => !c.metadata.org && (!c.metadata.account || c.metadata.account === accountId)
            );
        }

        // Create a new customer
        if (!customer || customer.deleted) {
            customer = await this._stripe.customers.create({
                email,
                // name: acc.name,
                metadata: {
                    account: accountId!,
                },
            });
        }

        return customer;
    }

    private _getStatus(sub: Stripe.Subscription | null) {
        const status = sub?.status || "active";

        switch (status) {
            case "active":
            case "trialing":
                return ProvisioningStatus.Active;
            default:
                return ProvisioningStatus.Frozen;
        }
    }

    private _getAccountQuota(tier: Tier) {
        switch (tier) {
            case Tier.Free:
                return new AccountQuota({
                    vaults: 1,
                    storage: 0,
                });
            default:
                return new AccountQuota({
                    vaults: 1,
                    storage: 1000,
                });
        }
    }

    private _getOrgQuota(tier: Tier) {
        switch (tier) {
            case Tier.Family:
                return new OrgQuota({
                    vaults: 10,
                    groups: 0,
                    storage: 1000,
                });
            case Tier.Team:
                return new OrgQuota({
                    vaults: 20,
                    groups: 10,
                    storage: 5000,
                });
            case Tier.Business:
                return new OrgQuota({
                    vaults: 50,
                    groups: 20,
                    storage: 5000,
                });
            default:
                return new OrgQuota({
                    vaults: 0,
                    groups: 0,
                    storage: 0,
                });
        }
    }

    private _getUpgradeMessage(
        customer: Stripe.Customer,
        tiers: Tier[],
        title = "Upgrade Required",
        message = "Your current plan does not support this feature. Please upgrade to continue!",
        highlightFeature?: string
    ): RichContent {
        return {
            type: "html",
            content: html`
                <div style="max-width: ${15 * tiers.length}em">
                    <h1 class="text-centering">${title}</h1>
                    <div class="margined text-centering">${message}</div>
                    <div style="overflow-x: auto; margin: 0 -1em;">
                        <div
                            class="grid"
                            style="grid-template-columns: repeat(${tiers.length}, minmax(14em, 1fr)); padding: 0 1em;"
                        >
                            ${tiers.map((tier) => this._renderTier(tier, customer, highlightFeature)).join("")}
                        </div>
                    </div>
                </div>
            `,
        };
    }

    private _getAccountFeatures(tier: Tier, customer: Stripe.Customer) {
        const features = new AccountFeatures();

        if (tier === Tier.Free) {
            features.manageAuthenticators.disabled = true;
            features.manageAuthenticators.message = this._getUpgradeMessage(
                customer,
                [Tier.Premium, Tier.Family, Tier.Team, Tier.Business],
                undefined,
                undefined,
                "Multi-Factor Authentication"
            );
            features.attachments.disabled = true;
            features.attachments.message = this._getUpgradeMessage(
                customer,
                [Tier.Premium, Tier.Family, Tier.Team, Tier.Business],
                undefined,
                undefined,
                "File Storage"
            );
        }

        if (![Tier.Family, Tier.Team, Tier.Business].includes(tier)) {
            features.createOrg.disabled = true;
            features.createOrg.message = this._getUpgradeMessage(customer, [Tier.Family, Tier.Team, Tier.Business]);
        }

        return features;
    }

    protected async _syncBilling({ email, accountId }: { email: string; accountId?: string | undefined }) {
        const entry = await this._getProvisioningEntry({ email, accountId });

        if (!entry.accountId) {
            return;
        }

        const customer = await this._getCustomer(entry);
        const { subscription, tier } = this._getSubscriptionInfo(customer);
        const paymentMethods = (await this._stripe.customers.listPaymentMethods(customer.id, { type: "card" })).data;

        entry.status = this._getStatus(subscription);
        entry.quota = this._getAccountQuota(tier);
        entry.orgQuota = this._getOrgQuota(tier);
        entry.features = this._getAccountFeatures(tier, customer);

        if (!entry.metaData) {
            entry.metaData = {};
        }
        entry.metaData.customer = customer;
        entry.metaData.paymentMethods = paymentMethods;

        entry.actionUrl = "";
        entry.statusMessage = "";
        entry.billingPage = this._renderBillingPage(customer, paymentMethods);
        await this.storage.save(entry);
    }

    protected async _handlePost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const path = new URL(httpReq.url!, "http://localhost").pathname;
        if (path === "stripe_webook") {
            return this._handleStripeEvent(httpReq, httpRes);
        }
        return super._handlePost(httpReq, httpRes);
    }

    protected async _handleGet(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const path = new URL(httpReq.url!, "http://localhost").pathname;
        if (path === "/portal") {
            return this._handlePortalRequest(httpReq, httpRes);
        }
        return super._handleGet(httpReq, httpRes);
    }

    private async _getStripeUrl(customer: Stripe.Customer, action?: PortalAction, tier?: Tier) {
        const { subscription } = this._getSubscriptionInfo(customer);

        if (
            action &&
            [PortalAction.UpdateSubscription, PortalAction.CancelSubscription].includes(action) &&
            !subscription
        ) {
            tier = tier || Tier.Premium;
            const tierInfo = this._tiers[tier];
            const price = this._getProduct(tier)?.priceMonthly;

            if (!price) {
                return null;
            }

            const session = await this._stripe.checkout.sessions.create({
                customer: customer.id,
                cancel_url: "https://web.padloc.app",
                success_url: "https://web.padloc.app",
                mode: "subscription",
                payment_method_types: ["card"],
                line_items: [
                    {
                        price: price.id,
                        adjustable_quantity:
                            tierInfo.minSeats || tierInfo.maxSeats
                                ? {
                                      enabled: true,
                                      minimum: tierInfo.minSeats,
                                      maximum: tierInfo.maxSeats,
                                  }
                                : undefined,
                        quantity: tierInfo.minSeats || 1,
                    },
                ],
                subscription_data: {
                    trial_period_days: 30,
                },
                automatic_tax: {
                    enabled: true,
                },
                tax_id_collection: {
                    enabled: true,
                },
                customer_update: {
                    name: "auto",
                    address: "auto",
                    shipping: "never",
                },
            });
            return session.url;
        }

        const session = await this._stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: "https://padloc.app",
        });

        switch (action) {
            case PortalAction.UpdateSubscription:
                if (!subscription) {
                    return null;
                }

                if (!tier) {
                    return `${session.url}/subscriptions/${subscription.id}/update`;
                }

                const prod = this._getProduct(tier);
                if (!prod) {
                    return null;
                }
                const { priceMonthly, priceAnnual } = prod;
                const currentPrice = subscription!.items.data[0].price;
                const price = currentPrice.recurring?.interval === "month" ? priceMonthly : priceAnnual;

                if (!price) {
                    return null;
                }

                return `${session.url}/subscriptions/${subscription.id}/preview/${price.id}`;
            case PortalAction.CancelSubscription:
                if (!subscription) {
                    return null;
                }
                return `${session.url}/subscriptions/${subscription.id}/cancel`;
            case PortalAction.ReactivateSubscription:
                if (!subscription) {
                    return null;
                }
                return `${session.url}/subscriptions/${subscription.id}/reactivate`;
            case PortalAction.UpdateBillingInfo:
                return `${session.url}/customer/update`;
            case PortalAction.AddPaymentMethod:
                return `${session.url}/payment_methods`;
            default:
                return session.url;
        }
    }

    protected async _handlePortalRequest(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const params = new URL(httpReq.url!, "http://localhost").searchParams;
        const email = params.get("email");
        const action = (params.get("action") as PortalAction | null) || undefined;
        const tier = (params.get("tier") as Tier | null) || undefined;

        if (!email) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        const entry = await this._getProvisioningEntry({ email });

        if (!entry.accountId) {
            return;
        }

        const customer = await this._getCustomer(entry);

        const url = await this._getStripeUrl(customer, action, tier);

        if (!url) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        httpRes.writeHead(302, { Location: url });
        httpRes.end();
    }

    private _getPortalUrl(customer: Stripe.Customer, action?: PortalAction, tier?: Tier) {
        const url = new URL(`${this.config.url}/portal`);

        url.searchParams.set("email", customer.email!);

        if (action) {
            url.searchParams.set("action", action);
        }

        if (tier) {
            url.searchParams.set("tier", tier);
        }
        return url.toString();
    }

    private _renderTier(tier: Tier, cus: Stripe.Customer, highlightFeature?: string) {
        const prod = this._getProduct(tier)!;
        if (!prod) {
            return "";
        }
        const { priceMonthly, priceAnnual } = prod;
        const { subscription, item, price, tier: currentTier } = this._getSubscriptionInfo(cus);
        const isCurrent = currentTier === tier;
        const perSeat = [Tier.Family, Tier.Team, Tier.Business].includes(tier);
        const info = this._tiers[tier];
        const hf = highlightFeature?.toLowerCase();

        const res = html`
            <div class="box vertical layout">
                <div class="padded bg-dark border-bottom">
                    <div class="horizontal start-aligning layout uppercase semibold">
                        <div class="stretch">${info.name}</div>
                        ${isCurrent ? html`<div class="micro tag highlighted">Current Plan</div>` : ""}
                    </div>
                    <div class="small top-half-margined" style="line-height: 1.1em">
                        ${priceMonthly && (!price || price.recurring?.interval === "month")
                            ? html`
                                  <span class="highlighted nowrap uppercase">
                                      <span class="bold large">$${(priceMonthly.unit_amount! / 100).toFixed(2)}</span>
                                      ${perSeat ? "/ seat " : ""} / month
                                  </span>
                              `
                            : ""}
                        ${priceAnnual && (!price || price.recurring?.interval === "year")
                            ? html`
                                  ${priceMonthly ? html`<span class="small">or </span>` : ""}
                                  <span class="highlighted nowrap uppercase">
                                      <span class="bold large">$${(priceAnnual.unit_amount! / 100).toFixed(2)}</span>
                                      ${perSeat ? "/ seat " : ""} / year
                                  </span>
                              `
                            : ""}
                    </div>
                    <div class="tiny subtle top-margined">${info.description}</div>
                </div>
                <div class="small stretch vertical layout">
                    ${info.features
                        .map(
                            (feature) =>
                                html`
                                    <div
                                        class="padded list-item horizontal spacing start-aligning layout ${hf &&
                                        feature.toLowerCase().includes(hf)
                                            ? "highlighted bold"
                                            : ""}"
                                    >
                                        <pl-icon icon="check"></pl-icon>
                                        <div class="stretch">${feature}</div>
                                    </div>
                                `
                        )
                        .join("")}
                    ${info.disabledFeatures
                        .map(
                            (feature) =>
                                html`
                                    <div
                                        class="padded list-item horizontal spacing start-aligning layout ${hf &&
                                        feature.toLowerCase().includes(hf)
                                            ? "highlighted bold"
                                            : ""}"
                                    >
                                        <pl-icon icon="cancel"></pl-icon>
                                        <div class="stretch"><s>${feature}</s></div>
                                    </div>
                                `
                        )
                        .join("")}
                    <div class="list-item stretch"></div>
                    ${isCurrent && tier === Tier.Free
                        ? ""
                        : isCurrent
                        ? html`
                              <div class="padded">
                                  ${item?.quantity && item.quantity > 1
                                      ? html`
                                            <div class="text-centering padded bottom-margined">
                                                <strong>Current seats:</strong> ${item.quantity}
                                            </div>
                                        `
                                      : ""}
                                  <a href="${this._getPortalUrl(cus, PortalAction.UpdateSubscription, tier)}">
                                      <button class="text-centering fill-horizontally">Update</button>
                                  </a>
                              </div>
                          `
                        : html`
                              <div class="padded">
                                  <a href="${this._getPortalUrl(cus, PortalAction.UpdateSubscription, tier)}">
                                      <button class="primary text-centering fill-horizontally">
                                          ${subscription ? "Switch" : "Try Now"}
                                      </button>
                                  </a>
                              </div>
                          `}
                </div>
            </div>
        `;
        return res;
    }

    private _renderSubscription(customer: Stripe.Customer, paymentMethods: Stripe.PaymentMethod[]) {
        const { tier, tierInfo, subscription, item } = this._getSubscriptionInfo(customer);
        const paymentMethod =
            subscription && paymentMethods.find((pm) => pm.id === subscription.default_payment_method);
        const country = customer.address?.country || paymentMethod?.card?.country || undefined;
        const periodEnd = (subscription && new Date(subscription.current_period_end * 1000))?.toLocaleDateString(
            country
        );
        const status = subscription?.status || "active";

        return html`
            <div class="box vertical layout">
                <div class="padded bg-dark border-bottom">
                    <div class="horizontal start-aligning layout uppercase semibold">
                        <div class="stretch">${tierInfo.name}</div>
                        <div class="tiny tag ${["active", "trialing"].includes(status) ? "highlighted" : "warning"}">
                            ${status}
                        </div>
                    </div>
                    ${subscription
                        ? html`
                              <div class="small subtle top-half-margined">
                                  ${subscription.cancel_at_period_end
                                      ? html` Cancels on ${periodEnd} `
                                      : html`
                                            Renews on ${periodEnd}
                                            ${paymentMethod?.card
                                                ? html`
                                                      using <pl-icon icon="credit" class="inline"></pl-icon> ••••
                                                      ${paymentMethod.card.last4}
                                                  `
                                                : ""}
                                        `}
                              </div>
                          `
                        : ""}
                </div>
                <div class="small">
                    ${tierInfo.features
                        .map(
                            (feature) => html`
                                <div class="padded list-item start-aligning spacing horizontal layout">
                                    <pl-icon icon="check"></pl-icon>
                                    <div class="stretch">${feature}</div>
                                </div>
                            `
                        )
                        .join("")}
                    ${tierInfo.disabledFeatures
                        .map(
                            (feature) => html`
                                <div class="padded list-item start-aligning spacing horizontal layout">
                                    <pl-icon icon="cancel"></pl-icon>
                                    <div class="stretch"><s>${feature}</s></div>
                                </div>
                            `
                        )
                        .join("")}
                    <div class="padded list-item spacing vertical layout">
                        ${subscription
                            ? html`
                                  ${item?.quantity && item.quantity > 1
                                      ? html`
                                            <div class="text-centering padded bottom-margined">
                                                <strong>Current seats:</strong>
                                                ${item.quantity}
                                            </div>
                                        `
                                      : ""}
                                  ${subscription.cancel_at_period_end
                                      ? html`
                                            <a
                                                href="${this._getPortalUrl(
                                                    customer,
                                                    PortalAction.ReactivateSubscription
                                                )}"
                                            >
                                                <button class="primary text-centering fill-horizontally">
                                                    Reactive
                                                </button>
                                            </a>
                                        `
                                      : html`
                                            <a
                                                href="${this._getPortalUrl(
                                                    customer,
                                                    PortalAction.UpdateSubscription,
                                                    tier
                                                )}"
                                            >
                                                <button class="text-centering fill-horizontally">Update</button>
                                            </a>
                                            <a href="#billing-plans">
                                                <button class="primary text-centering fill-horizontally">
                                                    Switch Plan
                                                </button>
                                            </a>
                                        `}
                              `
                            : html`
                                  <a href="#billing-plans">
                                      <button class="primary text-centering fill-horizontally">Upgrade</button>
                                  </a>
                              `}
                    </div>
                </div>
            </div>
        `;
    }

    private _renderCustomerInfo(customer: Stripe.Customer, paymentMethods: Stripe.PaymentMethod[]) {
        return html`
            <div class="box vertical layout">
                <div class="padded bg-dark border-bottom uppercase semibold">Billing Address</div>
                <div class="small vertical layout">
                    <div class="list-item padded">
                        <div class="small highlighted">Email</div>
                        <div>${customer.email}</div>
                    </div>
                    <div class="list-item padded">
                        <div class="small highlighted">Address</div>
                        ${customer.name ? html`<div>${customer.name}</div>` : ""}
                        ${customer.address?.line1 ? html`<div>${customer.address?.line1}</div>` : ""}
                        ${customer.address?.line2 ? html`<div>${customer.address?.line2}</div>` : ""}
                        ${customer.address?.city
                            ? html`<div>${customer.address?.postal_code} ${customer.address?.city}</div>`
                            : ""}
                    </div>
                    ${customer.tax_ids?.data[0]
                        ? html`
                              <div class="list-item padded">
                                  <div class="small highlighted">Tax ID</div>
                                  <div>${customer.tax_ids.data[0].value}</div>
                              </div>
                          `
                        : ""}
                    <div class="padded list-item">
                        <a href="${this._getPortalUrl(customer, PortalAction.UpdateBillingInfo)}">
                            <button class="text-centering fill-horizontally">Update</button>
                        </a>
                    </div>
                </div>
            </div>

            <div class="box vertical layout top-margined">
                <div class="padded bg-dark border-bottom uppercase semibold">Payment Methods</div>
                <div class="small vertical layout">
                    ${paymentMethods
                        .map(
                            ({ card }) => html`
                                ${card
                                    ? html`
                                          <div
                                              class="double-padded list-item center-aligning spacing horizontal layout"
                                          >
                                              <pl-icon icon="credit"></pl-icon>
                                              <div class="stretch">•••• ${card.last4}</div>
                                              <div class="subtle">Expires ${card.exp_month} / ${card.exp_year}</div>
                                          </div>
                                      `
                                    : ""}
                            `
                        )
                        .join("")}
                    <div class="padded list-item stretch">
                        ${paymentMethods.length
                            ? html`
                                  <a href="${this._getPortalUrl(customer)}">
                                      <button class="text-centering fill-horizontally">Update</button>
                                  </a>
                              `
                            : html`
                                  <a href="${this._getPortalUrl(customer, PortalAction.AddPaymentMethod)}">
                                      <button class="text-centering fill-horizontally">Add Payment Method</button>
                                  </a>
                              `}
                    </div>
                </div>
            </div>
        `;
    }

    private _renderBillingPage(custumer: Stripe.Customer, paymentMethods: Stripe.PaymentMethod[]): RichContent {
        return {
            type: "html",
            content: html`
                <div class="grid" style="--grid-column-width: 15em;">
                    <div>
                        <h2 class="padded">Subscription</h2>

                        ${this._renderSubscription(custumer, paymentMethods)}
                    </div>

                    <div>
                        <h2 class="padded">Billing Info</h2>

                        ${this._renderCustomerInfo(custumer, paymentMethods)}
                    </div>
                </div>

                <h2 class="padded" id="billing-plans">Plans</h2>
                <div class="grid" style="--grid-column-width: 13em">
                    ${[Tier.Free, Tier.Premium, Tier.Family, Tier.Team, Tier.Business]
                        .map((tier) => this._renderTier(tier, custumer))
                        .join("\n")}
                </div>
            `,
        };
    }

    private async _handleStripeEvent(httpReq: IncomingMessage, httpRes: ServerResponse) {
        httpRes.on("error", (e) => {
            console.error(e);
        });

        let event: Stripe.Event;

        try {
            const body = await readBody(httpReq);
            event = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        let customer: Stripe.Customer | Stripe.DeletedCustomer | undefined = undefined;

        switch (event.type) {
            case "customer.created":
            case "customer.deleted":
            case "customer.updated":
                customer = event.data.object as Stripe.Customer;
                break;
            case "customer.subscription.deleted":
            case "customer.subscription.created":
            case "customer.subscription.updated":
                const sub = event.data.object as Stripe.Subscription;
                customer = await this._stripe.customers.retrieve(sub.customer as string);
                break;
        }

        if (customer && !customer.deleted && customer.email) {
            await this._syncBilling({ email: customer.email, accountId: customer.metadata?.account });
        }

        httpRes.statusCode = 200;
        httpRes.end();
    }
}
