import { Server } from "@padloc/core/src/server";
import { setProvider } from "@padloc/core/src/crypto";
// import { StubBillingProvider } from "@padloc/core/src/billing";
import { NodeCryptoProvider } from "./crypto";
import { HTTPReceiver } from "./http";
import { LevelDBStorage } from "./storage";
import { EmailMessenger } from "./messenger";
import { FileSystemStorage } from "./attachment";
import { StripeBillingProvider } from "./billing";

async function init() {
    setProvider(new NodeCryptoProvider());

    const config = {
        clientUrl: process.env.PL_CLIENT_URL || "https://localhost:8081",
        reportErrors: process.env.PL_REPORT_ERRORS || "",
        accountQuota: {
            items: 50,
            storage: 0,
            orgs: 5
        },
        orgQuota: {
            members: 1,
            groups: 0,
            vaults: 0,
            storage: 0
        }
    };
    const messenger = new EmailMessenger({
        host: process.env.PL_EMAIL_SERVER || "",
        port: process.env.PL_EMAIL_PORT || "",
        user: process.env.PL_EMAIL_USER || "",
        password: process.env.PL_EMAIL_PASSWORD || "",
        from: process.env.PL_EMAIL_FROM || ""
    });
    const storage = new LevelDBStorage(process.env.PL_DB_PATH || "db");
    const attachmentStorage = new FileSystemStorage({ path: process.env.PL_ATTACHMENTS_PATH || "attachments" });
    // const billingProvider = new StubBillingProvider();
    const billingProvider = new StripeBillingProvider(
        {
            stripeSecret: process.env.PL_STRIPE_SECRET || ""
        },
        storage
    );

    await billingProvider.init();

    const server = new Server(config, storage, messenger, attachmentStorage, billingProvider);

    let port = parseInt(process.env.PL_SERVER_PORT!);
    if (isNaN(port)) {
        port = 3000;
    }
    let billingPort = parseInt(process.env.PL_BILLING_PORT!);
    if (isNaN(billingPort)) {
        billingPort = 3001;
    }

    console.log(`Starting server on port ${port}`);
    new HTTPReceiver(port).listen(req => server.handle(req));
    //
    // console.log(`Starting billing server on port ${billingPort}`);
    // new HTTPReceiver(billingPort).listen(req => billingProvider.handle(req));
}

init();
