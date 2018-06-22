import { Account } from "@padlock/core/src/data";
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

export async function activateSession(ctx: Context) {
    const { email, code } = ctx.request.body;
    ctx.assert(email && code, 400, "No email or login code provided.");

    const req = new AuthRequest(email, code);
    await ctx.storage.get(req);

    console.log("auth reuest found");

    let acc;
    try {
        acc = new Account(email);
        await ctx.storage.get(acc);
    } catch (e) {
        // TODO only catch not found error
        acc = Account.create(email);
        await ctx.storage.set(acc);
    }

    acc.sessions.push(req.session);
    await ctx.storage.set(acc);

    await ctx.storage.delete(req);

    ctx.body = "Success!";
}

export async function getAccount(ctx: Context) {
    ctx.assert(ctx.state.session, 401);
    ctx.body = await ctx.state.account.serialize();
}
