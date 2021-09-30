import { AccountID } from "./account";
import { AsSerializable, Serializable } from "./encoding";
import { OrgID } from "./org";

export enum ProvisioningStatus {
    Unprovisioned = "unprovisioned",
    Active = "active",
    Frozen = "frozen",
    Suspended = "suspended",
    Deleted = "deleted",
}

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

export class AccountProvisioning extends Serializable {
    constructor(vals: Partial<AccountProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    email: string = "";

    accountId?: AccountID = undefined;

    status: ProvisioningStatus = ProvisioningStatus.Active;

    statusMessage: string = "";

    @AsSerializable(AccountQuota)
    quota: AccountQuota = new AccountQuota();
}

export class OrgProvisioning extends Serializable {
    constructor(vals: Partial<OrgProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    orgId: OrgID = "";

    status: ProvisioningStatus = ProvisioningStatus.Active;

    @AsSerializable(OrgQuota)
    quota: OrgQuota = new OrgQuota();
}

export class Provisioning extends Serializable {
    constructor(vals: Partial<Provisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    @AsSerializable(AccountProvisioning)
    account!: AccountProvisioning;

    @AsSerializable(OrgProvisioning)
    orgs: OrgProvisioning[] = [];
}

export interface Provisioner {
    getAccountProvisioning(params: { email: string; accountId?: AccountID }): Promise<AccountProvisioning>;

    accountDeleted(params: { email: string; accountId?: AccountID }): Promise<void>;

    getOrgProvisioning(_params: { orgId: OrgID }): Promise<OrgProvisioning>;

    orgDeleted(params: { orgId?: OrgID }): Promise<void>;

    // getProvisioningPortalUrl(params: { email: string; accountid?: string }): Promise<string | null>;
}

export class StubProvisioner implements Provisioner {
    async getAccountProvisioning({ email, accountId }: { email: string; accountId?: string }) {
        return new AccountProvisioning({ email, accountId });
    }

    async accountDeleted(_params: { email: string; accountId?: string }) {}

    async getOrgProvisioning({ orgId }: { orgId: OrgID }) {
        return new OrgProvisioning({ orgId });
    }

    async orgDeleted(_params: { orgId: OrgID }) {}
}
