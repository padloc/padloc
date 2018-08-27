import * as Koa from "koa";
import * as route from "koa-route";
// @ts-ignore
import * as body from "koa-body";
// @ts-ignore
import * as cors from "@koa/cors";
import { Storage } from "@padlock/core/src/storage";
import { Session, Account, Device } from "@padlock/core/src/auth";
import { API } from "@padlock/core/src/api";
import { LevelDBStorage } from "./storage";
import { Sender, EmailSender } from "./sender";
import * as middleware from "./middleware";
import * as handlers from "./handlers";

export interface RequestState {
    session?: Session;
    account?: Account;
    device?: Device;
}

export interface Context extends Koa.Context {
    storage: Storage;
    sender: Sender;
    api: API;
    state: RequestState;
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
                    "Content-Type",
                    "X-Device",
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
        this.koa.use(middleware.handleError);
        this.koa.use(middleware.device);
        this.koa.use(middleware.authenticate);
        this.koa.use(middleware.api);

        this.koa.use(route.post("/session", handlers.createSession));
        this.koa.use(route.delete("/session/:id", handlers.revokeSession));
        this.koa.use(route.post("/session/:id/activate", handlers.activateSession));

        this.koa.use(route.get("/account", handlers.getAccount));
        this.koa.use(route.put("/account", handlers.updateAccount));

        this.koa.use(route.get("/account-store", handlers.getAccountStore));
        this.koa.use(route.put("/account-store", handlers.updateAccountStore));

        this.koa.use(route.post("/store", handlers.createSharedStore));
        this.koa.use(route.get("/store/:id", handlers.getSharedStore));
        this.koa.use(route.put("/store/:id", handlers.updateSharedStore));

        this.koa.use(route.post("/org", handlers.createOrganization));
        this.koa.use(route.get("/org/:id", handlers.getOrganization));
        this.koa.use(route.put("/org/:id", handlers.updateOrganization));
        this.koa.use(route.put("/org/:id/invite", handlers.updateOrganizationInvite));
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
