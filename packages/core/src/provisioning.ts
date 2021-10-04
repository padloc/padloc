import { AccountID } from "./account";
import { AsSerializable, Serializable } from "./encoding";
import { OrgID } from "./org";
import { VaultID } from "./vault";

export enum Feature {}

export enum ProvisioningStatus {
    Unprovisioned = "unprovisioned",
    Active = "active",
    Frozen = "frozen",
    Suspended = "suspended",
    Deleted = "deleted",
}

export class VaultQuota extends Serializable {
    constructor(vals: Partial<VaultQuota> = {}) {
        super();
        Object.assign(this, vals);
    }

    items = -1;
    storage = -1;
}

export class OrgQuota extends Serializable {
    constructor(vals: Partial<OrgQuota> = {}) {
        super();
        Object.assign(this, vals);
    }

    members = -1;
    groups = -1;
    vaults = -1;
}

export class AccountQuota extends Serializable {
    constructor(vals: Partial<AccountQuota> = {}) {
        super();
        Object.assign(this, vals);
    }

    vaults = 1;
    orgs = -1;

    features: Feature[] = [];
}

//     @AsSerializable(VaultQuota)
//     vaults = new VaultQuota();

//     @AsSerializable(OrgQuota)
//     orgs = new OrgQuota();

// }

export class AccountProvisioning extends Serializable {
    constructor(vals: Partial<AccountProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    email: string = "";

    accountId?: AccountID = undefined;

    status: ProvisioningStatus = ProvisioningStatus.Active;

    statusLabel: string = "";

    statusMessage: string = "";

    actionUrl?: string = undefined;

    actionLabel?: string = undefined;

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

    statusLabel: string = "";

    statusMessage: string = "";

    actionUrl?: string = undefined;

    actionLabel?: string = undefined;

    @AsSerializable(OrgQuota)
    quota: OrgQuota = new OrgQuota();
}

export class VaultProvisioning extends Serializable {
    constructor(vals: Partial<VaultProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    vaultId: VaultID = "";

    status: ProvisioningStatus = ProvisioningStatus.Active;

    statusLabel: string = "";

    statusMessage: string = "";

    actionUrl?: string = undefined;

    actionLabel?: string = undefined;

    @AsSerializable(VaultQuota)
    quota: VaultQuota = new VaultQuota();
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

    @AsSerializable(VaultProvisioning)
    vaults: VaultProvisioning[] = [];
}

export interface Provisioner {
    getProvisioning(params: { email: string; accountId?: AccountID }): Promise<Provisioning>;

    accountDeleted(params: { email: string; accountId?: AccountID }): Promise<void>;
}

export class StubProvisioner implements Provisioner {
    async getProvisioning(_params: { email: string; accountId?: string }) {
        return new Provisioning();
    }

    async accountDeleted(_params: { email: string; accountId?: string }) {}
}
