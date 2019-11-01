import { Server, ServerConfig } from "@padloc/core/src/server";
import { setPlatform } from "@padloc/core/src/platform";
import { BillingProvider } from "@padloc/core/src/billing";
import { NodePlatform } from "./platform";
import { HTTPReceiver } from "./http";
import { LevelDBStorage } from "./storage";
import { EmailMessenger } from "./messenger";
import { FileSystemStorage } from "./attachment";
import { StripeBillingProvider } from "./billing";

async function init() {
    setPlatform(new NodePlatform());

    const config = new ServerConfig({
        clientUrl: process.env.PL_PWA_URL || `http://0.0.0.0:${process.env.PL_PWA_PORT || 8080}`,
        reportErrors: process.env.PL_REPORT_ERRORS || "",
        mfa: (process.env.PL_MFA as ("email" | "none")) || "email",
        accountQuota: {
            items: -1,
            storage: 1,
            orgs: 5
        },
        orgQuota: {
            members: -1,
            groups: -1,
            vaults: -1,
            storage: 5
        }
    });
    const messenger = new EmailMessenger({
        host: process.env.PL_EMAIL_SERVER || "",
        port: process.env.PL_EMAIL_PORT || "",
        user: process.env.PL_EMAIL_USER || "",
        password: process.env.PL_EMAIL_PASSWORD || "",
        from: process.env.PL_EMAIL_FROM || ""
    });
    const storage = new LevelDBStorage(process.env.PL_DB_PATH || process.env.PL_DATA_DIR || "data");
    const attachmentStorage = new FileSystemStorage({
        path: process.env.PL_ATTACHMENTS_PATH || process.env.PL_ATTACHMENTS_DIR || "attachments"
    });
    // const billingProvider = new StubBillingProvider();

    let billingProvider: BillingProvider | undefined = undefined;

    if (process.env.PL_BILLING_ENABLED === "true") {
        let billingPort = parseInt(process.env.PL_BILLING_PORT!);
        if (isNaN(billingPort)) {
            billingPort = 3001;
        }

        const stripeProvider = new StripeBillingProvider(
            {
                stripeSecret: process.env.PL_BILLING_STRIPE_SECRET || "",
                port: billingPort
            },
            storage
        );

        await stripeProvider.init();

        billingProvider = stripeProvider;
    }

    let port = parseInt(process.env.PL_SERVER_PORT!);
    if (isNaN(port)) {
        port = 3000;
    }

    const server = new Server(config, storage, messenger, attachmentStorage, billingProvider);

    console.log(`Starting server on port ${port}`);
    new HTTPReceiver(port).listen(req => server.handle(req));
    //
    // console.log(`Starting billing server on port ${billingPort}`);
    // new HTTPReceiver(billingPort).listen(req => billingProvider.handle(req));
}

init();
