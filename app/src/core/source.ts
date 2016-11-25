import { request, Method, ErrorResponse } from "./ajax";
import { Settings } from "./settings";

export const ERR_INVALID_AUTH_TOKEN = "invalidAuthToken";
export const ERR_EXPIRED_AUTH_TOKEN = "expiredAuthToken";
export const ERR_SERVER_ERROR = "internalServerError";
export const ERR_VERSION_DEPRECATED = "deprecatedApiVersion";
export const ERR_SUBSCRIPTION_REQUIRED = "subscriptionRequired";
export const ERR_NOT_FOUND = "accountNotFound";
export const ERR_LIMIT_EXCEEDED = "rateLimitExceeded";

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

export interface CloudAuthToken {
    email: string;
    token: string;
    id: string;
}

export class CloudSource implements Source {

    constructor(public settings: Settings) {}

    request(method: Method, path: string, data?: string, headers?: Map<string, string>): Promise<string> {
        let host = this.settings.syncCustomHost ?
            this.settings.syncHostUrl : "https://cloud.padlock.io";

        // Remove any trailing slashes
        host = host.replace(/\/+$/, "");
        const url = host + path;

        headers = headers || new Map<string, string>();

        headers.set("Accept", "application/vnd.padlock;version=1");
        if (this.settings.syncEmail && this.settings.syncToken) {
            headers.set("Authorization",
                "AuthToken " + this.settings.syncEmail + ":" + this.settings.syncToken);
        }

        // headers.set("X-Client-Version", padlock.version);
        // headers.set("X-Client-Platform", padlock.platform.getPlatformName());

        return request(method, url, data, headers)
            .then((req) => {
                this.settings.syncSubStatus = req.getResponseHeader("X-Sub-Status") || "";
                try {
                    this.settings.syncTrialEnd =
                        parseInt(req.getResponseHeader("X-Sub-Trial-End") || "0", 10);
                } catch (e) {
                    //
                }
                return req.responseText;
            });
    }

    get(): Promise<string> {
        return this.request("GET", "/store/");
    }

    set(data: string): Promise<void> {
        return this.request("PUT", "/store/", data).then(() => {});
    }

    clear(): Promise<void> {
        return Promise.reject("Not Implemented");
    }

    requestAuthToken(email: string, create = false): Promise<CloudAuthToken> {
        return this.request(
            create ? "POST" : "PUT", "/auth/",
            "email=" + encodeURIComponent(email),
            new Map<string, string>().set("Content-Type", "application/x-www-form-urlencoded")
        )
        .then((res) => <CloudAuthToken>JSON.parse(res));
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
