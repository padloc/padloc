import { DefaultAccountProvisioning } from "../../provisioning";
import { Config, ConfigParam } from "../../config";

export class ApiProvisionerConfig extends Config {
    constructor(vals: Partial<ApiProvisionerConfig> = {}) {
        super();
        Object.assign(this, vals);
    }

    @ConfigParam(DefaultAccountProvisioning, {}, "The default provisioning status for new accounts.")
    default?: DefaultAccountProvisioning = new DefaultAccountProvisioning();

    @ConfigParam("number")
    port: number = 4000;

    @ConfigParam("string", { secret: true })
    apiKey?: string;
}
