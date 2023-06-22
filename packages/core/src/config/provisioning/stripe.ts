import { ConfigParam } from "../../config";
import { BasicProvisionerConfig } from "../../provisioning";

export class StripeProvisionerConfig extends BasicProvisionerConfig {
    @ConfigParam("string", { secret: true })
    secretKey!: string;

    @ConfigParam()
    publicKey!: string;

    @ConfigParam()
    url: string = "";

    @ConfigParam("number")
    port: number = 4000;

    @ConfigParam("string", { secret: true })
    portalSecret!: string;

    @ConfigParam("string", { secret: true })
    webhookSecret?: string;

    @ConfigParam("number")
    urlsExpireAfter: number = 48 * 60 * 60;

    @ConfigParam("number")
    forceSyncAfter: number = 24 * 60 * 60;

    @ConfigParam("string[]")
    disableBillingOn = ["ios", "android"];
}
