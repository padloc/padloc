import { Container } from "@padlock/core/src/crypto";
import { Account, Session } from "@padlock/core/src/auth";
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

export async function getStore(ctx: Context, id: string) {
    ctx.assert(ctx.state.session, 401);

    const container = new Container(id || ctx.state.account.mainStore);
    await ctx.storage.get(container);

    ctx.body = await container.serialize();
}

export async function putStore(ctx: Context, id?: string) {
    ctx.assert(ctx.state.session, 401);
    const account = ctx.state.account;

    const container = new Container(id || account.mainStore);
    await container.deserialize(ctx.request.body);

    ctx.assert(container.id === id, 400, "store id must match request id");

    switch (container.scheme) {
        case "PBES2":
            if (!account.mainStore) {
                account.mainStore = id;
                await ctx.storage.set(account);
            } else {
                ctx.assert(account.mainStore === id, 400, "invalid id");
            }
            await ctx.storage.set(container);
            break;
    }

    ctx.body = await container.serialize();
}
