import { Account, AccountID } from "@padloc/core/src/account";
import { OrgType, OrgID } from "@padloc/core/lib/org";
import { Serializable } from "@padloc/core/lib/encoding";

export enum Plan {
    Free,
    Pro,
    Family,
    Team,
    Business
}

const planNames = {
    [Plan.Free]: "Free",
    [Plan.Pro]: "Pro",
    [Plan.Family]: "Family",
    [Plan.Team]: "Teams",
    [Plan.Business]: "Business"
};

export class PlanInfo extends Serializable {
    id = "";
    plan: Plan = Plan.Free;
    description = "";
    storage: number = 0;
    groups: number = 0;
    vaults: number = 0;
    min: number = 0;
    max: number = 0;
    available = false;
    cost: number = 0;
    features: string[] = [];

    get name() {
        return planNames[this.plan];
    }

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.description === "string" &&
            this.plan in Plan &&
            typeof this.min === "number" &&
            typeof this.max === "number" &&
            typeof this.cost === "number" &&
            typeof this.storage === "number" &&
            typeof this.groups === "number" &&
            typeof this.vaults === "number" &&
            typeof this.available === "boolean" &&
            Array.isArray(this.features) &&
            this.features.every(f => typeof f === "string")
        );
    }
}

export class PaymentMethod extends Serializable {
    id = "";
    name = "";

    validate() {
        return typeof this.id === "string" && typeof this.name === "string";
    }

    fromRaw({ id, name }: any) {
        return super.fromRaw({ id, name });
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

export class BillingInfo extends Serializable {
    customerId: string = "";
    subscription: Subscription | null = null;
    availablePlans: PlanInfo[] = [];
    paymentMethod: PaymentMethod | null = null;

    fromRaw({ customerId, subscription, availablePlans, paymentMethod }: any) {
        return super.fromRaw({
            subscription: (subscription && new Subscription().fromRaw(subscription)) || null,
            availablePlans: availablePlans.map((p: any) => new PlanInfo().fromRaw(p)),
            customerId,
            paymentMethod: paymentMethod ? new PaymentMethod().fromRaw(paymentMethod) : null
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
    paymentMethod?: string;

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
            (!this.source || typeof this.source === "string") &&
            (!this.paymentMethod || typeof this.paymentMethod === "string")
        );
    }
}

export interface BillingAPI {
    getBillingInfo(account: Account): Promise<BillingInfo>;
    updateBillingInfo(account: Account, params: UpdateBillingInfoParams): Promise<BillingInfo>;
}
