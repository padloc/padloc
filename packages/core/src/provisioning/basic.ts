import { AccountProvisioning, OrgProvisioning, Provisioner, Provisioning } from "../provisioning";
import { BasicProvisionerConfig } from "../config/provisioning/basic";
import { Account, AccountID } from "../account";
import { ErrorCode, Err } from "../error";
import { OrgInfo, OrgID, Org } from "../org";
import { getIdFromEmail } from "../util";
import { Storage } from "../storage";

export class BasicProvisioner implements Provisioner {
    constructor(
        public readonly storage: Storage,
        public readonly config: BasicProvisionerConfig = new BasicProvisionerConfig()
    ) {}

    async init() {
        return this.storage.init();
    }

    async dispose() {
        return this.storage.dispose();
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

    async accountEmailChanged({
        prevEmail,
        newEmail,
        accountId,
    }: {
        prevEmail: string;
        newEmail: string;
        accountId?: string | undefined;
    }): Promise<void> {
        const id = await getIdFromEmail(prevEmail);

        // Delete old provisioning entry
        const prov = await this.storage.get(AccountProvisioning, id);

        await this.storage.delete(prov);

        // Update email and save new provisioning email
        prov.email = newEmail;
        prov.id = await getIdFromEmail(newEmail);
        prov.accountId = accountId;
        await this.storage.save(prov);

        // Update owner.email property on OrgProvisioning objects
        for (const orgId of prov.orgs) {
            const orgProv = await this.storage.get(OrgProvisioning, orgId);
            orgProv.owner = {
                email: newEmail,
                accountId,
            };
            await this.storage.save(orgProv);
        }
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
                    status: this.config.default?.status,
                    statusLabel: this.config.default?.statusLabel,
                    statusMessage: this.config.default?.statusMessage,
                    actionUrl: this.config.default?.actionUrl,
                    actionLabel: this.config.default?.actionLabel,
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
