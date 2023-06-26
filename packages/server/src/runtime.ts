import { LegacyServer, Server, ServerRuntime } from "@padloc/core/src/server";
import { setPlatform } from "@padloc/core/src/platform";
import { ChangeLogger, Logger, MultiLogger, RequestLogger, VoidLogger } from "@padloc/core/src/logging";
import { Storage } from "@padloc/core/src/storage";
import { NodePlatform } from "./platform/node";
import { HTTPReceiver } from "./transport/http";
import { LevelDBStorage } from "./storage/leveldb";
import { S3AttachmentStorage } from "./attachments/s3";
import { NodeLegacyServer } from "./legacy";
import { AuthServer, AuthType } from "@padloc/core/src/auth";
import { WebAuthnServer } from "./auth/webauthn";
import { SMTPSender } from "./email/smtp";
import { MongoDBStorage } from "./storage/mongodb";
import { ConsoleMessenger, Messenger, PlainMessage } from "@padloc/core/src/messenger";
import { FSAttachmentStorage } from "./attachments/fs";
import {
    AttachmentStorageConfig,
    ChangeLogConfig,
    DataStorageConfig,
    EmailConfig,
    LoggingConfig,
    PadlocConfig,
    RequestLogConfig,
} from "@padloc/core/src/config/padloc";
import { MemoryStorage, VoidStorage } from "@padloc/core/src/storage";
import { AttachmentStorage, MemoryAttachmentStorage } from "@padloc/core/src/attachment";
import { Provisioner } from "@padloc/core/src/provisioning";
import { OauthServer } from "./auth/oauth";
import { TotpAuthServer } from "@padloc/core/src/auth/totp";
import { EmailAuthServer } from "@padloc/core/src/auth/email";
import { PublicKeyAuthServer } from "@padloc/core/src/auth/public-key";
import { StripeProvisioner } from "./provisioning/stripe";
import { resolve, join } from "path";
import { MongoDBLogger } from "./logging/mongodb";
import { MixpanelLogger } from "./logging/mixpanel";
import { PostgresStorage } from "./storage/postgres";
import { stripPropertiesRecursive, uuid, removeTrailingSlash } from "@padloc/core/src/util";
import { DirectoryProvisioner } from "./provisioning/directory";
import { ScimServer } from "./scim";
import { DirectoryProvider, DirectorySync } from "@padloc/core/src/directory";
import { PostgresLogger } from "./logging/postgres";
import { LevelDBLogger } from "./logging/leveldb";
import { OauthProvisioner } from "./provisioning/oauth";
import { FSAttachmentStorageConfig } from "@padloc/core/src/config/attachments/fs";
import { WebAuthnConfig } from "@padloc/core/src/config/auth/webauthn";
import { OauthProvisionerConfig } from "@padloc/core/src/config/provisioning/oauth";
import { ScimServerConfig } from "@padloc/core/src/config/scim";
import { LevelDBStorageConfig } from "@padloc/core/src/config/storage/leveldb";
import { TotpAuthConfig } from "@padloc/core/src/config/auth/totp";
import { readFileSync, writeFileSync } from "fs";
import dotenv from "dotenv";
import { Service } from "@padloc/core/src/service";
import { Receiver } from "@padloc/core/src/transport";
import { BasicProvisionerConfig } from "@padloc/core/src/config/provisioning/basic";
import { BasicProvisioner } from "@padloc/core/src/provisioning/basic";

const rootDir = resolve(__dirname, "../../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
const { name } = require(join(assetsDir, "manifest.json"));

if (!process.env.PL_APP_NAME) {
    process.env.PL_APP_NAME = name;
}

function getDataStorage(config: DataStorageConfig) {
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
            return new MongoDBStorage(config.mongodb);
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

function getLogger({ backend, secondaryBackend, mongodb, postgres, leveldb, mixpanel }: LoggingConfig) {
    let primaryLogger: Logger;

    switch (backend) {
        case "mongodb":
            if (!mongodb) {
                throw "PL_LOGGING_BACKEND was set to 'mongodb', but no related configuration was found!";
            }
            const mongoStorage = new MongoDBStorage(mongodb);
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

function getEmailSender({ backend, smtp }: EmailConfig) {
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

function getAttachmentStorage(config: AttachmentStorageConfig) {
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

function getAuthServers(config: PadlocConfig) {
    const servers: AuthServer[] = [];
    for (const type of config.auth.types) {
        switch (type) {
            case AuthType.Email:
                servers.push(
                    new EmailAuthServer(getEmailSender(config.auth.email || config.email || new EmailConfig()))
                );
                break;
            case AuthType.Totp:
                servers.push(new TotpAuthServer(config.auth.totp || new TotpAuthConfig()));
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
                servers.push(webauthServer);
                break;
            case AuthType.PublicKey:
                servers.push(new PublicKeyAuthServer());
                break;
            case AuthType.Oauth:
                servers.push(new OauthServer(config.auth.oauth!));
                break;
            default:
                throw `Invalid authentication type: "${type}" - supported values: ${Object.values(AuthType)}`;
        }
    }
    return servers;
}

function getProvisioner(config: PadlocConfig, storage: Storage, directoryProviders?: DirectoryProvider[]) {
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
            return stripeProvisioner;
        case "oauth":
            if (!config.auth.oauth) {
                throw "Using the oauth provisioner requires an oauth authenticator to be configured also.";
            }
            return new OauthProvisioner(
                storage,
                config.provisioning.oauth || new OauthProvisionerConfig(),
                config.auth.oauth
            );
        default:
            throw `Invalid value for PL_PROVISIONING_BACKEND: ${config.provisioning.backend}! Supported values: "basic", "directory", "stripe"`;
    }
}

function getDirectoryProviders(config: PadlocConfig, storage: Storage) {
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
                providers.push(scimServer);
                break;
            default:
                throw `Invalid value for PL_DIRECTORY_PROVIDERS: ${provider}! Supported values: "scim"`;
        }
    }
    return providers;
}

function getChangeLogger(config: ChangeLogConfig, defaultStorage: Storage) {
    if (!config) {
        return;
    }

    const storage = config.storage ? getDataStorage(config.storage) : defaultStorage;

    return new ChangeLogger(storage, config);
}

function getRequestLogger(config: RequestLogConfig, defaultStorage: Storage) {
    if (!config) {
        return;
    }

    const storage = config.storage ? getDataStorage(config.storage) : defaultStorage;

    return new RequestLogger(storage, config);
}

export class PadlocServices implements Service {
    storage: Storage;
    messenger: Messenger;
    authServers: AuthServer[];
    attachmentStorage: AttachmentStorage;
    provisioner: Provisioner;
    logger?: Logger;
    changeLogger?: ChangeLogger;
    requestLogger?: RequestLogger;
    legacyServer?: LegacyServer;
    directoryProviders: DirectoryProvider[];
    receiver?: Receiver;

    constructor(services: {
        storage: Storage;
        messenger: Messenger;
        authServers: AuthServer[];
        attachmentStorage: AttachmentStorage;
        provisioner: Provisioner;
        logger?: Logger;
        changeLogger?: ChangeLogger;
        requestLogger?: RequestLogger;
        legacyServer?: LegacyServer;
        directoryProviders: DirectoryProvider[];
        receiver?: Receiver;
    }) {
        this.storage = services.storage;
        this.messenger = services.messenger;
        this.authServers = services.authServers;
        this.attachmentStorage = services.attachmentStorage;
        this.logger = services.logger;
        this.provisioner = services.provisioner;
        this.changeLogger = services.changeLogger;
        this.requestLogger = services.requestLogger;
        this.legacyServer = services.legacyServer;
        this.directoryProviders = services.directoryProviders || [];
        this.receiver = services.receiver;
    }

    init() {
        return Promise.all([
            this.storage.init(),
            this.messenger.init(),
            ...this.authServers.map((s) => s.init()),
            this.attachmentStorage.init(),
            this.provisioner.init(),
            this.logger?.init(),
            this.changeLogger?.init(),
            this.requestLogger?.init(),
            this.legacyServer?.init(),
            ...this.directoryProviders.map((s) => s.init()),
            this.receiver?.init(),
        ]).then(() => {});
    }

    dispose() {
        return Promise.all([
            this.storage.dispose(),
            this.messenger.dispose(),
            ...this.authServers.map((s) => s.dispose()),
            this.attachmentStorage.dispose(),
            this.provisioner.dispose(),
            this.logger?.dispose(),
            this.changeLogger?.dispose(),
            this.requestLogger?.dispose(),
            this.legacyServer?.dispose(),
            ...this.directoryProviders.map((s) => s.dispose()),
            this.receiver?.dispose(),
        ]).then(() => {});
    }
}

export class NodeServerRuntime implements ServerRuntime {
    constructor() {
        setPlatform(new NodePlatform());
    }

    private _services?: PadlocServices;

    private async _init(config: PadlocConfig) {
        const storage = getDataStorage(config.data);
        const directoryProviders = getDirectoryProviders(config, storage);

        let legacyServer: NodeLegacyServer | undefined = undefined;

        if (process.env.PL_LEGACY_URL && process.env.PL_LEGACY_KEY) {
            legacyServer = new NodeLegacyServer({
                url: process.env.PL_LEGACY_URL,
                key: process.env.PL_LEGACY_KEY,
            });
        }

        if (config.directory?.scim && !config.server.scimServerUrl) {
            config.server.scimServerUrl = config.directory.scim.url;
        }

        const services = (this._services = new PadlocServices({
            messenger: getEmailSender(config.email),
            storage,
            logger: getLogger(config.logging || new LoggingConfig()),
            attachmentStorage: getAttachmentStorage(config.attachments),
            authServers: getAuthServers(config),
            provisioner: getProvisioner(config, storage, directoryProviders),
            directoryProviders,
            changeLogger: getChangeLogger(config.changeLog || new ChangeLogConfig(), storage),
            requestLogger: getRequestLogger(config.requestLog || new RequestLogConfig(), storage),
            legacyServer,
        }));

        const server = new Server(config, services, this);

        new DirectorySync(server.makeController({ id: await uuid() }), directoryProviders);

        // Skip starting listener if --dryrun flag is present
        if (process.argv.includes("--dryrun")) {
            process.exit(0);
        }

        console.log(`Starting server on port ${config.transport.http.port}`);
        services.receiver = new HTTPReceiver(config.transport.http, (req) => server.handle(req));

        await services.init();

        // Notify admin if any uncaught exceptions cause the program to restart
        process.on("uncaughtException", async (err: Error) => {
            console.error("uncaught exception: ", err.message, err.stack, "exiting...");
            if (config.server.reportErrors) {
                try {
                    await this._services?.messenger.send(
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

    private _getJSONConfig() {
        const pathArg = process.argv.find((arg) => arg.startsWith("--config="))?.slice(9);
        const path = resolve(process.cwd(), pathArg || "./plconfig.json");

        try {
            return JSON.parse(readFileSync(path, "utf-8"));
        } catch (e) {
            if (pathArg) {
                throw `Failed to read config file at ${path}. Error: ${e.toString()}`;
            } else {
                return {};
            }
        }
    }

    private async _updateJSONConfig(config: PadlocConfig) {
        const pathArg = process.argv.find((arg) => arg.startsWith("--config="))?.slice(9);
        const path = resolve(process.cwd(), pathArg || "./plconfig.json");

        config.outputSecrets = true;
        console.log("writing config to ", path, config.email.smtp?.password, config.toString());
        config.outputSecrets = false;

        const existing = new PadlocConfig().fromRaw(await this._getJSONConfig());
        config.replaceSecrets(existing);

        config.outputSecrets = true;
        writeFileSync(path, config.toString());
        config.outputSecrets = false;
    }

    async getConfig() {
        const jsonConfig = this._getJSONConfig();

        const envFile = process.argv.find((arg) => arg.startsWith("--env="))?.slice(6);
        const path = envFile && resolve(process.cwd(), envFile);
        const override = process.argv.includes("--env-override");

        dotenv.config({ override, path });

        return new PadlocConfig().fromRaw(jsonConfig).fromEnv(process.env as { [v: string]: string }, "PL_");
    }

    async setConfig(config: PadlocConfig): Promise<void> {
        await this._updateJSONConfig(config);
    }

    async startServer() {
        try {
            const config = await this.getConfig();
            console.log(
                "Starting server with config: ",
                JSON.stringify(stripPropertiesRecursive(config.toRaw(), ["kind", "version"]), null, 4)
            );
            await this._init(config);
        } catch (e) {
            console.error("Init failed. Error: ", e);
        }
    }

    async stopServer() {
        console.log("stopping server...");
        await this._services?.dispose();
    }

    async restartServer() {
        await this.stopServer();
        await this.startServer();
    }
}
