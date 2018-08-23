import { AccountStore, SharedStore } from "@padlock/core/src/data";
import { Account, Session } from "@padlock/core/src/auth";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { uuid } from "@padlock/core/lib/util.js";
import { AccountUpdateParams } from "@padlock/core/lib/client.js";
import { Context } from "./server";
import { AuthRequest } from "./auth";
import { LoginMessage } from "./messages";

export async function createSession(ctx: Context) {
    const email = ctx.request.body.email;

    if (!email) {
        throw new Err(ErrorCode.BAD_REQUEST, "No email provided!");
    }

    const req = AuthRequest.create(email, ctx.state.device);
    await ctx.storage.set(req);

    ctx.sender.send(email, new LoginMessage(req));

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

    if (req.code.toLowerCase() !== code.toLowerCase()) {
        throw new Err(ErrorCode.BAD_REQUEST, "Invalid code");
    }

    const acc = new Account(req.email);
    try {
        await ctx.storage.get(acc);
    } catch (e) {
        if (e.code === ErrorCode.NOT_FOUND) {
            acc.id = uuid();
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

export async function getOwnAccount(ctx: Context) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }
    ctx.body = await ctx.state.account!.serialize();
}

export async function getAccount(ctx: Context, email: string) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = new Account(email);

    await ctx.storage.get(account);

    ctx.body = account.publicAccount;
}

export async function getAccountStore(ctx: Context) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const store = new AccountStore(ctx.state.account!);
    await ctx.storage.get(store);

    ctx.body = await store.serialize();
}

export async function putAccountStore(ctx: Context) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const store = await new AccountStore(ctx.state.account!).deserialize(ctx.request.body);
    await ctx.storage.set(store);

    ctx.body = await store.serialize();
}

export async function getSharedStore(ctx: Context, id: string) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const store = new SharedStore(id, ctx.state.account!);
    await ctx.storage.get(store);

    ctx.body = await store.serialize();
}

export async function putSharedStore(ctx: Context, id: string) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account!;
    const store = await new SharedStore(id, account).deserialize(ctx.request.body);
    const existing = new SharedStore(id, account);

    await ctx.storage.get(existing);

    const permissions = existing.permissions;

    if (!permissions.write) {
        throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Write permissions required to update store contents.");
    }

    const { added, changed } = existing.mergeAccessors(store.accessors);

    if (added.length || (changed.length && !permissions.manage)) {
        throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Manage permissions required to update store accessors.");
    }

    for (const accessor of added) {
        const acc = new Account(accessor.email);
        await ctx.storage.get(acc);
        acc.sharedStores.push(store.id);
        await ctx.storage.set(acc);
    }

    await ctx.storage.set(store);

    ctx.body = await store.serialize();
}

export async function createSharedStore(ctx: Context) {
    if (!ctx.state.session || !ctx.state.account) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account;
    const store = await new SharedStore(uuid(), account).deserialize(ctx.request.body);

    store.id = uuid();
    account.sharedStores.push(store.id);

    await Promise.all([ctx.storage.set(account), ctx.storage.set(store)]);

    ctx.body = await store.serialize();
}

export async function deleteSharedStore(ctx: Context, id: string) {
    if (!ctx.state.session) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account!;

    const store = new SharedStore(id, account);
    await ctx.storage.get(store);

    if (!store.permissions.manage) {
        throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Mangage permissions required to delete a shared store!");
    }
    await ctx.storage.delete(store);

    ctx.status = 204;
}

export async function updateAccount(ctx: Context) {
    if (!ctx.state.session || !ctx.state.account) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account;
    const { publicKey } = ctx.request.body as AccountUpdateParams;

    if (publicKey) {
        if (typeof publicKey !== "string") {
            throw new Err(ErrorCode.BAD_REQUEST);
        }
        account.publicKey = publicKey;
    }
    //
    // if (name) {
    //     if (typeof name !== "string") {
    //         throw new Err(ErrorCode.BAD_REQUEST);
    //     }
    //     account.name = name;
    // }

    await ctx.storage.set(account);

    ctx.body = await account.serialize();
}

export async function requestAccess(ctx: Context, id: string) {
    if (!ctx.state.session || !ctx.state.account) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account;

    const store = new SharedStore(id, account);
    await ctx.storage.get(store);

    if (store.accessors.some(a => a.id === account.id)) {
        throw new Err(ErrorCode.BAD_REQUEST);
    }

    store.updateAccess(account.publicAccount, { read: true, write: false, manage: false }, "requested");

    account.sharedStores.push(id);

    await Promise.all([ctx.storage.set(account), ctx.storage.set(store)]);

    ctx.body = await store.serialize();
}

export async function acceptInvite(ctx: Context, id: string) {
    if (!ctx.state.session || !ctx.state.account) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account;

    const store = new SharedStore(id, account);
    await ctx.storage.get(store);

    if (store.accessorStatus !== "invited") {
        throw new Err(ErrorCode.BAD_REQUEST);
    }

    store.updateAccess(account, store.permissions, "active");

    await Promise.all([ctx.storage.set(account), ctx.storage.set(store)]);

    ctx.body = await store.serialize();
}
