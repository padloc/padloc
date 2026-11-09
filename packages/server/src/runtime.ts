import { ServerExtension, validateCommunityConfig } from "./extensions";
import { Server } from "@padloc/core/src/server";
import { setPlatform } from "@padloc/core/src/platform";
import { Logger, MultiLogger, VoidLogger } from "@padloc/core/src/logging";
import { Storage } from "@padloc/core/src/storage";
import { NodePlatform } from "./platform/node";
import { HTTPReceiver } from "./transport/http";
import { GeoIP } from "@padloc/core/src/geoip";
import { DbIpGeoIP, DbIpGeoIPConfig } from "./geoip/dbip";
import { MaxMindGeoIP, MaxMindGeoIPConfig } from "./geoip/maxmind";
import { LevelDBStorage, LevelDBStorageConfig } from "./storage/leveldb";
import { S3AttachmentStorage } from "./attachments/s3";
import { NodeLegacyServer } from "./legacy";
import { AuthServer, AuthType } from "@padloc/core/src/auth";
import { WebAuthnConfig, WebAuthnServer } from "./auth/webauthn";
import { SMTPSender } from "./email/smtp";
import { MongoDBStorage } from "./storage/mongodb";
import { ConsoleMessenger, PlainMessage } from "@padloc/core/src/messenger";
import { FSAttachmentStorage, FSAttachmentStorageConfig } from "./attachments/fs";
import {
    AttachmentStorageConfig,
    DataStorageConfig,
    EmailConfig,
    getConfig,
    GeoIPConfig,
    LoggingConfig,
    PadlocConfig,
} from "./config";
import { MemoryStorage, VoidStorage } from "@padloc/core/src/storage";
import { MemoryAttachmentStorage } from "@padloc/core/src/attachment";
import { BasicProvisioner, BasicProvisionerConfig } from "@padloc/core/src/provisioning";
import { TotpAuthConfig, TotpAuthServer } from "@padloc/core/src/auth/totp";
import { EmailAuthServer } from "@padloc/core/src/auth/email";
import { PublicKeyAuthServer } from "@padloc/core/src/auth/public-key";
import { resolve, join } from "path";
import { MongoDBLogger } from "./logging/mongodb";
import { MixpanelLogger } from "./logging/mixpanel";
import { PostgresStorage } from "./storage/postgres";
import { stripPropertiesRecursive, removeTrailingSlash } from "@padloc/core/src/util";
import { PostgresLogger } from "./logging/postgres";
import { LevelDBLogger } from "./logging/leveldb";

const rootDir = resolve(__dirname, "../../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
const { name } = require(join(assetsDir, "manifest.json"));

if (!process.env.PL_APP_NAME) {
    process.env.PL_APP_NAME = name;
}

export async function initDataStorage(config: DataStorageConfig) {
    switch (config.backend) {
        case "leveldb":
            if (!config.leveldb) {
                config.leveldb = new LevelDBStorageConfig();
            }
            return new LevelDBStorage(config.leveldb);
        case "mongodb":
            if (!config.mongodb) {
                throw "PL_DATA_STORAGE_BACKEND was set to 'mongodb', but no related configuration was found!";
            }
            const storage = new MongoDBStorage(config.mongodb);
            await storage.init();
            return storage;
        case "postgres":
            if (!config.postgres) {
                throw "PL_DATA_STORAGE_BACKEND was set to 'postgres', but no related configuration was found!";
            }
            return new PostgresStorage(config.postgres);
        case "memory":
            return new MemoryStorage();
        case "void":
            return new VoidStorage();
        default:
            throw `Invalid value for PL_DATA_STORAGE_BACKEND: ${config.backend}! Supported values: leveldb, mongodb`;
    }
}

async function initLogger({ backend, secondaryBackend, mongodb, postgres, leveldb, mixpanel }: LoggingConfig) {
    let primaryLogger: Logger;

    switch (backend) {
        case "mongodb":
            if (!mongodb) {
                throw "PL_LOGGING_BACKEND was set to 'mongodb', but no related configuration was found!";
            }
            const mongoStorage = new MongoDBStorage(mongodb);
            await mongoStorage.init();
            primaryLogger = new MongoDBLogger(mongoStorage);
            break;
        case "postgres":
            if (!postgres) {
                throw "PL_LOGGING_BACKEND was set to 'postgres', but no related configuration was found!";
            }
            primaryLogger = new PostgresLogger(new PostgresStorage(postgres));
            break;
        case "leveldb":
            if (!leveldb) {
                throw "PL_LOGGING_BACKEND was set to 'leveldb', but no related configuration was found!";
            }
            primaryLogger = new LevelDBLogger(new LevelDBStorage(leveldb));
            break;
        case "void":
            primaryLogger = new VoidLogger();
            break;
        default:
            throw `Invalid value for PL_LOGGING_BACKEND: ${backend}! Supported values: void, mongodb, postgres, leveldb`;
    }

    if (secondaryBackend) {
        let secondaryLogger: Logger;
        switch (secondaryBackend) {
            case "mongodb":
                if (!mongodb) {
                    throw "PL_LOGGING_SECONDARY_BACKEND was set to 'mongodb', but no related configuration was found!";
                }
                const storage = new MongoDBStorage(mongodb);
                await storage.init();
                secondaryLogger = new MongoDBLogger(storage);
                break;
            case "mixpanel":
                if (!mixpanel) {
                    throw "PL_LOGGING_SECONDARY_BACKEND was set to 'mixpanel', but no related configuration was found!";
                }
                secondaryLogger = new MixpanelLogger(mixpanel);
                break;
            default:
                throw `Invalid value for PL_LOGGING_SECONDARY_BACKEND: ${backend}! Supported values: mixpanel, mongodb`;
        }
        return new MultiLogger(primaryLogger, secondaryLogger);
    } else {
        return primaryLogger;
    }
}

async function initGeoIP(config: GeoIPConfig, dryRun: boolean): Promise<GeoIP | undefined> {
    if (!config.enabled) {
        return undefined;
    }
    const attribution = config.attributionText.trim()
        ? { text: config.attributionText.trim(), url: config.attributionUrl }
        : undefined;
    switch (config.backend) {
        case "maxmind":
            config.maxmind ??= new MaxMindGeoIPConfig();
            return dryRun
                ? new MaxMindGeoIP(config.maxmind, attribution)
                : new MaxMindGeoIP(config.maxmind, attribution).start();
        case "dbip":
            config.dbip ??= new DbIpGeoIPConfig();
            return dryRun ? new DbIpGeoIP(config.dbip, attribution) : new DbIpGeoIP(config.dbip, attribution).start();
        default:
            throw new Error(`Invalid GeoIP backend: ${config.backend}`);
    }
}

async function initEmailSender({ backend, smtp }: EmailConfig) {
    switch (backend) {
        case "smtp":
            if (!smtp) {
                throw "PL_EMAIL_BACKEND was set to 'smtp', but no related configuration was found!";
            }
            if (!smtp.templateDir) {
                smtp.templateDir = join(assetsDir, "email");
            }
            return new SMTPSender(smtp);
        case "console":
            return new ConsoleMessenger();
        default:
            throw `Invalid value for PL_EMAIL_BACKEND: ${backend}! Supported values: smtp, console`;
    }
}

async function initAttachmentStorage(config: AttachmentStorageConfig) {
    switch (config.backend) {
        case "memory":
            return new MemoryAttachmentStorage();
        case "s3":
            if (!config.s3) {
                throw "PL_ATTACHMENTS_BACKEND was set to 's3', but no related configuration was found!";
            }
            return new S3AttachmentStorage(config.s3);
        case "fs":
            if (!config.fs) {
                config.fs = new FSAttachmentStorageConfig();
            }
            return new FSAttachmentStorage(config.fs);
        default:
            throw `Invalid value for PL_ATTACHMENTS_BACKEND: ${config.backend}! Supported values: fs, s3, memory`;
    }
}

async function initAuthServers(config: PadlocConfig, additional: AuthServer[] = []) {
    const servers: AuthServer[] = [];
    for (const type of config.auth.types) {
        switch (type) {
            case AuthType.Email:
                if (!config.auth.email) {
                    config.auth.email = config.email;
                }
                servers.push(new EmailAuthServer(await initEmailSender(config.auth.email)));
                break;
            case AuthType.Totp:
                if (!config.auth.totp) {
                    config.auth.totp = new TotpAuthConfig();
                }
                servers.push(new TotpAuthServer(config.auth.totp));
                break;
            case AuthType.WebAuthnPlatform:
            case AuthType.WebAuthnPortable:
                if (servers.some((s) => s.supportsType(type))) {
                    continue;
                }
                if (!config.auth.webauthn) {
                    const clientHostName = new URL(config.server.clientUrl).hostname;
                    config.auth.webauthn = new WebAuthnConfig({
                        rpID: clientHostName,
                        rpName: clientHostName,
                        origin: removeTrailingSlash(config.server.clientUrl),
                    });
                }
                const webauthServer = new WebAuthnServer(config.auth.webauthn);
                await webauthServer.init();
                servers.push(webauthServer);
                break;
            case AuthType.PublicKey:
                servers.push(new PublicKeyAuthServer());
                break;
            default:
                const additionalServer = additional.find((server) => server.supportsType(type));
                if (additionalServer) {
                    servers.push(additionalServer);
                    break;
                }
                throw `Invalid authentication type: "${type}" - supported values: ${Object.values(AuthType)}`;
        }
    }
    return servers;
}

async function initProvisioner(config: PadlocConfig, storage: Storage) {
    switch (config.provisioning.backend) {
        case "basic":
            if (!config.provisioning.basic) {
                config.provisioning.basic = new BasicProvisionerConfig();
            }
            return new BasicProvisioner(storage, config.provisioning.basic);
        default:
            throw `Invalid value for PL_PROVISIONING_BACKEND: ${config.provisioning.backend}! Only "basic" provisioning is available in the community server. Use the enterprise server entry point for other provisioning backends.`;
    }
}

export async function init(
    config: PadlocConfig,
    extension?: ServerExtension,
    { dryRun = process.argv.includes("--dryrun") } = {}
) {
    if (!extension) {
        validateCommunityConfig(config);
    }
    setPlatform(new NodePlatform());

    const emailSender = await initEmailSender(config.email);
    const storage = await initDataStorage(config.data);
    const logger = await initLogger(config.logging);
    const attachmentStorage = await initAttachmentStorage(config.attachments);
    const services = extension ? await extension.initialize(storage, { dryRun }) : {};
    const authServers = await initAuthServers(config, services.authServers);
    const provisioner = services.provisioner || (await initProvisioner(config, storage));

    let legacyServer: NodeLegacyServer | undefined = undefined;

    if (process.env.PL_LEGACY_URL && process.env.PL_LEGACY_KEY) {
        legacyServer = new NodeLegacyServer({
            url: process.env.PL_LEGACY_URL,
            key: process.env.PL_LEGACY_KEY,
        });
    }

    const geoip = await initGeoIP(config.geoip, dryRun);

    const server = new Server(
        config.server,
        storage,
        emailSender,
        logger,
        authServers,
        attachmentStorage,
        provisioner,
        geoip,
        services.changeLogger,
        services.requestLogger,
        legacyServer,
        services.directory
    );

    await services.onServerCreated?.(server);

    // Skip starting listener if --dryrun flag is present
    if (dryRun) {
        return server;
    }

    console.log(`Starting server on port ${config.transport.http.port}`);
    new HTTPReceiver(config.transport.http).listen((req) => server.handle(req));

    // Notify admin if any uncaught exceptions cause the program to restart
    process.on("uncaughtException", async (err: Error) => {
        console.error("uncaught exception: ", err.message, err.stack, "exiting...");
        if (config.server.reportErrors) {
            try {
                await emailSender.send(
                    config.server.reportErrors,
                    new PlainMessage({
                        message: `An uncaught exception occured at ${new Date().toISOString()}:\n${err.message}\n${
                            err.stack
                        }`,
                    })
                );
            } catch (e) {}
        }
        process.exit(1);
    });
    return server;
}

export async function start(config: PadlocConfig = getConfig(), extension?: ServerExtension) {
    try {
        await init(config, extension);
        if (process.argv.includes("--dryrun")) {
            return;
        }
        console.log(
            "Server started with config: ",
            JSON.stringify(stripPropertiesRecursive(config.toRaw(), ["kind", "version"]), null, 4)
        );
    } catch (e) {
        process.exitCode = 1;
        console.error(
            "Init failed. Error: ",
            e,
            "\nConfig: ",
            JSON.stringify(stripPropertiesRecursive(config.toRaw(), ["kind", "version"]), null, 4)
        );
    }
}
