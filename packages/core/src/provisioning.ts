import { Account, AccountID } from "./account";
import { AsSerializable, Serializable } from "./encoding";
import { ErrorCode } from "./error";
import { OrgID } from "./org";
import { Storable, Storage } from "./storage";
import { getIdFromEmail } from "./util";

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

export class AccountProvisioning extends Storable {
    constructor(vals: Partial<AccountProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    id: string = "";

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

    owner: AccountID = "";

    status: ProvisioningStatus = ProvisioningStatus.Active;

    statusLabel: string = "";

    statusMessage: string = "";

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

export interface Provisioner {
    getProvisioning(params: { email: string; accountId?: AccountID }): Promise<Provisioning>;
    accountDeleted(params: { email: string; accountId?: AccountID }): Promise<void>;
    orgDeleted(params: { id: OrgID }): Promise<void>;
}

export class StubProvisioner implements Provisioner {
    async getProvisioning(_params: { email: string; accountId?: string }) {
        return new Provisioning();
    }

    async accountDeleted(_params: { email: string; accountId?: string }) {}
    async orgDeleted(_params: { id: OrgID }) {}
}

export class BasicProvisioner implements Provisioner {
    constructor(public readonly storage: Storage) {}

    async getProvisioning({
        email,
        accountId,
    }: {
        email: string;
        accountId?: string | undefined;
    }): Promise<Provisioning> {
        const id = await getIdFromEmail(email);
        const provisioning = new Provisioning();

        provisioning.account = await this.storage
            .get(AccountProvisioning, id)
            .catch(() => new AccountProvisioning({ id, email, accountId }));

        if (!provisioning.account.accountId && accountId) {
            provisioning.account.accountId = accountId;
            await this.storage.save(provisioning.account);
        }

        const account =
            provisioning.account.accountId && (await this.storage.get(Account, provisioning.account.accountId));

        const orgIds = account
            ? [...new Set([...provisioning.account.orgs, ...account.orgs.map((org) => org.id)])]
            : provisioning.account.orgs;

        provisioning.orgs = await Promise.all(
            orgIds.map((id) => this.storage.get(OrgProvisioning, id).catch(() => new OrgProvisioning({ orgId: id })))
        );

        return provisioning;
    }

    async accountDeleted({ email }: { email: string; accountId?: string | undefined }): Promise<void> {
        const id = await getIdFromEmail(email);
        const prov = await this.storage.get(AccountProvisioning, id);
        prov.status = ProvisioningStatus.Deleted;
        await this.storage.save(prov);
    }

    async orgDeleted({ id }: { id: OrgID }): Promise<void> {
        try {
            const orgProv = await this.storage.get(OrgProvisioning, id);
            await this.storage.delete(new OrgProvisioning({ orgId: id }));
            const accountProv = await this.storage.get(AccountProvisioning, orgProv.owner);
            accountProv.orgs = accountProv.orgs.filter((id) => id !== orgProv.id);
            await this.storage.save(accountProv);
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }
    }
}
