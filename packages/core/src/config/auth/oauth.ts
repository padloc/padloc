import { Config, ConfigParam } from "../../config";

export class OauthConfig extends Config {
    @ConfigParam("string", { required: true })
    clientId!: string;

    @ConfigParam("string", { secret: true, required: true })
    clientSecret: string = "";

    @ConfigParam()
    authorizationEndpoint: string = "";

    @ConfigParam()
    tokenEndpoint: string = "";

    @ConfigParam()
    userInfoEndpoint: string = "";

    @ConfigParam()
    redirectUri!: string;
}
