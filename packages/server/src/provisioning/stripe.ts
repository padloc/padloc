import { IncomingMessage, ServerResponse } from "http";
import Stripe from "stripe";
import { Storage } from "@padloc/core/src/storage";
import { readBody } from "../transport/http";
import { ConfigParam } from "@padloc/core/src/config";
import { ProvisioningEntry, SimpleProvisioner, SimpleProvisionerConfig } from "./simple";
import {
    AccountFeatures,
    AccountQuota,
    Feature,
    Message,
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
            minSeats: 1,
            maxSeats: 1,
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
            minSeats: 1,
            maxSeats: 1,
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
        await this._syncProvisioning(opts);
        return super.getProvisioning(opts);
    }

    private _getProduct(tier: Tier) {
        return [...this._products.values()].find((entry) => entry.tier === tier);
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
                expand: ["subscriptions", "subscriptions.data.plan.product"],
            });
        }

        // Try to find customer with same email address that isn't assoziated with a different account or org
        if (!customer || customer.deleted) {
            const existingCustomers = await this._stripe.customers.list({
                email,
                expand: ["data.subscriptions", "data.subscriptions.data.plan.product"],
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
        message = "Your current plan does not support this feature. Please upgrade to continue!"
    ): Message {
        return {
            type: "html",
            content: html`
                <div style="max-width: 60em">
                    <h1 class="text-centering">${title}</h1>
                    <div class="margined">${message}</div>
                    <div style="overflow-x: auto">
                        <div class="grid" style="grid-template-columns: repeat(${tiers.length}, minmax(14em, 1fr));">
                            ${tiers.map((tier) => this._renderTier(tier, customer)).join("")}
                        </div>
                    </div>
                </div>
            `,
        };
    }

    private _getAccountFeatures(tier: Tier, customer: Stripe.Customer) {
        switch (tier) {
            case Tier.Free:
                return new AccountFeatures({
                    billing: new Feature({ disabled: false, hidden: false }),
                    quickUnlock: new Feature({ disabled: false, hidden: false }),
                    manageSessions: new Feature({ disabled: false, hidden: false }),
                    manageDevices: new Feature({ disabled: false, hidden: false }),
                    manageAuthenticators: new Feature({
                        disabled: true,
                        hidden: false,
                        message: this._getUpgradeMessage(customer, [
                            Tier.Premium,
                            Tier.Family,
                            Tier.Team,
                            Tier.Business,
                        ]),
                    }),
                    createOrg: new Feature({
                        disabled: true,
                        hidden: false,
                        message: this._getUpgradeMessage(customer, [Tier.Family, Tier.Team, Tier.Business]),
                    }),
                });
            default:
                return new AccountFeatures();
        }
    }

    protected async _syncProvisioning({ email, accountId }: { email: string; accountId?: string | undefined }) {
        const entry = await this._getProvisioningEntry({ email, accountId });

        if (!entry.accountId) {
            return;
        }

        const customer = await this._getCustomer(entry);
        const subscription = customer.subscriptions?.data[0] || null;
        const { tier } = (subscription && this._products.get(subscription.items[0]?.price.product)) || {
            tier: Tier.Free,
            product: null,
        };

        entry.status = this._getStatus(subscription);
        entry.quota = this._getAccountQuota(tier);
        entry.orgQuota = this._getOrgQuota(tier);
        entry.features = this._getAccountFeatures(tier, customer);

        if (!entry.metaData) {
            entry.metaData = {};
        }
        entry.metaData.customer = customer;

        if (!subscription) {
            entry.status = ProvisioningStatus.Active;
            entry.actionLabel = "Upgrade Now";
            entry.quota = this.config.default.quota;
            entry.features.createOrg.disabled = true;
            entry.features.createOrg.message = {
                type: "html",
                content: html`
                    <div class="grid">
                        ${[Tier.Family, Tier.Team, Tier.Business]
                            .map((tier) => this._renderTier(tier, customer))
                            .join("")}
                    </div>
                `,
            };
            entry.features.createOrg.actionLabel = "Upgrade Now";
            entry.features.createOrg.actionUrl = `${this.config.url}?email=${encodeURIComponent(email)}&tier=family`;
        } else {
            switch (subscription.status) {
                case "active":
                case "trialing":
                    entry.status = ProvisioningStatus.Active;
                    break;
                default:
                    entry.status = ProvisioningStatus.Frozen;
            }
        }

        entry.actionUrl = "";
        entry.statusMessage = "";
        entry.billingPage = {
            type: "html",
            content: this._renderBillingPage(customer),
        };
        entry.features.createOrg.disabled = true;
        entry.features.createOrg.message = {
            type: "html",
            content: html`
                <div style="max-width: 40em">
                    <h1>Upgrade now to share data with your family, team or company!</h1>
                    <div class="margined">In order to create an organization you have to upgrade your plan first!</div>
                    <div class="grid">
                        ${[Tier.Family, Tier.Team, Tier.Business]
                            .map((tier) => this._renderTier(tier, customer))
                            .join("")}
                    </div>
                </div>
            `,
        };
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

    protected async _handlePortalRequest(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const params = new URL(httpReq.url!, "http://localhost").searchParams;
        const email = params.get("email");
        const tier = params.get("tier") as Tier;
        const tierInfo = this._tiers[tier];
        let price = this._getProduct(tier)?.priceMonthly;

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
        // const subscription = customer.subscriptions?.data[0];
        let url: string | null = null;

        // if (!subscription) {
        if (!price) {
            price = this._getProduct(tier)?.priceMonthly;
        }

        if (!price) {
            httpRes.statusCode = 404;
            httpRes.end();
            return;
        }

        console.log(price);

        const checkoutSession = await this._stripe.checkout.sessions.create({
            customer: customer.id,
            cancel_url: "https://web.padloc.app",
            success_url: "https://web.padloc.app",
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: price.id,
                    adjustable_quantity: {
                        enabled: true,
                        minimum: tierInfo.minSeats,
                        maximum: tierInfo.maxSeats,
                    },
                    quantity: tierInfo.minSeats,
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
        url = checkoutSession.url;
        // } else {
        //     const portalSession = await this._stripe.billingPortal.sessions.create({
        //         customer: customer.id,
        //         return_url: "https://padloc.app",
        //     });
        //     url = `${portalSession.url}/subscriptions/${subscription.id}${price ? `/preview/${price.id}` : "/update"}`;
        // }

        if (!url) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        httpRes.writeHead(302, { Location: url });
        httpRes.end();
    }

    private _renderTier(tier: Tier, cus: Stripe.Customer) {
        const prod = this._getProduct(tier)!;
        if (!prod) {
            return "";
        }
        const { product, priceMonthly, priceAnnual } = prod;
        const sub = cus.subscriptions?.data[0];
        const item = sub?.items.data[0];
        const isCurrent = item?.plan.product === product.id;
        const portalUrl = `${this.config.url}/portal?email=${cus.email}&action=update&tier=${tier}`;
        const perSeat = [Tier.Family, Tier.Team, Tier.Business].includes(tier);
        const info = this._tiers[tier];

        const res = html`
            <div class="box vertical layout">
                <div class="padded bg-dark border-bottom">
                    <div class="horizontal start-aligning layout uppercase semibold">
                        <div class="stretch">${info.name}</div>
                        ${isCurrent ? html`<div class="micro tag highlighted">Current Plan</div>` : ""}
                    </div>
                    <div class="small subtle top-half-margined" style="line-height: 1.1em">
                        ${priceMonthly
                            ? html`
                                  <span class="nowrap uppercase">
                                      <span class="bold large">$${(priceMonthly.unit_amount! / 100).toFixed(2)}</span>
                                      ${perSeat ? "/ seat " : ""} / month
                                  </span>
                              `
                            : ""}
                        ${priceAnnual
                            ? html`
                                  ${priceMonthly ? html`<span class="small">or </span>` : ""}
                                  <span class="nowrap uppercase">
                                      <span class="bold large">$${(priceAnnual.unit_amount! / 100).toFixed(2)}</span>
                                      ${perSeat ? "/ seat " : ""} / year
                                  </span>
                              `
                            : ""}
                    </div>
                    <div class="tiny subtle top-margined">${info.description}</div>
                </div>
                <div class="small stretch vertical layout">
                    ${info.features.map((feature) => html` <div class="padded list-item">${feature}</div> `).join("")}
                    ${info.disabledFeatures
                        .map((feature) => html` <div class="padded list-item"><s>${feature}</s></div> `)
                        .join("")}
                    <div class="list-item stretch"></div>
                    <div class="padded list-item">
                        ${isCurrent && item.quantity && item.quantity > 1
                            ? html`
                                  <div class="text-centering bottom-margined">
                                      <strong>Current seats:</strong> ${item.quantity}
                                  </div>
                              `
                            : ""}
                        ${isCurrent
                            ? html`
                                  <a href="${portalUrl}&tier=${product.metadata.tier}">
                                      <button class="text-centering fill-horizontally">Update</button>
                                  </a>
                              `
                            : html`
                                  <a href="${portalUrl}&tier=${product.metadata.tier}">
                                      <button class="primary text-centering fill-horizontally">Switch</button>
                                  </a>
                              `}
                    </div>
                </div>
            </div>
        `;
        return res;
    }

    private _renderBillingPage(cus: Stripe.Customer) {
        return html`
            <h2 class="padded border-top">Plans</h2>
            <div class="grid">
                ${[Tier.Free, Tier.Premium, Tier.Family, Tier.Team, Tier.Business]
                    .map((tier) => this._renderTier(tier, cus))
                    .join("\n")}
            </div>
        `;
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
            await this._syncProvisioning({ email: customer.email, accountId: customer.metadata?.account });
        }

        httpRes.statusCode = 200;
        httpRes.end();
    }
}
