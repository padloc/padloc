import { Config, ConfigParam } from "../../config";

export class TotpAuthConfig extends Config {
    @ConfigParam("number", { required: true, default: 30 }, "Time in seconds after which a new code will be generated.")
    interval = 30;

    @ConfigParam("number", { required: true, default: 6 }, "The number of digits that will be generated.")
    digits = 6;

    @ConfigParam(
        "string",
        { required: true, options: ["SHA-1", "SHA-256"], default: "SHA-1" },
        "The hasing algorithm to use."
    )
    hash: "SHA-1" | "SHA-256" = "SHA-1";

    @ConfigParam(
        "number",
        { required: true, default: 1 },
        "Number of codes adjacent (prior/after) to the current one that will be accepted."
    )
    window = 1;
}
