import { API, CreateAccountParams, CreateSharedStoreParams, CreateOrganizationParams } from "./api";
import { request, Method } from "./ajax";
import { Session, Account, Device, Organization } from "./auth";
import { marshal, unmarshal } from "./encoding";
import { AccountStore, SharedStore } from "./data";

export interface AccountUpdateParams {
    publicKey?: string;
}

export interface CreateSharedStoreParams {
    name: string;
}

export interface CreateOrganizationParams {
    name: string;
}

export interface ClientSettings {
    customServer: boolean;
    customServerUrl: string;
}

export interface ClientState {
    session: Session | null;
    account: Account | null;
    device: Device;
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
        return `${this.basePath}/${path}/`.replace(/([^:]\/)\/+/g, "$1");
    }

    async request(method: Method, path: string, data?: string, headers?: Map<string, string>): Promise<XMLHttpRequest> {
        const url = this.urlForPath(path);
        headers = headers || new Map<string, string>();

        if (!headers.get("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
        headers.set("Accept", "application/vnd.padlock;version=1");
        if (this.state.session && this.state.session.active) {
            headers.set("Authorization", "AuthToken " + this.state.session.email + ":" + this.state.session.token);
        }

        headers.set("X-Device", marshal(await this.state.device.serialize()));

        return request(method, url, data, headers);
    }

    async createSession(email: string): Promise<Session> {
        const params = new URLSearchParams();
        params.set("email", email);

        const req = await this.request(
            "POST",
            "session",
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        );

        this.state.session = await new Session().deserialize(unmarshal(req.responseText));
        return this.state.session;
    }

    async activateSession(id: string, code: string): Promise<Session> {
        const params = new URLSearchParams();
        params.set("code", code);

        const req = await this.request(
            "POST",
            `session/${id}/activate`,
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        );
        this.state.session = await new Session().deserialize(unmarshal(req.responseText));
        return this.state.session;
    }

    async revokeSession(id: string): Promise<void> {
        await this.request("DELETE", `session/${id}`, undefined);
    }

    async createAccount(params: CreateAccountParams): Promise<Account> {
        const res = await this.request("POST", "account", marshal(params));
        return new Account().deserialize(unmarshal(res.responseText));
    }

    async getAccount(account: Account): Promise<Account> {
        const res = await this.request("GET", "account");
        return await account.deserialize(unmarshal(res.responseText));
    }

    async updateAccount(account: Account): Promise<Account> {
        const res = await this.request("PUT", "account", marshal(await account.serialize()));
        return account.deserialize(unmarshal(res.responseText));
    }

    async getAccountStore(store: AccountStore): Promise<AccountStore> {
        const res = await this.request("GET", "account-store", undefined);
        return store.deserialize(unmarshal(res.responseText));
    }

    async updateAccountStore(store: AccountStore): Promise<AccountStore> {
        const res = await this.request("PUT", "account-store", marshal(await store.serialize()));
        return store.deserialize(unmarshal(res.responseText));
    }

    async createSharedStore(params: CreateSharedStoreParams): Promise<SharedStore> {
        const res = await this.request("POST", "store", marshal(params));
        return new SharedStore("", this.state.account!).deserialize(unmarshal(res.responseText));
    }

    async getSharedStore(store: SharedStore): Promise<SharedStore> {
        const res = await this.request("GET", `store/${store.pk}`, undefined);
        return store.deserialize(unmarshal(res.responseText));
    }

    async updateSharedStore(store: SharedStore): Promise<SharedStore> {
        const res = await this.request("PUT", `store/${store.pk}`, marshal(await store.serialize()));
        return store.deserialize(unmarshal(res.responseText));
    }

    async createOrganization(params: CreateOrganizationParams): Promise<Organization> {
        const res = await this.request("POST", "org", marshal(params));
        return new Organization("", this.state.account!).deserialize(unmarshal(res.responseText));
    }

    async getOrganization(org: Organization): Promise<Organization> {
        const res = await this.request("GET", `org/${org.pk}`, undefined);
        return org.deserialize(unmarshal(res.responseText));
    }

    async updateOrganization(org: Organization): Promise<Organization> {
        const res = await this.request("PUT", `org/${org.pk}`, marshal(await org.serialize()));
        return org.deserialize(unmarshal(res.responseText));
    }
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
    //     return this.request("GET", this.urlForPath("plans")).then(res => <any[]>JSON.parse(res.responseText));
    // }
}
