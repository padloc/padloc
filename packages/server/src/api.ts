import { API, CreateAccountParams, CreateSharedStoreParams, CreateOrganizationParams } from "@padlock/core/src/api";
import { Storage } from "@padlock/core/src/storage";
import { AccountStore, SharedStore } from "@padlock/core/src/data";
import { Account, Session, Organization } from "@padlock/core/src/auth";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { uuid } from "@padlock/core/lib/util.js";
import { Sender } from "./sender";
import { AuthRequest } from "./auth";
import { LoginMessage } from "./messages";
import { RequestState } from "./server";

export class ServerAPI implements API {
    constructor(private storage: Storage, private sender: Sender, private state: RequestState) {}

    async createSession(email: string) {
        const req = AuthRequest.create(email);
        await this.storage.set(req);

        this.sender.send(email, new LoginMessage(req));

        return req.session;
    }

    async activateSession(id: string, code: string) {
        const req = new AuthRequest();
        req.session.id = id;
        await this.storage.get(req);

        if (req.code.toLowerCase() !== code.toLowerCase()) {
            throw new Err(ErrorCode.BAD_REQUEST, "Invalid code");
        }

        const acc = new Account(req.email);
        try {
            await this.storage.get(acc);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                acc.id = uuid();
                await this.storage.set(acc);
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
        await this.storage.set(acc);

        await this.storage.delete(req);

        return req.session;
    }

    async revokeSession(id: string) {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }
        const account = this.state.account;
        account.sessions = account.sessions.filter((s: Session) => s.id !== id);
        await this.storage.set(account);
    }

    async createAccount(_: CreateAccountParams): Promise<Account> {
        throw new Err(ErrorCode.NOT_FOUND);
    }

    async getAccount() {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }
        return this.state.account;
    }

    async getAccountStore() {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }
        const store = new AccountStore(this.state.account);
        await this.storage.get(store);
        return store;
    }

    async updateAccountStore(store: AccountStore) {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }
        await this.storage.set(store);
        return store;
    }

    async getSharedStore(store: SharedStore) {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        store.account = this.state.account;

        if (!store.permissions.read) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        await this.storage.get(store);
        return store;
    }

    async updateSharedStore(store: SharedStore) {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        const account = (store.account = this.state.account);
        const existing = new SharedStore(store.id, account);

        await this.storage.get(existing);

        const permissions = existing.permissions;

        if (!permissions.write) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Write permissions required to update store contents.");
        }

        const { added, changed } = existing.mergeAccessors(store.accessors);

        if ((added.length || changed.length) && !permissions.manage) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Manage permissions required to update store accessors.");
        }

        for (const accessor of added) {
            const acc = new Account(accessor.email);
            await this.storage.get(acc);
            acc.sharedStores.push(store.id);
            await this.storage.set(acc);
        }

        await this.storage.set(store);

        return store;
    }

    async createSharedStore(params: CreateSharedStoreParams) {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        const { name } = params;
        const account = this.state.account;
        const store = await new SharedStore(uuid(), account, name);
        store.owner = account.id;

        await Promise.all([this.storage.set(account), this.storage.set(store)]);

        return store;
    }

    async updateAccount(account: Account) {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        const existing = this.state.account;
        const { publicKey } = account;

        if (publicKey) {
            if (typeof publicKey !== "string") {
                throw new Err(ErrorCode.BAD_REQUEST);
            }
            existing.publicKey = publicKey;
        }
        //
        // if (name) {
        //     if (typeof name !== "string") {
        //         throw new Err(ErrorCode.BAD_REQUEST);
        //     }
        //     account.name = name;
        // }

        await this.storage.set(existing);
        return existing;
    }

    async createOrganization(params: CreateOrganizationParams) {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        const { name } = params;

        const account = this.state.account;
        const org = await new Organization(uuid(), account, name);
        org.owner = account.id;

        account.organizations.push(org.id);

        await Promise.all([this.storage.set(account), this.storage.set(org)]);

        return org;
    }

    async getOrganization(org: Organization) {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        const account = this.state.account!;

        await this.storage.get(org);

        if (!org.isMember(account)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        return org;
    }

    async updateOrganization(org: Organization) {
        if (!this.state.session || !this.state.account) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        const account = (org.account = this.state.account);

        const existing = new Organization(org.id, account);
        await this.storage.get(existing);

        if (!existing.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Only admins can update organizations");
        }

        await this.storage.set(org);

        return org;
    }
}
