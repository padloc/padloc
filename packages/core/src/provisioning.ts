import { Account, AccountID } from "./account";
import { Config, ConfigParam } from "./config";
import { AsSerializable, Serializable } from "./encoding";
import { Err, ErrorCode } from "./error";
import { Org, OrgID, OrgInfo } from "./org";
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

    statusMessage: RichContent | string = "";

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

    owner: {
        email: string;
        accountId?: AccountID;
    } = { email: "" };

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
    orgDeleted(params: OrgInfo): Promise<void>;
    orgOwnerChanged(
        org: OrgInfo,
        prevOwner: { email: string; id?: AccountID },
        newOwner: { email: string; id?: AccountID }
    ): Promise<void>;
}

export class StubProvisioner implements Provisioner {
    async getProvisioning(_params: { email: string; accountId?: string }) {
        return new Provisioning();
    }

    async accountDeleted(_params: { email: string; accountId?: string }) {}
    async orgDeleted(_params: OrgInfo) {}
    async orgOwnerChanged(
        _org: { id: string },
        _prevOwner: { email: string; id: string },
        _newOwner: { email: string; id: string }
    ): Promise<void> {}
}

export class DefaultAccountProvisioning
    extends Config
    implements Pick<AccountProvisioning, "status" | "statusLabel" | "statusMessage" | "actionUrl" | "actionLabel">
{
    constructor(vals: Partial<DefaultAccountProvisioning> = {}) {
        super();
        Object.assign(this, vals);
    }

    @ConfigParam()
    status: ProvisioningStatus = ProvisioningStatus.Active;

    @ConfigParam()
    statusLabel: string = "";

    @ConfigParam()
    statusMessage: string = "";

    @ConfigParam()
    actionUrl?: string;

    @ConfigParam()
    actionLabel?: string;
}

export class BasicProvisionerConfig extends Config {
    constructor(vals: Partial<BasicProvisionerConfig> = {}) {
        super();
        Object.assign(this, vals);
    }

    @ConfigParam(DefaultAccountProvisioning)
    default: DefaultAccountProvisioning = new DefaultAccountProvisioning();
}

export class BasicProvisioner implements Provisioner {
    constructor(
        public readonly storage: Storage,
        public readonly config: BasicProvisionerConfig = new BasicProvisionerConfig()
    ) {}

    async getProvisioning({
        email,
        accountId,
    }: {
        email: string;
        accountId?: string | undefined;
    }): Promise<Provisioning> {
        const provisioning = new Provisioning();

        provisioning.account = await this._getOrCreateAccountProvisioning({ email, accountId });

        if (!provisioning.account.accountId && accountId) {
            provisioning.account.accountId = accountId;
            await this.storage.save(provisioning.account);
        }

        const account =
            (provisioning.account.accountId &&
                (await this.storage.get(Account, provisioning.account.accountId).catch(() => null))) ||
            null;

        const orgIds = account
            ? [...new Set([...provisioning.account.orgs, ...account.orgs.map((org) => org.id)])]
            : provisioning.account.orgs;

        provisioning.orgs = await Promise.all(
            orgIds.map((orgId) =>
                this._getOrCreateOrgProvisioning(orgId).then((prov) => {
                    // Delete messages meant for owner if this org is not owned by this user
                    if (prov.owner.email !== provisioning.account.email) {
                        for (const feature of Object.values(prov.features)) {
                            delete feature.messageOwner;
                        }
                    }
                    return prov;
                })
            )
        );

        return provisioning;
    }

    async accountDeleted({ email }: { email: string; accountId?: string | undefined }): Promise<void> {
        const id = await getIdFromEmail(email);
        const prov = await this.storage.get(AccountProvisioning, id);
        for (const orgId of prov.orgs) {
            await this.storage.delete(new OrgProvisioning({ orgId }));
        }
        await this.storage.delete(prov);
    }

    async orgDeleted({ id }: OrgInfo): Promise<void> {
        try {
            const orgProv = await this.storage.get(OrgProvisioning, id);
            await this.storage.delete(new OrgProvisioning({ orgId: id }));
            const accountProv = await this._getOrCreateAccountProvisioning(orgProv.owner);
            accountProv.orgs = accountProv.orgs.filter((id) => id !== orgProv.id);
            await this.storage.save(accountProv);
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }
    }

    async orgOwnerChanged(
        { id }: OrgInfo,
        prevOwner: { email: string; id?: AccountID },
        newOwner: { email: string; id?: AccountID }
    ) {
        const [orgProv, prevOwnerProv, newOwnerProv] = await Promise.all([
            this._getOrCreateOrgProvisioning(id),
            this._getOrCreateAccountProvisioning(prevOwner),
            this._getOrCreateAccountProvisioning(newOwner),
        ]);

        if (newOwnerProv.orgs.length) {
            throw new Err(
                ErrorCode.PROVISIONING_NOT_ALLOWED,
                "You cannot transfer this organization to this account because they're already owner of a different organization."
            );
        }

        orgProv.owner = newOwner;
        prevOwnerProv.orgs = prevOwnerProv.orgs.filter((o) => o !== id);
        newOwnerProv.orgs.push(id);

        await Promise.all([
            this.storage.save(orgProv),
            this.storage.save(prevOwnerProv),
            this.storage.save(newOwnerProv),
        ]);
    }

    protected _getDefaultAccountProvisioning() {
        return this.storage.get(AccountProvisioning, "[default]").catch(
            () =>
                new AccountProvisioning({
                    status: this.config.default.status,
                    statusLabel: this.config.default.statusLabel,
                    statusMessage: this.config.default.statusMessage,
                    actionUrl: this.config.default.actionUrl,
                    actionLabel: this.config.default.actionLabel,
                })
        );
    }

    protected async _getOrCreateAccountProvisioning({ email, accountId }: { email: string; accountId?: AccountID }) {
        let prov: AccountProvisioning;
        const id = await getIdFromEmail(email);

        try {
            prov = await this.storage.get(AccountProvisioning, id);
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }

            prov = await this._getDefaultAccountProvisioning();
            prov.id = id;
            prov.email = email;
            prov.accountId = accountId;
            await this.storage.save(prov);
        }

        return prov;
    }

    protected async _getOrCreateOrgProvisioning(orgId: OrgID) {
        let prov: OrgProvisioning;
        try {
            prov = await this.storage.get(OrgProvisioning, orgId);
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }

            const org = await this.storage.get(Org, orgId).catch(() => null);
            prov = new OrgProvisioning({
                orgId,
                owner: org?.owner,
                orgName: org?.name || "My Org",
            });

            await this.storage.save(prov);
        }

        return prov;
    }
}
