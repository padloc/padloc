import { Server } from "@padloc/core/src/server";
import { setPlatform } from "@padloc/core/src/platform";
import { Logger } from "@padloc/core/src/log";
import { NodePlatform } from "./platform/node";
import { HTTPReceiver } from "./transport/http";
import { LevelDBStorage } from "./storage/leveldb";
import { S3AttachmentStorage } from "./attachments/s3";
import { StripeBillingProvider } from "./billing";
import { ReplServer } from "./repl";
import { NodeLegacyServer } from "./legacy";
import {
    EmailAuthServer,
    AuthServer,
    AuthType,
    PublicKeyAuthServer,
    TotpAuthConfig,
    TotpAuthServer,
} from "@padloc/core/src/mfa";
import { WebAuthnConfig, WebAuthnServer } from "./mfa/webauthn";
import { SMTPSender } from "./email/smtp";
import { MongoDBStorage } from "./storage/mongodb";
import { ConsoleMessenger } from "@padloc/core/src/messenger";
import { FSAttachmentStorage } from "./attachments/fs";
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
import { StubProvisioner } from "@padloc/core/src/provisioning";
import { OpenIDServer } from "./mfa/openid";

async function initDataStorage({ backend, leveldb, mongodb }: DataStorageConfig) {
    switch (backend) {
        case "leveldb":
            return new LevelDBStorage(leveldb!);
        case "mongodb":
            const storage = new MongoDBStorage(mongodb!);
            await storage.init();
            return storage;
        case "memory":
            return new MemoryStorage();
        case "void":
            return new VoidStorage();
        default:
            throw `Invalid value for PL_DATA_STORAGE_BACKEND: ${backend}! Supported values: leveldb, mongodb`;
    }
}

async function initLogger(config: LoggingConfig) {
    const storage = await initDataStorage(config.storage);
    return new Logger(storage);
}

async function initEmailSender({ backend, smtp }: EmailConfig) {
    switch (backend) {
        case "smtp":
            return new SMTPSender(smtp!);
        case "console":
            return new ConsoleMessenger();
        default:
            throw `Invalid value for PL_EMAIL_BACKEND: ${backend}! Supported values: smtp, console`;
    }
}

async function initAttachmentStorage({ backend, s3, fs }: AttachmentStorageConfig) {
    switch (backend) {
        case "memory":
            return new MemoryAttachmentStorage();
        case "s3":
            return new S3AttachmentStorage(s3!);
        case "fs":
            return new FSAttachmentStorage(fs!);
        default:
            throw `Invalid value for PL_ATTACHMENTS_BACKEND: ${backend}! Supported values: fs, s3, memory`;
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

async function init(config: PadlocConfig) {
    setPlatform(new NodePlatform());

    const emailSender = await initEmailSender(config.email);
    const storage = await initDataStorage(config.data);
    const logger = await initLogger(config.logging);
    const attachmentStorage = await initAttachmentStorage(config.attachments);
    const authServers = await initAuthServers(config);

    let port = parseInt(process.env.PL_SERVER_PORT!);
    if (isNaN(port)) {
        port = 3000;
    }

    let legacyServer: NodeLegacyServer | undefined = undefined;

    if (process.env.PL_LEGACY_URL && process.env.PL_LEGACY_KEY) {
        legacyServer = new NodeLegacyServer({
            url: process.env.PL_LEGACY_URL,
            key: process.env.PL_LEGACY_KEY,
        });
    }

    const server = new Server(
        config.server,
        storage,
        emailSender,
        logger,
        authServers,
        attachmentStorage,
        new StubProvisioner(),
        legacyServer
    );

    if (process.env.PL_BILLING_ENABLED === "true") {
        let billingPort = parseInt(process.env.PL_BILLING_PORT!);
        if (isNaN(billingPort)) {
            billingPort = 3001;
        }

        const stripeProvider = new StripeBillingProvider(
            {
                secretKey: process.env.PL_BILLING_STRIPE_SECRET || "",
                publicKey: process.env.PL_BILLING_STRIPE_PUBLIC_KEY || "",
                webhookPort: billingPort,
            },
            server
        );

        await stripeProvider.init();

        server.billingProvider = stripeProvider;
    }

    console.log(`Starting server on port ${port}`);
    new HTTPReceiver(port).listen((req) => server.handle(req));

    let replPort = parseInt(process.env.PL_REPL_PORT!);
    if (!isNaN(replPort)) {
        console.log(
            `Starting REPL server on port ${replPort}\n` + "WARNING: Make sure this port is NOT publicly accessible."
        );
        new ReplServer(server).start(replPort);
    }
}

async function start() {
    const config = getConfig();
    try {
        await init(config);
        console.log("Server started with config: ", JSON.stringify(config.toRaw(), null, 4));
    } catch (e) {
        console.error("Init failed. Error: ", e, "\nConfig: ", JSON.stringify(config.toRaw(), null, 4));
    }
}

start();
