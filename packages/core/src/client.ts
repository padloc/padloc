import { API, CreateAccountParams, CreateStoreParams, CreateOrgParams } from "./api";
import { Sender } from "./transport";
import { DeviceInfo } from "./platform";
import { Session, Account, AccountID, Auth } from "./auth";
import { Invite } from "./invite";
import { Base64String } from "./encoding";
import { Org } from "./org";
import { Store } from "./store";
import { Err, ErrorCode } from "./error";

export interface ClientSettings {
    customServer: boolean;
    customServerUrl: string;
}

export interface ClientState {
    session: Session | null;
    account: Account | null;
    device: DeviceInfo;
    settings: ClientSettings;
}

export class Client implements API {
    constructor(public state: ClientState, private sender: Sender) {}

    get session() {
        return this.state.session;
    }

    async call(method: string, params?: any[]) {
        const { session } = this.state;

        const req = { method, params };

        if (session) {
            await session.authenticate(req);
        }

        // headers.set("X-Device", marshal(this.state.device));

        const res = await this.sender.send(req);

        if (res.error) {
            throw new Err((res.error.code as any) as ErrorCode, res.error.message);
        }

        if (session && !(await session.verify(res))) {
            throw new Err(ErrorCode.INVALID_RESPONSE);
        }

        return res;
    }

    async verifyEmail(params: { email: string }) {
        const res = await this.call("verifyEmail", [params]);
        return res.result;
    }

    async initAuth(params: { email: string }) {
        const res = await this.call("initAuth", [params]);
        const { auth, B } = res.result;
        return { auth: await new Auth(params.email).deserialize(auth), B };
    }

    async createSession(params: { account: AccountID; M: Base64String; A: Base64String }): Promise<Session> {
        const res = await this.call("createSession", [params]);
        return new Session().deserialize(res.result);
    }

    async revokeSession(session: Session): Promise<void> {
        await this.call("revokeSession", [await session.serialize()]);
    }

    async getSessions() {
        const res = await this.call("getSessions");
        return res.result;
    }

    async createAccount(params: CreateAccountParams): Promise<Account> {
        const res = await this.call("createAccount", [
            {
                auth: await params.auth.serialize(),
                account: await params.account.serialize(),
                emailVerification: params.emailVerification
            }
        ]);
        return new Account().deserialize(res.result);
    }

    async getAccount(account: Account): Promise<Account> {
        const res = await this.call("getAccount");
        return await account.deserialize(res.result);
    }

    async updateAccount(account: Account): Promise<Account> {
        const res = await this.call("updateAccount", [await account.serialize()]);
        return account.deserialize(res.result);
    }

    async getStore(store: Store): Promise<Store> {
        const res = await this.call("getStore", [await store.serialize()]);
        return store.deserialize(res.result);
    }

    async createStore(params: CreateStoreParams): Promise<Store> {
        const res = await this.call("createStore", [params]);
        return new Store("").deserialize(res.result);
    }

    async updateStore(store: Store): Promise<Store> {
        const res = await this.call("updateStore", [await store.serialize()]);
        return store.deserialize(res.result);
    }

    async getOrg(org: Org): Promise<Org> {
        const res = await this.call("getOrg", [await org.serialize()]);
        return org.deserialize(res.result);
    }

    async createOrg(params: CreateOrgParams): Promise<Org> {
        const res = await this.call("createOrg", [params]);
        return new Org("").deserialize(res.result);
    }

    async updateOrg(org: Org): Promise<Org> {
        const res = await this.call("updateOrg", [await org.serialize()]);
        return org.deserialize(res.result);
    }

    async updateInvite(invite: Invite): Promise<Invite> {
        const res = await this.call("updateInvite", [await invite.serialize()]);
        return invite.deserialize(res.result);
    }

    async deleteInvite(invite: Invite): Promise<void> {
        await this.call("deleteInvite", [await invite.serialize()]);
    }
}
