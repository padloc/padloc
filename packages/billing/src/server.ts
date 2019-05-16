import * as Stripe from "stripe";
import { QuotaProvider, AccountQuota, OrgQuota } from "@padloc/core/src/quota";
import { Account } from "@padloc/core/src/account";
import { Org } from "@padloc/core/src/org";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { BaseServer, ServerConfig, Context } from "@padloc/core/src/server";
import { Storage } from "@padloc/core/src/storage";
import { Messenger } from "@padloc/core/src/messenger";
import { Request, Response } from "@padloc/core/src/transport";
import { BillingAPI, BillingInfo, Plan, PlanInfo, Subscription, UpdateBillingInfoParams, PaymentMethod } from "./api";

export interface BillingConfig {
    stripeSecret: string;
}

function parsePlan({
    id,
    amount,
    metadata: { plan, description, storage, groups, vaults, min, max, available, features }
}: Stripe.plans.IPlan) {
    return new PlanInfo().fromRaw({
        id,
        plan: plan ? (parseInt(plan) as Plan) : Plan.Free,
        description: description || "",
        storage: storage ? parseInt(storage) : 0,
        min: min ? parseInt(min) : 0,
        max: max ? parseInt(max) : 0,
        groups: groups ? parseInt(groups) : 0,
        vaults: vaults ? parseInt(vaults) : 0,
        available: available === "true",
        cost: amount,
        features: (features && features.trim().split(/\n/)) || []
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

export class BillingServer extends BaseServer implements QuotaProvider, BillingAPI {
    private _stripe: Stripe;
    private _availablePlans = new Map<Plan, PlanInfo>();

    constructor(config: ServerConfig, storage: Storage, messenger: Messenger, public billingConfig: BillingConfig) {
        super(config, storage, messenger);
        this._stripe = new Stripe(billingConfig.stripeSecret);
    }

    async init() {
        const plans = await this._stripe.plans.list();

        for (const p of plans.data) {
            const plan = parsePlan(p);
            if (plan.available && plan.plan in Plan) {
                this._availablePlans.set(plan.plan, plan);
            }
        }
    }

    async getAccountQuota(account: Account) {
        const { subscription } = await this.getBillingInfo(account);
        return new AccountQuota((subscription && { storage: subscription.storage }) || undefined);
    }

    async getOrgQuota(account: Account, org: Org) {
        const info = await this.getBillingInfo(account);
        const sub = info.subscription;
        return sub && sub.org === org.id && sub.orgType == org.type ? new OrgQuota(sub) : null;
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
        return info;
    }

    async updateBillingInfo(account: Account, { plan, members, source, paymentMethod }: UpdateBillingInfoParams) {
        const info = await this.getBillingInfo(account);

        if (source) {
            try {
                await this._stripe.customers.update(info.customerId, { source });
            } catch (e) {
                throw new Err(ErrorCode.BILLING_ERROR, e.message);
            }
        }

        if (paymentMethod) {
            // @ts-ignore
            await this._stripe.paymentMethods.attach(paymentMethod, { customer: info.customerId });
        }

        if (typeof plan !== "undefined" || typeof members !== "undefined") {
            const params: any = info.subscription ? {} : { customer: info.customerId };

            if (typeof plan !== "undefined") {
                const planInfo = this._availablePlans.get(plan);
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

        return this.getBillingInfo(account);
    }

    async getPrice(account: Account, { plan, members }: UpdateBillingInfoParams) {
        const planInfo = this._availablePlans.get(plan!);
        if (!planInfo) {
            throw new Err(ErrorCode.BAD_REQUEST, "Invalid plan!");
        }

        const { customerId, subscription } = await this.getBillingInfo(account);

        // const sub = await this._stripe.subscriptions.retrieve(subscription!.id);

        // Set proration date to this moment:
        const prorationDate = Math.floor(Date.now() / 1000);

        // See what the next invoice would look like with a plan switch
        // and proration set:
        // const items = [
        //     {
        //         id: sub!.items.data[0].id,
        //         plan: planInfo.id,
        //         quantity: members
        //     }
        // ];

        // @ts-ignore
        const invoice = await this._stripe.invoices.retrieveUpcoming({
            customer: customerId,
            subscription: subscription!.id,
            subscription_plan: planInfo.id,
            subscription_quantity: members || 0,
            subscription_trial_end: "now",
            subscription_proration_date: prorationDate
        });

        // Calculate the proration cost:
        const current_prorations = [];
        var cost = 0;
        for (var i = 0; i < invoice.lines.data.length; i++) {
            const invoice_item = invoice.lines.data[i];
            if (invoice_item.period.start === prorationDate) {
                current_prorations.push(invoice_item);
                cost += invoice_item.amount;
            }
        }

        return cost;
    }

    private async _getOrCreateCustomer({ email }: { email: string }): Promise<Stripe.customers.ICustomer> {
        let {
            data: [customer]
        } = await this._stripe.customers.list({ email });

        // console.log("customer: ", customer);

        if (!customer) {
            customer = await this._stripe.customers.create({
                email,
                plan: this._availablePlans.get(Plan.Free)!.id
            });
        }

        return customer;
    }

    async _process(req: Request, res: Response, ctx: Context): Promise<void> {
        if (!ctx.account) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const method = req.method;
        const params = req.params || [];

        switch (method) {
            case "getBillingInfo":
                res.result = (await this.getBillingInfo(ctx.account)).toRaw();
                break;

            case "updateBillingInfo":
                res.result = (await this.updateBillingInfo(
                    ctx.account,
                    new UpdateBillingInfoParams(params[0])
                )).toRaw();
                break;

            case "getPrice":
                res.result = await this.getPrice(ctx.account, new UpdateBillingInfoParams(params[0]));
                break;

            default:
                throw new Err(ErrorCode.INVALID_REQUEST);
        }
    }
}
