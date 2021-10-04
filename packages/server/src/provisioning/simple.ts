import {
    AccountProvisioning,
    OrgProvisioning,
    OrgQuota,
    Provisioner,
    Provisioning,
    ProvisioningStatus,
    VaultProvisioning,
    VaultQuota,
} from "@padloc/core/src/provisioning";
import { getIdFromEmail } from "@padloc/core/src/util";
import { Storage } from "@padloc/core/src/storage";
import { ErrorCode } from "@padloc/core/src/error";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { createServer } from "http";
import { readBody } from "../transport/http";
import { Account, AccountID } from "@padloc/core/src/account";
import { Org, OrgID } from "@padloc/core/src/org";
import { AsSerializable } from "@padloc/core/src/encoding";

export class SimpleProvisionerConfig extends Config {
    @ConfigParam("number")
    port: number = 4000;

    @ConfigParam("string", true)
    apiKey?: string;

    @ConfigParam()
    defaultStatus: ProvisioningStatus = ProvisioningStatus.Active;

    @ConfigParam()
    defaultStatusMessage: string = "";

    @ConfigParam()
    defaultActionUrl?: string;

    @ConfigParam()
    defaultActionLabel?: string;
}

interface ProvisioningRequest {
    updates: {
        email: string;

        status: ProvisioningStatus;

        statusMessage: string;

        actionUrl?: string;

        actionLabel?: string;

        scheduled?: {
            time: number;
            status: ProvisioningStatus;
            statusMessage: string;
        }[];
    }[];
}

class ProvisioningEntry extends AccountProvisioning {
    constructor(vals: Partial<ProvisioningEntry> = {}) {
        super();
        Object.assign(this, vals);
    }

    id: string = "";

    @AsSerializable(OrgQuota)
    orgQuota: OrgQuota = new OrgQuota();

    @AsSerializable(VaultQuota)
    vaultQuota: VaultQuota = new VaultQuota();
}

export class SimpleProvisioner implements Provisioner {
    constructor(public readonly config: SimpleProvisionerConfig, private readonly storage: Storage) {}

    private async _getProvisioningEntry({ email, accountId }: { email: string; accountId?: string | undefined }) {
        const id = await getIdFromEmail(email);

        try {
            return await this.storage.get(ProvisioningEntry, id);
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        const provisioning = new ProvisioningEntry({
            id,
            email,
            accountId,
            status: this.config.defaultStatus,
            statusMessage: this.config.defaultStatusMessage,
            actionUrl: this.config.defaultActionUrl,
            actionLabel: this.config.defaultActionLabel,
        });

        await this.storage.save(provisioning);

        return provisioning;
    }

    private async _getOrgProvisioning(account: Account, { id }: { id: OrgID }) {
        const org = await this.storage.get(Org, id);
        const { email, id: accountId } = org.isOwner(account) ? account : await this.storage.get(Account, org.owner);
        const { status, statusMessage, orgQuota, vaultQuota } = await this._getProvisioningEntry({
            email,
            accountId,
        });
        const vaults = org.getVaultsForMember(account);
        return {
            org: new OrgProvisioning({
                orgId: org.id,
                status,
                statusMessage,
                quota: orgQuota,
            }),
            vaults: vaults.map(
                (v) =>
                    new VaultProvisioning({
                        vaultId: v.id,
                        status,
                        statusMessage,
                        quota: vaultQuota,
                    })
            ),
        };
    }

    async getProvisioning({ email, accountId }: { email: string; accountId?: AccountID }) {
        const provisioningEntry = await this._getProvisioningEntry({ email, accountId });
        const provisioning = new Provisioning({
            account: new AccountProvisioning(provisioningEntry),
        });
        if (accountId) {
            const account = await this.storage.get(Account, accountId);
            const orgs = await Promise.all(account.orgs.map((org) => this._getOrgProvisioning(account, org)));
            provisioning.orgs = orgs.map((o) => o.org);
            provisioning.vaults = [
                new VaultProvisioning({
                    vaultId: account.mainVault.id,
                    status: provisioningEntry.status,
                    statusMessage: provisioningEntry.statusMessage,
                    quota: provisioningEntry.vaultQuota,
                }),
                ...orgs.flatMap((o) => o.vaults),
            ];
        }

        return provisioning;
    }

    async accountDeleted({ email }: { email: string; accountId?: string }): Promise<void> {
        const id = await getIdFromEmail(email);
        try {
            const provisioning = await this.storage.get(ProvisioningEntry, id);
            if (provisioning) {
                await this.storage.delete(provisioning);
            }
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }
    }

    async init() {
        return this._startServer();
    }

    private async _handleRequest({ updates }: ProvisioningRequest) {
        for (const { email, status, statusMessage, actionUrl, actionLabel } of updates) {
            const existing = (await this._getProvisioningEntry({ email })) as ProvisioningEntry;
            existing.status = status;
            existing.statusMessage = statusMessage;
            existing.actionUrl = actionUrl || this.config.defaultActionUrl;
            existing.actionLabel = actionLabel || this.config.defaultActionLabel;
            await this.storage.save(existing);
        }
    }

    private _validate(request: any): string | null {
        if (!request.updates) {
            return "Missing parameter 'updates'";
        }

        if (!Array.isArray(request.updates)) {
            return "'update' parameter should be an Array";
        }

        const validStatuses = Object.values(ProvisioningStatus);

        for (const update of request.updates) {
            if (typeof update.email !== "string") {
                return "'updates.email' parameter must be a string";
            }

            if (!validStatuses.includes(update.status)) {
                return `'updates.status' parameter must be one of ${validStatuses.map((s) => `"${s}"`).join(", ")}`;
            }

            if (typeof update.statusMessage !== "string") {
                return "'updates.statusMessage' parameter must be a string";
            }

            if (typeof update.scheduled !== "undefined" && !Array.isArray(update.scheduled)) {
                return "'updates.scheduled' parameter must be an array!";
            }

            if (typeof update.actionUrl !== "undefined" && typeof update.actionUrl !== "string") {
                return "'updates.actionUrl' parameter must be a string";
            }

            if (typeof update.actionLabel !== "undefined" && typeof update.actionLabel !== "string") {
                return "'updates.actionLabel' parameter must be a string";
            }
        }

        return null;
    }

    async _startServer() {
        const server = createServer(async (httpReq, httpRes) => {
            if (this.config.apiKey) {
                let authHeader = httpReq.headers["authorization"];
                authHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
                const apiKeyMatch = authHeader?.match(/^Bearer (.+)$/);
                if (!apiKeyMatch || apiKeyMatch[1] !== this.config.apiKey) {
                    httpRes.statusCode = 401;
                    httpRes.end();
                    return;
                }
            }

            if (httpReq.method !== "POST") {
                console.log("wrong method!");
                httpRes.statusCode = 405;
                httpRes.end();
                return;
            }

            let request: ProvisioningRequest;

            try {
                const body = await readBody(httpReq);
                request = JSON.parse(body);
            } catch (e) {
                httpRes.statusCode = 400;
                httpRes.end("Failed to read request body.");
                return;
            }

            const validationError = this._validate(request);
            if (validationError) {
                httpRes.statusCode = 400;
                httpRes.end(validationError);
                return;
            }

            try {
                await this._handleRequest(request);
            } catch (e) {
                httpRes.statusCode = 500;
                httpRes.end("Unexpected Error");
                return;
            }

            httpRes.statusCode = 200;
            httpRes.end();
        });

        server.listen(this.config.port);
    }
}
