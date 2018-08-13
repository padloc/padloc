import { Account, Device } from "@padlock/core/src/auth";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { unmarshal } from "@padlock/core/src/encoding";
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

    try {
        await ctx.storage.get(account);
    } catch (e) {
        await next();
        return;
    }

    ctx.state.account = account;
    const session = (ctx.state.session = account.sessions.find(s => s.token === token && s.active));

    if (!session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    if (session.expires && new Date(session.expires) < new Date()) {
        throw new Err(ErrorCode.SESSION_EXPIRED);
    }

    Object.assign(session.device, ctx.state.device);
    session.lastUsed = new Date().toISOString();
    await ctx.storage.set(account);

    await next();
}

export async function handleError(ctx: Context, next: () => Promise<void>) {
    try {
        await next();
    } catch (e) {
        if (e instanceof Err) {
            ctx.status = e.status;
            ctx.body = {
                error: e.code,
                message: e.message
            };
        } else {
            ctx.status = 500;
            ctx.body = {
                error: ErrorCode.SERVER_ERROR,
                message:
                    "Something went wrong while we were processing your request. " +
                    "Our team has been notified and will resolve the problem as soon as possible!"
            };
            console.error(e);
            ctx.sender.send("support@padlock.io", {
                title: "Padlock Error Notification",
                text: `The following error occurred at ${new Date().toString()}:\n\n${e.stack}`,
                html: ""
            });
        }
        ctx.app.emit("error", e, ctx);
    }
}

export async function device(ctx: Context, next: () => Promise<void>) {
    const deviceHeader = ctx.request.header["x-device"];
    if (deviceHeader) {
        ctx.state.device = await new Device().deserialize(unmarshal(deviceHeader));
    }
    await next();
}
