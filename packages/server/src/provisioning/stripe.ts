import Stripe from "stripe";
import { Storage } from "@padloc/core/src/storage";
import { readBody } from "../transport/http";
import { Config, ConfigParam } from "@padloc/core/src/config";
import {
    AccountFeatures,
    AccountQuota,
    RichContent,
    OrgQuota,
    ProvisioningStatus,
    OrgProvisioning,
    OrgFeatures,
    BasicProvisioner,
    AccountProvisioning,
    Provisioning,
} from "@padloc/core/src/provisioning";
import { uuid } from "@padloc/core/src/util";
import { Org } from "@padloc/core/src/org";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { base64ToBytes, bytesToBase64, equalCT, stringToBytes } from "@padloc/core/src/encoding";
import { HMACKeyParams, HMACParams } from "@padloc/core/src/crypto";
import { URLSearchParams } from "url";
import { Account } from "@padloc/core/src/account";

export class StripeProvisionerConfig extends Config {
    @ConfigParam("string", true)
    secretKey!: string;

    @ConfigParam()
    publicKey!: string;

    @ConfigParam()
    url: string = "";

    @ConfigParam("number")
    port: number = 4000;

    @ConfigParam("string", true)
    portalSecret!: string;

    @ConfigParam("string", true)
    webhookSecret?: string;

    @ConfigParam("number")
    urlsExpireAfter: number = 48 * 60 * 60;

    @ConfigParam("number")
    forceSyncAfter: number = 24 * 60 * 60;
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

export class StripeProvisioner extends BasicProvisioner {
    private _stripe: Stripe;
    private _products = new Map<
        string,
        { product: Stripe.Product; tier: Tier; priceAnnual?: Stripe.Price; priceMonthly?: Stripe.Price }
    >();
    private _tiers = {
        [Tier.Free]: {
            order: 0,
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
            order: 1,
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
            order: 2,
            name: "Family",
            description: "Easy and straightforward password management and file storage for the entire familiy.",
            minSeats: 5,
            maxSeats: 10,
            features: [
                "Unlimited Vault Items",
                "Unlimited Devices",
                "Multi-Factor Authentication",
                "Up to 1GB encrypted file storage",
                "Up to 5 Shared Vaults",
            ],
            disabledFeatures: [],
        },
        [Tier.Team]: {
            order: 3,
            name: "Team",
            description: "Powerful collaborative password management for your team.",
            minSeats: 5,
            maxSeats: 50,
            features: [
                "Unlimited Vault Items",
                "Unlimited Devices",
                "Multi-Factor Authentication",
                "Up to 5GB encrypted file storage",
                "Up to 20 Shared Vaults",
                "Up to 10 groups for easier permission management",
            ],
            disabledFeatures: [],
        },
        [Tier.Business]: {
            order: 4,
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
        super(storage);
        this._stripe = new Stripe(config.secretKey, { apiVersion: "2020-08-27" });
    }

    async init() {
        if (!this.config.portalSecret) {
            this.config.portalSecret = bytesToBase64(await getCryptoProvider().generateKey(new HMACKeyParams()));
        }

        await this._loadPlans();
        await this._startServer();
    }

    async accountDeleted(params: { email: string; accountId?: string }): Promise<void> {
        const { account } = await this.getProvisioning(params);

        if (account.metaData?.customer) {
            try {
                await this._stripe.customers.del(account.metaData.customer.id);
            } catch (e) {
                // If the customer is already gone we can ignore the error
                if (e.code !== "resource_missing") {
                    throw e;
                }
            }
            delete account.metaData.customer;
        }

        await super.accountDeleted(params);
    }

    async getProvisioning(opts: { email: string; accountId?: string | undefined }) {
        const provisioning = await super.getProvisioning(opts);
        if (
            provisioning.account.accountId &&
            (!provisioning.account.metaData?.customer ||
                !provisioning.account.metaData?.lastSync ||
                provisioning.account.metaData.lastSync < Date.now() - this.config.forceSyncAfter * 1000)
        ) {
            console.log("sync billing!!");
            await this._syncBilling(provisioning);
        }
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
    }

    private async _getCustomer({ email, accountId, metaData }: AccountProvisioning, fetch = false) {
        let customer = metaData?.customer as Stripe.Customer | Stripe.DeletedCustomer | undefined;

        // Refresh customer
        if (customer && fetch) {
            customer = await this._stripe.customers.retrieve(customer.id, {
                expand: ["subscriptions", "tax_ids"],
            });
        }

        // Try to find customer with same email address that isn't assoziated with a different account or org
        if (!customer || customer.deleted) {
            const existingCustomers = await this._stripe.customers.list({
                email,
                expand: ["data.subscriptions", "data.tax_ids"],
            });
            customer = existingCustomers.data.find(
                (c) => !c.metadata.org && (!c.metadata.account || c.metadata.account === accountId)
            );
        }

        // Create a new customer
        if (!customer || customer.deleted) {
            const account = accountId ? await this.storage.get(Account, accountId).catch(() => null) : null;
            console.log("creating customer...", accountId, account?.email, account?.name);
            console.trace();
            const testClock = await this._stripe.testHelpers.testClocks.create({
                name: `Test Clock for ${email}`,
                frozen_time: Math.floor(Date.now() / 1000),
            });
            customer = await this._stripe.customers.create({
                email,
                test_clock: testClock.id,
                name: account?.name,
                metadata: {
                    account: accountId!,
                },
            });
        }

        return customer;
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

    private async _getUpgradeMessage(
        customer: Stripe.Customer,
        tiers: Tier[],
        title = "Upgrade Required",
        message = "Your current plan does not support this feature. Please upgrade to continue!",
        allowUpdate = true,
        highlightFeature?: string
    ): Promise<RichContent> {
        return {
            type: "html",
            content: html`
                <div style="max-width: ${15 * tiers.length}em">
                    <h1 class="text-centering">${title}</h1>
                    <div class="margined text-centering">${message}</div>
                    ${!allowUpdate
                        ? html`
                              <div class="small negative highlighted padded margined box">
                                  You don't have the permissions to make changes to this subscription. Please ask the
                                  organization's owner to make any necessary changes.
                              </div>
                          `
                        : ""}
                    <div style="overflow-x: auto; margin: 0 -1em;">
                        <div
                            class="grid"
                            style="grid-template-columns: repeat(${tiers.length}, minmax(14em, 1fr)); padding: 0 1em;"
                        >
                            ${(
                                await Promise.all(
                                    tiers.map((tier) => this._renderTier(tier, customer, allowUpdate, highlightFeature))
                                )
                            ).join("")}
                        </div>
                    </div>
                </div>
            `,
        };
    }

    private async _getAccountFeatures(tier: Tier, customer: Stripe.Customer) {
        const features = new AccountFeatures();

        if (tier === Tier.Free) {
            features.manageAuthenticators.disabled = true;
            features.manageAuthenticators.message = await this._getUpgradeMessage(
                customer,
                [Tier.Premium, Tier.Family, Tier.Team, Tier.Business],
                undefined,
                undefined,
                true,
                "Multi-Factor Authentication"
            );
            features.attachments.disabled = true;
            features.attachments.message = await this._getUpgradeMessage(
                customer,
                [Tier.Premium, Tier.Family, Tier.Team, Tier.Business],
                undefined,
                undefined,
                true,
                "File Storage"
            );
        }

        if (![Tier.Family, Tier.Team, Tier.Business].includes(tier)) {
            features.createOrg.disabled = true;
            features.createOrg.message = await this._getUpgradeMessage(customer, [
                Tier.Family,
                Tier.Team,
                Tier.Business,
            ]);
        }

        return features;
    }

    private _getOrgQuota(customer: Stripe.Customer) {
        const { item, tier } = this._getSubscriptionInfo(customer);

        switch (tier) {
            case Tier.Family:
                return new OrgQuota({
                    members: item?.quantity || 1,
                    vaults: 5,
                    groups: 0,
                    storage: 1000,
                });
            case Tier.Team:
                return new OrgQuota({
                    members: item?.quantity || 1,
                    vaults: 20,
                    groups: 10,
                    storage: 5000,
                });
            case Tier.Business:
                return new OrgQuota({
                    members: item?.quantity || 1,
                    vaults: 50,
                    groups: 20,
                    storage: 5000,
                });
            default:
                return new OrgQuota({
                    members: 1,
                    vaults: 0,
                    groups: 0,
                    storage: 0,
                });
        }
    }

    private async _getOrgFeatures(customer: Stripe.Customer, tier: Tier, quota: OrgQuota, org?: Org | null) {
        const features = new OrgFeatures();

        if (tier === Tier.Family) {
            features.addGroup.hidden = true;
            features.addGroup.disabled = true;
        }

        if (org) {
            if (org.members.length >= (this._tiers[tier]?.maxSeats || 0)) {
                features.addMember.disabled = true;
                features.addMember.message = await this._getUpgradeMessage(
                    customer,
                    [Tier.Team, Tier.Business],
                    "Upgrade Required",
                    "You have reached the maximum number of orginization members for this plan. Please upgrade to the next tier to add more!",
                    false
                );
                features.addMember.messageOwner = await this._getUpgradeMessage(
                    customer,
                    [Tier.Team, Tier.Business],
                    "Upgrade Required",
                    "You have reached the maximum number of orginization members for this plan. Please upgrade to the next tier to add more!",
                    true
                );
            } else if (quota.members !== -1 && org?.members.length >= quota.members) {
                features.addMember.disabled = true;
                features.addMember.message = {
                    type: "plain",
                    content:
                        "You have reached your member limit. Please ask the organization owner to increase the number of seats in your subscription!",
                };
                features.addMember.messageOwner = {
                    type: "html",
                    content: html`
                        <div style="max-width: 20em;">
                            <h1 class="text-centering">Additional Seats Required</h1>
                            <div class="margined">
                                You have reached your member limit. Please increase the number of seats in your
                                subscription!
                            </div>
                            <a href="${await this._getPortalUrl(customer, PortalAction.UpdateSubscription, tier)}">
                                <button class="primary text-centering fill-horizontally">Add Seats</button>
                            </a>
                        </div>
                    `,
                };
            }
            if (quota.groups !== -1 && org?.groups.length >= quota.groups) {
                features.addGroup.disabled = true;
                features.addGroup.message = await this._getUpgradeMessage(
                    customer,
                    [Tier.Team, Tier.Business],
                    "Upgrade Required",
                    "You have reached the maximum number of groups for this plan. Please upgrade to the next tier to add more!",
                    false,
                    "Groups"
                );
                features.addGroup.messageOwner = await this._getUpgradeMessage(
                    customer,
                    [Tier.Team, Tier.Business],
                    "Upgrade Required",
                    "You have reached the maximum number of groups for this plan. Please upgrade to the next tier to add more!",
                    true,
                    "Groups"
                );
            }
            if (quota.vaults !== -1 && org?.vaults.length >= quota.vaults) {
                features.addVault.disabled = true;
                features.addVault.message = await this._getUpgradeMessage(
                    customer,
                    [Tier.Family, Tier.Team, Tier.Business],
                    "Upgrade Required",
                    "You have reached the maximum number of vaults for this plan. Please upgrade to the next tier to add more!",
                    false,
                    "Vaults"
                );
                features.addVault.messageOwner = await this._getUpgradeMessage(
                    customer,
                    [Tier.Family, Tier.Team, Tier.Business],
                    "Upgrade Required",
                    "You have reached the maximum number of vaults for this plan. Please upgrade to the next tier to add more!",
                    true,
                    "Vaults"
                );
            }
        }

        return features;
    }

    private async _getOrgProvisioning(
        account: AccountProvisioning,
        customer: Stripe.Customer,
        existing?: OrgProvisioning
    ) {
        const { tier, subscription } = this._getSubscriptionInfo(customer);

        const org = existing && (await this.storage.get(Org, existing.orgId).catch(() => null));
        const quota = this._getOrgQuota(customer);

        const provisioning = new OrgProvisioning({
            orgId: existing?.orgId || (await uuid()),
            orgName:
                org?.name ||
                (tier === Tier.Family
                    ? "Family"
                    : tier === Tier.Team
                    ? "My Team"
                    : tier === Tier.Business
                    ? "My Business"
                    : "My Org"),
            owner: account.accountId,
            autoCreate: !org,
            quota,
            features: await this._getOrgFeatures(customer, tier, quota, org),
        });

        switch (subscription?.status || "canceled") {
            case "canceled":
                provisioning.status = ProvisioningStatus.Frozen;
                provisioning.statusMessage =
                    "This organization has been frozen because the subscription was canceled! Please renew the subscription to unfreeze it!";
                break;
            case "unpaid":
                provisioning.status = ProvisioningStatus.Frozen;
                provisioning.statusMessage =
                    "This organization has been frozen because there was a problem with the last payment. Please review your billing info and update your payment method if necessary!";
                break;
            default:
                provisioning.status = ProvisioningStatus.Active;
        }

        if (org && provisioning.status === ProvisioningStatus.Active) {
            if (org.members.length > provisioning.quota.members) {
                provisioning.status = ProvisioningStatus.Frozen;
                provisioning.statusMessage =
                    "This organization has been frozen because it's number of members exceeds the number of seats in your current subscription. To unfreeze this organization, please either purchase additional seats or remove members until the number of members matches the number of seats.";
            } else if (org.groups.length > provisioning.quota.groups) {
                provisioning.status = ProvisioningStatus.Frozen;
                provisioning.statusMessage =
                    "This organization has been frozen because it's number of groups exceeds the maximum number of groups allowed in your current plan. To unfreeze this organization, please either upgrade to a higher tier or remove groups until the number of groups matches your quota";
            } else if (org.vaults.length > provisioning.quota.vaults) {
                provisioning.status = ProvisioningStatus.Frozen;
                provisioning.statusMessage =
                    "This organization has been frozen because it's number of vaults exceeds the maximum number of vaults allowed in your current plan. To unfreeze this organization, please either upgrade to a higher tier or remove vaults until the number of vaults matches your quota";
            }
        }

        return provisioning;
    }

    protected async _syncBilling({ account, orgs }: Provisioning) {
        const customer = await this._getCustomer(account, true);
        const { subscription, tier } = this._getSubscriptionInfo(customer);
        const paymentMethods = (await this._stripe.customers.listPaymentMethods(customer.id, { type: "card" })).data;
        const latestInvoice =
            subscription &&
            (await this._stripe.invoices.retrieve(subscription.latest_invoice as string, {
                expand: ["payment_intent", "lines.data.price.product"],
            }));

        switch (subscription?.status) {
            case "canceled":
            case "incomplete":
            case "incomplete_expired":
            case "past_due":
            case "unpaid":
                account.status = ProvisioningStatus.Frozen;
                account.actionLabel = "Learn More";
                account.actionUrl = "https://padloc.app/help/"; // TODO: Point to specific article/section
                break;
            default:
                account.status = ProvisioningStatus.Active;
                account.actionLabel = "";
                account.actionUrl = "";
        }

        account.quota = this._getAccountQuota(tier);
        account.features = await this._getAccountFeatures(tier, customer);

        if (!account.metaData) {
            account.metaData = {};
        }
        account.metaData.customer = customer;
        account.metaData.paymentMethods = paymentMethods;
        account.metaData.latestInvoice = latestInvoice;

        if (subscription?.status === "trialing" && !account.metaData.firstTrialStarted) {
            account.metaData.firstTrialStarted = Date.now();
        }

        account.billingPage = await this._renderBillingPage(customer, paymentMethods, latestInvoice);

        const existingOrg = orgs.find((o) => o.owner === account.accountId);

        if (existingOrg || [Tier.Family, Tier.Team, Tier.Business].includes(tier)) {
            const org = await this._getOrgProvisioning(account, customer, existingOrg);
            await this.storage.save(org);
            account.orgs = [org.id];
            // Org will be auto-created, so hide create org button now
            account.features.createOrg.hidden = true;
        }

        account.metaData.lastSync = Date.now();

        await this.storage.save(account);
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
                cancel_url: `${this.config.url}/callback`,
                success_url: `${this.config.url}/callback`,
                mode: "subscription",
                payment_method_types: ["card"],
                line_items: [
                    {
                        price: price.id,
                        adjustable_quantity:
                            tierInfo.minSeats || tierInfo.maxSeats
                                ? {
                                      enabled: true,
                                      minimum: Math.max(tierInfo.minSeats),
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
            return_url: `${this.config.url}/callback`,
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

        if (!(await this._verifyPortalParams(params))) {
            httpRes.writeHead(401);
            httpRes.write("Invalid or expired url!");
            httpRes.end();
        }

        const email = params.get("email");
        const action = (params.get("action") as PortalAction | null) || undefined;
        const tier = (params.get("tier") as Tier | null) || undefined;

        if (!email) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        const provisioning = await this.getProvisioning({ email });

        if (!provisioning.account.accountId) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        const customer = await this._getCustomer(provisioning.account);

        const url = await this._getStripeUrl(customer, action, tier);

        if (!url) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        httpRes.writeHead(302, { Location: url });
        httpRes.end();
    }

    private async _signPortalParams(params: URLSearchParams) {
        params.set("ts", Date.now().toString());

        params.sort();

        const sig = await getCryptoProvider().sign(
            base64ToBytes(this.config.portalSecret),
            stringToBytes(params.toString()),
            new HMACParams()
        );

        params.set("sig", bytesToBase64(sig));
    }

    private async _verifyPortalParams(params: URLSearchParams) {
        const sig = params.get("sig");
        const ts = Number(params.get("ts"));

        if (!sig || isNaN(ts) || Date.now() - ts < 0 || Date.now() - ts > this.config.urlsExpireAfter * 1000) {
            return false;
        }

        params.delete("sig");
        params.sort();

        const sig1 = base64ToBytes(sig);
        const sig2 = await getCryptoProvider().sign(
            base64ToBytes(this.config.portalSecret),
            stringToBytes(params.toString()),
            new HMACParams()
        );

        return equalCT(sig1, sig2);
    }

    private async _getPortalUrl(customer: Stripe.Customer, action?: PortalAction, tier?: Tier) {
        const url = new URL(`${this.config.url}/portal`);

        url.searchParams.set("email", customer.email!);

        if (action) {
            url.searchParams.set("action", action);
        }

        if (tier) {
            url.searchParams.set("tier", tier);
        }

        await this._signPortalParams(url.searchParams);

        return url.toString();
    }

    private async _renderTier(tier: Tier, cus: Stripe.Customer, allowUpdate = true, highlightFeature?: string) {
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
                    ${(isCurrent && tier === Tier.Free) || !allowUpdate
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
                                  <a href="${await this._getPortalUrl(cus, PortalAction.UpdateSubscription, tier)}">
                                      <button class="text-centering fill-horizontally">Update</button>
                                  </a>
                              </div>
                          `
                        : html`
                              <div class="padded">
                                  <a href="${await this._getPortalUrl(cus, PortalAction.UpdateSubscription, tier)}">
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

    private async _renderSubscription(
        customer: Stripe.Customer,
        paymentMethods: Stripe.PaymentMethod[],
        latestInvoice: Stripe.Invoice | null
    ) {
        const { tier, tierInfo, subscription, item } = this._getSubscriptionInfo(customer);
        const paymentMethod =
            subscription && paymentMethods.find((pm) => pm.id === subscription.default_payment_method);
        const country = customer.address?.country || paymentMethod?.card?.country || undefined;
        const periodEnd = (subscription && new Date(subscription.current_period_end * 1000))?.toLocaleDateString(
            country
        );
        const status = subscription?.status || "active";
        const paymentError = (latestInvoice?.payment_intent as Stripe.PaymentIntent)?.last_payment_error;

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
                              <div
                                  class="small ${paymentError || subscription.cancel_at_period_end
                                      ? "negative highlighted"
                                      : "subtle"} top-half-margined"
                              >
                                  ${paymentError
                                      ? html`<pl-icon icon="error" class="inline"></pl-icon>
                                            Payment failed
                                            ${paymentError.payment_method?.card
                                                ? html`
                                                      using <pl-icon icon="credit" class="inline"></pl-icon> ••••
                                                      ${paymentError.payment_method.card.last4}
                                                  `
                                                : ""} `
                                      : subscription.cancel_at_period_end
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
                                                href="${await this._getPortalUrl(
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
                                                href="${await this._getPortalUrl(
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
            ${latestInvoice
                ? html`
                      <div class="box vertical layout">
                          <div class="padded bg-dark border-bottom">
                              <div class="horizontal start-aligning layout uppercase semibold">
                                  <div class="stretch">Latest Invoice</div>
                                  <div class="tiny tag ${paymentError ? "negative" : ""} highlighted">
                                      ${paymentError ? "failed payment" : latestInvoice.status}
                                  </div>
                              </div>
                              <div class="small subtle top-half-margined">
                                  ${new Date(latestInvoice.created * 1000).toLocaleDateString(country)}
                              </div>
                          </div>
                          <div>
                              <a
                                  href="${latestInvoice.hosted_invoice_url!}"
                                  class="${paymentError ? "negative highlighted" : ""}"
                              >
                                  <div class="small double-padded list-item">
                                      ${latestInvoice.lines.data
                                          .map(
                                              (line) => html`
                                                  <div class="spacing horizontal layout">
                                                      <div class="stretch">${line.description}</div>
                                                      <div class="bold">
                                                          ${new Intl.NumberFormat(country, {
                                                              style: "currency",
                                                              currency: line.currency,
                                                          }).format(line.amount / 100)}
                                                      </div>
                                                  </div>
                                              `
                                          )
                                          .join("")}
                                      ${latestInvoice.lines.data.length > 1
                                          ? html`
                                                <div class="horizontal top-margined layout">
                                                    <div class="stretch"></div>
                                                    <div
                                                        class="bold padded"
                                                        style="margin-right: -0.5em; border-top: solid 1px;"
                                                    >
                                                        ${new Intl.NumberFormat(country, {
                                                            style: "currency",
                                                            currency: latestInvoice.currency,
                                                        }).format(latestInvoice.total / 100)}
                                                    </div>
                                                </div>
                                            `
                                          : ""}
                                      ${paymentError
                                          ? html`
                                                <div class="top-margined bold">
                                                    <pl-icon icon="error" class="inline"></pl-icon>
                                                    ${paymentError.message ||
                                                    "There was a problem with your payment method."}
                                                </div>
                                            `
                                          : ""}
                                  </div>
                              </a>
                              <div class="small padded list-item spacing vertical layout">
                                  <a href="${await this._getPortalUrl(customer)}">
                                      <button class="text-centering fill-horizontally">All Invoices</button>
                                  </a>
                              </div>
                          </div>
                      </div>
                  `
                : ""}
        `;
    }

    private async _renderCustomerInfo(
        customer: Stripe.Customer,
        paymentMethods: Stripe.PaymentMethod[],
        latestInvoice: Stripe.Invoice | null
    ) {
        const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;
        const paymentError = paymentIntent?.last_payment_error;
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
                        <a href="${await this._getPortalUrl(customer, PortalAction.UpdateBillingInfo)}">
                            <button class="text-centering fill-horizontally">Update</button>
                        </a>
                    </div>
                </div>
            </div>

            <div class="box vertical layout">
                <div class="padded bg-dark border-bottom uppercase semibold">Payment Methods</div>
                <div class="small vertical layout">
                    ${paymentMethods
                        .map(({ id, card }) => {
                            return html`
                                ${card
                                    ? html`
                                          <div class="double-padded list-item">
                                              <div class="center-aligning spacing horizontal layout">
                                                  <pl-icon icon="credit"></pl-icon>
                                                  <div class="stretch">•••• ${card.last4}</div>
                                                  <div class="subtle">Expires ${card.exp_month} / ${card.exp_year}</div>
                                              </div>
                                              ${paymentError && paymentError.payment_method?.id === id
                                                  ? html`<div class="negative highlighted top-margined">
                                                        <pl-icon icon="error" class="inline"></pl-icon>
                                                        ${paymentError.message ||
                                                        "There was a problem with your payment method."}
                                                    </div>`
                                                  : ""}
                                          </div>
                                      `
                                    : ""}
                            `;
                        })
                        .join("")}
                    <div class="padded list-item stretch">
                        ${paymentMethods.length
                            ? html`
                                  <a href="${await this._getPortalUrl(customer)}">
                                      <button class="text-centering fill-horizontally">Update</button>
                                  </a>
                              `
                            : html`
                                  <a href="${await this._getPortalUrl(customer, PortalAction.AddPaymentMethod)}">
                                      <button class="text-centering fill-horizontally">Add Payment Method</button>
                                  </a>
                              `}
                    </div>
                </div>
            </div>
        `;
    }

    private async _renderBillingPage(
        customer: Stripe.Customer,
        paymentMethods: Stripe.PaymentMethod[],
        latestInvoice: Stripe.Invoice | null
    ): Promise<RichContent> {
        // const { tier } = this._getSubscriptionInfo(customer);
        return {
            type: "html",
            content: html`
                <div>
                    <h2 class="padded">Subscription</h2>

                    <div class="grid" style="--grid-column-width: 15em; align-items: start;">
                        ${await this._renderSubscription(customer, paymentMethods, latestInvoice)}
                    </div>
                </div>

                <div>
                    <h2 class="padded">Billing Info</h2>

                    <div class="grid" style="--grid-column-width: 15em; align-items: start;">
                        ${await this._renderCustomerInfo(customer, paymentMethods, latestInvoice)}
                    </div>
                </div>

                <h2 class="padded" id="billing-plans">Plans</h2>
                <div class="grid" style="--grid-column-width: 13em">
                    ${(
                        await Promise.all(
                            [Tier.Free, Tier.Premium, Tier.Family, Tier.Team, Tier.Business]
                                // .filter((t) => this._tiers[t].order >= this._tiers[tier].order)
                                .map((tier) => this._renderTier(tier, customer))
                        )
                    ).join("\n")}
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
            if (this.config.webhookSecret) {
                console.log("verifying signature", httpReq.headers["stripe-signature"]);
                event = this._stripe.webhooks.constructEvent(
                    body,
                    httpReq.headers["stripe-signature"] as string,
                    this.config.webhookSecret
                );
            } else {
                event = JSON.parse(body);
            }
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        console.log("handle stripe event", event.type);

        let customer: Stripe.Customer | Stripe.DeletedCustomer | undefined = undefined;

        switch (event.type) {
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
            console.log(
                "event received for customer",
                event.type,
                customer.id,
                customer.email,
                customer.metadata.account
            );
            const provisioning = await this.getProvisioning({
                email: customer.email,
                accountId: customer.metadata.account,
            });
            await this._syncBilling(provisioning);
        }

        httpRes.statusCode = 200;
        httpRes.end();
    }

    protected async _handleSyncBilling(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let params: { email: string; accountId?: string };
        try {
            const body = await readBody(httpReq);
            params = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end();
            return;
        }

        const provisioning = await this.getProvisioning({
            email: params.email,
            accountId: params.accountId,
        });

        await this._syncBilling(provisioning);

        httpRes.statusCode = 200;
        httpRes.end();
    }

    protected async _handleCallbackRequest(_httpReq: IncomingMessage, httpRes: ServerResponse) {
        // const params = new URL(httpReq.url!, "http://localhost").searchParams;
        // const message = params.get("message");

        httpRes.write(
            html`
                <!DOCTYPE html>
                <html>
                    <head>
                        <script>
                            window.close();
                        </script>
                    </head>
                    <body></body>
                </html>
            `
        );
        httpRes.end();
    }

    protected async _handleRequest(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const path = new URL(httpReq.url!, "http://localhost").pathname;

        if (path === "/stripe_webhooks") {
            if (httpReq.method !== "POST") {
                httpRes.statusCode = 405;
                httpRes.end();
                return;
            }

            return this._handleStripeEvent(httpReq, httpRes);
        }

        if (path === "/sync") {
            if (httpReq.method !== "POST") {
                httpRes.statusCode = 405;
                httpRes.end();
                return;
            }

            return this._handleSyncBilling(httpReq, httpRes);
        }

        if (path === "/portal") {
            if (httpReq.method !== "GET") {
                httpRes.statusCode = 405;
                httpRes.end();
                return;
            }

            return this._handlePortalRequest(httpReq, httpRes);
        }

        if (path == "/callback") {
            if (httpReq.method !== "GET") {
                httpRes.statusCode = 405;
                httpRes.end();
                return;
            }

            return this._handleCallbackRequest(httpReq, httpRes);
        }

        httpRes.statusCode = 400;
        httpRes.end();
    }

    private async _startServer() {
        const server = createServer((req, res) => this._handleRequest(req, res));
        server.listen(this.config.port);
    }
}
