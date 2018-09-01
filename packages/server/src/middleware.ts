import { Account, Session, parseAuthHeader } from "@padlock/core/src/auth";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { marshal, unmarshal } from "@padlock/core/src/encoding";
import { Context } from "./server";
import { ServerAPI } from "./api";

export async function authenticate(ctx: Context, next: () => Promise<void>) {
    const authHeader = ctx.headers["authorization"];
    if (!authHeader) {
        await next();
        return;
    }

    const { sid } = parseAuthHeader(authHeader);

    const session = new Session(sid);

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

    // TODO: Check date to prevent replay attacks
    if (!(await session.verifyAuthHeader(authHeader))) {
        throw new Err(ErrorCode.INVALID_SESSION, "Failed to verify Authorization header");
    }

    const signature = ctx.headers["x-signature"];
    if (ctx.request.rawBody && !(await session.verify(signature, ctx.request.rawBody))) {
        // TODO: Better error code
        throw new Err(ErrorCode.INVALID_SESSION, "Failed to verify signature" + signature + ctx.request.rawBody);
    }

    const account = new Account(session.account);
    await ctx.storage.get(account);

    ctx.state.session = session;
    ctx.state.account = account;

    session.device, ctx.state.device;
    session.lastUsed = new Date().toISOString();

    await ctx.storage.set(session);

    await next();

    ctx.set("Authorization", await session.getAuthHeader());
    ctx.set("X-Signature", await session.sign(marshal(ctx.body)));
}

export async function handleError(ctx: Context, next: () => Promise<void>) {
    try {
        await next();
    } catch (e) {
        console.log(e);
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
    }
}

export async function device(ctx: Context, next: () => Promise<void>) {
    const deviceHeader = ctx.request.header["x-device"];
    if (deviceHeader) {
        ctx.state.device = await unmarshal(deviceHeader);
    }
    await next();
}

export async function api(ctx: Context, next: () => Promise<void>) {
    ctx.api = new ServerAPI(ctx.storage, ctx.sender, ctx.state);
    await next();
}
