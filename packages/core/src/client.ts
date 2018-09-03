import { API, CreateAccountParams, CreateStoreParams } from "./api";
import { request, Method } from "./ajax";
import { DeviceInfo } from "./platform";
import { Session, Account, AccountID } from "./auth";
import { Invite } from "./invite";
import { marshal, unmarshal, Base64String } from "./encoding";
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
    constructor(public state: ClientState) {}

    get session() {
        return this.state.session;
    }

    get basePath() {
        return this.state.settings.customServer ? this.state.settings.customServerUrl : "https://cloud.padlock.io";
    }

    urlForPath(path: string): string {
        return `${this.basePath}/${path}`.replace(/([^:]\/)\/+/g, "$1");
    }

    async request(method: Method, path: string, data?: string, headers?: Map<string, string>): Promise<string> {
        const url = this.urlForPath(path);
        headers = headers || new Map<string, string>();
        const { session } = this.state;

        if (!headers.get("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        headers.set("Accept", "application/vnd.padlock;version=2");

        if (session) {
            headers.set("Authorization", await session.getAuthHeader());

            if (data) {
                headers.set("X-Signature", await session.sign(data));
            }
        }

        headers.set("X-Device", marshal(this.state.device));

        const res = await request(method, url, data, headers);

        const body = res.responseText;

        if (session) {
            if (!(await session.verifyAuthHeader(res.getResponseHeader("Authorization") || ""))) {
                // TODO: Better error code
                throw new Err(ErrorCode.INVALID_SESSION);
            }

            if (body && !(await session.verify(res.getResponseHeader("X-Signature") || "", body))) {
                // TODO: Better error code
                throw new Err(ErrorCode.INVALID_SESSION);
            }
        }

        return body;
    }

    async verifyEmail(params: { email: string }) {
        const res = await this.request("POST", "verify", marshal(params));
        return unmarshal(res);
    }

    async initAuth(params: { email: string }) {
        const res = await this.request("POST", "auth", marshal(params));
        return unmarshal(res);
    }

    async createSession(params: { account: AccountID; M: Base64String; A: Base64String }): Promise<Session> {
        const res = await this.request("POST", "session", marshal(params));
        return new Session().deserialize(unmarshal(res));
    }

    async revokeSession(session: Session): Promise<void> {
        await this.request("DELETE", `session/${session.id}`, undefined);
    }

    async createAccount(params: CreateAccountParams): Promise<Account> {
        const res = await this.request("POST", "account", marshal(params));
        return new Account().deserialize(unmarshal(res));
    }

    async getAccount(account: Account): Promise<Account> {
        const res = await this.request("GET", "account");
        return await account.deserialize(unmarshal(res));
    }

    async updateAccount(account: Account): Promise<Account> {
        const res = await this.request("PUT", "account", marshal(await account.serialize()));
        return account.deserialize(unmarshal(res));
    }

    async getStore(store: Store): Promise<Store> {
        const res = await this.request("GET", `store/${store.pk}`, undefined);
        return store.deserialize(unmarshal(res));
    }

    async createStore(params: CreateStoreParams): Promise<Store> {
        const res = await this.request("POST", "store", marshal(params));
        return new Store("").deserialize(unmarshal(res));
    }

    async updateStore(store: Store): Promise<Store> {
        const res = await this.request("PUT", `store/${store.pk}`, marshal(await store.serialize()));
        return store.deserialize(unmarshal(res));
    }

    async updateInvite(invite: Invite): Promise<Invite> {
        const res = await this.request("PUT", `invite`, marshal(await invite.serialize()));
        return invite.deserialize(unmarshal(res));
    }

    //
    // async createOrganization(params: CreateOrganizationParams): Promise<Organization> {
    //     const res = await this.request("POST", "org", marshal(params));
    //     return new Organization("", this.state.account!).deserialize(unmarshal(res));
    // }
    //
    // async getOrganization(org: Organization): Promise<Organization> {
    //     const res = await this.request("GET", `org/${org.pk}`, undefined);
    //     return org.deserialize(unmarshal(res));
    // }
    //
    // async updateOrganization(org: Organization): Promise<Organization> {
    //     const res = await this.request("PUT", `org/${org.pk}`, marshal(await org.serialize()));
    //     return org.deserialize(unmarshal(res));
    // }

    // async updateInvite(org: Organization, invite: Invite): Promise<Organization> {
    //     const res = await this.request("PUT", `org/${org.pk}/invite`, marshal(await invite.serialize()));
    //     return org.deserialize(unmarshal(res));
    // }
    //
    // subscribe(stripeToken = "", coupon = "", source = ""): Promise<XMLHttpRequest> {
    //     const params = new URLSearchParams();
    //     params.set("stripeToken", stripeToken);
    //     params.set("coupon", coupon);
    //     params.set("source", source);
    //     return this.request(
    //         "POST",
    //         "subscribe",
    //         params.toString(),
    //         new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
    //     );
    // }
    //
    // cancelSubscription(): Promise<XMLHttpRequest> {
    //     return this.request("POST", "unsubscribe");
    // }
    //
    // getPlans(): Promise<any[]> {
    //     return this.request("GET", this.urlForPath("plans")).then(res => <any[]>JSON.parse(res));
    // }
}
