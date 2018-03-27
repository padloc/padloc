import { request, Method, AjaxError, Client } from "./ajax";
import { FileManager, HTML5FileManager, CordovaFileManager, NodeFileManager } from "./file";
import { Settings } from "./data";
import { Container } from "./crypto";
import { isCordova, isElectron, getDeviceInfo, isChromeApp } from "./platform";

declare var chrome: any;
const chromeLocalStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

export interface Source {
    get(): Promise<string>;
    set(data: string): Promise<void>;
    clear(): Promise<void>;
}

export class MemorySource implements Source {

    constructor(private data = "") {}

    async get(): Promise<string> {
        return this.data;
    }

    async set(data: string): Promise<void> {
        this.data = data;
    }

    async clear(): Promise<void> {
        this.data = "";
    }

}

export class HTML5LocalStorageSource implements Source {

    constructor(public key: string) {}

    async get(): Promise<string> {
        return localStorage.getItem(this.key) || "";
    };

    async set(data: string): Promise<void> {
        localStorage.setItem(this.key, data);
    };

    async clear(): Promise<void> {
        localStorage.removeItem(this.key);
    };

}

export class ChromeLocalStorageSource implements Source {

    constructor(public key: string) {}

    get(): Promise<string> {
        return new Promise((resolve) => {
            chromeLocalStorage.get(this.key, (obj: any) => {
                let data = obj[this.key];
                if (typeof data === "object") {
                    data = JSON.stringify(data);
                }
                resolve(data || "");
            });
        });
    };

    set(data: string): Promise<void> {
        const obj = {
            [this.key]: data
        };

        return new Promise<void>((resolve) => chromeLocalStorage.set(obj, resolve));
    }

    clear(): Promise<void> {
        return new Promise<void>((resolve) => chromeLocalStorage.remove(this.key, resolve));
    }

}

export const LocalStorageSource = isChromeApp() ? ChromeLocalStorageSource : HTML5LocalStorageSource;

export class AjaxSource implements Source {

    constructor(private _url: string) {}

    get url() {
        return this._url;
    }

    request(method: Method, url: string, data?: string, headers?: Map<string, string>): Promise<XMLHttpRequest> {
        return request(method, url, data, headers);
    }

    get(): Promise<string> {
        return this.request("GET", this.url).then(req => req.responseText);
    }

    set(data: string): Promise<void> {
        return this.request("POST", this.url, data).then(() => {});
    }

    clear(): Promise<void> {
        return this.set("").then(() => {});
    }

}

export interface CloudAuthToken {
    email: string;
    token: string;
    id: string;
    // Activation url returned by server. Only used for testing
    actUrl?: string;
}

export class CloudSource extends AjaxSource implements Client {

    urlForPath(path: string): string {
        // Remove trailing slashes
        const host = this.settings.syncCustomHost ?
            this.settings.syncHostUrl.replace(/\/+$/, "") :
            "https://cloud.padlock.io"
        return `${host}/${path}/`;
    }

    constructor(public settings: Settings) {
        super("");
    }

    get url() {
        return this.urlForPath("store");
    }

    async request(method: Method, url: string, data?: string, headers?: Map<string, string>): Promise<XMLHttpRequest> {

        headers = headers || new Map<string, string>();

        headers.set("Accept", "application/vnd.padlock;version=1");
        if (this.settings.syncEmail && this.settings.syncToken) {
            headers.set("Authorization",
                "AuthToken " + this.settings.syncEmail + ":" + this.settings.syncToken);
        }

        const { uuid, platform, osVersion, appVersion, manufacturer, model, hostName } = await getDeviceInfo();
        headers.set("X-Device-App-Version", appVersion || "");
        headers.set("X-Device-Platform", platform || "");
        headers.set("X-Device-UUID", uuid || "");
        headers.set("X-Device-Manufacturer", manufacturer || "");
        headers.set("X-Device-OS-Version", osVersion || "");
        headers.set("X-Device-Model", model || "");
        headers.set("X-Device-Hostname", hostName || "");

        const req = await super.request(method, url, data, headers);

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

    async authenticate(email: string, create = false, authType = "api", redirect = "", actType = ""): Promise<CloudAuthToken> {
        const params = new URLSearchParams();
        params.set("email", email);
        params.set("type", authType);
        params.set("redirect", redirect);
        params.set("actType", actType);

        const req = await this.request(
            create ? "POST" : "PUT",
            this.urlForPath("auth"),
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        );

        let authToken: CloudAuthToken;
        try {
            authToken = <CloudAuthToken>JSON.parse(req.responseText);
        } catch (e) {
            throw new AjaxError(req);
        }
        return authToken;
    }

    async requestAuthToken(email: string, create = false, redirect = "", actType?: string): Promise<CloudAuthToken> {
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

    async testCredentials(): Promise<boolean> {
        try {
            await this.get();
            return true;
        } catch (e) {
            const err = <AjaxError>e;
            if (err.code === "invalid_auth_token") {
                return false;
            } else {
                throw err;
            }
        }
    }

    activateToken(code: string): Promise<Boolean> {
        const params = new URLSearchParams();
        params.set("code", code);
        params.set("email", this.settings.syncEmail);

        return this.request(
            "POST",
            this.urlForPath("activate"),
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        )
            .then(() => true)
            .catch((e) => {
                if (e.code === "bad_request") {
                    return false;
                } else {
                    throw e;
                }
            });
    }

    logout(): Promise<XMLHttpRequest> {
        return this.request(
            "GET",
            this.urlForPath("logout")
        );
    }

    async getAccountInfo(): Promise<Account> {
        const res = await this.request("GET", this.urlForPath("account"))
        const account = JSON.parse(res.responseText);
        this.settings.account = account;
        return account;
    }

    revokeAuthToken(tokenId: string): Promise<XMLHttpRequest> {
        const params = new URLSearchParams();
        params.set("id", tokenId);
        return this.request(
            "POST",
            this.urlForPath("revoke"),
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
            this.urlForPath("subscribe"),
            params.toString(),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        );
    }

    cancelSubscription(): Promise<XMLHttpRequest> {
        return this.request("POST", this.urlForPath("unsubscribe"));
    }

    getPlans(): Promise<any[]> {
        return this.request("GET", this.urlForPath("plans"))
            .then((res) => <any[]>JSON.parse(res.responseText));
    }

}

export class EncryptedSource implements Source {

    private container?: Container;

    public password: string;

    constructor(public source: Source) {}

    async get(): Promise<string> {
        let data = await this.source.get();
        if (data == "") {
            return "";
        }

        let cont = this.container = Container.fromJSON(data);
        cont.password = this.password;

        return await cont.get();
    }

    async set(data: string): Promise<void> {
        // Reuse container if possible
        let cont = this.container = this.container || new Container();
        cont.password = this.password;
        await cont.set(data);

        return this.source.set(cont.toJSON());
    }

    async hasData(): Promise<boolean> {
        const data = await this.source.get();
        return data !== "";
    }

    clear(): Promise<void> {
        this.password = "";
        if (this.container) {
            this.container.clear();
        }
        delete this.container;
        return this.source.clear();
    }

}

export class FileSource implements Source {

    private fileManager: FileManager;

    constructor(private filePath: string) {
        this.fileManager = isElectron() ? new NodeFileManager() :
            isCordova() ? new CordovaFileManager() : new HTML5FileManager();
    }

    get(): Promise<string> {
        return this.fileManager.read(this.filePath);
    }

    set(data: string): Promise<void> {
        return this.fileManager.write(this.filePath, data);
    }

    clear(): Promise<void> {
        return this.fileManager.write(this.filePath, "");
    }

}
