import { AccountID } from "./account";
import { Config, ConfigParam } from "./config";
import { AsSerializable, Serializable } from "./encoding";
import { OrgID, OrgInfo } from "./org";
import { Service, SimpleService } from "./service";
import { Session } from "./session";
import { Storable } from "./storage";

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

    members = -1;
    groups = -1;
    vaults = -1;
    storage = -1;
}

export class AccountQuota extends Serializable {
    constructor(vals: Partial<AccountQuota> = {}) {
        super();
        Object.assign(this, vals);
    }

    vaults = -1;
    storage = -1;
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

export class OrgFeature extends Feature {
    messageOwner?: RichContent = undefined;
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
    securityReport: Feature = new Feature();

    @AsSerializable(Feature)
    billing: Feature = new Feature();

    @AsSerializable(Feature)
    totpField: Feature = new Feature();

    @AsSerializable(Feature)
    notesField: Feature = new Feature();

    @AsSerializable(Feature)
    itemHistory: Feature = new Feature();

    @AsSerializable(Feature)
    changeEmail: Feature = new Feature();
}

export class OrgFeatures extends Serializable {
    constructor(vals: Partial<OrgFeatures> = {}) {
        super();
        Object.assign(this, vals);
    }

    @AsSerializable(OrgFeature)
    addMember: OrgFeature = new OrgFeature();

    @AsSerializable(OrgFeature)
    addGroup: OrgFeature = new OrgFeature();

    @AsSerializable(OrgFeature)
    addVault: OrgFeature = new OrgFeature();

    @AsSerializable(OrgFeature)
    attachments: OrgFeature = new OrgFeature();

    @AsSerializable(OrgFeature)
    securityReport: OrgFeature = new OrgFeature();

    @AsSerializable(OrgFeature)
    directorySync: OrgFeature = new OrgFeature();

    @AsSerializable(OrgFeature)
    totpField: OrgFeature = new OrgFeature();

    @AsSerializable(OrgFeature)
    notesField: OrgFeature = new OrgFeature();

    @AsSerializable(OrgFeature)
    itemHistory: OrgFeature = new OrgFeature();
}

export class AccountProvisioning extends Storable {
    constructor(vals: Partial<AccountProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    id: string = "";

    email: string = "";

    name?: string = undefined;

    accountId?: AccountID = undefined;

    status: ProvisioningStatus = ProvisioningStatus.Active;

    statusLabel: string = "";

    statusMessage: RichContent | string = "";

    actionUrl?: string = undefined;

    actionLabel?: string = undefined;

    metaData?: any = undefined;

    skipTos: boolean = false;

    billingPage?: RichContent = undefined;

    @AsSerializable(AccountQuota)
    quota: AccountQuota = new AccountQuota();

    @AsSerializable(AccountFeatures)
    features: AccountFeatures = new AccountFeatures();

    orgs: OrgID[] = [];
}

export class OrgProvisioning extends Storable {
    constructor(vals: Partial<OrgProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    get id() {
        return this.orgId;
    }

    orgId: OrgID = "";

    orgName: string = "";

    owner: {
        email: string;
        accountId?: AccountID;
    } = { email: "" };

    status: ProvisioningStatus = ProvisioningStatus.Active;

    statusLabel: string = "";

    statusMessage: string | RichContent = "";

    actionUrl?: string = undefined;

    actionLabel?: string = undefined;

    metaData?: any = undefined;

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
    account: AccountProvisioning = new AccountProvisioning();

    @AsSerializable(OrgProvisioning)
    orgs: OrgProvisioning[] = [];
}

export interface Provisioner extends Service {
    getProvisioning(params: { email: string; accountId?: AccountID }, session?: Session): Promise<Provisioning>;
    accountDeleted(params: { email: string; accountId?: AccountID }): Promise<void>;
    accountEmailChanged(params: { prevEmail: string; newEmail: string; accountId?: AccountID }): Promise<void>;
    orgDeleted(params: OrgInfo): Promise<void>;
    orgOwnerChanged(
        org: OrgInfo,
        prevOwner: { email: string; id?: AccountID },
        newOwner: { email: string; id?: AccountID }
    ): Promise<void>;
}

export class StubProvisioner extends SimpleService implements Provisioner {
    async getProvisioning(_params: { email: string; accountId?: string }) {
        return new Provisioning();
    }

    async accountDeleted(_params: { email: string; accountId?: string }) {}
    async accountEmailChanged(_params: { prevEmail: string; newEmail: string; accountId?: string }) {}
    async orgDeleted(_params: OrgInfo) {}
    async orgOwnerChanged(
        _org: { id: string },
        _prevOwner: { email: string; id: string },
        _newOwner: { email: string; id: string }
    ): Promise<void> {}
}

export class DefaultAccountProvisioning
    extends Config
    implements
        Partial<Pick<AccountProvisioning, "status" | "statusLabel" | "statusMessage" | "actionUrl" | "actionLabel">>
{
    constructor(vals: Partial<DefaultAccountProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    @ConfigParam("string", { required: true, options: Object.values(ProvisioningStatus) }, "The provisioning status.")
    status: ProvisioningStatus = ProvisioningStatus.Active;

    @ConfigParam(
        "string",
        {},
        "Optional default status label (what will be displayed in the app). If nothing is provided, a default label is used."
    )
    statusLabel?: string;

    @ConfigParam(
        "string",
        {},
        "Optional default status message (what will be displayed in the app). If nothing is provided, a default message is used."
    )
    statusMessage?: string;

    @ConfigParam(
        "string",
        {},
        "If provided (along with `actionLabel`), a button will be shown in the app that will send the user to the provided url."
    )
    actionUrl?: string;

    @ConfigParam("string", {}, "Label for the action button if `actionLabel` is set.")
    actionLabel?: string;
}
