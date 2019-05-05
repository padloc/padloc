import * as Stripe from "stripe";
import { QuotaProvider, AccountQuota, OrgQuota } from "@padloc/core/src/quota";
import { Account, AccountID } from "@padloc/core/src/account";
import { Org, OrgType, OrgID } from "@padloc/core/src/org";
import { Serializable } from "@padloc/core/src/encoding";
import { Err, ErrorCode } from "@padloc/core/src/error";

export interface BillingConfig {
    stripeSecret: string;
}

export enum Plan {
    Free,
    Pro,
    Family,
    Team,
    Business
}

export class PlanInfo extends Serializable {
    id = "";
    plan: Plan = Plan.Free;
    storage: number = 0;
    groups: number = 0;
    vaults: number = 0;
    min: number = 0;
    max: number = 0;
    available = false;

    validate() {
        return (
            typeof this.id === "string" &&
            this.plan in Plan &&
            typeof this.min === "number" &&
            typeof this.max === "number" &&
            typeof this.storage === "number" &&
            typeof this.groups === "number" &&
            typeof this.vaults === "number" &&
            typeof this.available === "boolean"
        );
    }

    fromStripe({ id, metadata: { plan, storage, groups, vaults, min, max, available } }: Stripe.plans.IPlan) {
        return this.fromRaw({
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
}

export enum SubscriptionStatus {
    Incomplete = "incomplete",
    IncompleteExpired = "incomplete_expired",
    Trialing = "trialing",
    Active = "active",
    PastDue = "past_due",
    Canceled = "canceled",
    Unpaied = "unpaid"
}

export class Subscription extends Serializable {
    id = "";
    account: AccountID = "";
    org: OrgID = "";
    plan: PlanInfo = new PlanInfo();
    status: SubscriptionStatus = SubscriptionStatus.Incomplete;
    storage: number = 0;
    groups: number = 0;
    vaults: number = 0;
    members: number = 0;

    get orgType() {
        switch (this.plan.plan) {
            case Plan.Family:
                return OrgType.Basic;
            case Plan.Team:
                return OrgType.Team;
            case Plan.Business:
                return OrgType.Business;
            default:
                return null;
        }
    }

    fromRaw({ id, status, account, plan, members, storage, groups, vaults, org }: any) {
        this.plan.fromRaw(plan);
        return super.fromRaw({ id, status, account, members, storage, groups, vaults, org });
    }

    fromStripe({
        id,
        status,
        plan,
        quantity,
        metadata: { storage, groups, vaults, account, org }
    }: Stripe.subscriptions.ISubscription) {
        this.plan.fromStripe(plan!);
        return this.fromRaw({
            id,
            status,
            account: account || "",
            org: org || "",
            storage: storage ? parseInt(storage) : this.plan.storage,
            groups: groups ? parseInt(groups) : this.plan.groups,
            vaults: vaults ? parseInt(vaults) : this.plan.vaults,
            members: quantity
        });
    }

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.status === "string" &&
            typeof this.account === "string" &&
            typeof this.org === "string" &&
            typeof this.members === "number" &&
            typeof this.storage === "number" &&
            typeof this.groups === "number" &&
            typeof this.vaults === "number"
        );
    }
}

// function parseSubscription(sub?: Stripe.subscriptions.ISubscription) {
//     const subscription = new Subscription();
//
//     if (!sub) {
//         return subscription;
//     }
//
//     Object.assign(subscription, parseMetaData(sub.plan!.metadata), parseMetaData(sub.metadata));
//
//     subscription.status = sub.status as SubscriptionStatus;
//     subscription.members = sub.quantity;
//     subscription.id = sub.id;
//
//     return subscription;
// }

// function parseMetaData(raw: any = {}) {
//     const meta: {
//         members?: number;
//         groups?: number;
//         vaults?: number;
//         storage?: number;
//         plan?: Plan;
//         org?: string;
//         account?: string;
//         available?: boolean;
//     } = {
//         account: raw.account,
//         org: raw.org
//     };
//
//     raw.members && (meta.members = parseInt(raw.members));
//     raw.groups && (meta.groups = parseInt(raw.groups));
//     raw.vaults && (meta.vaults = parseInt(raw.vaults));
//     raw.storage && (meta.storage = parseInt(raw.storage));
//     raw.plan && (meta.plan = parseInt(raw.plan) as Plan);
//     raw.available && (meta.available = raw.available === "true");
//
//     return meta;
// }

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

export class GetBillingInfoParams extends Serializable {
    email!: string;

    constructor(params?: Partial<GetBillingInfoParams>) {
        super();
        if (params) {
            Object.assign(this, params);
        }
    }

    validate() {
        return typeof this.email === "string";
    }
}

export class UpdateBillingInfoParams extends Serializable {
    email!: string;
    plan?: Plan;
    members?: number;
    source?: string;

    constructor(params?: Partial<UpdateBillingInfoParams>) {
        super();
        if (params) {
            Object.assign(this, params);
        }
    }

    validate() {
        return (
            typeof this.email === "string" &&
            (!this.members || typeof this.members === "number") &&
            (!this.plan || this.plan in Plan) &&
            (!this.source || typeof this.source === "string")
        );
    }
}

export class BillingProvider implements QuotaProvider {
    private _stripe: Stripe;
    private _availablePlans = new Map<Plan, PlanInfo>();

    constructor(public config: BillingConfig) {
        this._stripe = new Stripe(config.stripeSecret);
    }

    async init() {
        const plans = await this._stripe.plans.list();

        for (const p of plans.data) {
            const plan = new PlanInfo().fromStripe(p);
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

    async getBillingInfo(params: GetBillingInfoParams) {
        const customer = await this._getOrCreateCustomer(params);
        const subscription = customer.subscriptions.data[0]
            ? new Subscription().fromStripe(customer.subscriptions.data[0])
            : null;
        const info = new BillingInfo();
        info.subscription = subscription;
        info.customerId = customer.id;
        return info;
    }

    async updateBillingInfo({ email, plan, members, source }: UpdateBillingInfoParams) {
        const info = await this.getBillingInfo(new GetBillingInfoParams({ email }));

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
}
