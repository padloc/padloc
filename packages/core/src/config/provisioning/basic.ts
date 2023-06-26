import { Config, ConfigParam } from "../../config";
import { DefaultAccountProvisioning } from "../../provisioning";

export class BasicProvisionerConfig extends Config {
    constructor(vals: Partial<BasicProvisionerConfig> = {}) {
        super();
        Object.assign(this, vals);
    }

    @ConfigParam(DefaultAccountProvisioning, {}, "The default provisioning status for new accounts.")
    default?: DefaultAccountProvisioning = new DefaultAccountProvisioning();
}
