import { BasicProvisionerConfig } from "../../provisioning";
import { ConfigParam } from "../../config";

export class ApiProvisionerConfig extends BasicProvisionerConfig {
    @ConfigParam("number")
    port: number = 4000;

    @ConfigParam("string", { secret: true })
    apiKey?: string;
}
