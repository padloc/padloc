import { API, CreateAccountParams, RecoverAccountParams, CreateVaultParams } from "./api";
import { Sender } from "./transport";
import { DeviceInfo } from "./platform";
import { Session } from "./session";
import { Account, AccountID } from "./account";
import { Auth, EmailVerificationPurpose } from "./auth";
import { Invite } from "./invite";
import { Base64String } from "./encoding";
import { Vault } from "./vault";
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

        const req = { method, params, device: this.state.device };

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

    async requestEmailVerification(params: { email: string; purpose?: EmailVerificationPurpose }) {
        const res = await this.call("requestEmailVerification", [params]);
        return res.result;
    }

    async completeEmailVerification(params: { email: string; code: string }) {
        const res = await this.call("completeEmailVerification", [params]);
        return res.result;
    }

    async initAuth(email: string) {
        const res = await this.call("initAuth", [{ email }]);
        const { auth, B } = res.result;
        return { auth: await new Auth(email).deserialize(auth), B };
    }

    async updateAuth(auth: Auth): Promise<void> {
        await this.call("updateAuth", [await auth.serialize()]);
    }

    async createSession(params: { account: AccountID; M: Base64String; A: Base64String }): Promise<Session> {
        const res = await this.call("createSession", [params]);
        return new Session().deserialize(res.result);
    }

    async revokeSession(session: Session): Promise<void> {
        await this.call("revokeSession", [await session.serialize()]);
    }

    async createAccount(params: CreateAccountParams): Promise<Account> {
        const res = await this.call("createAccount", [
            {
                auth: await params.auth.serialize(),
                account: await params.account.serialize(),
                verify: params.verify,
                invite: params.invite
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

    async recoverAccount(params: RecoverAccountParams): Promise<Account> {
        const res = await this.call("recoverAccount", [
            {
                ...params,
                auth: await params.auth.serialize(),
                account: await params.account.serialize()
            }
        ]);
        return new Account().deserialize(res.result);
    }

    async getVault(vault: Vault): Promise<Vault> {
        const res = await this.call("getVault", [{ id: vault.id }]);
        return vault.deserialize(res.result);
    }

    async createVault(params: CreateVaultParams): Promise<Vault> {
        const res = await this.call("createVault", [params]);
        return new Vault("").deserialize(res.result);
    }

    async updateVault(vault: Vault): Promise<Vault> {
        const res = await this.call("updateVault", [await vault.serialize()]);
        return vault.deserialize(res.result);
    }

    async deleteVault(vault: Vault): Promise<void> {
        await this.call("deleteVault", [{ id: vault.id }]);
    }

    async getInvite(params: { vault: string; id: string }): Promise<Invite> {
        const res = await this.call("getInvite", [params]);
        return new Invite().deserialize(res.result);
    }

    async acceptInvite(invite: Invite): Promise<void> {
        await this.call("acceptInvite", [await invite.serialize()]);
    }
}
