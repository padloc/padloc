import { Config, ConfigParam } from "../../config";

export class ChangeLoggerConfig extends Config {
    @ConfigParam("boolean", { required: true, default: false }, "Set to true to enable change logs.")
    enabled: boolean = false;

    @ConfigParam(
        "string[]",
        { required: true, default: ["auth", "session", "srpsession", "authrequest"] },
        "A list of data kinds that should be omitted from change logs."
    )
    excludeKinds: string[] = ["auth", "session", "srpsession", "authrequest"];
}
