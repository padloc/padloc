import { createServer, IncomingMessage, ServerResponse } from "http";
import { Config, ConfigParam } from "./config";
import { Account, AccountID } from "./account";
import { AsSerializable, Serializable } from "./encoding";
import { Err, ErrorCode } from "./error";
import { Org, OrgID, OrgInfo } from "./org";
import { Storable, Storage } from "./storage";
import { getIdFromEmail } from "./util";

export class BasicProvisionerConfig extends Config {
    @ConfigParam("number")
    port: number = 4000;
}

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
    billing: Feature = new Feature();
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
    orgDeleted(params: OrgInfo): Promise<void>;
    orgOwnerChanged(
        org: OrgInfo,
        prevOwner: { email: string; id: AccountID },
        newOwner: { email: string; id: AccountID }
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

interface ScimUserRequestData {
    schemas: string[];
    externalId: string;
    userName: string;
    active: boolean;
    meta: {
        resourceType: "User" | "Group";
    };
    name: {
        formatted: string;
    };
    email: string;
}

export class BasicProvisioner implements Provisioner {
    constructor(public readonly storage: Storage, public readonly config?: BasicProvisionerConfig) {}

    async init() {
        if (this.config?.port) {
            await this.startScimServer();
        }
    }

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
                    if (prov.owner !== provisioning.account.accountId) {
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
            const owner = await this.storage.get(Account, orgProv.owner);
            await this.storage.delete(new OrgProvisioning({ orgId: id }));
            const accountProv = await this.storage.get(AccountProvisioning, await getIdFromEmail(owner.email));
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
        prevOwner: { email: string; id: AccountID },
        newOwner: { email: string; id: AccountID }
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

        orgProv.owner = newOwner.id;
        prevOwnerProv.orgs = prevOwnerProv.orgs.filter((o) => o !== id);
        newOwnerProv.orgs.push(id);

        await Promise.all([
            this.storage.save(orgProv),
            this.storage.save(prevOwnerProv),
            this.storage.save(newOwnerProv),
        ]);
    }

    private async _getOrCreateAccountProvisioning({ email, accountId }: { email: string; accountId?: AccountID }) {
        let prov: AccountProvisioning;
        const id = await getIdFromEmail(email);

        try {
            prov = await this.storage.get(AccountProvisioning, id);
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }

            prov = new AccountProvisioning({ id, email, accountId });
            await this.storage.save(prov);
        }

        return prov;
    }

    private async _getOrCreateOrgProvisioning(orgId: OrgID) {
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

    getAccountIdFromScimRequest(httpReq: IncomingMessage) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        const secretToken = url.searchParams.get("token") || "";

        // TODO: find secret token in the DB
        if (secretToken === "asdrtyghj") {
            return {
                accountId: "472478c5-17e8-4ed5-8f51-05a9c5deaebb",
                orgId: "e0bb91b4-2b35-4ba7-ba60-f4ac8470e7a3",
            };
        }

        return {
            accountId: null,
            orgId: null,
        };
    }

    validateScimUser(newUser: ScimUserRequestData): string | null {
        if (!newUser.externalId) {
            return "User must contain externalId";
        }

        if (!newUser.email) {
            return "User must contain email";
        }

        if (!newUser.name.formatted) {
            return "User must contain name.formatted";
        }

        if (newUser.meta.resourceType !== "User") {
            return 'User meta.resourceType must be "User"';
        }

        return null;
    }

    async handleScimUsersPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let newUser: ScimUserRequestData;

        const { accountId, orgId } = this.getAccountIdFromScimRequest(httpReq);

        if (!accountId || !orgId) {
            httpRes.statusCode = 400;
            httpRes.end("Invalid SCIM Secret Token");
            return;
        }

        try {
            const body = await readBody(httpReq);
            newUser = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end("Failed to read request body.");
            return;
        }

        const validationError = this.validateScimUser(newUser);
        if (validationError) {
            httpRes.statusCode = 400;
            httpRes.end(validationError);
            return;
        }

        try {
            const provisioning = await this.getProvisioning({ email: newUser.email, accountId });

            const organization = provisioning.orgs.find((org) => org.id === orgId);

            if (!organization) {
                throw new Error("Organization not found");
            }

            // TODO: create user
            // const invite = new Invite(email, purpose);
            // await invite.initialize(org, this.account!);
            // await org.addOrUpdateMember(invite.invitee);
            console.log(JSON.stringify({ provisioning, organization }, null, 2));
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }

        httpRes.statusCode = 200;
        httpRes.end();
    }

    handleScimPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        switch (url.pathname) {
            // TODO: Implement this
            // case "/Groups":
            //     return this.handleScimGroupsPost(httpReq, httpRes);
            case "/Users":
                return this.handleScimUsersPost(httpReq, httpRes);
            default:
                httpRes.statusCode = 404;
                httpRes.end();
        }
    }

    async handleScimRequest(httpReq: IncomingMessage, httpRes: ServerResponse) {
        switch (httpReq.method) {
            case "POST":
                return this.handleScimPost(httpReq, httpRes);
            // TODO: Implement these
            // case "PATCH":
            //     return this.handleScimPatch(httpReq, httpRes);
            // case "DELETE":
            //     return this.handleScimDelete(httpReq, httpRes);
            default:
                httpRes.statusCode = 405;
                httpRes.end();
        }
    }

    async startScimServer() {
        // TODO: Remove this
        console.log("======== provisioning.startScimServer");
        const server = createServer((req, res) => this.handleScimRequest(req, res));
        server.listen(this.config!.port);
    }
}

// TODO: Maybe it makes sense to move this from the http server transport to core's transport as readHttpBody?
function readBody(request: IncomingMessage, maxSize = 1e7): Promise<string> {
    return new Promise((resolve, reject) => {
        const body: Buffer[] = [];
        let size = 0;

        request
            .on("data", (chunk) => {
                size += chunk.length;
                if (size > maxSize) {
                    console.error("Max request size exceeded!", size, maxSize);
                    request.destroy(new Err(ErrorCode.MAX_REQUEST_SIZE_EXCEEDED));
                }
                body.push(chunk);
            })
            .on("error", (e) => {
                reject(e);
            })
            .on("end", () => {
                resolve(Buffer.concat(body).toString());
            });
    });
}
