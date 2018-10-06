import { Server } from "@padlock/core/src/server";
import { setProvider } from "@padlock/core/src/crypto";
import { NodeCryptoProvider } from "./crypto";
import { HTTPReceiver } from "./http";
import { LevelDBStorage } from "./storage";
import { EmailMessenger } from "./messenger";

setProvider(new NodeCryptoProvider());

const messenger = new EmailMessenger({
    host: process.env.PC_EMAIL_SERVER || "",
    port: process.env.PC_EMAIL_PORT || "",
    user: process.env.PC_EMAIL_USER || "",
    password: process.env.PC_EMAIL_PASSWORD || ""
});
const storage = new LevelDBStorage(process.env.PC_LEVELDB_PATH || "db");
const server = new Server(storage, messenger);

new HTTPReceiver(3000).listen(req => server.handle(req));
