import { IncomingMessage, ServerResponse } from "http";
import Stripe from "stripe";
import { Storage } from "@padloc/core/src/storage";
import { readBody } from "../transport/http";
import { ConfigParam } from "@padloc/core/src/config";
import { ProvisioningEntry, SimpleProvisioner, SimpleProvisionerConfig } from "./simple";
import { ProvisioningStatus } from "@padloc/core/src/provisioning";

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
    private _tiers = new Map<
        Tier,
        {
            product: Stripe.Product;
            prices: Stripe.Price[];
        }
    >();

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

    private async _loadPlans() {
        this._tiers.clear();
        for await (const price of this._stripe.prices.list({ expand: ["data.product"] })) {
            const product = price.product as Stripe.Product;
            const tier = product.metadata.tier as Tier | undefined;
            if (!tier) {
                continue;
            }

            if (!this._tiers.has(tier)) {
                this._tiers.set(tier, {
                    product,
                    prices: [],
                });
            }

            this._tiers.get(tier)!.prices.push(price);
        }
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

    protected async _syncProvisioning({ email, accountId }: { email: string; accountId?: string | undefined }) {
        const entry = await this._getProvisioningEntry({ email, accountId });

        if (!entry.accountId) {
            return;
        }

        const customer = await this._getCustomer(entry);
        const subscription = customer.subscriptions?.data[0];

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
        let plan = tier && this._tiers.get(tier)?.prices[0];

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
        const subscription = customer.subscriptions?.data[0];
        let url: string | null = null;

        if (!subscription) {
            if (!plan) {
                plan = tier && this._tiers.get(Tier.Premium)?.prices[0];
            }

            if (!plan) {
                httpRes.statusCode = 404;
                httpRes.end();
                return;
            }

            const checkoutSession = await this._stripe.checkout.sessions.create({
                customer: customer.id,
                cancel_url: "https://web.padloc.app",
                success_url: "https://web.padloc.app",
                mode: "subscription",
                payment_method_types: ["card"],
                line_items: [
                    {
                        price: plan.id,
                        quantity: 1,
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
        } else {
            const portalSession = await this._stripe.billingPortal.sessions.create({
                customer: customer.id,
                return_url: "https://padloc.app",
            });
            url = `${portalSession.url}/subscriptions/${subscription.id}${plan ? `/preview/${plan.id}` : "/update"}`;
        }

        if (!url) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        httpRes.writeHead(302, { Location: url });
        httpRes.end();
    }

    private _renderTier(tier: Tier, cus: Stripe.Customer) {
        const product = this._tiers.get(tier)?.product;
        if (!product) {
            return "";
        }
        const sub = cus.subscriptions?.data[0];
        const item = sub?.items.data[0];
        const isCurrent = item?.plan.product === product.id;
        const portalUrl = `${this.config.url}/portal?email=${cus.email}`;

        const res = html`
            <div class="box vertical layout">
                <div class="padded uppercase bg-dark border-bottom semibold">
                    <div class="horizontal center-aligning layout">
                        <div class="stretch">${product.name}</div>
                        ${isCurrent ? html`<div class="tiny tag">Selected</div>` : ""}
                    </div>
                    <div class="small subtle">$2.99 / month</div>
                </div>
                <div class="small stretch vertical layout">
                    <div class="padded list-item">Share data with up to 10 familiy members</div>
                    <div class="padded list-item">Additional multi-factor authentication options.</div>
                    <div class="padded list-item">Up to 5GB of encrypted file storage</div>
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
