import { DefaultAccountProvisioning } from "../../provisioning";
import { Config, ConfigParam } from "../../config";

export class DirectoryProvisionerConfig extends Config {
    constructor(vals: Partial<DirectoryProvisionerConfig> = {}) {
        super();
        Object.assign(this, vals);
    }

    @ConfigParam(DefaultAccountProvisioning, {}, "The default provisioning status for new accounts.")
    default?: DefaultAccountProvisioning = new DefaultAccountProvisioning();
}
