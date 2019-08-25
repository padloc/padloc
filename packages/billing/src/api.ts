import { Account, AccountID } from "@padloc/core/src/account";
import { OrgType, OrgID } from "@padloc/core/lib/org";
import { Serializable } from "@padloc/core/lib/encoding";

export class Plan extends Serializable {
    id = "";
    name = "";
    description = "";
    storage: number = 0;
    groups: number = 0;
    vaults: number = 0;
    min: number = 0;
    max: number = 0;
    available = false;
    cost: number = 0;
    features: string[] = [];
    orgType: OrgType | -1 = -1;
    default = false;

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.name === "string" &&
            typeof this.description === "string" &&
            typeof this.min === "number" &&
            typeof this.max === "number" &&
            typeof this.cost === "number" &&
            typeof this.storage === "number" &&
            typeof this.groups === "number" &&
            typeof this.vaults === "number" &&
            typeof this.available === "boolean" &&
            Array.isArray(this.features) &&
            this.features.every(f => typeof f === "string") &&
            (this.orgType === -1 || this.orgType in OrgType) &&
            typeof this.default === "boolean"
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
    Unpaid = "unpaid"
}

export class Subscription extends Serializable {
    id = "";
    account: AccountID = "";
    org: OrgID = "";
    plan: Plan = new Plan();
    status: SubscriptionStatus = SubscriptionStatus.Incomplete;
    storage: number = 0;
    groups: number = 0;
    vaults: number = 0;
    members: number = 0;

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
    availablePlans: Plan[] = [];
    paymentMethod: PaymentMethod | null = null;

    fromRaw({ customerId, subscription, availablePlans, paymentMethod }: any) {
        return super.fromRaw({
            subscription: (subscription && new Subscription().fromRaw(subscription)) || null,
            availablePlans: availablePlans.map((p: any) => new Plan().fromRaw(p)),
            customerId,
            paymentMethod: paymentMethod ? new PaymentMethod().fromRaw(paymentMethod) : null
        });
    }
}

export class UpdateBillingInfoParams extends Serializable {
    plan?: string;
    members?: number;
    paymentMethod?: any;

    constructor(params?: Partial<UpdateBillingInfoParams>) {
        super();
        if (params) {
            Object.assign(this, params);
        }
    }

    validate() {
        return (!this.members || typeof this.members === "number") && (!this.plan || typeof this.plan === "string");
    }
}

export interface BillingProvider {
    updateBillingInfo(account: Account, params: UpdateBillingInfoParams): Promise<BillingInfo>;
}

const stubPlans = [
    {
        id: "personal",
        name: "Personal",
        description: "Basic Setup For Personal Use",
        storage: -1,
        groups: 0,
        vaults: 0,
        min: 0,
        max: 0,
        available: true,
        cost: 0,
        features: [],
        orgType: -1,
        default: true
    },
    {
        id: "shared",
        name: "Shared",
        description: "Basic Setup For Sharing",
        storage: -1,
        groups: 0,
        vaults: -1,
        min: 0,
        max: 0,
        available: true,
        cost: 0,
        features: [],
        orgType: 1,
        default: false
    },
    {
        id: "advanced",
        name: "Advanced",
        description: "Advanced Setup For Sharing",
        storage: -1,
        groups: -1,
        vaults: -1,
        min: 0,
        max: 0,
        available: true,
        cost: 0,
        features: [],
        orgType: 3,
        default: false
    }
].map(p => new Plan().fromRaw(p));

export class StubBillingProvider implements BillingProvider {
    async updateBillingInfo(account: Account, update?: UpdateBillingParams) {
        const info = account.billing || new BillingInfo();
        const subscription = new Subscription();
        const plan = update && stubPlans.find(p => p.id === update.plan);
        subscription.plan = stubPlans[0];
        info.availablePlans = stubPlans;
        return info;
    }
}
