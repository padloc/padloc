import { Server } from "@padloc/core/src/server";
import { setPlatform } from "@padloc/core/src/platform";
import { Logger, MultiLogger, VoidLogger } from "@padloc/core/src/logging";
import { Storage } from "@padloc/core/src/storage";
import { NodePlatform } from "./platform/node";
import { HTTPReceiver } from "./transport/http";
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
    LoggingConfig,
    PadlocConfig,
} from "./config";
import { MemoryStorage, VoidStorage } from "@padloc/core/src/storage";
import { MemoryAttachmentStorage } from "@padloc/core/src/attachment";
import { BasicProvisioner, BasicProvisionerConfig } from "@padloc/core/src/provisioning";
import { OpenIDServer } from "./auth/openid";
import { TotpAuthConfig, TotpAuthServer } from "@padloc/core/src/auth/totp";
import { EmailAuthServer } from "@padloc/core/src/auth/email";
import { PublicKeyAuthServer } from "@padloc/core/src/auth/public-key";
import { StripeProvisioner } from "./provisioning/stripe";
import { resolve, join } from "path";
import { MongoDBLogger } from "./logging/mongodb";
import { MixpanelLogger } from "./logging/mixpanel";
import { PostgresStorage } from "./storage/postgres";
import { stripPropertiesRecursive } from "@padloc/core/src/util";
import { DirectoryProvisioner } from "./provisioning/directory";
import { ScimServer, ScimServerConfig } from "./scim";
import { DirectoryProvider, DirectorySync } from "@padloc/core/src/directory";
import { PostgresLogger } from "./logging/postgres";

const rootDir = resolve(__dirname, "../../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
const { name } = require(join(assetsDir, "manifest.json"));

if (!process.env.PL_APP_NAME) {
    process.env.PL_APP_NAME = name;
}

async function initDataStorage(config: DataStorageConfig) {
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

async function initLogger({ backend, secondaryBackend, mongodb, postgres, mixpanel }: LoggingConfig) {
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
        case "void":
            primaryLogger = new VoidLogger();
            break;
        default:
            throw `Invalid value for PL_LOGGING_BACKEND: ${backend}! Supported values: void, mongodb`;
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

async function initAuthServers(config: PadlocConfig) {
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
                        origin: config.server.clientUrl,
                    });
                }
                const webauthServer = new WebAuthnServer(config.auth.webauthn);
                await webauthServer.init();
                servers.push(webauthServer);
                break;
            case AuthType.PublicKey:
                servers.push(new PublicKeyAuthServer());
                break;
            case AuthType.OpenID:
                servers.push(new OpenIDServer(config.auth.openid!));
                break;
            default:
                throw `Invalid authentication type: "${type}" - supported values: ${Object.values(AuthType)}`;
        }
    }
    return servers;
}

async function initProvisioner(config: PadlocConfig, storage: Storage, directoryProviders?: DirectoryProvider[]) {
    switch (config.provisioning.backend) {
        case "basic":
            if (!config.provisioning.basic) {
                config.provisioning.basic = new BasicProvisionerConfig();
            }
            return new BasicProvisioner(storage, config.provisioning.basic);
        case "directory":
            const directoryProvisioner = new DirectoryProvisioner(
                storage,
                directoryProviders,
                config.provisioning.directory
            );
            return directoryProvisioner;
        case "stripe":
            if (!config.provisioning.stripe) {
                throw "PL_PROVISIONING_BACKEND was set to 'stripe', but no related configuration was found!";
            }
            const stripeProvisioner = new StripeProvisioner(config.provisioning.stripe, storage);
            await stripeProvisioner.init();
            return stripeProvisioner;
        default:
            throw `Invalid value for PL_PROVISIONING_BACKEND: ${config.provisioning.backend}! Supported values: "basic", "directory", "stripe"`;
    }
}

async function initDirectoryProviders(config: PadlocConfig, storage: Storage) {
    if (!config.directory) {
        return [];
    }
    let providers: DirectoryProvider[] = [];
    for (const provider of config.directory.providers) {
        switch (provider) {
            case "scim":
                if (!config.directory.scim) {
                    config.directory.scim = new ScimServerConfig();
                }
                const scimServer = new ScimServer(config.directory.scim, storage);
                await scimServer.init();
                providers.push(scimServer);
                break;
            default:
                throw `Invalid value for PL_DIRECTORY_PROVIDERS: ${provider}! Supported values: "scim"`;
        }
    }
    return providers;
}

async function init(config: PadlocConfig) {
    setPlatform(new NodePlatform());

    const emailSender = await initEmailSender(config.email);
    const storage = await initDataStorage(config.data);
    const logger = await initLogger(config.logging);
    const attachmentStorage = await initAttachmentStorage(config.attachments);
    const authServers = await initAuthServers(config);
    const directoryProviders = await initDirectoryProviders(config, storage);
    const provisioner = await initProvisioner(config, storage, directoryProviders);

    let legacyServer: NodeLegacyServer | undefined = undefined;

    if (process.env.PL_LEGACY_URL && process.env.PL_LEGACY_KEY) {
        legacyServer = new NodeLegacyServer({
            url: process.env.PL_LEGACY_URL,
            key: process.env.PL_LEGACY_KEY,
        });
    }

    if (config.directory.scim && !config.server.scimServerUrl) {
        config.server.scimServerUrl = config.directory.scim.url;
    }

    const server = new Server(
        config.server,
        storage,
        emailSender,
        logger,
        authServers,
        attachmentStorage,
        provisioner,
        legacyServer
    );

    new DirectorySync(server, directoryProviders);

    // Skip starting listener if --dryrun flag is present
    if (process.argv.includes("--dryrun")) {
        process.exit(0);
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
}

async function start() {
    const config = getConfig();
    try {
        await init(config);
        console.log(
            "Server started with config: ",
            JSON.stringify(stripPropertiesRecursive(config.toRaw(), ["kind", "version"]), null, 4)
        );
    } catch (e) {
        console.error(
            "Init failed. Error: ",
            e,
            "\nConfig: ",
            JSON.stringify(stripPropertiesRecursive(config.toRaw(), ["kind", "version"]), null, 4)
        );
    }
}

start();
function DirectoryProvider() {
    throw new Error("Function not implemented.");
}
