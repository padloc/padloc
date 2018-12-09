import { Server } from "@padloc/core/src/server";
import { setProvider } from "@padloc/core/src/crypto";
import { NodeCryptoProvider } from "./crypto";
import { HTTPReceiver } from "./http";
import { LevelDBStorage } from "./storage";
import { EmailMessenger } from "./messenger";

setProvider(new NodeCryptoProvider());

const messenger = new EmailMessenger({
    host: process.env.PL_EMAIL_SERVER || "",
    port: process.env.PL_EMAIL_PORT || "",
    user: process.env.PL_EMAIL_USER || "",
    password: process.env.PL_EMAIL_PASSWORD || ""
});
const storage = new LevelDBStorage(process.env.PL_DB_PATH || "db");
const server = new Server(
    {
        clientUrl: process.env.PL_CLIENT_URL || "https://localhost:8081",
        reportErrors: process.env.PL_REPORT_ERRORS || ""
    },
    storage,
    messenger
);

let port = 3000;

try {
    port = parseInt(process.env.PL_SERVER_PORT!);
} catch (e) {}

new HTTPReceiver(port).listen(req => server.handle(req));
