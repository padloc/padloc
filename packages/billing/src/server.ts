import * as Stripe from "stripe";
import { QuotaProvider, AccountQuota, OrgQuota } from "@padloc/core/src/quota";
import { Account } from "@padloc/core/src/account";
import { Org } from "@padloc/core/src/org";
import { Serializable } from "@padloc/core/src/encoding";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { BaseServer, ServerConfig, Context } from "@padloc/core/src/server";
import { Storage } from "@padloc/core/src/storage";
import { Messenger } from "@padloc/core/src/messenger";
import { Request, Response } from "@padloc/core/src/transport";
import { BillingAPI, Plan, PlanInfo, Subscription, UpdateBillingInfoParams } from "./api";

export interface BillingConfig {
    stripeSecret: string;
}

function parsePlan({ id, metadata: { plan, storage, groups, vaults, min, max, available } }: Stripe.plans.IPlan) {
    return new PlanInfo().fromRaw({
        id,
        plan: plan ? (parseInt(plan) as Plan) : Plan.Free,
        storage: storage ? parseInt(storage) : 0,
        min: min ? parseInt(min) : 0,
        max: max ? parseInt(max) : 0,
        groups: groups ? parseInt(groups) : 0,
        vaults: vaults ? parseInt(vaults) : 0,
        available: available === "true"
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

export class BillingInfo extends Serializable {
    customerId: string = "";
    subscription: Subscription | null = null;

    fromRaw({ customerId, subscription }: any) {
        return super.fromRaw({
            subscription: (subscription && new Subscription().fromRaw(subscription)) || null,
            customerId
        });
    }
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
        info.subscription = subscription;
        info.customerId = customer.id;
        return info;
    }

    async updateBillingInfo(account: Account, { plan, members, source }: UpdateBillingInfoParams) {
        const info = await this.getBillingInfo(account);

        if (source) {
            await this._stripe.customers.update(info.customerId, { source });
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

            if (info.subscription) {
                await this._stripe.subscriptions.update(
                    info.subscription.id,
                    params as Stripe.subscriptions.ISubscriptionUpdateOptions
                );
            } else {
                await this._stripe.subscriptions.create(params as Stripe.subscriptions.ISubscriptionCreationOptions);
            }
        }

        return this.getBillingInfo(account);
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
        console.log("process request", req, res, ctx);
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

            default:
                throw new Err(ErrorCode.INVALID_REQUEST);
        }
    }
}
