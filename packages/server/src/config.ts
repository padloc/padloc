import { Config, ConfigParam } from "@padloc/core/src/config";
import { ServerConfig } from "@padloc/core/src/server";
import { FSAttachmentStorageConfig } from "./attachments/fs";
import { S3AttachmentStorageConfig } from "./attachments/s3";
import { SMTPConfig } from "./email/smtp";
import { WebAuthnConfig } from "./auth/webauthn";
import { LevelDBStorageConfig } from "./storage/leveldb";
import { MongoDBStorageConfig } from "./storage/mongodb";
import { AuthType } from "@padloc/core/src/auth";
import { OauthConfig } from "./auth/oauth";
import { TotpAuthConfig } from "@padloc/core/src/auth/totp";
import { StripeProvisionerConfig } from "./provisioning/stripe";
import { DirectoryProvisionerConfig } from "./provisioning/directory";
import { MixpanelConfig } from "./logging/mixpanel";
import { HTTPReceiverConfig } from "./transport/http";
import { PostgresConfig } from "./storage/postgres";
import dotenv from "dotenv";
import { resolve } from "path";
import { ScimServerConfig } from "./scim";
import { BasicProvisionerConfig } from "@padloc/core/src/provisioning";
import { ChangeLoggerConfig, RequestLoggerConfig } from "@padloc/core/src/logging";

export class TransportConfig extends Config {
    @ConfigParam()
    backend: "http" = "http";

    @ConfigParam(HTTPReceiverConfig)
    http: HTTPReceiverConfig = new HTTPReceiverConfig();
}

export class EmailConfig extends Config {
    constructor(init: Partial<EmailConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam()
    backend: "smtp" | "console" = "console";

    @ConfigParam(SMTPConfig)
    smtp?: SMTPConfig;
}

export class DataStorageConfig extends Config {
    constructor(init: Partial<DataStorageConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam()
    backend: "void" | "memory" | "leveldb" | "mongodb" | "postgres" = "leveldb";

    @ConfigParam(LevelDBStorageConfig)
    leveldb?: LevelDBStorageConfig;

    @ConfigParam(MongoDBStorageConfig)
    mongodb?: MongoDBStorageConfig;

    @ConfigParam(PostgresConfig)
    postgres?: PostgresConfig;
}

export class AttachmentStorageConfig extends Config {
    constructor(init: Partial<AttachmentStorageConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam()
    backend: "memory" | "fs" | "s3" = "fs";

    @ConfigParam(FSAttachmentStorageConfig)
    fs?: FSAttachmentStorageConfig;

    @ConfigParam(S3AttachmentStorageConfig)
    s3?: S3AttachmentStorageConfig;
}

export class LoggingConfig extends Config {
    constructor(init: Partial<LoggingConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam()
    backend: "void" | "mongodb" | "postgres" | "leveldb" | "mixpanel" = "void";

    @ConfigParam()
    secondaryBackend?: "mongodb" | "mixpanel";

    @ConfigParam(MongoDBStorageConfig)
    mongodb?: MongoDBStorageConfig;

    @ConfigParam(PostgresConfig)
    postgres?: PostgresConfig;

    @ConfigParam(LevelDBStorageConfig)
    leveldb?: LevelDBStorageConfig;

    @ConfigParam(MixpanelConfig)
    mixpanel?: MixpanelConfig;
}

export class AuthConfig extends Config {
    @ConfigParam("string[]")
    types: AuthType[] = [AuthType.Email, AuthType.Totp];

    @ConfigParam(EmailConfig)
    email?: EmailConfig;

    @ConfigParam(WebAuthnConfig)
    webauthn?: WebAuthnConfig;

    @ConfigParam(TotpAuthConfig)
    totp?: TotpAuthConfig;

    @ConfigParam(OauthConfig)
    oauth?: OauthConfig;
}

export class ProvisioningConfig extends Config {
    @ConfigParam()
    backend: "basic" | "directory" | "stripe" = "basic";

    @ConfigParam(BasicProvisionerConfig)
    basic?: BasicProvisionerConfig;

    @ConfigParam(StripeProvisionerConfig)
    stripe?: StripeProvisionerConfig;

    @ConfigParam(DirectoryProvisionerConfig)
    directory?: DirectoryProvisionerConfig;
}

export class DirectoryConfig extends Config {
    @ConfigParam("string[]")
    providers: "scim"[] = ["scim"];

    @ConfigParam(ScimServerConfig)
    scim?: ScimServerConfig;
}

export class ChangeLogConfig extends ChangeLoggerConfig {
    @ConfigParam(DataStorageConfig)
    storage?: DataStorageConfig;
}

export class RequestLogConfig extends RequestLoggerConfig {
    @ConfigParam(DataStorageConfig)
    storage?: DataStorageConfig;
}

export class PadlocConfig extends Config {
    constructor(init: Partial<PadlocConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam(ServerConfig)
    server = new ServerConfig();

    @ConfigParam(TransportConfig)
    transport = new TransportConfig();

    @ConfigParam(EmailConfig)
    email = new EmailConfig();

    @ConfigParam(DataStorageConfig)
    data = new DataStorageConfig();

    @ConfigParam(AttachmentStorageConfig)
    attachments = new AttachmentStorageConfig();

    @ConfigParam(LoggingConfig)
    logging = new LoggingConfig();

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

export function getConfig() {
    const envFile = process.argv.find((arg) => arg.startsWith("--env="))?.slice(6);
    const path = envFile && resolve(process.cwd(), envFile);
    const override = process.argv.includes("--env-override");
    dotenv.config({ override, path });
    return new PadlocConfig().fromEnv(process.env as { [v: string]: string }, "PL_");
}
