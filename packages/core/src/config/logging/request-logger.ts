import { Config, ConfigParam } from "../../config";

export class RequestLoggerConfig extends Config {
    @ConfigParam("boolean", { required: true, default: false }, "Set to true to enable request logs.")
    enabled = false;

    @ConfigParam(
        "string[]",
        { required: true, default: ["get*", "list*"] },
        "A lost of endpoints that should be excluded from request logs. Wildcards allowed."
    )
    excludeEndpoints: string[] = ["get*", "list*"];
}
