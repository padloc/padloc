import { ConfigParam } from "../../config";
import { BasicProvisionerConfig } from "../../provisioning";

export class OauthProvisionerConfig extends BasicProvisionerConfig {
    @ConfigParam("number")
    resyncAfter: number = 10;
}
