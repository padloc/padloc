import { Server } from "@padloc/core/src/server";
import { setProvider } from "@padloc/core/src/crypto";
import { NodeCryptoProvider } from "./crypto";
import { HTTPReceiver } from "./http";
import { LevelDBStorage } from "./storage";
import { EmailMessenger } from "./messenger";
import { FileSystemStorage } from "./attachment";
import { BillingProvider, GetBillingInfoParams, UpdateBillingInfoParams, Plan } from "./billing";

async function init() {
    setProvider(new NodeCryptoProvider());

    const messenger = new EmailMessenger({
        host: process.env.PL_EMAIL_SERVER || "",
        port: process.env.PL_EMAIL_PORT || "",
        user: process.env.PL_EMAIL_USER || "",
        password: process.env.PL_EMAIL_PASSWORD || "",
        from: process.env.PL_EMAIL_FROM || ""
    });
    const storage = new LevelDBStorage(process.env.PL_DB_PATH || "db");
    const attachmentStorage = new FileSystemStorage({ path: process.env.PL_ATTACHMENTS_PATH || "attachments" });
    const billingProvider = new BillingProvider({ stripeSecret: process.env.PL_STRIPE_SECRET || "" });

    await billingProvider.init();
    await billingProvider.updateBillingInfo(
        new UpdateBillingInfoParams({ email: "martin@maklesoft.com", plan: Plan.Team })
    );
    console.log(await billingProvider.getBillingInfo(new GetBillingInfoParams({ email: "martin@maklesoft.com" })));

    const server = new Server(
        {
            clientUrl: process.env.PL_CLIENT_URL || "https://localhost:8081",
            reportErrors: process.env.PL_REPORT_ERRORS || ""
        },
        storage,
        messenger,
        attachmentStorage,
        billingProvider
    );

    let port = 3000;

    try {
        port = parseInt(process.env.PL_SERVER_PORT!);
    } catch (e) {}

    console.log(`Starting server on port ${port}`);
    new HTTPReceiver(port).listen(req => server.handle(req));
}

init();
