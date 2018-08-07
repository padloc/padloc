import { Container, AccessorStatus } from "@padlock/core/src/crypto";
import { Account, Session } from "@padlock/core/src/auth";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { uuid } from "@padlock/core/lib/util.js";
import { AccountUpdateParams } from "@padlock/core/lib/client.js";
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
    let container = await new Container().deserialize(ctx.request.body);

    if (id === "main") {
        if (!account.mainStore) {
            account.mainStore = uuid();
            await ctx.storage.set(account);
        }
        container.id = account.mainStore;
    } else {
        const existing = new Container();
        existing.id = id;
        existing.kind = "store";
        await ctx.storage.get(existing);

        const accessor = existing.accessors.find(a => a.email === account.email);

        if (!accessor || !accessor.permissions.write) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Write permissions required");
        }

        Object.assign(existing, {
            cipherText: container.cipherText,
            encryptionParams: container.encryptionParams,
            wrappingParams: container.wrappingParams
        });

        if (accessor.permissions.manage) {
            const { added } = existing.mergeAccessors(container.accessors);
            for (const accessor of added) {
                const acc = new Account(accessor.email);
                await ctx.storage.get(acc);
                acc.sharedStores.push(container.id);
                await ctx.storage.set(acc);
            }
        }

        container = existing;
    }

    await ctx.storage.set(container);

    ctx.body = await container.serialize();
}

export async function createStore(ctx: Context) {
    if (!ctx.state.session || !ctx.state.account) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account;
    const container = await new Container().deserialize(ctx.request.body);

    container.id = uuid();

    account.sharedStores.push(container.id);

    await Promise.all([ctx.storage.set(account), ctx.storage.set(container)]);

    // const accounts = container.accessors.map(a => new Account(a.email));
    //
    // await Promise.all(accounts.map(a => ctx.storage.get(a)));
    //
    // for (const acc of accounts) {
    //     if (!acc.sharedStores.includes(container.id)) {
    //         acc.sharedStores.push(container.id);
    //     }
    // }
    //
    // await Promise.all(accounts.map(a => ctx.storage.set(a)));

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

    const accessor = container.accessors.find(a => a.email === account.email);

    if (!accessor || !accessor.permissions.manage) {
        throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Mangage permissions required");
    }

    await ctx.storage.delete(container);
    //
    // const accounts = container.accessors.map(a => new Account(a.email));
    //
    // await Promise.all(accounts.map(a => ctx.storage.get(a)));
    //
    // for (const acc of accounts) {
    //     console.log("updating account", acc.email);
    //     acc.sharedStores.splice(acc.sharedStores.indexOf(id), 1);
    // }
    //
    // await Promise.all(accounts.map(a => ctx.storage.set(a)));

    ctx.status = 204;
}

export async function updateAccount(ctx: Context) {
    if (!ctx.state.session || !ctx.state.account) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account;
    const { publicKey } = ctx.request.body as AccountUpdateParams;

    if (publicKey) {
        account.publicKey = publicKey;
    }

    await ctx.storage.set(account);

    ctx.body = await account.serialize();
}

export async function requestAccess(ctx: Context, id: string) {
    if (!ctx.state.session || !ctx.state.account) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account;

    const container = new Container();
    container.id = id;
    container.kind = "store";

    await ctx.storage.get(container);

    if (container.accessors.some(a => a.email === account.email)) {
        throw new Err(ErrorCode.BAD_REQUEST);
    }

    container.accessors.push(
        Object.assign(
            {
                status: "requested" as AccessorStatus,
                updated: new Date().toISOString(),
                encryptedKey: "",
                addedBy: "",
                permissions: { read: true, write: false, manage: false }
            },
            account.publicAccount
        )
    );

    account.sharedStores.push(id);

    await Promise.all([ctx.storage.set(account), ctx.storage.set(container)]);

    ctx.body = await container.serialize();
}

export async function acceptInvite(ctx: Context, id: string) {
    if (!ctx.state.session || !ctx.state.account) {
        throw new Err(ErrorCode.INVALID_SESSION);
    }

    const account = ctx.state.account;

    const container = new Container();
    container.id = id;
    container.kind = "store";

    await ctx.storage.get(container);

    const accessor = container.accessors.find(a => a.email === account.email);

    if (!accessor || accessor.status !== "invited") {
        throw new Err(ErrorCode.BAD_REQUEST);
    }

    accessor.status = "active";
    accessor.updated = new Date().toISOString();

    await Promise.all([ctx.storage.set(account), ctx.storage.set(container)]);

    ctx.body = await container.serialize();
}

//
// export async function createFriendRequest(ctx: Context) {
//     if (!ctx.state.session || !ctx.state.account) {
//         throw new Err(ErrorCode.INVALID_SESSION);
//     }
//
//     const { email } = ctx.request.body;
//
//     const sender = ctx.state.account;
//     const recipient = new Account(email);
//
//     const request = new FriendRequest(sender, recipient);
//
//     try {
//         await ctx.storage.get(recipient);
//         recipient.friendRequests.push(request.id);
//         await ctx.storage.set(recipient);
//         ctx.sender.send(
//             email,
//             `${request.sender.email} would like to share data on Padlock with you!`,
//             `
//             Hi there!
//
//             ${request.sender.email} would like to add you to their trusted Padlock accounts, allowing you
//             to securely and easily share data with eachother!
//
//             To complete the process, simply open the Padlock app!
//
//             Best,
//             Martin from Padlock
//         `
//         );
//     } catch (e) {
//         if (e.code === ErrorCode.NOT_FOUND) {
//             // TODO
//         } else {
//             throw e;
//         }
//     }
//
//     await ctx.storage.set(request);
//
//     sender.friendRequests.push(request.id);
//     await ctx.storage.set(sender);
//
//     ctx.body = await request.serialize();
// }
