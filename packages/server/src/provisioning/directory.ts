import { BasicProvisioner, ProvisioningStatus } from "@padloc/core/src/provisioning";
import { Storage } from "@padloc/core/src/storage";
import { Config } from "@padloc/core/src/config";
import { DirectoryGroup, DirectoryProvider, DirectorySubscriber, DirectoryUser } from "@padloc/core/src/directory";

export class DirectoryProvisionerConfig extends Config {}

export class DirectoryProvisioner extends BasicProvisioner implements DirectorySubscriber {
    constructor(
        public readonly config: DirectoryProvisionerConfig,
        public readonly storage: Storage,
        public readonly providers: DirectoryProvider[] = []
    ) {
        super(storage);
        for (const provider of providers) {
            provider.subscribe(this);
        }
    }

    async userCreated(user: DirectoryUser) {
        const accountProv = await this._getOrCreateAccountProvisioning(user);
        accountProv.status = user.active ? ProvisioningStatus.Active : ProvisioningStatus.Suspended;
    }

    async userUpdated(user: DirectoryUser): Promise<void> {
        const accountProv = await this._getOrCreateAccountProvisioning(user);
        accountProv.status = user.active ? ProvisioningStatus.Active : ProvisioningStatus.Suspended;
    }

    async userDeleted(user: DirectoryUser): Promise<void> {
        const accountProv = await this._getOrCreateAccountProvisioning(user);
        return super.accountDeleted(accountProv);
    }

    // TODO: Groups

    groupCreated(_group: DirectoryGroup, _orgId: string) {
        return Promise.resolve();
    }
    groupUpdated(_group: DirectoryGroup, _orgId: string) {
        return Promise.resolve();
    }
    groupDeleted(_group: DirectoryGroup, _orgId: string) {
        return Promise.resolve();
    }
}
