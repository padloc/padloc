import { bytesToHex } from "./encoding";
import {
    API,
    RequestEmailVerificationParams,
    CompleteEmailVerificationParams,
    InitAuthParams,
    InitAuthResponse,
    CreateAccountParams,
    RecoverAccountParams,
    CreateSessionParams
} from "./api";
import { Storage } from "./storage";
import {
    // Attachment,
    AttachmentStorage
} from "./attachment";
import { Session, SessionID } from "./session";
import { Account } from "./account";
import { Auth, EmailVerification } from "./auth";
import { Request, Response } from "./transport";
import { Err, ErrorCode } from "./error";
import { Vault, VaultID } from "./vault";
import { Org } from "./org";
// import { Invite } from "./invite";
import { Messenger } from "./messenger";
import { Server as SRPServer } from "./srp";
import { DeviceInfo } from "./platform";
import { getProvider } from "./crypto";
import { uuid } from "./util";
import {
    EmailVerificationMessage
    //, InviteCreatedMessage, InviteAcceptedMessage, MemberAddedMessage
} from "./messages";

const pendingAuths = new Map<string, SRPServer>();
const cachedFakeAuthParams = new Map<string, Auth>();

export interface ServerConfig {
    clientUrl: string;
    reportErrors: string;
}

export class Context implements API {
    session?: Session;
    account?: Account;
    device?: DeviceInfo;

    constructor(
        public config: ServerConfig,
        public storage: Storage,
        public messenger: Messenger,
        public attachmentStorage: AttachmentStorage
    ) {}

    async requestEmailVerification({ email, purpose }: RequestEmailVerificationParams) {
        const v = new EmailVerification(email, purpose);
        await v.init();
        await this.storage.save(v);
        this.messenger.send(email, new EmailVerificationMessage(v));
    }

    async completeEmailVerification({ email, code }: CompleteEmailVerificationParams) {
        return await this._checkEmailVerificationCode(email, code);
    }

    async initAuth({ email }: InitAuthParams): Promise<InitAuthResponse> {
        let auth: Auth;

        try {
            auth = await this.storage.get(Auth, email);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                // Account does not exist. We don't want to respond with an error though
                // because that would allow user enumeration. Instead, we'll just send back
                // random values...

                if (!cachedFakeAuthParams.has(email)) {
                    const auth = new Auth(email);
                    auth.keyParams.salt = await getProvider().randomBytes(32);
                    auth.account = uuid();

                    // We'll have to cache our fake authentication params since returning
                    // different values on subsequent requests would give away our clever
                    // deceit...
                    cachedFakeAuthParams.set(email, auth);
                }

                return new InitAuthResponse({
                    auth: cachedFakeAuthParams.get(email)!,
                    B: await getProvider().randomBytes(32)
                });
            }
            throw e;
        }

        const srp = new SRPServer();
        await srp.initialize(auth.verifier);

        pendingAuths.set(auth.account, srp);

        return new InitAuthResponse({
            auth,
            B: srp.B!
        });
    }

    async updateAuth(auth: Auth): Promise<void> {
        const { account } = this._requireAuth();

        if (account.email !== auth.email) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        await this.storage.save(auth);
    }

    async createSession({ account, A, M }: CreateSessionParams): Promise<Session> {
        const srp = pendingAuths.get(account);

        if (!srp) {
            throw new Err(ErrorCode.INVALID_CREDENTIALS);
        }

        await srp.setA(A);

        if (bytesToHex(M) !== bytesToHex(srp.M1!)) {
            throw new Err(ErrorCode.INVALID_CREDENTIALS);
        }

        const acc = await this.storage.get(Account, account);

        const session = new Session();
        session.id = uuid();
        session.account = account;
        session.device = this.device;
        session.key = srp.K!;

        acc.sessions.push(session);

        await Promise.all([this.storage.save(session), this.storage.save(acc)]);

        pendingAuths.delete(account);

        // Delete key before returning session
        delete session.key;
        return session;
    }

    async revokeSession(id: SessionID) {
        const { account } = this._requireAuth();

        const session = await this.storage.get(Session, id);

        if (session.account !== account.id) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const i = account.sessions.findIndex(s => s.id === id);
        account.sessions.splice(i, 1);

        await Promise.all([this.storage.delete(session), this.storage.save(account)]);
    }

    async createAccount({ account, auth, verify }: CreateAccountParams): Promise<Account> {
        this._checkEmailVerificationToken(account.email, verify);

        // Make sure account does not exist yet
        try {
            await this.storage.get(Auth, auth.id);
            throw new Err(ErrorCode.ACCOUNT_EXISTS, "This account already exists!");
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        account.id = uuid();
        auth.account = account.id;

        const vault = new Vault();
        vault.id = uuid();
        vault.name = "My Vault";
        vault.owner = account.id;
        vault.created = new Date();
        vault.updated = new Date();
        account.mainVault = vault.id;

        await Promise.all([this.storage.save(account), this.storage.save(vault), this.storage.save(auth)]);

        return account;
    }

    async getAccount() {
        const { account } = this._requireAuth();
        return account;
    }

    async updateAccount({ name, email, publicKey, keyParams, encryptionParams, encryptedData }: Account) {
        const { account } = this._requireAuth();
        Object.assign(account, { name, email, publicKey, keyParams, encryptionParams, encryptedData });
        account.updated = new Date();
        await this.storage.save(account);
        return account;
    }

    async recoverAccount({
        account: { name, email, publicKey, keyParams, encryptionParams, encryptedData },
        auth,
        verify
    }: RecoverAccountParams) {
        await this._checkEmailVerificationToken(auth.email, verify);

        const existingAuth = await this.storage.get(Auth, auth.id);
        const account = await this.storage.get(Account, existingAuth.account);
        Object.assign(account, { name, email, publicKey, keyParams, encryptionParams, encryptedData });

        // reset main vault
        const mainVault = new Vault();
        mainVault.id = account.mainVault;
        mainVault.name = "My Vault";
        mainVault.owner = account.id;
        mainVault.created = new Date();
        mainVault.updated = new Date();

        auth.account = account.id;
        await Promise.all([this.storage.save(account), this.storage.save(auth), this.storage.save(mainVault)]);

        return account;
    }

    async getVault(id: VaultID) {
        const { account } = this._requireAuth();

        // Check permssion
        if (id !== account.mainVault && !account.sharedVaults.some(v => v.id === id)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        const vault = await this.storage.get(Vault, id);

        return vault;
    }

    async updateVault({ id, name, keyParams, encryptionParams, accessors, encryptedData, revision }: Vault) {
        const { account } = this._requireAuth();

        if (id !== account.mainVault) {
            const v = account.sharedVaults.find(v => v.id === id);

            if (!v) {
                throw new Err(ErrorCode.NOT_FOUND);
            }

            if (v.readonly) {
                throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
            }
        }

        const vault = await this.storage.get(Vault, id);

        if (
            revision &&
            vault.revision &&
            revision.id !== vault.revision.id &&
            (!revision.mergedFrom || !revision.mergedFrom.includes(vault.revision.id))
        ) {
            throw new Err(ErrorCode.MERGE_CONFLICT);
        }

        Object.assign(vault, { id, name, keyParams, encryptionParams, accessors, encryptedData, revision });
        vault.updated = new Date();
        await this.storage.save(vault);

        return vault;
    }

    async createVault(vault: Vault) {
        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, vault.org!);

        if (!org.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        vault.id = uuid();
        vault.owner = account.id;
        vault.created = vault.updated = new Date();

        // org.addVault(vault);

        await this.storage.save(vault);

        return vault;
    }

    async deleteVault(id: VaultID) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);

        // Only shared vaults can be deleted
        if (!vault.org) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const org = await this.storage.get(Org, vault.org);

        // Only org admins can delete vaults
        if (!org.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const promises = [this.storage.delete(vault)];
        promises.push(this.attachmentStorage.deleteAll(vault));

        // Remove vault from org
        let i = org.vaults.findIndex(v => v.id === id);
        org.vaults.splice(i, 1);

        // Remove vault from accessor accounts and groups
        for (const { id: accID } of vault.accessors) {
            // Check if accessor is a group first. If not it must be
            // an account
            const group = org.groups.find(g => g.id === accID);
            if (group) {
                i = group.vaults.findIndex(v => v.id === id);
                group.vaults.splice(i, 1);
            } else {
                const acc = await this.storage.get(Account, accID);
                i = acc.sharedVaults.findIndex(v => v.id === id);
                acc.sharedVaults.splice(i, 1);
                promises.push(this.storage.save(acc));
            }
        }

        promises.push(this.storage.save(org));

        await Promise.all(promises);
    }

    // async getInvite({ vault, id }: { vault: string; id: string }) {
    //     const v = new Vault(vault);
    //     await this.storage.get(v);
    //
    //     const invite = v.invites.get(id);
    //
    //     if (!invite) {
    //         throw new Err(ErrorCode.NOT_FOUND);
    //     }
    //
    //     return invite;
    // }
    //
    // async acceptInvite(invite: Invite) {
    //     if (!invite.accepted) {
    //         throw new Err(ErrorCode.BAD_REQUEST);
    //     }
    //
    //     const { account } = this._requireAuth();
    //
    //     const vault = new Vault(invite.vault!.id);
    //
    //     await this.storage.get(vault);
    //
    //     const existing = vault.invites.get(invite.id);
    //
    //     if (!existing) {
    //         throw new Err(ErrorCode.NOT_FOUND);
    //     }
    //
    //     if (existing.email !== account.email) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //
    //     if (!existing.accepted && invite.invitor) {
    //         this.messenger.send(
    //             invite.invitor.email,
    //             new InviteAcceptedMessage(invite, `${this.config.clientUrl}/invite/${vault.id}/${invite.id}`)
    //         );
    //     }
    //
    //     vault.invites.update(invite);
    //     vault.invites.revision = { id: uuid(), date: new Date() };
    //
    //     await this.storage.set(vault);
    // }
    //
    // async createAttachment(att: Attachment) {
    //     const { account } = this._requireAuth();
    //
    //     const vault = new Vault(att.vault);
    //     await this.storage.get(vault);
    //
    //     const permissions = vault.getPermissions(account);
    //
    //     if (!permissions.write) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //
    //     // att.id = uuid();
    //
    //     const currentUsage = await this.attachmentStorage.getUsage(vault);
    //
    //     if (currentUsage + att.size > 5e7) {
    //         throw new Err(ErrorCode.STORAGE_QUOTA_EXCEEDED);
    //     }
    //
    //     await this.attachmentStorage.put(att);
    //
    //     return att;
    // }
    //
    // async getAttachment(att: Attachment) {
    //     const { account } = this._requireAuth();
    //
    //     const vault = new Vault(att.vault);
    //     await this.storage.get(vault);
    //
    //     const permissions = vault.getPermissions(account);
    //
    //     if (!permissions.read) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //
    //     await this.attachmentStorage.get(att);
    //
    //     return att;
    // }
    //
    // async deleteAttachment(att: Attachment) {
    //     const { account } = this._requireAuth();
    //
    //     const vault = new Vault(att.vault);
    //     await this.storage.get(vault);
    //
    //     const permissions = vault.getPermissions(account);
    //
    //     if (!permissions.write) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //
    //     await this.attachmentStorage.delete(att);
    // }

    private _requireAuth(): { account: Account; session: Session } {
        const { account, session } = this;

        if (!session || !account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        return { account, session };
    }

    private async _checkEmailVerificationCode(email: string, code: string) {
        let ev: EmailVerification;
        try {
            ev = await this.storage.get(EmailVerification, email);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Email verification required.");
            } else {
                throw e;
            }
        }

        if (ev.code !== code.toLowerCase()) {
            throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Invalid verification code. Please try again!");
        }

        return ev.token;
    }

    private async _checkEmailVerificationToken(email: string, token: string) {
        let ev: EmailVerification;
        try {
            ev = await this.storage.get(EmailVerification, email);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Email verification required.");
            } else {
                throw e;
            }
        }

        if (ev.token !== token) {
            throw new Err(ErrorCode.EMAIL_VERIFICATION_FAILED, "Invalid verification token. Please try again!");
        }

        await this.storage.delete(ev);
    }

    // private async _transferVault({ vault, account }: { vault: string; account: string }, currentAccount: Account) {
    //     const vlt = new Vault(vault);
    //     await this.storage.get(vlt);
    //
    //     if (!vlt.isOwner(currentAccount)) {
    //         throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
    //     }
    //
    //     if (!vlt.members.get(account)) {
    //         throw new Err(ErrorCode.BAD_REQUEST, "The receiving account needs to be a member of the transfered vault");
    //     }
    //
    //     vlt.owner = account;
    //     vlt.archived = true;
    //     await this.storage.set(vlt);
    //
    //     for (const { id } of vlt.vaults) {
    //         await this._transferVault({ vault: id, account }, currentAccount);
    //     }
    // }
}

export class Server {
    constructor(
        public config: ServerConfig,
        private storage: Storage,
        private messenger: Messenger,
        private attachmentStorage: AttachmentStorage
    ) {}

    async handle(req: Request) {
        const res = { result: null };
        try {
            const context = new Context(this.config, this.storage, this.messenger, this.attachmentStorage);
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
        const method = req.method;
        const params = req.params || [];

        switch (method) {
            case "requestEmailVerification":
                await ctx.requestEmailVerification(new RequestEmailVerificationParams().fromRaw(params[0]));
                break;

            case "completeEmailVerification":
                res.result = await ctx.completeEmailVerification(
                    new CompleteEmailVerificationParams().fromRaw(params[0])
                );
                break;

            case "initAuth":
                res.result = (await ctx.initAuth(new InitAuthParams().fromRaw(params[0]))).toRaw();
                break;

            case "updateAuth":
                await ctx.updateAuth(new Auth().fromRaw(params[0]));
                break;

            case "createSession":
                res.result = (await ctx.createSession(new CreateSessionParams().fromRaw(params[0]))).toRaw();
                break;

            case "revokeSession":
                if (typeof params[0].id !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                await ctx.revokeSession(params[0]);
                break;

            case "getAccount":
                res.result = (await ctx.getAccount()).toRaw();
                break;

            case "createAccount":
                res.result = (await ctx.createAccount(new CreateAccountParams().fromRaw(params[0]))).toRaw();
                break;

            case "updateAccount":
                res.result = (await ctx.updateAccount(new Account().fromRaw(params[0]))).toRaw();
                break;

            case "recoverAccount":
                res.result = (await ctx.recoverAccount(new RecoverAccountParams().fromRaw(params[0]))).toRaw();
                break;

            case "getVault":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                res.result = (await ctx.getVault(params[0])).toRaw();
                break;

            case "updateVault":
                res.result = (await ctx.updateVault(new Vault().fromRaw(params[0]))).toRaw();
                break;

            case "createVault":
                res.result = (await ctx.createVault(new Vault().fromRaw(params[0]))).toRaw();
                break;

            case "deleteVault":
                if (typeof params[0] !== "string") {
                    throw new Err(ErrorCode.BAD_REQUEST);
                }
                await ctx.deleteVault(params[0]);
                break;

            default:
                throw new Err(ErrorCode.INVALID_REQUEST);
        }
    }

    private async _authenticate(req: Request, ctx: Context) {
        if (!req.auth) {
            return;
        }

        let session: Session;

        try {
            session = await ctx.storage.get(Session, req.auth.session);
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

        const account = await ctx.storage.get(Account, session.account);

        ctx.session = session;
        ctx.account = account;

        session.lastUsed = new Date();
        session.device = ctx.device;
        session.updated = new Date();

        const i = account.sessions.findIndex(({ id }) => id === session.id);
        if (i !== -1) {
            account.sessions[i] = session.info;
        } else {
            account.sessions.push(session.info);
        }

        await Promise.all([ctx.storage.save(session), ctx.storage.save(account)]);
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
