import { Config, ConfigParam } from "../../config";

export class TotpAuthConfig extends Config {
    @ConfigParam("number")
    interval = 30;

    @ConfigParam("number")
    digits = 6;

    @ConfigParam()
    hash: "SHA-1" | "SHA-256" = "SHA-1";

    @ConfigParam("number")
    window = 1;
}
