import { request, Method, ErrorResponse } from "./ajax";
import { Settings } from "./settings";
import { Container, clearKeyCache } from "./crypto";

export const ERR_INVALID_AUTH_TOKEN = "invalid_auth_token";
export const ERR_EXPIRED_AUTH_TOKEN = "expired_auth_token";
export const ERR_SERVER_ERROR = "internal_server_error";
export const ERR_VERSION_DEPRECATED = "deprecated_api_version";
export const ERR_SUBSCRIPTION_REQUIRED = "subscription_required";
export const ERR_NOT_FOUND = "account_not_found";
export const ERR_LIMIT_EXCEEDED = "rate_limit_exceeded";
export const ERR_NO_PASSWORD_SET = "no_password_set";

export interface Source {
    get(): Promise<string>;
    set(data: string): Promise<void>;
    clear(): Promise<void>;
}

export class MemorySource implements Source {

    private data: string;

    get(): Promise<string> {
        return Promise.resolve(this.data);
    }

    set(data: string): Promise<void> {
        this.data = data;
        return Promise.resolve();
    }

    clear(): Promise<void> {
        this.data = "";
        return Promise.resolve();
    }

}

export class LocalStorageSource implements Source {

    constructor(private key: string) {}

    get(): Promise<string> {
        return Promise.resolve(localStorage.getItem(this.key));
    };

    set(data: string): Promise<void> {
        localStorage.setItem(this.key, data);
        return Promise.resolve();
    };

    clear(): Promise<void> {
        localStorage.removeItem(this.key);
        return Promise.resolve();
    };

}

export class AjaxSource implements Source {

    constructor(public url: string) {}

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
        return this.request("DELETE", this.url).then(() => {});
    }

}

export interface CloudAuthToken {
    email: string;
    token: string;
    id: string;
}

export class CloudSource extends AjaxSource {

    urlForPath(path: string) {
        let url = this.settings.syncHostUrl + "/" + path + "/";
        // Replace duplicate slashes
        return url.replace(/\/\//g, "/");
    }

    constructor(public settings: Settings) {
        super("");
        this.url = this.urlForPath("store");
    }

    request(method: Method, url: string, data?: string, headers?: Map<string, string>): Promise<XMLHttpRequest> {

        headers = headers || new Map<string, string>();

        headers.set("Accept", "application/vnd.padlock;version=1");
        if (this.settings.syncEmail && this.settings.syncToken) {
            headers.set("Authorization",
                "AuthToken " + this.settings.syncEmail + ":" + this.settings.syncToken);
        }

        // headers.set("X-Client-Version", padlock.version);
        // headers.set("X-Client-Platform", padlock.platform.getPlatformName());

        return super.request(method, url, data, headers)
            .then(req => {
                this.settings.syncSubStatus = req.getResponseHeader("X-Sub-Status") || "";
                try {
                    this.settings.syncTrialEnd =
                        parseInt(req.getResponseHeader("X-Sub-Trial-End") || "0", 10);
                } catch (e) {
                    //
                }
                return req;
            });
    }

    requestAuthToken(email: string, create = false): Promise<CloudAuthToken> {
        return this.request(
            create ? "POST" : "PUT",
            this.urlForPath("auth"),
            "email=" + encodeURIComponent(email),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        )
        .then(res => <CloudAuthToken>JSON.parse(res.responseText));
    };

    testCredentials(): Promise<boolean> {
        return this.get()
            .then(
                () => true,
                (err: ErrorResponse) => {
                    if (err.error === ERR_INVALID_AUTH_TOKEN) {
                        return false;
                    } else {
                        throw err;
                    }
                }
            );
    }

}

export class EncryptedSource implements Source {

    private container?: Container;
    public password: string;

    constructor(private source: Source, password?: string) {
        this.password = password || this.password;
    }

    get(): Promise<string> {
        if (!this.password) {
            return Promise.reject(ERR_NO_PASSWORD_SET);
        }

        return this.source.get()
            .then(data => {
                if (data == "") {
                    return "";
                }

                let cont = this.container = Container.fromJSON(data);

                return cont.getData(this.password);
            });
    }

    set(data: string): Promise<void> {
        if (!this.password) {
            return Promise.reject(ERR_NO_PASSWORD_SET);
        }

        // Reuse container if possible
        let cont = this.container = this.container || new Container();

        cont.setData(this.password, data);

        return this.source.set(cont.toJSON());
    }

    clear(): Promise<void> {
        this.password = "";
        delete this.container;
        clearKeyCache();
        return this.source.clear();
    }

}
