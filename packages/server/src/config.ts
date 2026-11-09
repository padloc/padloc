import { DbIpGeoIPConfig } from "./geoip/dbip";
import { MaxMindGeoIPConfig } from "./geoip/maxmind";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { ServerConfig } from "@padloc/core/src/server";
import { FSAttachmentStorageConfig } from "./attachments/fs";
import { S3AttachmentStorageConfig } from "./attachments/s3";
import { SMTPConfig } from "./email/smtp";
import { WebAuthnConfig } from "./auth/webauthn";
import { LevelDBStorageConfig } from "./storage/leveldb";
import { MongoDBStorageConfig } from "./storage/mongodb";
import { AuthType } from "@padloc/core/src/auth";
import { TotpAuthConfig } from "@padloc/core/src/auth/totp";
import { MixpanelConfig } from "./logging/mixpanel";
import { HTTPReceiverConfig } from "./transport/http";
import { PostgresConfig } from "./storage/postgres";
import dotenv from "dotenv";
import { resolve } from "path";
import { BasicProvisionerConfig } from "@padloc/core/src/provisioning";

export class GeoIPConfig extends Config {
    @ConfigParam("boolean")
    enabled = true;

    @ConfigParam()
    backend: "maxmind" | "dbip" = "maxmind";

    @ConfigParam()
    attributionText = "";

    @ConfigParam()
    attributionUrl = "";

    @ConfigParam(MaxMindGeoIPConfig)
    maxmind?: MaxMindGeoIPConfig;

    @ConfigParam(DbIpGeoIPConfig)
    dbip?: DbIpGeoIPConfig;
}

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
}

export class ProvisioningConfig extends Config {
    // Extensions can declare other identifiers; the community runtime accepts only "basic".
    @ConfigParam()
    backend: string = "basic";

    @ConfigParam(BasicProvisionerConfig)
    basic?: BasicProvisionerConfig;
}

export class PadlocConfig extends Config {
    constructor(init: Partial<PadlocConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam(ServerConfig)
    server = new ServerConfig();

    @ConfigParam(GeoIPConfig)
    geoip = new GeoIPConfig();

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
}

export function getConfig<T extends PadlocConfig = PadlocConfig>(config: T = new PadlocConfig() as T) {
    const envFile = process.argv.find((arg) => arg.startsWith("--env="))?.slice(6);
    const path = envFile && resolve(process.cwd(), envFile);
    const override = process.argv.includes("--env-override");
    dotenv.config({ override, path });
    return config.fromEnv(process.env as { [v: string]: string }, "PL_");
}
