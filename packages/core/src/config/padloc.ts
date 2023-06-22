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
import { BasicProvisionerConfig } from "../provisioning";
import { ChangeLoggerConfig, RequestLoggerConfig } from "../logging";
import { OauthProvisionerConfig } from "./provisioning/oauth";

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

    @ConfigParam(EmailConfig, { required: { prop: "types", value: "email" } })
    email?: EmailConfig;

    @ConfigParam(WebAuthnConfig, { required: { prop: "types", value: ["webauthn_portable", "webauthn_platform"] } })
    webauthn?: WebAuthnConfig;

    @ConfigParam(TotpAuthConfig, { required: { prop: "types", value: "totp" } })
    totp?: TotpAuthConfig;

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

export class PadlocConfig extends Config {
    constructor(init: Partial<PadlocConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam(ServerConfig, { required: true })
    server = new ServerConfig();

    @ConfigParam(TransportConfig, { required: true })
    transport = new TransportConfig();

    @ConfigParam(EmailConfig, { required: true })
    email = new EmailConfig();

    @ConfigParam(DataStorageConfig, { required: true })
    data = new DataStorageConfig();

    @ConfigParam(AttachmentStorageConfig, { required: true })
    attachments = new AttachmentStorageConfig();

    @ConfigParam(AuthConfig, { required: true })
    auth = new AuthConfig();

    @ConfigParam(ProvisioningConfig, { required: true })
    provisioning = new ProvisioningConfig();

    @ConfigParam(DirectoryConfig, { required: { prop: "provisioning.backend", value: "directory" } })
    directory?: DirectoryConfig;

    @ConfigParam(ChangeLogConfig)
    changeLog?: ChangeLogConfig;

    @ConfigParam(RequestLogConfig)
    requestLog?: RequestLogConfig;

    /** @deprecated */
    @ConfigParam(LoggingConfig)
    logging?: LoggingConfig;
}
