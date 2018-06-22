import { Account } from "@padlock/core/src/data";
import { Context } from "./server";

export async function authenticate(ctx: Context, next: () => Promise<void>) {
    const authHeader = ctx.headers["authorization"];
    const creds = authHeader && authHeader.match(/^(?:AuthToken|ApiKey) (.+):(.+)$/);

    if (!creds) {
        await next();
        return;
    }

    let [email, token] = creds.slice(1);
    const account = new Account(email);

    console.log(email, token);

    try {
        await ctx.storage.get(account);
    } catch (e) {
        await next();
        return;
    }

    ctx.state.account = account;
    ctx.state.session = account.sessions.find(s => s.token === token);
    await next();
}
