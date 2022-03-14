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

export class OrgQuota extends Serializable {
    constructor(vals: Partial<OrgQuota> = {}) {
        super();
        Object.assign(this, vals);
    }

    members = 50;
    groups = 10;
    vaults = 10;
    storage = 1000;
}

export class AccountQuota extends Serializable {
    constructor(vals: Partial<AccountQuota> = {}) {
        super();
        Object.assign(this, vals);
    }

    vaults = 1;
    storage = 0;
}

export type RichContent = {
    type: "plain" | "markdown" | "html";
    content: string;
};

export class Feature extends Serializable {
    constructor(vals: Partial<Feature> = {}) {
        super();
        Object.assign(this, vals);
    }

    disabled: boolean = false;
    hidden: boolean = false;
    message?: RichContent = undefined;
    actionUrl?: string = undefined;
    actionLabel?: string = undefined;
}

export class AccountFeatures extends Serializable {
    constructor(vals: Partial<AccountFeatures> = {}) {
        super();
        Object.assign(this, vals);
    }

    @AsSerializable(Feature)
    createOrg: Feature = new Feature();

    @AsSerializable(Feature)
    quickUnlock: Feature = new Feature();

    @AsSerializable(Feature)
    manageAuthenticators: Feature = new Feature();

    @AsSerializable(Feature)
    manageSessions: Feature = new Feature();

    @AsSerializable(Feature)
    manageDevices: Feature = new Feature();

    @AsSerializable(Feature)
    attachments: Feature = new Feature();

    @AsSerializable(Feature)
    billing: Feature = new Feature();
}

export class OrgFeatures extends Serializable {
    constructor(vals: Partial<OrgFeatures> = {}) {
        super();
        Object.assign(this, vals);
    }

    @AsSerializable(Feature)
    addMember: Feature = new Feature();

    @AsSerializable(Feature)
    addGroup: Feature = new Feature();

    @AsSerializable(Feature)
    addVault: Feature = new Feature();

    @AsSerializable(Feature)
    attachments: Feature = new Feature();
}

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

    metaData?: any = undefined;

    billingPage?: RichContent = undefined;

    @AsSerializable(AccountQuota)
    quota: AccountQuota = new AccountQuota();

    @AsSerializable(AccountFeatures)
    features: AccountFeatures = new AccountFeatures();
}

export class OrgProvisioning extends Serializable {
    constructor(vals: Partial<OrgProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    orgId: OrgID = "";

    orgName: string = "";

    status: ProvisioningStatus = ProvisioningStatus.Active;

    statusLabel: string = "";

    statusMessage: string = "";

    actionUrl?: string = undefined;

    actionLabel?: string = undefined;

    autoCreate: boolean = false;

    @AsSerializable(OrgQuota)
    quota: OrgQuota = new OrgQuota();

    @AsSerializable(OrgFeatures)
    features: OrgFeatures = new OrgFeatures();
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
    getProvisioning(params: { email: string; accountId?: AccountID }): Promise<Provisioning>;
    accountDeleted(params: { email: string; accountId?: AccountID }): Promise<void>;
}

export class StubProvisioner implements Provisioner {
    async getProvisioning(_params: { email: string; accountId?: string }) {
        return new Provisioning();
    }

    async accountDeleted(_params: { email: string; accountId?: string }) {}
}
