import { Account, Session } from "@padlock/core/src/auth";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { unmarshal } from "@padlock/core/src/encoding";
import { defaultHMACParams } from "@padlock/core/src/crypto";
import { NodeCryptoProvider } from "@padlock/core/src/node-crypto-provider";
import { Context } from "./server";
import { ServerAPI } from "./api";

const crypto = new NodeCryptoProvider();

export async function authenticate(ctx: Context, next: () => Promise<void>) {
    const authHeader = ctx.headers["authorization"];
    const creds = authHeader && authHeader.match(/^(.+):(.+):(.+)$/);
    const signature = ctx.headers["X-Signature"];

    if (!creds) {
        await next();
        return;
    }

    let [sessionID, b64Date, signedDate] = creds.slice(1);

    const session = new Session(sessionID);

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
    if (!crypto.verify(session.key, signedDate, b64Date, defaultHMACParams())) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    console.log(ctx.request.rawBody);
    if (ctx.request.rawBody && !crypto.verify(session.key, signature, ctx.request.rawBody, defaultHMACParams())) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = new Account(session.account);
    await ctx.storage.get(account);

    ctx.state.session = session;
    ctx.state.account = account;

    session.device, ctx.state.device;
    session.lastUsed = new Date().toISOString();

    await ctx.storage.set(session);

    await next();
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
