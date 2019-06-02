import * as Stripe from "stripe";
import { Account } from "@padloc/core/src/account";
import { Org } from "@padloc/core/src/org";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { Storage } from "@padloc/core/src/storage";
import {
    BillingProvider,
    BillingInfo,
    Plan,
    Subscription,
    UpdateBillingParams,
    PaymentMethod,
    BillingAddress,
    Discount
} from "@padloc/core/src/billing";

export interface StripeConfig {
    stripeSecret: string;
}

function parsePlan({
    id,
    amount,
    nickname,
    metadata: { description, storage, groups, vaults, min, max, available, features, orgType, default: def, color }
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
        available: available === "true",
        default: def === "true",
        cost: amount,
        features: (features && features.trim().split(/\n/)) || [],
        orgType: orgType ? parseInt(orgType) : -1,
        color: color || ""
    });
}

function parseSubscription({
    id,
    status,
    plan,
    quantity,
    metadata: { items, storage, groups, vaults, account, org }
}: Stripe.subscriptions.ISubscription) {
    const planInfo = parsePlan(plan!);
    return new Subscription().fromRaw({
        id,
        status,
        plan: planInfo.toRaw(),
        account: account || "",
        org: org || "",
        items: items ? parseInt(items) : planInfo.items || -1,
        storage: storage ? parseInt(storage) : planInfo.storage || 0,
        groups: groups ? parseInt(groups) : planInfo.groups || 0,
        vaults: vaults ? parseInt(vaults) : planInfo.vaults || 0,
        members: quantity
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
        const plans = await this._stripe.plans.list();

        this._availablePlans = plans.data
            .map(p => parsePlan(p))
            .filter(p => p.available)
            .sort((a, b) => a.orgType - b.orgType);
    }

    async updateBilling({ account, org, email, plan, members, paymentMethod, address, coupon }: UpdateBillingParams) {
        if (!account && !org) {
            throw new Err(ErrorCode.BAD_REQUEST, "Either 'account' or 'org' parameter required!");
        }

        const acc = account ? await this.storage.get(Account, account) : await this.storage.get(Org, org!);

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

        if (typeof plan !== "undefined" || typeof members !== "undefined") {
            const params: any = info.subscription ? {} : { customer: info.customerId };

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

            params.trial_end = "now";

            if (info.subscription) {
                console.log("updating subscription");
                await this._stripe.subscriptions.update(
                    info.subscription.id,
                    params as Stripe.subscriptions.ISubscriptionUpdateOptions
                );
            } else {
                console.log("creating subscription");
                await this._stripe.subscriptions.create(params as Stripe.subscriptions.ISubscriptionCreationOptions);
            }
        }

        await this._sync(acc);
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

        console.log(invoice);

        const items = new Map<number, number>();

        for (const line of invoice.lines.data) {
            console.log(line.amount);
            items.set(line.period.start, line.amount + (items.get(line.period.start) || 0));
        }

        console.log(items.entries());

        // console.log([...items.entries()].map(([ts, amount]) => ({ due: new Date(ts * 1000), amount })));
    }

    private async _sync(acc: Account | Org): Promise<void> {
        const customer = acc.billing
            ? await this._stripe.customers.retrieve(acc.billing.customerId)
            : await this._stripe.customers.create({
                  metadata: {
                      account: acc instanceof Account ? acc.id : "",
                      org: acc instanceof Org ? acc.id : ""
                  }
              });

        acc.billing = parseCustomer(customer);

        const sub = acc.billing.subscription;

        Object.assign(
            acc.quota,
            sub
                ? {
                      storage: sub.storage,
                      items: sub.items,
                      members: sub.members,
                      groups: sub.groups,
                      vaults: sub.vaults
                  }
                : {
                      storage: 0,
                      items: 50,
                      members: 0,
                      groups: 0,
                      vaults: 0
                  }
        );

        acc.billing!.availablePlans = [...this._availablePlans.values()];
        await this.storage.save(acc);
    }
}
