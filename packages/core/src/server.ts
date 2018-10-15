import { API, CreateAccountParams, CreateVaultParams } from "./api";
import { Storage } from "./storage";
import { Session, Account, Auth } from "./auth";
import { Request, Response } from "./transport";
import { Err, ErrorCode } from "./error";
import { Vault } from "./vault";
import { Invite } from "./invite";
import { Messenger } from "./messenger";
import { Server as SRPServer } from "./srp";
import { DeviceInfo } from "./platform";
import { EmailVerification } from "./auth";
import { Base64String, base64ToHex } from "./encoding";
import { getProvider } from "./crypto";
import { uuid } from "./util";
import { EmailVerificationMessage, InviteCreatedMessage, InviteAcceptedMessage, MemberAddedMessage } from "./messages";

const pendingAuths = new Map<string, SRPServer>();

export class Context implements API {
    session?: Session;
    account?: Account;
    device?: DeviceInfo;

    constructor(public storage: Storage, public messenger: Messenger) {}

    async verifyEmail({ email }: { email: string }) {
        const v = new EmailVerification(email, base64ToHex(await getProvider().randomBytes(3)), uuid());
        await this.storage.set(v);
        this.messenger.send(email, new EmailVerificationMessage(v));
        return { id: v.id };
    }

    async initAuth({ email }: { email: string }): Promise<{ auth: Auth; B: Base64String }> {
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

        acc.sessions.add(session.id);

        await Promise.all([this.storage.set(session), this.storage.set(acc)]);

        pendingAuths.delete(account);

        // Delete key before returning session
        session.key = "";
        return session;
    }

    async revokeSession(session: Session) {
        const { account } = this._requireAuth();

        await this.storage.get(session);

        account.sessions.delete(session.id);

        await Promise.all([this.storage.delete(session), this.storage.set(account)]);
    }

    async getSessions() {
        const { account } = this._requireAuth();
        const sessions = Promise.all(
            Array.from(account.sessions).map(async id => {
                const session = new Session(id);
                try {
                    await this.storage.get(session);
                } catch (e) {
                    if (e.code === ErrorCode.NOT_FOUND) {
                        account.sessions.delete(id);
                    } else {
                        throw e;
                    }
                }
                return session;
            })
        );
        await this.storage.set(account);
        return sessions;
    }

    async createAccount(params: CreateAccountParams): Promise<Account> {
        const {
            account,
            auth,
            emailVerification: { id, code }
        } = params;

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

        if (ev.id !== id || ev.code !== code.toLowerCase()) {
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

        const vault = new Vault(uuid(), "Main");
        vault.owner = account.id;
        account.vault = vault.id;

        await Promise.all([this.storage.set(account), this.storage.set(vault), this.storage.set(auth)]);

        return account;
    }

    async getAccount() {
        const { account } = this._requireAuth();
        return account;
    }

    async updateAccount(account: Account) {
        const existing = this._requireAuth().account;
        existing.update(account);
        await this.storage.set(existing);
        return existing;
    }

    async getVault(vault: Vault) {
        const { account } = this._requireAuth();

        await this.storage.get(vault);
        const { read } = vault.getPermissions(account);

        if (!read) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        return vault;
    }

    async updateVault(vault: Vault) {
        const { account } = this._requireAuth();

        const existing = new Vault(vault.id);
        await this.storage.get(existing);

        const addedMembers = vault.members.filter(m => !existing.isMember(m));
        for (const member of addedMembers) {
            const acc = new Account(member.id);
            await this.storage.get(acc);
            acc.vaults.push(vault.info);
            if (acc.id !== account.id) {
                this.messenger.send(member.email, new MemberAddedMessage(vault));
            }
            await this.storage.set(acc);
        }

        existing.access(account);
        existing.update(vault);

        await this.storage.set(existing);

        return vault;
    }

    async createVault(params: CreateVaultParams) {
        const { account } = this._requireAuth();

        const { name } = params;
        const vault = await new Vault(uuid(), name);
        vault.owner = account.id;

        await Promise.all([this.storage.set(account), this.storage.set(vault)]);

        return vault;
    }

    async updateInvite(invite: Invite) {
        const { account } = this._requireAuth();

        const vault = new Vault(invite.vault!.id);

        await this.storage.get(vault);

        const existing = vault.getInvite(invite.email);

        if (!vault.isAdmin(account) && existing && existing.email !== account.email) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        vault.updateInvite(invite);

        await this.storage.set(vault);

        if (!invite.accepted) {
            this.messenger.send(invite.email, new InviteCreatedMessage(invite));
        } else if (invite.invitor) {
            this.messenger.send(invite.invitor.email, new InviteAcceptedMessage(invite));
        }

        return invite;
    }

    async deleteInvite(invite: Invite) {
        const { account } = this._requireAuth();

        const vault = new Vault(invite.vault!.id);

        await this.storage.get(vault);

        if (!vault.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        vault.deleteInvite(invite);

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
    constructor(private storage: Storage, private messenger: Messenger) {}

    async handle(req: Request) {
        const context = new Context(this.storage, this.messenger);
        await this._authenticate(req, context);
        const res = { result: null };
        try {
            await this._process(req, res, context);
        } catch (e) {
            this._handleError(e, res);
        }
        if (context.session) {
            await context.session.authenticate(res);
        }
        return res;
    }

    private async _process(req: Request, res: Response, ctx: Context): Promise<void> {
        const { method, params } = req;
        const { account } = ctx;

        let session: Session;
        let acc: Account;
        let vault: Vault;
        let invite: Invite;

        switch (method) {
            case "verifyEmail":
                if (!params || params.length !== 1 || typeof params[0].email !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }

                res.result = await ctx.verifyEmail({ email: params[0].email });
                break;

            case "initAuth":
                if (!params || params.length !== 1 || typeof params[0].email !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                const { auth: _auth, B } = await ctx.initAuth({ email: params[0].email });
                res.result = {
                    auth: await _auth.serialize(),
                    B
                };
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
                res.result = null;
                break;

            case "getSessions":
                res.result = await ctx.getSessions();
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
                    emailVerification: params[0].emailVerification
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
                vault = await ctx.getVault(await new Vault().deserialize(params[0]));
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

            case "updateInvite":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                invite = await ctx.updateInvite(await new Invite().deserialize(params[0]));
                res.result = await invite.serialize();
                break;

            case "deleteInvite":
                if (!params || params.length !== 1) {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                invite = await new Invite().deserialize(params[0]);
                await ctx.deleteInvite(invite);
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

        if (session.expires && new Date(session.expires) < new Date()) {
            throw new Err(ErrorCode.SESSION_EXPIRED);
        }

        if (!(await session.verify(req))) {
            throw new Err(ErrorCode.INVALID_REQUEST);
        }

        const account = new Account(session.account);
        await ctx.storage.get(account);

        ctx.session = session;
        ctx.account = account;

        // TODO
        // session.device = req.device;
        session.lastUsed = new Date().toISOString();

        await ctx.storage.set(session);
    }

    _handleError(e: Error, res: Response) {
        if (e instanceof Err) {
            res.error = {
                code: e.code,
                message: e.message
            };
        } else {
            console.error(e.stack);
            this.messenger.send("support@padlock.io", {
                title: "Padlock Error Notification",
                text: `The following error occurred at ${new Date().toString()}:\n\n${e.stack}`,
                html: ""
            });
            res.error = {
                code: ErrorCode.SERVER_ERROR,
                message:
                    "Something went wrong while we were processing your request. " +
                    "Our team has been notified and will resolve the problem as soon as possible!"
            };
        }
    }
}
