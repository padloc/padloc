import { request, Method, AjaxError } from "./ajax";
import { Settings } from "./data";

export interface AuthToken {
    email: string;
    token: string;
    id: string;
    // Activation url returned by server. Only used for testing
    actUrl?: string;
}

export class Client {
    constructor(public settings: Settings) {}

    get basePath() {
        return this.settings.syncCustomHost ? this.settings.syncHostUrl : "https://cloud.padlock.io";
    }

    urlForPath(path: string): string {
        return `${this.basePath}/${path}/`.replace(/\/+$/, "");
    }

    async request(method: Method, path: string, data?: string, headers?: Map<string, string>): Promise<XMLHttpRequest> {
        const url = this.urlForPath(path);
        headers = headers || new Map<string, string>();

        headers.set("Accept", "application/vnd.padlock;version=1");
        if (this.settings.syncEmail && this.settings.syncToken) {
            headers.set("Authorization", "AuthToken " + this.settings.syncEmail + ":" + this.settings.syncToken);
        }

        // const { uuid, platform, osVersion, appVersion, manufacturer, model, hostName } = await getDeviceInfo();
        // headers.set("X-Device-App-Version", appVersion || "");
        // headers.set("X-Device-Platform", platform || "");
        // headers.set("X-Device-UUID", uuid || "");
        // headers.set("X-Device-Manufacturer", manufacturer || "");
        // headers.set("X-Device-OS-Version", osVersion || "");
        // headers.set("X-Device-Model", model || "");
        // headers.set("X-Device-Hostname", hostName || "");

        const req = await request(method, url, data, headers);

        const subStatus = req.getResponseHeader("X-Sub-Status");
        if (subStatus !== null) {
            this.settings.syncSubStatus = subStatus;
        }
        const stripePubKey = req.getResponseHeader("X-Stripe-Pub-Key");
        if (stripePubKey !== null) {
            this.settings.stripePubKey = stripePubKey;
        }

        const trialEnd = req.getResponseHeader("X-Sub-Trial-End");
        if (trialEnd !== null) {
            try {
                this.settings.syncTrialEnd = parseInt(trialEnd, 10);
            } catch (e) {
                //
            }
        }
        return req;
    }

    async authenticate(
        email: string,
        create = false,
        authType = "api",
        redirect = "",
        actType = ""
    ): Promise<AuthToken> {
        const params = new URLSearchParams();
        params.set("email", email);
        params.set("type", authType);
        params.set("redirect", redirect);
        params.set("actType", actType);

        const req = await this.request(
            create ? "POST" : "PUT",
            "auth",
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        );

        let authToken: AuthToken;
        try {
            authToken = <AuthToken>JSON.parse(req.responseText);
        } catch (e) {
            throw new AjaxError(req);
        }
        return authToken;
    }

    async requestAuthToken(email: string, create = false, redirect = "", actType?: string): Promise<AuthToken> {
        const authToken = await this.authenticate(email, create, "api", redirect, actType);
        this.settings.syncEmail = authToken.email;
        this.settings.syncToken = authToken.token;
        return authToken;
    }

    async getLoginUrl(redirect: string) {
        if (!this.settings.syncConnected) {
            throw { code: "invalid_auth_token", message: "Need to be authenticated to get a login link." };
        }

        const authToken = await this.authenticate(this.settings.syncEmail, false, "web", redirect);
        return authToken.actUrl;
    }

    activateToken(code: string): Promise<Boolean> {
        const params = new URLSearchParams();
        params.set("code", code);
        params.set("email", this.settings.syncEmail);

        return this.request(
            "POST",
            "activate",
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        )
            .then(() => true)
            .catch(e => {
                if (e.code === "bad_request") {
                    return false;
                } else {
                    throw e;
                }
            });
    }

    logout(): Promise<XMLHttpRequest> {
        return this.request("GET", "logout");
    }

    async getAccountInfo(): Promise<Account> {
        const res = await this.request("GET", "account");
        const account = JSON.parse(res.responseText);
        this.settings.account = account;
        return account;
    }

    revokeAuthToken(tokenId: string): Promise<XMLHttpRequest> {
        const params = new URLSearchParams();
        params.set("id", tokenId);
        return this.request(
            "POST",
            "revoke",
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        );
    }

    subscribe(stripeToken = "", coupon = "", source = ""): Promise<XMLHttpRequest> {
        const params = new URLSearchParams();
        params.set("stripeToken", stripeToken);
        params.set("coupon", coupon);
        params.set("source", source);
        return this.request(
            "POST",
            "subscribe",
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        );
    }

    cancelSubscription(): Promise<XMLHttpRequest> {
        return this.request("POST", "unsubscribe");
    }

    getPlans(): Promise<any[]> {
        return this.request("GET", this.urlForPath("plans")).then(res => <any[]>JSON.parse(res.responseText));
    }
}
