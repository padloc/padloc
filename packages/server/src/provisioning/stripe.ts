import { createServer } from "http";
import Stripe from "stripe";
import { Storage } from "@padloc/core/src/storage";
import { getIdFromEmail } from "@padloc/core/src/util";
import { readBody } from "../transport/http";
import { AccountProvisioning, OrgProvisioning, Provisioner, Provisioning } from "@padloc/core/src/provisioning";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { Account, AccountID } from "@padloc/core/src/account";
import { Org, OrgID } from "@padloc/core/src/org";

export class StripeProvisionerConfig extends Config {
    @ConfigParam("string", true)
    secretKey!: string;

    @ConfigParam()
    publicKey!: string;

    @ConfigParam()
    webhookPort!: number;
}

class AccountProvisioningEntry extends AccountProvisioning {
    constructor(vals: Partial<AccountProvisioningEntry> = {}) {
        super();
        Object.assign(this, vals);
    }

    id: string = "";

    customer?: Stripe.Customer = undefined;
}

// class OrgProvisioningEntry extends OrgProvisioning {
//     constructor(vals: Partial<OrgProvisioningEntry> = {}) {
//         super();
//         Object.assign(this, vals);
//     }

//     customer?: Stripe.Customer = undefined;
// }

export class StripeProvisioner implements Provisioner {
    private _stripe: Stripe;

    constructor(public config: StripeProvisionerConfig, public storage: Storage) {
        this._stripe = new Stripe(config.secretKey, { apiVersion: "2020-08-27" });
    }

    async init() {
        this._startWebhook();
    }

    async getProvisioning({ email, accountId }: { email: string; accountId?: AccountID }) {
        const accountProvisioning = await this._getAccountProvisioning({ email, accountId });
        const provisioning = new Provisioning({
            account: accountProvisioning,
        });
        if (accountId) {
            const account = await this.storage.get(Account, accountId);
            provisioning.orgs = await Promise.all(account.orgs.map((org) => this._getOrgProvisioning(org)));
        }
        return provisioning;
    }

    async accountDeleted(params: { email: string; accountId?: string }): Promise<void> {
        const entry = await this._getAccountProvisioningEntry(params);

        if (!entry.customer) {
            return;
        }

        try {
            await this._stripe.customers.del(entry.customer.id);
            await this.storage.delete(entry);
        } catch (e) {
            // If the customer is already gone we can ignore the error
            if (e.code !== "resource_missing") {
                throw e;
            }
        }
    }

    private async _getAccountProvisioningEntry({
        email,
        accountId,
    }: {
        email: string;
        accountId?: string | undefined;
    }) {
        const id = await getIdFromEmail(email);
        try {
            const entry = await this.storage.get(AccountProvisioningEntry, id);
            if (accountId && !entry.accountId) {
                entry.accountId = accountId;
                await this.storage.save(entry);
            }
            return entry;
        } catch (e) {
            return new AccountProvisioningEntry({
                email,
                accountId,
            });
        }
    }

    private async _getAccountProvisioning({
        email,
        accountId,
    }: {
        email: string;
        accountId?: string | undefined;
    }): Promise<AccountProvisioning> {
        const entry = await this._getAccountProvisioningEntry({ email, accountId });

        if (!entry.accountId) {
            return entry as AccountProvisioning;
        }

        // Try to find customer with same email address that isn't assoziated with a different account or org
        if (!entry.customer || entry.customer.deleted) {
            const existingCustomers = await this._stripe.customers.list({ email, expand: ["data.subscriptions"] });
            entry.customer = existingCustomers.data.find(
                (c) => !c.metadata.org && (!c.metadata.account || c.metadata.account === accountId)
            );
        }

        // Create a new customer
        if (!entry.customer || entry.customer.deleted) {
            entry.customer = await this._stripe.customers.create({
                email,
                // name: acc.name,
                metadata: {
                    account: entry.accountId,
                },
            });
        }

        if (!entry.customer.subscriptions?.data.length) {
            const checkoutSession = await this._stripe.checkout.sessions.create({
                customer: entry.customer.id,
                cancel_url: "https://web.padloc.app",
                success_url: "https://web.padloc.app",
                mode: "subscription",
                payment_method_types: ["card"],
                line_items: [
                    {
                        // price_data: {
                        //     currency: "USD",
                        //     product: "prod_KAKP7w3M7Lzwvg",
                        //     recurring: {
                        //         interval: "month",
                        //         interval_count: 12,
                        //     },
                        // },
                        price: "price_1JVztbLGYleXiL7bebBwQWw3",
                        quantity: 1,
                    },
                ],
                subscription_data: {
                    trial_period_days: 30,
                },
                // automatic_tax: {
                //     enabled: true,
                // },
                // tax_id_collection: {
                //     enabled: true,
                // },
                // customer_update: {
                //     name: "auto",
                //     address: "auto",
                //     shipping: "never",
                // },
            });
            entry.actionUrl = checkoutSession.success_url || undefined;
        } else {
            const portalSession = await this._stripe.billingPortal.sessions.create({ customer: entry.customer.id });
            entry.actionUrl = portalSession.url;
        }

        await this.storage.save(entry);

        return entry as AccountProvisioning;
    }

    private async _getOrgProvisioning({ id }: { id: OrgID }) {
        const org = await this.storage.get(Org, id);
        const { email, id: accountId } = await this.storage.get(Account, org.owner);
        const { status, statusMessage } = await this._getAccountProvisioning({
            email,
            accountId,
        });
        return new OrgProvisioning({
            orgId: org.id,
            status,
            statusMessage,
        });
    }

    private async _startWebhook() {
        const server = createServer(async (httpReq, httpRes) => {
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

            if (customer && !customer.deleted) {
                console.log("found customer!", customer);
            }

            httpRes.statusCode = 200;
            httpRes.end();
        });

        server.listen(this.config.webhookPort);
    }
}
