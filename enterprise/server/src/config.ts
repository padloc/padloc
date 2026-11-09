import { Config, ConfigParam } from "@padloc/core/src/config";
import {
    AuthConfig as CommunityAuthConfig,
    ProvisioningConfig as CommunityProvisioningConfig,
    PadlocConfig,
    DataStorageConfig,
} from "@padloc/server/src/config";
import { ServerConfig as CommunityServerConfig } from "@padloc/core/src/server";
import { OauthConfig } from "./auth/oauth";
import { DirectoryProvisionerConfig } from "./provisioning/directory";
import { OauthProvisionerConfig } from "./provisioning/oauth";
import { ApiProvisionerConfig } from "./provisioning/api";
import { StripeProvisionerConfig } from "./provisioning/stripe";
import { ScimServerConfig } from "./scim";
import { ChangeLoggerConfig, RequestLoggerConfig } from "./logging";

export class AuthConfig extends CommunityAuthConfig {
    @ConfigParam(OauthConfig)
    oauth?: OauthConfig;
}

export class ProvisioningConfig extends CommunityProvisioningConfig {
    @ConfigParam()
    backend: "basic" | "api" | "stripe" | "directory" | "oauth" = "basic";

    @ConfigParam(ApiProvisionerConfig)
    api?: ApiProvisionerConfig;

    @ConfigParam(StripeProvisionerConfig)
    stripe?: StripeProvisionerConfig;

    @ConfigParam(DirectoryProvisionerConfig)
    directory?: DirectoryProvisionerConfig;

    @ConfigParam(OauthProvisionerConfig)
    oauth?: OauthProvisionerConfig;
}

export class DirectoryConfig extends Config {
    @ConfigParam("string[]")
    providers: "scim"[] = ["scim"];

    @ConfigParam(ScimServerConfig)
    scim = new ScimServerConfig();
}

export class ChangeLogConfig extends ChangeLoggerConfig {
    @ConfigParam(DataStorageConfig)
    storage?: DataStorageConfig;
}

export class RequestLogConfig extends RequestLoggerConfig {
    @ConfigParam(DataStorageConfig)
    storage?: DataStorageConfig;
}

export class ServerConfig extends CommunityServerConfig {
    @ConfigParam()
    scimServerUrl = "http://localhost:5000";
}

export class EnterpriseConfig extends PadlocConfig {
    @ConfigParam(ServerConfig)
    server = new ServerConfig();

    @ConfigParam(AuthConfig)
    auth = new AuthConfig();

    @ConfigParam(ProvisioningConfig)
    provisioning = new ProvisioningConfig();

    @ConfigParam(DirectoryConfig)
    directory = new DirectoryConfig();

    @ConfigParam(ChangeLogConfig)
    changeLog = new ChangeLogConfig();

    @ConfigParam(RequestLogConfig)
    requestLog = new RequestLogConfig();
}
