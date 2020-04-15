import { AccountID } from "./account";
import { OrgID } from "./org";
import { Serializable } from "./encoding";

export enum PlanType {
    Free,
    Premium,
    Family,
    Team,
    Business
}

export class Plan extends Serializable {
    id = "";
    type: PlanType = PlanType.Free;
    name = "Free";
    description = "";
    items: number = -1;
    storage: number = 0;
    groups: number = 0;
    vaults: number = 0;
    min: number = 0;
    max: number = 0;
    available = false;
    cost: number = 0;
    features: string[] = [];
    default = false;
    color = "";

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.name === "string" &&
            typeof this.description === "string" &&
            typeof this.color === "string" &&
            typeof this.min === "number" &&
            typeof this.max === "number" &&
            typeof this.cost === "number" &&
            typeof this.items === "number" &&
            typeof this.storage === "number" &&
            typeof this.groups === "number" &&
            typeof this.vaults === "number" &&
            typeof this.available === "boolean" &&
            Array.isArray(this.features) &&
            this.features.every(f => typeof f === "string") &&
            (this.type === -1 || this.type in PlanType) &&
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
}

export enum SubscriptionStatus {
    Trialing = "trialing",
    Active = "active",
    Inactive = "inactive",
    Canceled = "canceled"
}

export class Subscription extends Serializable {
    id = "";
    account: AccountID = "";
    org: OrgID = "";
    plan: Plan = new Plan();
    status: SubscriptionStatus = SubscriptionStatus.Active;
    items: number = -1;
    storage: number = 0;
    groups: number = 0;
    vaults: number = 0;
    members: number = 0;
    periodEnd: Date = new Date(0);
    trialEnd?: Date;

    paymentError?: string;
    paymentRequiresAuth?: string;
    currentInvoice: string = "";

    protected _fromRaw({ plan, trialEnd, periodEnd, ...rest }: any) {
        this.plan.fromRaw(plan);
        return super._fromRaw({
            trialEnd: trialEnd && new Date(trialEnd),
            ...rest
        });
    }

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.status === "string" &&
            typeof this.account === "string" &&
            typeof this.org === "string" &&
            typeof this.items === "number" &&
            typeof this.members === "number" &&
            typeof this.storage === "number" &&
            typeof this.groups === "number" &&
            typeof this.vaults === "number"
        );
    }
}

export class BillingAddress extends Serializable {
    name = "";
    street = "";
    postalCode = "";
    city = "";
    country = "";

    constructor(params?: Partial<BillingAddress>) {
        super();
        if (params) {
            Object.assign(this, params);
        }
    }

    validate() {
        return (
            typeof this.name === "string" &&
            typeof this.street === "string" &&
            typeof this.postalCode === "string" &&
            typeof this.city === "string" &&
            typeof this.country === "string"
        );
    }
}

export class Discount extends Serializable {
    name = "";
    coupon = "";
}

export class BillingInfo extends Serializable {
    customerId: string = "";
    account: AccountID = "";
    org: OrgID = "";
    email: string = "";
    subscription: Subscription | null = null;
    paymentMethod: PaymentMethod | null = null;
    address: BillingAddress = new BillingAddress();
    discount: Discount | null = null;

    protected _fromRaw({ subscription, paymentMethod, address, discount, ...rest }: any) {
        return super._fromRaw({
            subscription: (subscription && new Subscription().fromRaw(subscription)) || null,
            address: (address && new BillingAddress().fromRaw(address)) || new BillingAddress(),
            paymentMethod: paymentMethod ? new PaymentMethod().fromRaw(paymentMethod) : null,
            discount: discount ? new Discount().fromRaw(discount) : null,
            ...rest
        });
    }
}

export class UpdateBillingParams extends Serializable {
    provider: string = "";
    account?: AccountID;
    org?: OrgID;
    email?: string;
    plan?: string;
    planType?: PlanType;
    members?: number;
    paymentMethod?: { name: string } & any;
    address?: BillingAddress;
    coupon?: string;
    cancel?: boolean;

    constructor(params?: Partial<UpdateBillingParams>) {
        super();
        if (params) {
            Object.assign(this, params);
        }
    }

    protected _fromRaw({ address, ...rest }: any) {
        return super._fromRaw({
            address: address && new BillingAddress().fromRaw(address),
            ...rest
        });
    }

    validate() {
        return (
            (!this.email || typeof this.email === "string") &&
            (!this.account || typeof this.account === "string") &&
            (!this.org || typeof this.org === "string") &&
            (!this.email || typeof this.email === "string") &&
            (!this.members || typeof this.members === "number") &&
            (!this.plan || typeof this.plan === "string") &&
            (!this.cancel || typeof this.cancel === "boolean") &&
            (!this.coupon || typeof this.coupon === "string")
        );
    }
}

export class BillingProviderInfo extends Serializable {
    type: string = "";
    plans: Plan[] = [];
    config: {
        [param: string]: string;
    } = {};

    fromRaw({ plans, ...rest }: any) {
        return super.fromRaw({
            plans: plans.map((plan: any) => new Plan().fromRaw(plan)),
            ...rest
        });
    }
}

export interface BillingProvider {
    update(params: UpdateBillingParams): Promise<void>;
    delete(billingInfo: BillingInfo): Promise<void>;
    getInfo(): BillingProviderInfo;
}
//
// const stubPlans: Plan[] = [
//     {
//         id: "personal",
//         name: "Personal",
//         description: "Basic Setup For Personal Use",
//         storage: -1,
//         available: true,
//         default: true
//     },
//     {
//         id: "shared",
//         name: "Shared",
//         description: "Basic Setup For Sharing",
//         storage: -1,
//         vaults: -1,
//         available: true,
//         orgType: 1
//     },
//     {
//         id: "advanced",
//         name: "Advanced",
//         description: "Advanced Setup For Sharing",
//         storage: -1,
//         groups: -1,
//         vaults: -1,
//         available: true,
//         orgType: 2
//     }
// ].map(p => {
//     const plan = new Plan();
//     Object.assign(plan, p);
//     return plan;
// });
