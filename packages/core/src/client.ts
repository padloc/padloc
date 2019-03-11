import {
    API,
    RequestEmailVerificationParams,
    CompleteEmailVerificationParams,
    InitAuthParams,
    InitAuthResponse,
    CreateAccountParams,
    RecoverAccountParams,
    CreateSessionParams,
    GetInviteParams
} from "./api";
import { Sender, RequestProgress } from "./transport";
import { DeviceInfo } from "./platform";
import { Session, SessionID } from "./session";
import { Account } from "./account";
import { Auth } from "./auth";
import { Org, OrgID } from "./org";
import { Invite } from "./invite";
import { Vault, VaultID } from "./vault";
import { Err, ErrorCode } from "./error";
// import { Attachment } from "./attachment";

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

    async call(method: string, params?: any[], progress?: RequestProgress) {
        const { session } = this.state;

        const req = { method, params };

        if (session) {
            await session.authenticate(req);
        }

        let res;

        try {
            res = await this.sender.send(req, progress);
        } catch (e) {
            if (progress) {
                progress.error = e;
            }
            throw e;
        }

        if (res.error) {
            const err = new Err((res.error.code as any) as ErrorCode, res.error.message);
            if (progress) {
                progress.error = err;
            }
            throw err;
        }

        if (session && !(await session.verify(res))) {
            const err = new Err(ErrorCode.INVALID_RESPONSE);
            if (progress) {
                progress.error = err;
            }
            throw err;
        }

        return res;
    }

    async requestEmailVerification(params: RequestEmailVerificationParams) {
        const res = await this.call("requestEmailVerification", [params.toRaw()]);
        return res.result;
    }

    async completeEmailVerification(params: CompleteEmailVerificationParams) {
        const res = await this.call("completeEmailVerification", [params.toRaw()]);
        return res.result;
    }

    async initAuth(params: InitAuthParams) {
        const res = await this.call("initAuth", [params.toRaw()]);
        return new InitAuthResponse().fromRaw(res.result);
    }

    async updateAuth(auth: Auth) {
        await this.call("updateAuth", [auth.toRaw()]);
    }

    async createSession(params: CreateSessionParams) {
        const res = await this.call("createSession", [params.toRaw()]);
        return new Session().fromRaw(res.result);
    }

    async revokeSession(id: SessionID): Promise<void> {
        await this.call("revokeSession", [id]);
    }

    async createAccount(params: CreateAccountParams): Promise<Account> {
        const res = await this.call("createAccount", [params.toRaw()]);
        return new Account().fromRaw(res.result);
    }

    async getAccount(): Promise<Account> {
        const res = await this.call("getAccount");
        return new Account().fromRaw(res.result);
    }

    async updateAccount(account: Account): Promise<Account> {
        const res = await this.call("updateAccount", [account.toRaw()]);
        return new Account().fromRaw(res.result);
    }

    async recoverAccount(params: RecoverAccountParams): Promise<Account> {
        const res = await this.call("recoverAccount", [params.toRaw()]);
        return new Account().fromRaw(res.result);
    }

    async getOrg(id: OrgID): Promise<Org> {
        const res = await this.call("getOrg", [id]);
        return new Org().fromRaw(res.result);
    }

    async createOrg(org: Org): Promise<Org> {
        const res = await this.call("createOrg", [org.toRaw()]);
        return new Org().fromRaw(res.result);
    }

    async updateOrg(org: Org): Promise<Org> {
        const res = await this.call("updateOrg", [org.toRaw()]);
        return new Org().fromRaw(res.result);
    }

    async getVault(id: VaultID): Promise<Vault> {
        const res = await this.call("getVault", [id]);
        return new Vault().fromRaw(res.result);
    }

    async createVault(vault: Vault): Promise<Vault> {
        const res = await this.call("createVault", [vault.toRaw()]);
        return new Vault().fromRaw(res.result);
    }

    async updateVault(vault: Vault): Promise<Vault> {
        const res = await this.call("updateVault", [vault.toRaw()]);
        return new Vault().fromRaw(res.result);
    }

    async deleteVault(id: VaultID): Promise<void> {
        await this.call("deleteVault", [id]);
    }

    async getInvite(params: GetInviteParams): Promise<Invite> {
        const res = await this.call("getInvite", [params.toRaw()]);
        return new Invite().fromRaw(res.result);
    }

    async acceptInvite(invite: Invite): Promise<void> {
        await this.call("acceptInvite", [invite.toRaw()]);
    }
    //
    // async createAttachment(att: Attachment): Promise<Attachment> {
    //     att.uploadProgress = new RequestProgress();
    //     const { result } = await this.call("createAttachment", [await att.serialize()], att.uploadProgress);
    //     att.id = result.id;
    //     return att;
    // }
    //
    // async getAttachment(att: Attachment): Promise<Attachment> {
    //     att.downloadProgress = new RequestProgress();
    //     const res = await this.call("getAttachment", [{ id: att.id, vault: att.vault }], att.downloadProgress);
    //     return att.deserialize(res.result);
    // }
    //
    // async deleteAttachment(att: Attachment): Promise<void> {
    //     await this.call("deleteAttachment", [{ id: att.id, vault: att.vault }]);
    // }
}
