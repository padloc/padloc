import { AccountID } from "./account";
import { OrgID } from "./org";
import { Serializable, AsSerializable, AsDate } from "./encoding";

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
}

export class PaymentMethod extends Serializable {
    id = "";
    name = "";
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
    status: SubscriptionStatus = SubscriptionStatus.Active;
    items: number = -1;
    storage: number = 0;
    groups: number = 0;
    vaults: number = 0;
    members: number = 0;

    paymentError?: string;
    paymentRequiresAuth?: string;
    currentInvoice: string = "";

    @AsDate()
    periodEnd: Date = new Date(0);

    @AsDate()
    trialEnd?: Date;

    @AsSerializable(Plan)
    plan: Plan = new Plan();
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

    @AsSerializable(Subscription)
    subscription: Subscription | null = null;

    @AsSerializable(PaymentMethod)
    paymentMethod: PaymentMethod | null = null;

    @AsSerializable(BillingAddress)
    address: BillingAddress = new BillingAddress();

    @AsSerializable(Discount)
    discount: Discount | null = null;
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
    coupon?: string;
    cancel?: boolean;

    @AsSerializable(BillingAddress)
    address?: BillingAddress;

    constructor(params?: Partial<UpdateBillingParams>) {
        super();
        if (params) {
            Object.assign(this, params);
        }
    }
}

export class BillingProviderInfo extends Serializable {
    type: string = "";
    config: {
        [param: string]: string;
    } = {};

    @AsSerializable(Plan)
    plans: Plan[] = [];
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
