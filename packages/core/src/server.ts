import { API, CreateAccountParams, CreateVaultParams } from "./api";
import { Storage } from "./storage";
import { Session } from "./session";
import { Account } from "./account";
import { Auth, EmailVerification } from "./auth";
import { Request, Response } from "./transport";
import { Err, ErrorCode } from "./error";
import { Vault, SubVault } from "./vault";
import { Invite } from "./invite";
import { Messenger } from "./messenger";
import { Server as SRPServer } from "./srp";
import { DeviceInfo } from "./platform";
import { Base64String, base64ToHex } from "./encoding";
import { getProvider } from "./crypto";
import { uuid } from "./util";
import { EmailVerificationMessage, InviteCreatedMessage, InviteAcceptedMessage, MemberAddedMessage } from "./messages";

const pendingAuths = new Map<string, SRPServer>();

export interface ServerConfig {
    clientUrl: string;
    reportErrors: string;
}

export class Context implements API {
    session?: Session;
    account?: Account;
    device?: DeviceInfo;

    constructor(public config: ServerConfig, public storage: Storage, public messenger: Messenger) {}

    async verifyEmail(email: string) {
        const v = new EmailVerification(email, base64ToHex(await getProvider().randomBytes(3)), uuid());
        await this.storage.set(v);
        this.messenger.send(email, new EmailVerificationMessage(v));
    }

    async initAuth(email: string): Promise<{ auth: Auth; B: Base64String }> {
        const auth = new Auth(email);

        try {
            await this.storage.get(auth);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                // Account does not exist. Send randomized values
                const auth = new Auth(email);
                auth.keyParams.salt = await getProvider().randomBytes(32);
                auth.account = uuid();
                return {
                    auth,
                    B: await getProvider().randomBytes(32)
                };
            }
            throw e;
        }

        const srp = new SRPServer();
        await srp.initialize(auth.verifier);

        pendingAuths.set(auth.account, srp);

        return {
            auth,
            B: srp.B!
        };
    }

    async updateAuth(auth: Auth): Promise<void> {
        const { account } = this._requireAuth();

        if (account.email !== auth.email) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        await this.storage.set(auth);
    }

    async createSession({ account, A, M }: { account: string; A: Base64String; M: Base64String }): Promise<Session> {
        const srp = pendingAuths.get(account);

        if (!srp) {
            throw new Err(ErrorCode.INVALID_CREDENTIALS);
        }

        await srp.setA(A);

        if (M !== srp.M1) {
            throw new Err(ErrorCode.INVALID_CREDENTIALS);
        }

        const acc = new Account(account);

        await this.storage.get(acc);

        const session = new Session(uuid());
        session.account = account;
        session.device = this.device;
        session.key = srp.K!;

        acc.sessions.update(session);

        await Promise.all([this.storage.set(session), this.storage.set(acc)]);

        pendingAuths.delete(account);

        // Delete key before returning session
        session.key = "";
        return session;
    }

    async revokeSession(session: Session) {
        const { account } = this._requireAuth();

        await this.storage.get(session);

        account.sessions.remove(session);
        account.sessions.revision = { id: uuid(), date: new Date() };

        await Promise.all([this.storage.delete(session), this.storage.set(account)]);
    }

    async createAccount(params: CreateAccountParams): Promise<Account> {
        const { account, auth, verify } = params;

        const ev = new EmailVerification(auth.email);
        try {
            await this.storage.get(ev);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Email verification required.");
            } else {
                throw e;
            }
        }

        if (ev.code !== verify.toLowerCase()) {
            throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Invalid verification code. Please try again!");
        }

        // Make sure account does not exist yet
        try {
            await this.storage.get(auth);
            throw new Err(ErrorCode.ACCOUNT_EXISTS, "This account already exists!");
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        account.id = uuid();
        auth.account = account.id;

        const vault = new Vault(uuid(), "My Vault");
        vault.owner = account.id;
        vault.created = new Date();
        vault.updated = new Date();
        account.mainVault = vault.id;

        await Promise.all([this.storage.set(account), this.storage.set(vault), this.storage.set(auth)]);

        return account;
    }

    async getAccount() {
        const { account } = this._requireAuth();
        return account;
    }

    async updateAccount(account: Account) {
        const existing = this._requireAuth().account;
        existing.merge(account);
        await this.storage.set(existing);
        return existing;
    }

    async getVault(vault: Vault) {
        const { account } = this._requireAuth();

        await this.storage.get(vault);

        const parent = vault.parent && new Vault(vault.parent.id);
        parent && (await this.storage.get(parent));
        const ownsParent = parent && parent.isOwner(account);

        if (!vault.isOwner(account) && !vault.isMember(account) && !ownsParent) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        return vault;
    }

    async updateVault(vault: Vault) {
        const { account } = this._requireAuth();

        const existing = new Vault(vault.id);
        await this.storage.get(existing);

        const parent = vault.parent && new Vault(vault.parent.id);
        parent && (await this.storage.get(parent));
        const ownsParent = parent && parent.isOwner(account);

        if (!vault.isOwner(account) && !vault.isMember(account) && !ownsParent) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        const hasPermission = vault.archived
            ? vault.isOwner(account) || ownsParent
            : vault.isOwner(account) || ownsParent || vault.getPermissions(account).write;

        if (!hasPermission) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        if (
            vault.revision.id !== existing.revision.id &&
            (!vault.revision.mergedFrom || !vault.revision.mergedFrom.includes(existing.revision.id))
        ) {
            throw new Err(ErrorCode.MERGE_CONFLICT);
        }

        existing.access(account);
        const changes = existing.merge(vault, existing.getPermissions());

        const promises = [];

        if (changes.members) {
            for (const member of changes.members.added) {
                const acc = new Account(member.id);
                await this.storage.get(acc);
                acc.vaults.update({ ...vault.info, updated: new Date() });
                if (acc.id !== account.id) {
                    this.messenger.send(
                        member.email,
                        new MemberAddedMessage(vault, `${this.config.clientUrl}/vaults/${vault.id}`)
                    );
                }
                promises.push(this.storage.set(acc));
            }

            for (const member of changes.members.removed) {
                const acc = new Account(member.id);
                await this.storage.get(acc);
                acc.vaults.remove({ ...vault.info, updated: new Date() });
                promises.push(this.storage.set(acc));
            }
        }

        for (const invite of (changes.invites && changes.invites.added) || []) {
            let link = `${this.config.clientUrl}/invite/${vault.id}/${invite.id}`;

            try {
                await this.storage.get(new Auth(invite.email));
            } catch (e) {
                if (e.code !== ErrorCode.NOT_FOUND) {
                    throw e;
                }
                // account does not exist yet; add verification code to link
                const v = new EmailVerification(invite.email, base64ToHex(await getProvider().randomBytes(3)), uuid());
                await this.storage.set(v);
                link += `?verify=${v.code}`;
            }

            this.messenger.send(invite.email, new InviteCreatedMessage(invite, link));
        }

        await [...promises, this.storage.set(existing)];

        return vault;
    }

    async createVault(params: CreateVaultParams) {
        const { account } = this._requireAuth();

        const { name } = params;
        const vault = await new Vault(uuid(), name);
        vault.owner = account.id;
        vault.created = new Date();

        await this.storage.set(vault);

        return vault;
    }

    async deleteVault(vault: Vault) {
        const { account } = this._requireAuth();
        await this.storage.get(vault);

        const parent = vault.parent && new Vault(vault.parent.id);
        parent && (await this.storage.get(parent));
        const ownsParent = parent && parent.isOwner(account);

        if ((!vault.isOwner(account) && !ownsParent) || vault.id === account.mainVault) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const promises = [this.storage.delete(vault)];

        if (parent) {
            parent.vaults.remove(vault.info as SubVault);
            promises.push(this.storage.set(parent));
        }

        for (const { id } of vault.vaults) {
            promises.push(this.deleteVault(new Vault(id)));
        }

        // TODO: remove vault from all member accounts?

        // for (const member of vault.members) {
        //     if (vault.isOwner(member)) {
        //         continue;
        //     }
        //     promises.push(
        //         (async () => {
        //             const account = new Account(member.id);
        //             await this.storage.get(account);
        //             account.vaults.remove(vault.info as CollectionItem & VaultInfo);
        //             await this.storage.set(account);
        //         })()
        //     );
        // }
        await Promise.all(promises);
    }

    async getInvite({ vault, id }: { vault: string; id: string }) {
        const v = new Vault(vault);
        await this.storage.get(v);

        const invite = v.invites.get(id);

        if (!invite) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        return invite;
    }

    async acceptInvite(invite: Invite) {
        if (!invite.accepted) {
            throw new Err(ErrorCode.BAD_REQUEST);
        }

        const { account } = this._requireAuth();

        const vault = new Vault(invite.vault!.id);

        await this.storage.get(vault);

        const existing = vault.invites.get(invite.id);

        if (!existing) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        if (existing.email !== account.email) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        if (!existing.accepted && invite.invitor) {
            this.messenger.send(
                invite.invitor.email,
                new InviteAcceptedMessage(invite, `${this.config.clientUrl}/invite/${vault.id}/${invite.id}`)
            );
        }

        vault.invites.update(invite);
        vault.invites.revision = { id: uuid(), date: new Date() };

        await this.storage.set(vault);
    }

    private _requireAuth(): { account: Account; session: Session } {
        const { account, session } = this;

        if (!session || !account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        return { account, session };
    }
}

export class Server {
    constructor(public config: ServerConfig, private storage: Storage, private messenger: Messenger) {}

    async handle(req: Request) {
        const res = { result: null };
        try {
            const context = new Context(this.config, this.storage, this.messenger);
            context.device = req.device;
            await this._authenticate(req, context);
            await this._process(req, res, context);
            if (context.session) {
                await context.session.authenticate(res);
            }
        } catch (e) {
            this._handleError(e, res);
        }
        return res;
    }

    private async _process(req: Request, res: Response, ctx: Context): Promise<void> {
        const { method, params } = req;
        const { account } = ctx;

        let session: Session;
        let acc: Account;
        let vault: Vault;

        switch (method) {
            case "verifyEmail":
                if (!params || params.length !== 1 || typeof params[0].email !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }

                res.result = await ctx.verifyEmail(params[0].email);
                break;

            case "initAuth":
                if (!params || params.length !== 1 || typeof params[0].email !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                const { auth: _auth, B } = await ctx.initAuth(params[0].email);
                res.result = {
                    auth: await _auth.serialize(),
                    B
                };
                break;

            case "updateAuth":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }

                const auth = await new Auth().deserialize(params[0]);
                await ctx.updateAuth(auth);
                break;

            case "createSession":
                // TODO: check params
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                session = await ctx.createSession(params[0]);
                res.result = await session.serialize();
                break;

            case "revokeSession":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                session = await new Session().deserialize(params[0]);
                await ctx.revokeSession(session);
                break;

            case "getAccount":
                if (!account) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                res.result = await account.serialize();
                break;

            case "createAccount":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }

                acc = await ctx.createAccount({
                    account: await new Account().deserialize(params[0].account),
                    auth: await new Auth().deserialize(params[0].auth),
                    verify: params[0].verify,
                    invite: params[0].invite
                });
                res.result = await acc.serialize();
                break;

            case "updateAccount":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                acc = await ctx.updateAccount(await new Account().deserialize(params[0]));
                res.result = await acc.serialize();
                break;

            case "getVault":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                vault = await ctx.getVault(await new Vault(params[0].id));
                res.result = await vault.serialize();
                break;

            case "updateVault":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                vault = await ctx.updateVault(await new Vault().deserialize(params[0]));
                res.result = await vault.serialize();
                break;

            case "createVault":
                // TODO: Validate params
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                vault = await ctx.createVault(params[0]);
                res.result = await vault.serialize();
                break;

            case "deleteVault":
                if (!params || (params.length !== 1 && typeof params[0].id !== "string")) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                vault = new Vault(params[0].id);
                await ctx.deleteVault(vault);
                break;

            case "getInvite":
                // TODO: Validate params
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                const invite = await ctx.getInvite(params[0]);
                res.result = await invite.serialize();
                break;

            case "acceptInvite":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                await ctx.acceptInvite(await new Invite().deserialize(params[0]));
                break;

            default:
                throw new Err(ErrorCode.INVALID_REQUEST);
        }
    }

    private async _authenticate(req: Request, ctx: Context) {
        if (!req.auth) {
            return;
        }

        const session = new Session(req.auth.session);

        try {
            await ctx.storage.get(session);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.INVALID_SESSION);
            } else {
                throw e;
            }
        }

        if (session.expires && session.expires < new Date()) {
            throw new Err(ErrorCode.SESSION_EXPIRED);
        }

        if (!(await session.verify(req))) {
            throw new Err(ErrorCode.INVALID_REQUEST);
        }

        const account = new Account(session.account);
        await ctx.storage.get(account);

        ctx.session = session;
        ctx.account = account;

        session.lastUsed = new Date();
        session.device = ctx.device;
        session.updated = new Date();

        account.sessions.update(session.info);

        await Promise.all([ctx.storage.set(session), ctx.storage.set(account)]);
    }

    _handleError(e: Error, res: Response) {
        if (e instanceof Err) {
            res.error = {
                code: e.code,
                message: e.message
            };
        } else {
            console.error(e.stack);
            if (this.config.reportErrors) {
                this.messenger.send(this.config.reportErrors, {
                    title: "Padloc Error Notification",
                    text: `The following error occurred at ${new Date().toString()}:\n\n${e.stack}`,
                    html: ""
                });
            }
            res.error = {
                code: ErrorCode.SERVER_ERROR,
                message:
                    "Something went wrong while we were processing your request. " +
                    "Our team has been notified and will resolve the problem as soon as possible!"
            };
        }
    }
}
