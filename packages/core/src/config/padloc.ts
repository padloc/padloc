import { Config, ConfigParam } from "../config";
import { ServerConfig } from "./server";
import { FSAttachmentStorageConfig } from "./attachments/fs";
import { S3AttachmentStorageConfig } from "./attachments/s3";
import { SMTPConfig } from "./email/smtp";
import { WebAuthnConfig } from "./auth/webauthn";
import { LevelDBStorageConfig } from "./storage/leveldb";
import { MongoDBStorageConfig } from "./storage/mongodb";
import { AuthType } from "../auth";
import { OauthConfig } from "./auth/oauth";
import { TotpAuthConfig } from "./auth/totp";
import { StripeProvisionerConfig } from "./provisioning/stripe";
import { DirectoryProvisionerConfig } from "./provisioning/directory";
import { MixpanelConfig } from "./logging/mixpanel";
import { HTTPReceiverConfig } from "./transport/http";
import { PostgresConfig } from "./storage/postgres";
import { ScimServerConfig } from "./scim";
import { OauthProvisionerConfig } from "./provisioning/oauth";
import { ChangeLoggerConfig } from "./logging/change-logger";
import { RequestLoggerConfig } from "./logging/request-logger";
import { BasicProvisionerConfig } from "./provisioning/basic";

export class TransportConfig extends Config {
    @ConfigParam("string", { options: ["http"] })
    backend: "http" = "http";

    @ConfigParam(HTTPReceiverConfig, { required: { prop: "backend", value: "http" } })
    http: HTTPReceiverConfig = new HTTPReceiverConfig();
}

export class EmailConfig extends Config {
    constructor(init: Partial<EmailConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam("string", { required: true, options: ["smtp", "console"], default: "console" })
    backend: "smtp" | "console" = "console";

    @ConfigParam(SMTPConfig, { required: { prop: "backend", value: "smtp" } })
    smtp?: SMTPConfig;
}

export class DataStorageConfig extends Config {
    constructor(init: Partial<DataStorageConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam("string", {
        required: true,
        options: ["void", "memory", "leveldb", "mongodb", "postgres"],
        default: "leveldb",
    })
    backend: "void" | "memory" | "leveldb" | "mongodb" | "postgres" = "leveldb";

    @ConfigParam(LevelDBStorageConfig, { required: { prop: "backend", value: "leveldb" } })
    leveldb?: LevelDBStorageConfig;

    @ConfigParam(MongoDBStorageConfig, { required: { prop: "backend", value: "mongodb" } })
    mongodb?: MongoDBStorageConfig;

    @ConfigParam(PostgresConfig, { required: { prop: "backend", value: "postgres" } })
    postgres?: PostgresConfig;
}

export class AttachmentStorageConfig extends Config {
    constructor(init: Partial<AttachmentStorageConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam("string", { required: true, options: ["memory", "fs", "s3"], default: "fs" })
    backend: "memory" | "fs" | "s3" = "fs";

    @ConfigParam(FSAttachmentStorageConfig, { required: { prop: "backend", value: "fs" } })
    fs?: FSAttachmentStorageConfig;

    @ConfigParam(S3AttachmentStorageConfig, { required: { prop: "backend", value: "s3" } })
    s3?: S3AttachmentStorageConfig;
}

export class LoggingConfig extends Config {
    constructor(init: Partial<LoggingConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam("string", {
        required: true,
        options: ["void", "leveldb", "mongodb", "postgres", "mixpanel"],
        default: "void",
    })
    backend: "void" | "mongodb" | "postgres" | "leveldb" | "mixpanel" = "void";

    @ConfigParam("string", { options: ["mongodb", "mixpanel"] })
    secondaryBackend?: "mongodb" | "mixpanel";

    @ConfigParam(MongoDBStorageConfig, { required: { prop: "backend", value: "mongodb" } })
    mongodb?: MongoDBStorageConfig;

    @ConfigParam(PostgresConfig, { required: { prop: "backend", value: "postgres" } })
    postgres?: PostgresConfig;

    @ConfigParam(LevelDBStorageConfig, { required: { prop: "backend", value: "leveldb" } })
    leveldb?: LevelDBStorageConfig;

    @ConfigParam(MixpanelConfig, { required: { prop: "backend", value: "mixpanel" } })
    mixpanel?: MixpanelConfig;
}

export class AuthConfig extends Config {
    @ConfigParam("string[]", {
        required: true,
        options: Object.values(AuthType),
        default: [AuthType.Email, AuthType.Totp],
    })
    types: AuthType[] = [AuthType.Email, AuthType.Totp];

    @ConfigParam(
        EmailConfig,
        {},
        "Optional config for email authenticator. If not provided, top-level email config is used."
    )
    email?: EmailConfig;

    @ConfigParam(TotpAuthConfig, {}, "Optional totp config. If not provided, default values are used.")
    totp?: TotpAuthConfig;

    @ConfigParam(WebAuthnConfig, { required: { prop: "types", value: ["webauthn_portable", "webauthn_platform"] } })
    webauthn?: WebAuthnConfig;

    @ConfigParam(OauthConfig, { required: { prop: "types", value: "oauth" } })
    oauth?: OauthConfig;
}

export class ProvisioningConfig extends Config {
    @ConfigParam("string", { required: true, options: ["basic", "directory", "stripe", "oauth"], default: "basic" })
    backend: "basic" | "directory" | "stripe" | "oauth" = "basic";

    @ConfigParam(BasicProvisionerConfig, { required: { prop: "backend", value: "basic" } })
    basic?: BasicProvisionerConfig;

    @ConfigParam(StripeProvisionerConfig, { required: { prop: "backend", value: "stripe" } })
    stripe?: StripeProvisionerConfig;

    @ConfigParam(DirectoryProvisionerConfig, { required: { prop: "backend", value: "directory" } })
    directory?: DirectoryProvisionerConfig;

    @ConfigParam(OauthProvisionerConfig, { required: { prop: "backend", value: "oauth" } })
    oauth?: OauthProvisionerConfig;
}

export class DirectoryConfig extends Config {
    @ConfigParam("string[]", { required: true, options: ["scim"], default: ["scim"] })
    providers: string[] = ["scim"];

    @ConfigParam(ScimServerConfig, { required: { prop: "providers", value: "scim" } })
    scim?: ScimServerConfig;
}

export class ChangeLogConfig extends ChangeLoggerConfig {
    @ConfigParam(DataStorageConfig, { required: true })
    storage?: DataStorageConfig;
}

export class RequestLogConfig extends RequestLoggerConfig {
    @ConfigParam(DataStorageConfig, { required: true })
    storage?: DataStorageConfig;
}

export class PWAConfig extends Config {
    @ConfigParam("string", { required: true, default: "./pwa" }, "The build output directory directory.")
    dir: string = "./pwa";

    @ConfigParam(
        "string",
        { required: true, default: "http://localhost:8080", envVars: ["PL_CLIENT_URL"] },
        "The url the app will be available on."
    )
    url: string = "http://localhost:8080";

    @ConfigParam(
        "number",
        { default: 8080 },
        "The port to serve the app over. Omit this if you want to " +
            "serve those files another way (like through nginx or caddy)."
    )
    port?: number;

    @ConfigParam("boolean", { default: false }, "Set to `true` to disable adding a CSP to the app.")
    disableCSP?: boolean = false;
}

export class AdminConfig extends PWAConfig {}

export class AssetsConfig extends Config {
    @ConfigParam("string", { required: true, default: "./assets" }, "The directory containing the assets.")
    dir: string = "./assets";
}

export class PadlocConfig extends Config {
    constructor(init: Partial<PadlocConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam(ServerConfig, { required: true }, "Basic server configuration.")
    server = new ServerConfig();

    @ConfigParam(
        TransportConfig,
        { required: true, default: new TransportConfig() },
        "Transport-related configuration. I.e. what protocol to use, which port to listen on etc."
    )
    transport = new TransportConfig();

    @ConfigParam(
        EmailConfig,
        { required: true, default: new EmailConfig() },
        "Configuration related to sending emails."
    )
    email = new EmailConfig();

    @ConfigParam(DataStorageConfig, { required: true }, "Data storage configuration.")
    data = new DataStorageConfig();

    @ConfigParam(
        AttachmentStorageConfig,
        { required: true, default: new AttachmentStorageConfig() },
        "Attachment storage configuration."
    )
    attachments = new AttachmentStorageConfig();

    @ConfigParam(AuthConfig, { required: true }, "Config related to authentication.")
    auth = new AuthConfig();

    @ConfigParam(
        ProvisioningConfig,
        { required: true, default: new ProvisioningConfig() },
        "Provisioning config. Determines who can use the service."
    )
    provisioning = new ProvisioningConfig();

    @ConfigParam(PWAConfig, { required: true }, "The configuration for the web app.")
    pwa: PWAConfig = new PWAConfig();

    @ConfigParam(AdminConfig, { required: true }, "The configuration for the admin portal.")
    admin: AdminConfig = new AdminConfig();

    @ConfigParam(
        AssetsConfig,
        { required: true },
        "Config for assets like app icon, logos, email templates, custom style sheets etc."
    )
    assets: AssetsConfig = new AssetsConfig();

    @ConfigParam(
        DirectoryConfig,
        { required: { prop: "provisioning.backend", value: "directory" } },
        "Configure directory services."
    )
    directory?: DirectoryConfig;

    @ConfigParam(
        ChangeLogConfig,
        { default: new ChangeLogConfig() },
        "Change log config. Add this if you want to enable change logs."
    )
    changeLog?: ChangeLogConfig;

    @ConfigParam(
        RequestLogConfig,
        { default: new RequestLogConfig() },
        "Request log config. Add this if you want to enable request logs."
    )
    requestLog?: RequestLogConfig;

    /** @deprecated */
    @ConfigParam(LoggingConfig, {}, "[DEPRECATED] - Old logging configuration")
    logging?: LoggingConfig;
}
