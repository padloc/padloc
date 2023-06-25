import { Config, ConfigParam } from "../config";

export class ScimServerConfig extends Config {
    @ConfigParam(
        "string",
        { required: true, default: "http://localhost:5000" },
        "The url where the SCIM server will be available."
    )
    url = "http://localhost:5000";

    @ConfigParam("number", { required: true, default: 5000 }, "The port the SCIM server will listen on.")
    port: number = 5000;
}
