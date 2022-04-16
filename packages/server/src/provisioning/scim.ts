import { BasicProvisioner, ProvisioningStatus } from "@padloc/core/src/provisioning";
import { Storage } from "@padloc/core/src/storage";
import { Config } from "@padloc/core/src/config";
import { Org, OrgMember, OrgMemberStatus } from "@padloc/core/src/org";
import { uuid } from "@padloc/core/src/util";
import { ScimGroup, ScimHandler, ScimUser } from "@padloc/core/src/scim";

export class ScimProvisionerConfig extends Config {}

export class ScimProvisioner extends BasicProvisioner implements ScimHandler {
    constructor(public readonly config: ScimProvisionerConfig, public readonly storage: Storage) {
        super(storage);
    }

    async userCreated(user: ScimUser, orgId?: string) {
        const accountProv = await this._getOrCreateAccountProvisioning(user);
        accountProv.status = user.active ? ProvisioningStatus.Active : ProvisioningStatus.Suspended;

        const org = (orgId && (await this.storage.get(Org, orgId))) || null;
        if (org?.scim?.syncMembers) {
            org.members.push(
                new OrgMember({
                    email: user.email,
                    status: OrgMemberStatus.Provisioned,
                    updated: new Date(),
                })
            );
            org.revision = await uuid();
            org.updated = new Date();
        }
    }

    userUpdated(_user: ScimUser, _orgId?: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    userDeleted(_user: ScimUser, _orgId?: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    groupCreated(_group: ScimGroup, _orgId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    groupUpdated(_group: ScimGroup, _orgId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    groupDeleted(_group: ScimGroup, _orgId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
