import { createServer } from "http";
import Stripe from "stripe";
import { Account } from "@padloc/core/src/account";
import { Org } from "@padloc/core/src/org";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { Storage } from "@padloc/core/src/storage";
import {
    BillingProvider,
    BillingInfo,
    Plan,
    PlanType,
    Subscription,
    SubscriptionStatus,
    UpdateBillingParams,
    PaymentMethod,
    BillingAddress,
    Discount
} from "@padloc/core/src/billing";
import { readBody } from "./http";

export interface StripeConfig {
    stripeSecret: string;
    port: number;
}

function parsePlan({
    id,
    amount,
    nickname,
    metadata: { description, storage, groups, vaults, items, min, max, available, features, type, default: def, color }
}: Stripe.plans.IPlan) {
    return new Plan().fromRaw({
        id,
        name: nickname,
        description: description || "",
        storage: storage ? parseInt(storage) : 0,
        min: min ? parseInt(min) : 0,
        max: max ? parseInt(max) : 0,
        groups: groups ? parseInt(groups) : 0,
        vaults: vaults ? parseInt(vaults) : 0,
        items: items ? parseInt(items) : -1,
        available: available === "true",
        default: def === "true",
        cost: amount,
        features: (features && features.trim().split(/\n/)) || [],
        type: type ? parseInt(type) : 0,
        color: color || ""
    });
}

function parseSubscription({
    id,
    status: _status,
    plan,
    quantity,
    trial_end,
    cancel_at_period_end,
    current_period_end,
    metadata: { items, storage, groups, vaults, account, org },
    latest_invoice
}: Stripe.subscriptions.ISubscription) {
    const planInfo = parsePlan(plan!);

    const payment = latest_invoice && latest_invoice.payment_intent;
    const paymentStatus = payment && payment.status;
    const paymentError = (payment && payment.last_payment_error && payment.last_payment_error.message) || undefined;
    const paymentRequiresAuth = payment && paymentStatus === "requires_action" ? payment.client_secret : undefined;

    let status: SubscriptionStatus;

    switch (_status) {
        case "trialing":
            status = SubscriptionStatus.Trialing;
            break;
        case "active":
            status = cancel_at_period_end ? SubscriptionStatus.Canceled : SubscriptionStatus.Active;
            break;
        case "canceled":
        case "unpaid":
        case "past_due":
        case "incomplete":
        case "incomplete_expired":
            status = SubscriptionStatus.Inactive;
            break;
        default:
            status = SubscriptionStatus.Inactive;
    }

    return new Subscription().fromRaw({
        id,
        status,
        trialEnd: trial_end && trial_end * 1000,
        periodEnd: current_period_end && current_period_end * 1000,
        plan: planInfo.toRaw(),
        account: account || "",
        org: org || "",
        items: items ? parseInt(items) : planInfo.items || -1,
        storage: storage ? parseInt(storage) : planInfo.storage || 0,
        groups: groups ? parseInt(groups) : planInfo.groups || 0,
        vaults: vaults ? parseInt(vaults) : planInfo.vaults || 0,
        members: quantity,
        paymentError,
        paymentRequiresAuth,
        currentInvoice: (latest_invoice && !latest_invoice.paid && latest_invoice.id) || ""
    });
}

function parseCustomer({
    id,
    email,
    name,
    address,
    subscriptions,
    sources,
    discount,
    metadata: { org, account }
}: Stripe.customers.ICustomer) {
    const info = new BillingInfo();

    info.org = org;
    info.account = account;
    info.email = email || "";
    info.customerId = id;

    const subscription = subscriptions.data[0] ? parseSubscription(subscriptions.data[0]) : null;
    info.subscription = subscription;

    const source = sources && (sources.data[0] as Stripe.ICard);
    info.paymentMethod =
        (source &&
            new PaymentMethod().fromRaw({
                id: source.id,
                name: `${source.brand} •••• •••• •••• ${source.last4}`
            })) ||
        null;

    info.address = new BillingAddress().fromRaw({
        name: name || "",
        street: (address && address.line1) || "",
        postalCode: (address && address.postal_code) || "",
        city: (address && address.city) || "",
        country: (address && address.country) || ""
    });

    info.discount =
        (discount &&
            new Discount().fromRaw({
                name: discount.coupon.name,
                coupon: discount.coupon.id
            })) ||
        null;

    return info;
}

export class StripeBillingProvider implements BillingProvider {
    private _stripe: Stripe;
    private _availablePlans: Plan[] = [];

    constructor(public config: StripeConfig, public storage: Storage) {
        this._stripe = new Stripe(config.stripeSecret);
    }

    async init() {
        this._loadPlans();
        this._startWebhook();
    }

    async update({ account, org, email, plan, members, paymentMethod, address, coupon, cancel }: UpdateBillingParams) {
        if (!account && !org) {
            throw new Err(ErrorCode.BAD_REQUEST, "Either 'account' or 'org' parameter required!");
        }

        const acc = org ? await this.storage.get(Org, org) : await this.storage.get(Account, account!);

        await this._sync(acc);

        const info = acc.billing!;

        try {
            await this._stripe.customers.update(info.customerId, {
                email,
                // @ts-ignore
                name: address && address.name,
                address: address && {
                    line1: address.street,
                    postal_code: address.postalCode,
                    city: address.city,
                    country: address.country
                },
                source: paymentMethod && paymentMethod.source,
                coupon: coupon || undefined,
                // @ts-ignore
                metadata: { account, org }
            });
        } catch (e) {
            throw new Err(ErrorCode.BILLING_ERROR, e.message);
        }

        const params: any = {};

        if (typeof plan !== "undefined") {
            const planInfo = this._availablePlans.find(p => p.id === plan);
            if (!planInfo) {
                throw new Err(ErrorCode.BAD_REQUEST, "Invalid plan!");
            }
            params.plan = planInfo.id;
        }

        if (typeof members !== "undefined") {
            params.quantity = members;
        }

        if (typeof cancel === "boolean") {
            params.cancel_at_period_end = cancel;
        }

        if (Object.keys(params).length) {
            try {
                if (info.subscription) {
                    await this._stripe.subscriptions.update(info.subscription.id, {
                        trial_from_plan: true,
                        // trial_end: Math.floor(Date.now() / 1000) + 20,
                        // trial_end: "now",
                        ...params
                    } as Stripe.subscriptions.ISubscriptionUpdateOptions);
                } else {
                    await this._stripe.subscriptions.create({
                        customer: info.customerId,
                        trial_from_plan: true,
                        // trial_end: Math.floor(Date.now() / 1000) + 20,
                        ...params
                    } as Stripe.subscriptions.ISubscriptionCreationOptions);
                }
            } catch (e) {
                throw new Err(ErrorCode.BILLING_ERROR, e.message);
            }
        }

        await this._sync(acc);

        const sub = acc.billing && acc.billing.subscription;

        if (sub && sub.currentInvoice && !sub.paymentRequiresAuth) {
            try {
                await this._stripe.invoices.pay(sub.currentInvoice);
                await this._sync(acc);
            } catch (e) {
                await this._sync(acc);
                throw new Err(ErrorCode.BILLING_ERROR, e.message);
            }
        }
    }

    async getPrice(account: Account, { plan, members }: UpdateBillingParams) {
        const planInfo = this._availablePlans.find(p => p.id === plan);
        if (!planInfo) {
            throw new Err(ErrorCode.BAD_REQUEST, "Invalid plan!");
        }

        await this._sync(account);

        const { customerId, subscription } = account.billing!;

        // const sub = await this._stripe.subscriptions.retrieve(subscription!.id);

        // Set proration date to this moment:
        const prorationDate = Math.floor(Date.now() / 1000);

        // @ts-ignore
        const invoice = await this._stripe.invoices.retrieveUpcoming({
            customer: customerId,
            subscription: subscription!.id,
            subscription_plan: planInfo.id,
            subscription_quantity: members || 0,
            subscription_trial_end: "now",
            subscription_proration_date: prorationDate
        });

        const items = new Map<number, number>();

        for (const line of invoice.lines.data) {
            items.set(line.period.start, line.amount + (items.get(line.period.start) || 0));
        }

        console.log(items.entries());

        // console.log([...items.entries()].map(([ts, amount]) => ({ due: new Date(ts * 1000), amount })));
    }

    async delete(billingInfo: BillingInfo) {
        try {
            await this._stripe.customers.del(billingInfo.customerId);
        } catch (e) {
            // If the customer is already gone we can ignore the error
            if (e.code !== "resource_missing") {
                throw e;
            }
        }
    }

    private async _sync(acc: Account | Org): Promise<void> {
        let customer: Stripe.customers.ICustomer | undefined;
        const freePlan = this._availablePlans.find(p => p.type === PlanType.Free);

        if (acc.billing) {
            try {
                customer = await this._stripe.customers.retrieve(acc.billing.customerId, {
                    expand: ["subscriptions.data.latest_invoice.payment_intent"]
                });
            } catch (e) {
                // If the customer was not found we can continue an create a new one,
                // otherwise something unexpected happened and we should probably throw
                if (e.code !== "resource_missing") {
                    throw e;
                }
            }
        } else if (acc instanceof Account) {
            const existingCustomers = await this._stripe.customers.list({ email: acc.email });
            customer = existingCustomers.data.find(c => !c.metadata.org && !c.metadata.account);
        }

        // @ts-ignore
        if (!customer || customer.deleted) {
            customer = await this._stripe.customers.create({
                // email: acc instanceof Account ? acc.email : undefined,
                plan: acc instanceof Account && freePlan ? freePlan.id : undefined,
                metadata: {
                    account: acc instanceof Account ? acc.id : "",
                    org: acc instanceof Org ? acc.id : ""
                }
            });
        }

        acc.billing = parseCustomer(customer);

        // if (acc instanceof Account && !acc.billing!.subscription && freePlan) {
        //     await this._stripe.subscriptions.create({
        //         customer: acc.billing!.customerId,
        //         plan: freePlan.id
        //     });
        // }

        const sub = acc.billing.subscription;

        if (sub && sub.status !== SubscriptionStatus.Inactive) {
            if (acc instanceof Account) {
                acc.quota.storage = sub.storage;
                acc.quota.items = sub.items;
            } else {
                acc.quota.storage = sub.storage;
                acc.quota.members = sub.members;
                acc.quota.groups = sub.groups;
                acc.quota.vaults = sub.vaults;
                acc.frozen = false;
            }
        } else {
            if (acc instanceof Account) {
                const { items, storage } = freePlan || { items: 50, storage: 0 };
                Object.assign(acc.quota, { items, storage });
            } else {
                acc.frozen = true;
            }
        }

        await this.storage.save(acc);
    }

    async getPlans() {
        return [...this._availablePlans.values()];
    }

    private async _startWebhook() {
        const server = createServer(async (httpReq, httpRes) => {
            httpRes.on("error", e => {
                console.error(e);
            });

            let event: Stripe.events.IEvent;

            try {
                const body = await readBody(httpReq);
                event = JSON.parse(body);
            } catch (e) {
                httpRes.statusCode = 400;
                httpRes.end();
                return;
            }

            let customer: Stripe.customers.ICustomer | undefined = undefined;

            switch (event.type) {
                case "customer.created":
                case "customer.deleted":
                case "customer.updated":
                    customer = event.data.object as Stripe.customers.ICustomer;
                    break;
                case "customer.subscription.deleted":
                case "customer.subscription.created":
                case "customer.subscription.updated":
                    const sub = event.data.object as Stripe.subscriptions.ISubscription;
                    customer = await this._stripe.customers.retrieve(sub.customer as string);
                    break;
                case "plan.created":
                case "plan.updated":
                case "plan.deleted":
                    this._loadPlans();
                    break;
            }

            if (customer) {
                const { account, org } = customer.metadata;
                const acc = org
                    ? await this.storage.get(Org, org)
                    : account
                    ? await this.storage.get(Account, account)
                    : null;

                if (acc) {
                    await this._sync(acc);
                }
            }

            httpRes.statusCode = 200;
            httpRes.end();
        });

        server.listen(this.config.port);
    }

    private async _loadPlans() {
        const plans = await this._stripe.plans.list();
        this._availablePlans = plans.data.map(p => parsePlan(p)).filter(p => p.available);
    }
}
