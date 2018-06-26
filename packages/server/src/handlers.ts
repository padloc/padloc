import { Container } from "@padlock/core/src/crypto";
import { Account, Session } from "@padlock/core/src/auth";
import { uuid } from "@padlock/core/lib/util.js";
import { Context } from "./server";
import { AuthRequest } from "./auth";

export async function createSession(ctx: Context) {
    const email = ctx.request.body.email;
    ctx.assert(email, 400, "No email provided.");

    const req = AuthRequest.create(email);
    await ctx.storage.set(req);

    ctx.sender.send(email, "Your Padlock Login Code", `Here is your code: ${req.code}`);

    ctx.body = req.session;
}

export async function activateSession(ctx: Context, id: string) {
    const { code } = ctx.request.body;
    ctx.assert(code, 400, "No login code provided.");

    const req = new AuthRequest();
    req.session = { id: id } as Session;
    await ctx.storage.get(req);

    if (req.code !== code) {
        ctx.throw(400, "Invalid code");
    }

    let acc;
    try {
        acc = new Account(req.email);
        await ctx.storage.get(acc);
    } catch (e) {
        // TODO only catch not found error
        acc = Account.create(req.email);
        await ctx.storage.set(acc);
    }

    req.session.active = true;
    acc.sessions.push(req.session);
    await ctx.storage.set(acc);

    await ctx.storage.delete(req);

    ctx.body = req.session;
}

export async function revokeSession(ctx: Context, id: string) {
    ctx.assert(ctx.state.session, 401);
    const account = ctx.state.account;
    account.sessions = account.sessions.filter((s: Session) => s.id !== id);
    await ctx.storage.set(account);
    ctx.body = "";
}

export async function getAccount(ctx: Context) {
    ctx.assert(ctx.state.session, 401);
    ctx.body = await ctx.state.account.serialize();
}

export async function getStore(ctx: Context, id?: string) {
    ctx.assert(ctx.state.session, 401);

    if (!id || id === "main") {
        id = ctx.state.account.mainStore;
    }

    if (!id) {
        ctx.throw(404);
    }

    const container = new Container();
    container.id = id!;
    container.kind = "store";
    await ctx.storage.get(container);

    ctx.body = await container.serialize();
}

export async function putStore(ctx: Context, id?: string) {
    ctx.assert(ctx.state.session, 401);
    const account = ctx.state.account;
    const container = await new Container().deserialize(ctx.request.body);

    if (!id || id === "main") {
        if (!account.mainStore) {
            account.mainStore = uuid();
            await ctx.storage.set(account);
        }
        id = container.id = account.mainStore;
    }

    ctx.assert(container.id === id, 400, "store id must match request id");

    await ctx.storage.set(container);

    ctx.body = await container.serialize();
}
