import {
    API,
    RequestEmailVerificationParams,
    CompleteEmailVerificationParams,
    InitAuthParams,
    InitAuthResponse,
    CreateAccountParams,
    RecoverAccountParams,
    CreateSessionParams,
    GetInviteParams,
    GetAttachmentParams,
    DeleteAttachmentParams
} from "./api";
import { Sender, Request, Response, RequestProgress } from "./transport";
import { DeviceInfo } from "./platform";
import { Session, SessionID } from "./session";
import { Account } from "./account";
import { Auth } from "./auth";
import { Org, OrgID } from "./org";
import { Invite } from "./invite";
import { Vault, VaultID } from "./vault";
import { Err, ErrorCode } from "./error";
import { Attachment } from "./attachment";
import { Plan, UpdateBillingParams } from "./billing";

/**
 * Client state, keeping track of [[session]], [[account]] and [[device]] info
 */
export interface ClientState {
    /** Current session */
    session: Session | null;
    /** Currently logged in account */
    account: Account | null;
    /** info about current device */
    device: DeviceInfo;
}

/**
 * Client-side interface for Client-Server communication. Manages serialization,
 * authentication and some state like current session and account.
 */
export class BaseClient {
    online = true;

    constructor(
        /** Object for storing state */
        public state: ClientState,
        /** [[Sender]] implementation used for sending/receiving requests */
        private sender: Sender,
        private hook?: (req: Request, res: Response | null, err: Err | null) => void
    ) {}

    /** The current session */
    get session() {
        return this.state.session;
    }

    /** Generic method for making an RPC call */
    async call(method: string, params?: any[], progress?: RequestProgress) {
        const { session } = this.state;

        const req = new Request();
        req.method = method;
        req.params = params;
        req.device = this.state.device;

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
            this.hook && this.hook(req, null, e);
            throw e;
        }

        if (res.error) {
            const err = new Err((res.error.code as any) as ErrorCode, res.error.message);
            if (progress) {
                progress.error = err;
            }
            this.hook && this.hook(req, res, err);
            throw err;
        }

        if (session && !(await session.verify(res))) {
            const err = new Err(ErrorCode.INVALID_RESPONSE);
            if (progress) {
                progress.error = err;
            }
            this.hook && this.hook(req, res, err);
            throw err;
        }

        this.hook && this.hook(req, res, null);
        return res;
    }
}

export class Client extends BaseClient implements API {
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

    async deleteAccount(): Promise<void> {
        await this.call("deleteAccount");
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

    async deleteOrg(id: OrgID): Promise<void> {
        await this.call("deleteOrg", [id]);
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

    async createAttachment(att: Attachment): Promise<Attachment> {
        att.uploadProgress = new RequestProgress();
        this.call("createAttachment", [await att.toRaw()], att.uploadProgress).then(res => {
            att.id = res.result;
            att.uploadProgress!.complete();
        });
        return att;
    }

    async getAttachment(params: GetAttachmentParams): Promise<Attachment> {
        const att = new Attachment(params);
        att.downloadProgress = new RequestProgress();
        this.call("getAttachment", [params.toRaw()], att.downloadProgress).then(res => {
            att.fromRaw(res.result);
            att.downloadProgress!.complete();
        });
        return att;
    }

    async deleteAttachment(params: DeleteAttachmentParams): Promise<void> {
        await this.call("deleteAttachment", [params.toRaw()]);
    }

    async updateBilling(params: UpdateBillingParams): Promise<void> {
        await this.call("updateBilling", [params.toRaw()]);
    }

    async getPlans(): Promise<Plan[]> {
        const res = await this.call("getPlans");
        return res.result.map((p: any) => new Plan().fromRaw(p));
    }
}
