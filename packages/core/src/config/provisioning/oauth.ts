import { Config, ConfigParam } from "../../config";
import { DefaultAccountProvisioning } from "../../provisioning";

export class OauthProvisionerConfig extends Config {
    constructor(vals: Partial<OauthProvisionerConfig> = {}) {
        super();
        Object.assign(this, vals);
    }

    @ConfigParam(DefaultAccountProvisioning, {}, "The default provisioning status for new accounts.")
    default?: DefaultAccountProvisioning = new DefaultAccountProvisioning();

    @ConfigParam("number", { required: true, default: 24 * 60 * 60 }, "Maximum age of cached user info.")
    resyncAfter: number = 24 * 60 * 60;
}
