import { Config, ConfigParam } from "../../config";
import { DefaultAccountProvisioning } from "../../provisioning";

export class StripeProvisionerConfig extends Config {
    constructor(vals: Partial<StripeProvisionerConfig> = {}) {
        super();
        Object.assign(this, vals);
    }

    @ConfigParam(DefaultAccountProvisioning, {}, "The default provisioning status for new accounts.")
    default?: DefaultAccountProvisioning = new DefaultAccountProvisioning();

    @ConfigParam("string", { required: true, secret: true }, "The Stripe secret key.")
    secretKey: string = "";

    @ConfigParam("string", { required: true }, "The Stripe public key.")
    publicKey: string = "";

    @ConfigParam(
        "string",
        { required: true },
        "The base URL where webhooks, callbacks and billing portal endpoints are hosted."
    )
    url: string = "";

    @ConfigParam("number", { required: true, default: 4000 }, "The port to start the provisioning server on.")
    port: number = 4000;

    @ConfigParam(
        "string",
        { secret: true, required: true },
        "A secret string which is used to create signed billing portal URLS."
    )
    portalSecret: string = "";

    @ConfigParam("string", { secret: true, required: true }, "The secret to verify webhook requests with.")
    webhookSecret: string = "";

    @ConfigParam(
        "number",
        { required: true, default: 48 * 60 * 60 },
        "Number of seconds after which portal urls expire. Defaults to 48 hours."
    )
    urlsExpireAfter: number = 48 * 60 * 60;

    @ConfigParam(
        "number",
        { required: true, default: 24 * 60 * 60 },
        "This determines the maximum age of the cached billing info, in seconds. " +
            "Once this age is exceeded, fresh data will be requested from Stripe. " +
            "This is to make sure data does not get out of sync in case any webhook events are lost."
    )
    forceSyncAfter: number = 24 * 60 * 60;

    @ConfigParam(
        "string[]",
        { options: ["ios", "android", "windows", "macos", "linux"] },
        "Platforms where all billing features should be disabled."
    )
    disableBillingOn?: string[] = ["ios", "android"];
}
