import { AccountStore, SharedStore } from "@padlock/core/src/data";
import { Account, Organization, Invite } from "@padlock/core/src/auth";
import { CreateSharedStoreParams, CreateOrganizationParams } from "@padlock/core/src/api";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { Context } from "./server";

export async function createSession(ctx: Context) {
    const { email } = ctx.request.body;

    if (!email) {
        throw new Err(ErrorCode.BAD_REQUEST, "No email provided!");
    }

    ctx.body = await ctx.api.createSession(email);
}

export async function activateSession(ctx: Context, id: string) {
    const { code } = ctx.request.body;

    if (!code) {
        throw new Err(ErrorCode.BAD_REQUEST, "No code provided!");
    }

    ctx.body = await ctx.api.activateSession(id, code);
}

export async function revokeSession(ctx: Context, id: string) {
    await ctx.api.revokeSession(id);
    ctx.body = "";
}

export async function getAccount(ctx: Context) {
    const account = await ctx.api.getAccount(ctx.state.account!);
    ctx.body = await account.serialize();
}

export async function updateAccount(ctx: Context) {
    const account = await new Account().deserialize(ctx.request.body);
    await ctx.api.updateAccount(account);
    ctx.body = await account.serialize();
}

export async function getAccountStore(ctx: Context) {
    const store = await ctx.api.getAccountStore(new AccountStore(ctx.state.account!));
    ctx.body = await store.serialize();
}

export async function updateAccountStore(ctx: Context) {
    const store = await new AccountStore(ctx.state.account!).deserialize(ctx.request.body);
    await ctx.api.updateAccountStore(store);
    ctx.body = await store.serialize();
}

export async function getSharedStore(ctx: Context, id: string) {
    const store = await ctx.api.getSharedStore(new SharedStore(id, ctx.state.account!));
    ctx.body = await store.serialize();
}

export async function updateSharedStore(ctx: Context, id: string) {
    const store = await new SharedStore(id, ctx.state.account!).deserialize(ctx.request.body);
    await ctx.api.updateSharedStore(store);
    ctx.body = await store.serialize();
}

export async function createSharedStore(ctx: Context) {
    const store = await ctx.api.createSharedStore(ctx.request.body as CreateSharedStoreParams);
    ctx.body = await store.serialize();
}

export async function getOrganization(ctx: Context, id: string) {
    const org = await ctx.api.getOrganization(new Organization(id, ctx.state.account!));
    ctx.body = await org.serialize();
}

export async function updateOrganization(ctx: Context, id: string) {
    const org = await new Organization(id, ctx.state.account!).deserialize(ctx.request.body);
    await ctx.api.updateOrganization(org);
    ctx.body = await org.serialize();
}

export async function createOrganization(ctx: Context) {
    const org = await ctx.api.createOrganization(ctx.request.body as CreateOrganizationParams);
    ctx.body = await org.serialize();
}

export async function updateOrganizationInvite(ctx: Context, id: string) {
    const org = await new Organization(id, ctx.state.account!);
    const invite = await new Invite().deserialize(ctx.request.body);
    await ctx.api.updateInvite(invite, org);
    ctx.body = await org.serialize();
}
