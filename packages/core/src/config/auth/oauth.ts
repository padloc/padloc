import { Config, ConfigParam } from "../../config";

export class OauthConfig extends Config {
    @ConfigParam("string", { required: true }, "The oauth client ID")
    clientId: string = "";

    @ConfigParam("string", { secret: true, required: true }, "The oauth client secret")
    clientSecret: string = "";

    @ConfigParam(
        "string",
        { required: true },
        "Then endpoint for users to be redirected to in order to log in / authenticate."
    )
    authorizationEndpoint: string = "";

    @ConfigParam("string", { required: true }, "The endpoint where auth tokens can be retrieved.")
    tokenEndpoint: string = "";

    @ConfigParam("string", { required: true }, "The endpoint to fetch user info from.")
    userInfoEndpoint: string = "";

    @ConfigParam("string", { required: true }, "The URI to redirect to after authentating.")
    redirectUri: string = "";
}
