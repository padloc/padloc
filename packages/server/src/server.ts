import { Storage } from "@padlock/core/src/storage";
import { Session, Account, Auth } from "@padlock/core/src/auth";
import { setProvider } from "@padlock/core/src/crypto";
import { NodeCryptoProvider } from "@padlock/core/src/node-crypto-provider";
import { Receiver, Request, Response } from "@padlock/core/src/transport";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { Store } from "@padlock/core/src/store";
import { Org } from "@padlock/core/src/org";
import { Invite } from "@padlock/core/src/invite";
import { HTTPReceiver } from "./transport";
import { Context } from "./api";
import { LevelDBStorage } from "./storage";
import { Sender, EmailSender } from "./sender";

setProvider(new NodeCryptoProvider());

export class Server {
    constructor(private storage: Storage, private sender: Sender, private receivers: Receiver[]) {}

    start() {
        for (const receiver of this.receivers) {
            receiver.listen(async (req: Request) => {
                const context = new Context(this.storage, this.sender);
                await this._authenticate(req, context);
                const res = { result: null };
                try {
                    await this._process(req, res, context);
                } catch (e) {
                    this._handleError(e, res);
                }
                if (context.session) {
                    await context.session.authenticate(res);
                }
                return res;
            });
        }
    }

    private async _process(req: Request, res: Response, ctx: Context): Promise<void> {
        const { method, params } = req;
        const { account } = ctx;

        let session: Session;
        let acc: Account;
        let store: Store;
        let org: Org;
        let invite: Invite;

        switch (method) {
            case "verifyEmail":
                if (!params || params.length !== 1 || typeof params[0].email !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }

                res.result = await ctx.verifyEmail({ email: params[0].email });
                break;

            case "initAuth":
                if (!params || params.length !== 1 || typeof params[0].email !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                const { auth: _auth, B } = await ctx.initAuth({ email: params[0].email });
                res.result = {
                    auth: await _auth.serialize(),
                    B
                };
                break;

            case "createSession":
                // TODO: check params
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                session = await ctx.createSession(params[0]);
                res.result = await session.serialize();
                break;

            case "revokeSession":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                session = await new Session().deserialize(params[0]);
                await ctx.revokeSession(session);
                res.result = null;
                break;

            case "getSessions":
                res.result = await ctx.getSessions();
                break;

            case "getAccount":
                if (!account) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                res.result = await account.serialize();
                break;

            case "createAccount":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }

                acc = await ctx.createAccount({
                    account: await new Account().deserialize(params[0].account),
                    auth: await new Auth().deserialize(params[0].auth),
                    emailVerification: params[0].emailVerification
                });
                res.result = await acc.serialize();
                break;

            case "updateAccount":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                acc = await ctx.updateAccount(await new Account().deserialize(params[0]));
                res.result = await acc.serialize();
                break;

            case "getStore":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                store = await ctx.getStore(await new Store().deserialize(params[0]));
                res.result = await store.serialize();
                break;

            case "updateStore":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                store = await ctx.updateStore(await new Store().deserialize(params[0]));
                res.result = await store.serialize();
                break;

            case "createStore":
                // TODO: Validate params
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                store = await ctx.createStore(params[0]);
                res.result = await store.serialize();
                break;

            case "getOrg":
                // TODO: Validate params
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                org = await ctx.getOrg(new Org(params[0].id));
                res.result = await org.serialize();
                break;

            case "updateOrg":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                org = await ctx.updateOrg(await new Org().deserialize(params[0]));
                res.result = await org.serialize();
                break;

            case "createOrg":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                org = await ctx.createOrg(params[0]);
                res.result = await org.serialize();
                break;

            case "updateInvite":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                invite = await ctx.updateInvite(await new Invite().deserialize(params[0]));
                res.result = await invite.serialize();
                break;

            case "deleteInvite":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                invite = await new Invite().deserialize(params[0]);
                await ctx.deleteInvite(invite);
                break;

            default:
                throw new Err(ErrorCode.INVALID_REQUEST);
        }
    }

    private async _authenticate(req: Request, ctx: Context) {
        if (!req.auth) {
            return;
        }

        const session = new Session(req.auth.session);

        try {
            await ctx.storage.get(session);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.INVALID_SESSION);
            } else {
                throw e;
            }
        }

        if (session.expires && new Date(session.expires) < new Date()) {
            throw new Err(ErrorCode.SESSION_EXPIRED);
        }

        if (!(await session.verify(req))) {
            throw new Err(ErrorCode.INVALID_REQUEST);
        }

        const account = new Account(session.account);
        await ctx.storage.get(account);

        ctx.session = session;
        ctx.account = account;

        // TODO
        // session.device = req.device;
        session.lastUsed = new Date().toISOString();

        await ctx.storage.set(session);
    }

    _handleError(e: Error, res: Response) {
        if (e instanceof Err) {
            res.error = {
                code: e.code,
                message: e.message
            };
        } else {
            console.error(e.stack);
            this.sender.send("support@padlock.io", {
                title: "Padlock Error Notification",
                text: `The following error occurred at ${new Date().toString()}:\n\n${e.stack}`,
                html: ""
            });
            res.error = {
                code: ErrorCode.SERVER_ERROR,
                message:
                    "Something went wrong while we were processing your request. " +
                    "Our team has been notified and will resolve the problem as soon as possible!"
            };
        }
    }
}

const sender = new EmailSender({
    host: process.env.PC_EMAIL_SERVER || "",
    port: process.env.PC_EMAIL_PORT || "",
    user: process.env.PC_EMAIL_USER || "",
    password: process.env.PC_EMAIL_PASSWORD || ""
});
const storage = new LevelDBStorage(process.env.PC_LEVELDB_PATH || "db");
const server = new Server(storage, sender, [new HTTPReceiver(3000)]);
server.start();
