import { API, CreateAccountParams, CreateStoreParams } from "@padlock/core/src/api";
import { Storage, Storable } from "@padlock/core/src/storage";
import { Store } from "@padlock/core/src/store";
import { DateString, Base64String } from "@padlock/core/src/encoding";
import { AuthInfo, Account, AccountID, Session } from "@padlock/core/src/auth";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { uuid } from "@padlock/core/src/util";
import { Server as SRPServer } from "@padlock/core/src/srp";
import { defaultPBKDF2Params } from "@padlock/core/src/crypto";
import { NodeCryptoProvider } from "@padlock/core/src/node-crypto-provider";
import { Sender } from "./sender";
import { EmailVerificationMessage } from "./messages";
import { RequestState } from "./server";
import { randomBytes } from "crypto";

const crypto = new NodeCryptoProvider();

export class EmailVerification implements Storable {
    kind = "email-verification";
    code: string = "";
    created: DateString = new Date().toISOString();

    get pk() {
        return this.email;
    }

    constructor(public email: string) {
        this.code = randomBytes(3).toString("hex");
    }

    async serialize() {
        return {
            email: this.email,
            code: this.code
        };
    }

    async deserialize(raw: any) {
        this.email = raw.email;
        this.code = raw.code;
        return this;
    }
}

const pendingAuths = new Map<string, SRPServer>();

export class ServerAPI implements API {
    constructor(private storage: Storage, private sender: Sender, private state: RequestState) {}

    async verifyEmail({ email }: { email: string }) {
        const v = new EmailVerification(email);
        await this.storage.set(v);
        this.sender.send(email, new EmailVerificationMessage(v));
    }

    async initAuth({ email }: { email: string }) {
        const authInfo = new AuthInfo(email);

        try {
            await this.storage.get(authInfo);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                const keyParams = defaultPBKDF2Params();
                keyParams.salt = await crypto.randomBytes(32);
                // Account does not exist. Send randomized values
                return {
                    account: uuid(),
                    keyParams,
                    B: await crypto.randomBytes(32)
                };
            }
            throw e;
        }

        const srp = new SRPServer();
        await srp.initialize(authInfo.verifier);

        pendingAuths.set(authInfo.account, srp);

        return {
            B: srp.B!,
            account: authInfo.account,
            keyParams: authInfo.keyParams
        };
    }

    async createSession({ account, A, M }: { account: AccountID; A: Base64String; M: Base64String }): Promise<Session> {
        const srp = pendingAuths.get(account);

        if (!srp) {
            throw new Err(ErrorCode.BAD_REQUEST);
        }

        await srp.setA(A);

        if (M !== srp.M1) {
            throw new Err(ErrorCode.BAD_REQUEST);
        }

        const acc = new Account(account);

        await this.storage.get(acc);

        const session = new Session(uuid());
        session.account = account;
        session.device = this.state.device;
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

    async createAccount(params: CreateAccountParams): Promise<Account> {
        const { email, emailVerification, verifier, keyParams } = params;

        const ev = new EmailVerification(email);
        await this.storage.get(ev);
        if (ev.email !== email || ev.code !== emailVerification.toLowerCase()) {
            throw new Err(ErrorCode.BAD_REQUEST, "Email verification failed");
        }

        const authInfo = new AuthInfo(email);

        // Make sure account does not exist yet
        try {
            await this.storage.get(authInfo);
            throw new Err(ErrorCode.BAD_REQUEST, "Account already exists");
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        const account = await new Account().deserialize(params);
        account.id = uuid();

        const store = new Store(uuid(), "Main");
        account.store = store.id;

        authInfo.account = account.id;
        authInfo.verifier = verifier;
        authInfo.keyParams = keyParams;

        await Promise.all([this.storage.set(account), this.storage.set(store), this.storage.set(authInfo)]);

        return account;
    }

    async getAccount() {
        const { account } = this._requireAuth();
        return account;
    }

    async updateAccount(account: Account) {
        const existing = this._requireAuth().account;
        const { name } = account;

        if (name) {
            if (typeof name !== "string") {
                throw new Err(ErrorCode.BAD_REQUEST);
            }
            account.name = name;
        }

        await this.storage.set(existing);
        return existing;
    }

    async getStore(store: Store) {
        const { account } = this._requireAuth();

        if (!store.isMember(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        await this.storage.get(store);
        return store;
    }

    async updateStore(store: Store) {
        const { account } = this._requireAuth();

        const existing = new Store(store.id);
        await this.storage.get(existing);

        const member = existing.getMember(account);
        const permissions = (member && member.permissions) || { read: false, write: false, manage: false };

        if (!permissions.write) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Write permissions required to update store contents.");
        }

        // const { added, changed } = existing.mergeAccessors(store.accessors);
        //
        // if ((added.length || changed.length) && !permissions.manage) {
        //     throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Manage permissions required to update store accessors.");
        // }
        //
        // for (const accessor of added) {
        //     const acc = new Account(accessor.email);
        //     await this.storage.get(acc);
        //     acc.sharedStores.push(store.id);
        //     await this.storage.set(acc);
        // }

        await this.storage.set(store);

        return store;
    }

    async createStore(params: CreateStoreParams) {
        const { account } = this._requireAuth();

        const { name } = params;
        const store = await new Store(uuid(), name);
        store.owner = account.id;

        await Promise.all([this.storage.set(account), this.storage.set(store)]);

        return store;
    }

    private _requireAuth(): { account: Account; session: Session } {
        const { account, session } = this.state;

        if (!session || !account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        return { account, session };
    }
}
