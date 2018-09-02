import { Store } from "@padlock/core/src/store";
import { Account, Session } from "@padlock/core/src/auth";
import { CreateStoreParams, CreateAccountParams } from "@padlock/core/src/api";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { Context } from "./server";

export async function verifyEmail(ctx: Context) {
    const { email } = ctx.request.body;

    if (typeof email !== "string") {
        throw new Err(ErrorCode.BAD_REQUEST, "No email provided!");
    }

    ctx.body = await ctx.api.verifyEmail({ email });
}

export async function initAuth(ctx: Context) {
    const { email } = ctx.request.body;
    if (typeof email !== "string") {
        throw new Err(ErrorCode.BAD_REQUEST);
    }
    ctx.body = await ctx.api.initAuth({ email });
}

export async function createSession(ctx: Context) {
    // TODO: check params
    const session = await ctx.api.createSession(ctx.request.body);
    ctx.body = await session.serialize();
}

export async function revokeSession(ctx: Context, id: string) {
    await ctx.api.revokeSession(new Session(id));
    ctx.body = "";
}

export async function getAccount(ctx: Context) {
    const account = await ctx.api.getAccount(ctx.state.account!);
    ctx.body = await account.serialize();
}

export async function createAccount(ctx: Context) {
    // TODO: Check params
    const params = ctx.request.body as CreateAccountParams;
    const account = await ctx.api.createAccount(params);
    ctx.body = await account.serialize();
}

export async function updateAccount(ctx: Context) {
    const account = await new Account().deserialize(ctx.request.body);
    await ctx.api.updateAccount(account);
    ctx.body = await account.serialize();
}

export async function getStore(ctx: Context, id: string) {
    const store = await ctx.api.getStore(new Store(id));
    ctx.body = await store.serialize();
}

export async function updateStore(ctx: Context, id: string) {
    const store = await new Store(id).deserialize(ctx.request.body);
    await ctx.api.updateStore(store);
    ctx.body = await store.serialize();
}

export async function createStore(ctx: Context) {
    const store = await ctx.api.createStore(ctx.request.body as CreateStoreParams);
    ctx.body = await store.serialize();
}
