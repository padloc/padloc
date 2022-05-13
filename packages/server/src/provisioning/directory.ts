import {
    BasicProvisioner,
    BasicProvisionerConfig,
    DefaultAccountProvisioning,
    ProvisioningStatus,
} from "@padloc/core/src/provisioning";
import { Storage } from "@padloc/core/src/storage";
import { DirectoryGroup, DirectoryProvider, DirectorySubscriber, DirectoryUser } from "@padloc/core/src/directory";

export class DirectoryProvisionerConfig extends BasicProvisionerConfig {}

export class DirectoryProvisioner extends BasicProvisioner implements DirectorySubscriber {
    constructor(
        public readonly storage: Storage,
        public readonly providers: DirectoryProvider[] = [],
        public readonly config: DirectoryProvisionerConfig = new DirectoryProvisionerConfig()
    ) {
        super(
            storage,
            new BasicProvisionerConfig({
                default: new DefaultAccountProvisioning({
                    status: ProvisioningStatus.Unprovisioned,
                    statusLabel: "Access Denied",
                    statusMessage:
                        "You currently don't have access to this service. Please contact the service administrator.",
                }),
            })
        );
        for (const provider of providers) {
            provider.subscribe(this);
        }
    }

    async userCreated(user: DirectoryUser) {
        if (user.email) {
            const accountProv = await this._getOrCreateAccountProvisioning({ email: user.email });
            accountProv.status = user.active ? ProvisioningStatus.Active : ProvisioningStatus.Suspended;
        }
    }

    async userUpdated(user: DirectoryUser) {
        if (user.email) {
            const accountProv = await this._getOrCreateAccountProvisioning({ email: user.email });
            accountProv.status = user.active ? ProvisioningStatus.Active : ProvisioningStatus.Suspended;
        }
    }

    async userDeleted(user: DirectoryUser) {
        if (user.email) {
            const accountProv = await this._getOrCreateAccountProvisioning({ email: user.email });
            return super.accountDeleted(accountProv);
        }
    }

    groupCreated(_group: DirectoryGroup, _orgId: string) {
        return Promise.resolve();
    }
    groupUpdated(_group: DirectoryGroup, _orgId: string, _previousName?: string) {
        return Promise.resolve();
    }
    groupDeleted(_group: DirectoryGroup, _orgId: string) {
        return Promise.resolve();
    }
}
