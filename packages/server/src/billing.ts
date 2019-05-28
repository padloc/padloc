import * as Stripe from "stripe";
import { Account } from "@padloc/core/src/account";
import { Err, ErrorCode } from "@padloc/core/src/error";
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
    metadata: { storage, groups, vaults, account, org }
}: Stripe.subscriptions.ISubscription) {
    const planInfo = parsePlan(plan!);
    return new Subscription().fromRaw({
        id,
        status,
        plan: planInfo.toRaw(),
        account: account || "",
        org: org || "",
        storage: storage ? parseInt(storage) : planInfo.storage,
        groups: groups ? parseInt(groups) : planInfo.groups,
        vaults: vaults ? parseInt(vaults) : planInfo.vaults,
        members: quantity
    });
}

export class StripeBillingProvider implements BillingProvider {
    private _stripe: Stripe;
    private _availablePlans: Plan[] = [];

    constructor(public config: StripeConfig) {
        this._stripe = new Stripe(config.stripeSecret);
    }

    async init() {
        const plans = await this._stripe.plans.list();

        this._availablePlans = plans.data
            .map(p => parsePlan(p))
            .filter(p => p.available)
            .sort((a, b) => a.orgType - b.orgType);
    }

    async getBillingInfo(account: Account) {
        const customer = await this._getOrCreateCustomer(account);
        const subscription = customer.subscriptions.data[0] ? parseSubscription(customer.subscriptions.data[0]) : null;
        const info = new BillingInfo();
        const source = customer.sources && (customer.sources.data[0] as Stripe.ICard);
        info.subscription = subscription;
        info.customerId = customer.id;
        info.availablePlans = [...this._availablePlans.values()];
        info.paymentMethod =
            (source &&
                new PaymentMethod().fromRaw({
                    id: source.id,
                    name: `${source.brand} **** **** **** ${source.last4}`
                })) ||
            null;

        // @ts-ignore
        const { name, address } = customer;

        info.address = new BillingAddress().fromRaw({
            name: name || "",
            street: (address && address.line1) || "",
            postalCode: (address && address.postal_code) || "",
            country: (address && address.country) || ""
        });

        info.discount =
            (customer.discount &&
                new Discount().fromRaw({
                    name: customer.discount.coupon.name,
                    coupon: customer.discount.coupon.id
                })) ||
            null;

        return info;
    }

    async updateBilling(
        account: Account,
        { plan, members, paymentMethod, address, coupon }: UpdateBillingParams = new UpdateBillingParams()
    ) {
        const info = await this.getBillingInfo(account);

        try {
            await this._stripe.customers.update(info.customerId, {
                // @ts-ignore
                name: address && address.name,
                address: address && {
                    line1: address.street,
                    postal_code: address.postalCode,
                    city: address.city,
                    country: address.country
                },
                source: paymentMethod && paymentMethod.source,
                coupon: coupon || undefined
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

        account.billing = await this.getBillingInfo(account);
    }

    async getPrice(account: Account, { plan, members }: UpdateBillingParams) {
        const planInfo = this._availablePlans.find(p => p.id === plan);
        if (!planInfo) {
            throw new Err(ErrorCode.BAD_REQUEST, "Invalid plan!");
        }

        const { customerId, subscription } = await this.getBillingInfo(account);

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

    private async _getOrCreateCustomer({ email }: { email: string }): Promise<Stripe.customers.ICustomer> {
        let {
            data: [customer]
        } = await this._stripe.customers.list({ email });

        // console.log("customer: ", customer);

        if (!customer) {
            customer = await this._stripe.customers.create({
                email,
                plan: this._availablePlans.find(p => p.default)!.id
            });
        }

        return customer;
    }
}
