import { AsDate, AsSerializable, Serializable } from "./encoding";
import { Storable } from "./storage";

export enum ProvisioningStatus {
    Unprovisioned = "unprovisioned",
    Trialing = "trialing",
    Active = "active",
    Suspended = "suspended",
    Deleted = "deleted",
}

export enum Feature {}

export class AccountQuota extends Serializable {
    items = -1;
    storage = -1;
    orgs = -1;

    constructor(vals: Partial<AccountQuota> = {}) {
        super();
        Object.assign(this, vals);
    }
}

export class OrgQuota extends Serializable {
    members = -1;
    groups = -1;
    vaults = -1;
    storage = -1;

    constructor(vals: Partial<OrgQuota> = {}) {
        super();
        Object.assign(this, vals);
    }
}

export class AccountProvisioning extends Storable {
    constructor(vals: Partial<AccountProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    id: string = "";

    email: string = "";

    accountId?: string = undefined;

    status: ProvisioningStatus = ProvisioningStatus.Active;

    @AsDate()
    trialEnd?: Date;

    plan?: {
        name: string;
        description: string;
    };

    features: Feature[] = [];

    @AsSerializable(AccountQuota)
    quota: AccountQuota = new AccountQuota();
}

export interface Provisioner {
    getAccountProvisioning(params: { email: string; accountId?: string }): Promise<AccountProvisioning>;
}

export class StubProvisioner {
    async getAccountProvisioning({ email, accountId }: { email: string; accountId?: string }) {
        return new AccountProvisioning({ email, accountId });
    }
}
