import { Config, ConfigParam } from "../config";

export class ScimServerConfig extends Config {
    @ConfigParam()
    url = "http://localhost:5000";
    @ConfigParam("number")
    port: number = 5000;
}
