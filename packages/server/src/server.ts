import * as Koa from "koa";
import * as route from "koa-route";
// @ts-ignore
import * as body from "koa-body";
// @ts-ignore
import * as cors from "@koa/cors";
import { Storage } from "@padlock/core/src/storage";
import { LevelDBStorage } from "./storage";
import { Sender, EmailSender } from "./sender";
import { authenticate } from "./middleware";
import { createSession, activateSession, revokeSession, getAccount } from "./handlers";

export interface Context extends Koa.Context {
    storage: Storage;
    sender: Sender;
}

export class Server {
    private koa: Koa;

    constructor(private storage: Storage, private sender: Sender) {
        this.koa = new Koa();
        Object.assign(this.koa.context, {
            storage: this.storage,
            sender: this.sender
        });

        this.koa.use(
            cors({
                exposeHeaders: ["X-Sub-Status", "X-Stripe-Pub-Key", "X-Sub-Trial-End"],
                allowHeaders: [
                    "Authorization",
                    "X-Device-App-Version",
                    "X-Device-Platform",
                    "X-Device-UUID",
                    "X-Device-Manufacturer",
                    "X-Device-OS-Version",
                    "X-Device-Model",
                    "X-Device-Hostname"
                ]
            })
        );
        this.koa.use(body());
        this.koa.use(authenticate);
        this.koa.use(route.post("/session", createSession));
        this.koa.use(route.delete("/session/:id", revokeSession));
        this.koa.use(route.post("/session/:id/activate", activateSession));
        this.koa.use(route.get("/account", getAccount));
    }

    start(port: number) {
        this.koa.listen(port);
    }
}

const sender = new EmailSender({
    host: process.env.PC_EMAIL_SERVER || "",
    port: process.env.PC_EMAIL_PORT || "",
    user: process.env.PC_EMAIL_USER || "",
    password: process.env.PC_EMAIL_PASSWORD || ""
});
const storage = new LevelDBStorage(process.env.PC_LEVELDB_PATH || "db");
const server = new Server(storage, sender);
server.start(3000);
