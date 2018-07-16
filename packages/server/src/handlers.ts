import { Container } from "@padlock/core/src/crypto";
import { Account, Session } from "@padlock/core/src/auth";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { uuid } from "@padlock/core/lib/util.js";
import { Context } from "./server";
import { AuthRequest } from "./auth";

export async function createSession(ctx: Context) {
    const email = ctx.request.body.email;

    if (!email) {
        throw new Err(ErrorCode.BAD_REQUEST, "No email provided!");
    }

    const req = AuthRequest.create(email, ctx.state.device);
    await ctx.storage.set(req);

    ctx.sender.send(email, "Your Padlock Login Code", `Here is your code: ${req.code}`);

    ctx.body = req.session;
}

export async function activateSession(ctx: Context, id: string) {
    const { code } = ctx.request.body;

    if (!code) {
        throw new Err(ErrorCode.BAD_REQUEST, "No code provided!");
    }

    const req = new AuthRequest();
    req.session.id = id;
    await ctx.storage.get(req);

    if (req.code !== code) {
        throw new Err(ErrorCode.BAD_REQUEST, "Invalid code");
    }

    const acc = new Account(req.email);
    try {
        await ctx.storage.get(acc);
    } catch (e) {
        if (e.code === ErrorCode.NOT_FOUND) {
            await ctx.storage.set(acc);
        } else {
            throw e;
        }
    }

    req.session.active = true;

    const existing = acc.sessions.find(s => s.device.id === req.session.device.id);
    if (existing) {
        acc.sessions.splice(acc.sessions.indexOf(existing), 1);
    }
    acc.sessions.push(req.session);
    await ctx.storage.set(acc);

    await ctx.storage.delete(req);

    ctx.body = req.session;
}

export async function revokeSession(ctx: Context, id: string) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }
    const account = ctx.state.account!;
    account.sessions = account.sessions.filter((s: Session) => s.id !== id);
    await ctx.storage.set(account);
    ctx.body = "";
}

export async function getAccount(ctx: Context) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }
    ctx.body = await ctx.state.account!.serialize();
}

export async function getStore(ctx: Context, id?: string) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    if (!id || id === "main") {
        id = ctx.state.account!.mainStore;
    }

    if (!id) {
        throw new Err(ErrorCode.NOT_FOUND);
    }

    const container = new Container();
    container.id = id!;
    container.kind = "store";
    await ctx.storage.get(container);

    ctx.body = await container.serialize();
}

export async function putStore(ctx: Context, id: string) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account!;
    const container = await new Container().deserialize(ctx.request.body);

    if (id === "main") {
        if (!account.mainStore) {
            account.mainStore = uuid();
            await ctx.storage.set(account);
        }
        container.id = account.mainStore;
    } else {
        container.id = id;
        await ctx.storage.get(container);

        const accessor = container.accessors.find(a => a.id === account.id);

        if (!accessor || !accessor.permissions.write) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Write permissions required");
        }
    }

    await ctx.storage.set(container);

    ctx.body = await container.serialize();
}

export async function createStore(ctx: Context) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const container = await new Container().deserialize(ctx.request.body);

    container.id = uuid();

    const accounts = container.accessors.map(a => new Account(a.email));

    await ctx.storage.set(container);

    await Promise.all(accounts.map(a => ctx.storage.get(a)));

    for (const acc of accounts) {
        if (!acc.sharedStores.includes(container.id)) {
            acc.sharedStores.push(container.id);
        }
    }

    await Promise.all(accounts.map(a => ctx.storage.set(a)));

    ctx.body = await container.serialize();
}

export async function deleteStore(ctx: Context, id: string) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account!;

    if (id === "main") {
        if (!account.mainStore) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        id = account.mainStore;
    }

    const container = new Container();
    container.id = id;
    container.kind = "store";

    await ctx.storage.get(container);

    const accessor = container.accessors.find(a => a.id === account.id);

    if (!accessor || !accessor.permissions.manage) {
        throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Mangage permissions required");
    }

    await ctx.storage.delete(container);

    const accounts = container.accessors.map(a => new Account(a.email));

    await Promise.all(accounts.map(a => ctx.storage.get(a)));

    for (const acc of accounts) {
        console.log("updating account", acc.email);
        acc.sharedStores.splice(acc.sharedStores.indexOf(id), 1);
    }

    await Promise.all(accounts.map(a => ctx.storage.set(a)));

    ctx.status = 204;
}

export async function updateAccount(ctx: Context) {
    if (!ctx.state.session || !ctx.state.account) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account;
    const { publicKey, sharedStores } = ctx.request.body;

    if (publicKey) {
        account.publicKey = publicKey;
    }

    if (sharedStores) {
        account.sharedStores = sharedStores;
    }

    await ctx.storage.set(account);

    ctx.body = await account.serialize();
}
