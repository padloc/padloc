import { Server } from "@padloc/core/src/server";
import { setProvider } from "@padloc/core/src/crypto";
import { NodeCryptoProvider } from "./crypto";
import { HTTPReceiver } from "./http";
import { LevelDBStorage } from "./storage";
import { EmailMessenger } from "./messenger";
import { FileSystemStorage } from "./attachment";

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
const server = new Server(
    {
        clientUrl: process.env.PL_CLIENT_URL || "https://localhost:8081",
        reportErrors: process.env.PL_REPORT_ERRORS || ""
    },
    storage,
    messenger,
    attachmentStorage
);

let port = 3000;

try {
    port = parseInt(process.env.PL_SERVER_PORT!);
} catch (e) {}

console.log(`Starting server on port ${port}`);
new HTTPReceiver(port).listen(req => server.handle(req));
