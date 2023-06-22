import { AuthType } from "../auth";
import { Config, ConfigParam } from "../config";

/** Server configuration */
export class ServerConfig extends Config {
    /** URL where the client interface is hosted. Used for creating links into the application */
    @ConfigParam()
    clientUrl = "http://localhost:8080";

    /** Email address to report critical errors to */
    @ConfigParam()
    reportErrors = "";

    /** Maximum accepted request age */
    @ConfigParam("number")
    maxRequestAge = 60 * 60 * 1000;

    /** Whether or not to require email verification before creating an account */
    @ConfigParam("boolean")
    verifyEmailOnSignup = true;

    @ConfigParam("string[]", { options: Object.values(AuthType) })
    defaultAuthTypes: AuthType[] = [AuthType.Email];

    /** URL where the SCIM directory server is hosted, if used. Used for creating URLs for integrations */
    @ConfigParam()
    scimServerUrl = "http://localhost:5000";

    @ConfigParam("string[]")
    admins: string[] = [];

    constructor(init: Partial<ServerConfig> = {}) {
        super();
        Object.assign(this, init);
    }
}
