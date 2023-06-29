import { AuthType } from "../auth";
import { Config, ConfigParam } from "../config";

/** Server configuration */
export class ServerConfig extends Config {
    @ConfigParam(
        "string",
        { required: true, default: "http://localhost:3000" },
        "The url the server will be reachable on."
    )
    url: string = "http://localhost:3000";

    /** Email address to report critical errors to */
    @ConfigParam("string", {}, "Email address for reporting unexpected server errors.")
    reportErrors?: string;

    /** Maximum accepted request age */
    @ConfigParam(
        "number",
        { required: true, default: 60 * 60 * 1000 },
        "Maximum accepted request age in seconds. Defaults to 1 hour."
    )
    maxRequestAge = 60 * 60 * 1000;

    /** Whether or not to require email verification before creating an account */
    @ConfigParam(
        "boolean",
        { required: true, default: true },
        "Set this to `false` if you want to skip the email verification step on signup."
    )
    verifyEmailOnSignup = true;

    @ConfigParam(
        "string[]",
        { options: [AuthType.Email, AuthType.Oauth] },
        "The default methods of authentication if no other mfa method is set up yet. " +
            "The only authentication methods that are suited for this are those " +
            "that don't require any setup from the user."
    )
    defaultAuthTypes: AuthType[] = [AuthType.Email];

    /** URL where the SCIM directory server is hosted, if used. Used for creating URLs for integrations */
    @ConfigParam(
        "string",
        { required: false },
        "URL where the SCIM directory server is hosted, if used. If not provided, the url from the ScimServerConfig is used.`"
    )
    scimServerUrl?: string = "http://localhost:5000";

    @ConfigParam(
        "string[]",
        { required: true },
        "The usernames / email addresses of all users that are considered admins, " +
            "i.e. users who are permitted to use the admin portal."
    )
    admins: string[] = [];

    constructor(init: Partial<ServerConfig> = {}) {
        super();
        Object.assign(this, init);
    }
}
