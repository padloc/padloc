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

    fromRaw({ id, name }: any) {
        return super.fromRaw({ id, name });
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

    fromRaw({
        id,
        status,
        account,
        plan,
        members,
        items,
        storage,
        groups,
        vaults,
        org,
        trialEnd,
        periodEnd,
        paymentError,
        paymentRequiresAuth,
        currentInvoice
    }: any) {
        this.plan.fromRaw(plan);
        return super.fromRaw({
            id,
            status,
            account,
            members,
            storage,
            groups,
            vaults,
            items,
            org,
            trialEnd: trialEnd && new Date(trialEnd),
            periodEnd: new Date(periodEnd),
            paymentError,
            paymentRequiresAuth,
            currentInvoice
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

    validate() {
        return typeof this.name === "string" && typeof this.coupon === "string";
    }
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

    fromRaw({ customerId, account, org, email, subscription, paymentMethod, address, discount }: any) {
        return super.fromRaw({
            subscription: (subscription && new Subscription().fromRaw(subscription)) || null,
            customerId,
            account,
            org,
            email,
            address: (address && new BillingAddress().fromRaw(address)) || new BillingAddress(),
            paymentMethod: paymentMethod ? new PaymentMethod().fromRaw(paymentMethod) : null,
            discount: discount ? new Discount().fromRaw(discount) : null
        });
    }
}

export class UpdateBillingParams extends Serializable {
    account?: AccountID;
    org?: OrgID;
    email?: string;
    plan?: string;
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

    fromRaw({ account, email, org, plan, members, paymentMethod, coupon, address, cancel }: any) {
        return super.fromRaw({
            email,
            account,
            org,
            plan,
            members,
            paymentMethod,
            coupon,
            address: address && new BillingAddress().fromRaw(address),
            cancel
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

export interface BillingProvider {
    update(params: UpdateBillingParams): Promise<void>;
    delete(billingInfo: BillingInfo): Promise<void>;
    getPlans(): Promise<Plan[]>;
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
