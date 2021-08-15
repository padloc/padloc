import { Server, ServerConfig } from "@padloc/core/src/server";
import { setPlatform } from "@padloc/core/src/platform";
import { Logger } from "@padloc/core/src/log";
import { NodePlatform } from "./platform";
import { HTTPReceiver } from "./http";
import { LevelDBStorage } from "./storage";
// import { EmailMessenger } from "./messenger";
import { S3Storage } from "./attachment";
import { StripeBillingProvider } from "./billing";
import { ReplServer } from "./repl";
import { NodeLegacyServer } from "./legacy";
import { MessengerMFAProvider } from "@padloc/core/src/mfa";
import { WebAuthnServer } from "./mfa";
// import { ConsoleMessenger } from "@padloc/core/src/messenger";
import { EmailMessenger } from "./messenger";
import { MongoDBStorage } from "./mongodb";

async function init() {
    setPlatform(new NodePlatform());

    const config = new ServerConfig({
        clientUrl: process.env.PL_PWA_URL || `http://0.0.0.0:${process.env.PL_PWA_PORT || 8080}`,
        reportErrors: process.env.PL_REPORT_ERRORS || "",
        mfa: (process.env.PL_MFA as "email" | "none") || "email",
        accountQuota: {
            items: -1,
            storage: 1,
            orgs: 5,
        },
        orgQuota: {
            members: -1,
            groups: -1,
            vaults: -1,
            storage: 5,
        },
        verifyEmailOnSignup: process.env.PL_VERIFY_EMAIL !== "false",
    });
    const messenger = new EmailMessenger({
        host: process.env.PL_EMAIL_SERVER || "",
        port: process.env.PL_EMAIL_PORT || "",
        secure: process.env.PL_EMAIL_SECURE === "true",
        user: process.env.PL_EMAIL_USER || "",
        password: process.env.PL_EMAIL_PASSWORD || "",
        from: process.env.PL_EMAIL_FROM || "",
    });
    // const messenger = new ConsoleMessenger();
    // const storage = new LevelDBStorage(process.env.PL_DB_PATH || process.env.PL_DATA_DIR || "data");
    const storage = new MongoDBStorage({
        host: process.env.PL_DATA_STORAGE_HOST!,
        tls: process.env.PL_DATA_STORAGE_TLS?.toLocaleLowerCase() === "true",
        tlsCAFile: process.env.PL_DATA_STORAGE_TLS_CA_FILE,
        port: process.env.PL_DATA_STORAGE_PORT,
        protocol: process.env.PL_DATA_STORAGE_PROTOCOL,
        database: process.env.PL_DATA_STORAGE_DATABASE,
        username: process.env.PL_DATA_STORAGE_USERNAME!,
        password: process.env.PL_DATA_STORAGE_PASSWORD!,
    });
    await storage.init();

    const logger = new Logger(new LevelDBStorage(process.env.PL_LOG_DIR || "logs"));

    // const attachmentStorage = new FileSystemStorage({
    //     path: process.env.PL_ATTACHMENTS_PATH || process.env.PL_ATTACHMENTS_DIR || "attachments",
    // });
    const attachmentStorage = new S3Storage({
        region: process.env.PL_ATTACHMENT_STORAGE_REGION!,
        endpoint: process.env.PL_ATTACHMENT_STORAGE_ENDPOINT!,
        accessKeyId: process.env.PL_ATTACHMENT_STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.PL_ATTACHMENT_STORAGE_SECRET_ACCESS_KEY!,
        bucket: process.env.PL_ATTACHMENT_STORAGE_BUCKET!,
    });
    // const billingProvider = new StubBillingProvider();

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

    const messengerMFAProvider = new MessengerMFAProvider(messenger);
    const serverHost = new URL(process.env.PL_SERVER_URL!).hostname;
    const webAuthnProvider = new WebAuthnServer({
        rpID: serverHost,
        rpName: "Padloc",
        attestationType: "indirect",
        origin: config.clientUrl
    });

    console.log("created webauthn provider with config", webAuthnProvider.config);

    cons server = new Server(
        config,
        storage,
        messenger,
        logger,
        [messengerMFAProvider, webAuthnProvider],
        attachmentStorage,
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

init();
