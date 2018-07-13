import { request, Method } from "./ajax";
import { Session, Account } from "./auth";
import { marshal, unmarshal } from "./encoding";
import { App } from "./app";

export class Client {
    constructor(public app: App) {}

    get basePath() {
        return this.app.settings.customServer ? this.app.settings.customServerUrl : "https://cloud.padlock.io";
    }

    urlForPath(path: string): string {
        return `${this.basePath}/${path}/`.replace(/([^:]\/)\/+/g, "$1");
    }

    async request(method: Method, path: string, data?: string, headers?: Map<string, string>): Promise<XMLHttpRequest> {
        const url = this.urlForPath(path);
        headers = headers || new Map<string, string>();

        headers.set("Accept", "application/vnd.padlock;version=1");
        if (this.app.session && this.app.session.active) {
            headers.set("Authorization", "AuthToken " + this.app.session.account + ":" + this.app.session.token);
        }

        headers.set("X-Device", marshal(await this.app.device.serialize()));

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

        this.app.session = await new Session().deserialize(unmarshal(req.responseText));
        return this.app.session;
    }

    async activateSession(code: string): Promise<Session> {
        if (!this.app.session) {
            throw "No valid session object found. Need to call 'createSession' first!";
        }

        const params = new URLSearchParams();
        params.set("code", code);

        const req = await this.request(
            "POST",
            `session/${this.app.session.id}/activate`,
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        );
        await this.app.session.deserialize(unmarshal(req.responseText));
        return this.app.session;
    }

    async revokeSession(id: string): Promise<XMLHttpRequest> {
        return this.request("DELETE", `session/${id}`);
    }

    async logout(): Promise<void> {
        if (!this.app.session) {
            throw "Not logged in";
        }
        if (this.app.session.active) {
            await this.revokeSession(this.app.session.id);
        }
        delete this.app.session;
        delete this.app.account;
    }

    async getAccount(): Promise<Account> {
        if (!this.app.session) {
            throw "Need to be logged in to sync account";
        }
        const res = await this.request("GET", "account");
        this.app.account = await new Account().deserialize(unmarshal(res.responseText));
        return this.app.account;
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
