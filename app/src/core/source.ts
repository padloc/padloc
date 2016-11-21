import { request, Method, ErrorResponse } from "./ajax";

export const ERR_INVALID_AUTH_TOKEN = "invalid_auth_token";
export const ERR_EXPIRED_AUTH_TOKEN = "expired_auth_token";
export const ERR_SERVER_ERROR = "internal_server_error";
export const ERR_VERSION_DEPRECATED = "deprecated_api_version";
export const ERR_SUBSCRIPTION_REQUIRED = "subscription_required";
export const ERR_NOT_FOUND = "account_not_found";
export const ERR_LIMIT_EXCEEDED = "rate_limit_exceeded";

export interface Source {
    get(): Promise<string>;
    set(data: string): Promise<void>;
    clear(): Promise<void>;
}

export class MemorySource implements Source {

    private data: string;

    get() {
        return Promise.resolve(this.data);
    }

    set(data) {
        this.data = data;
        return Promise.resolve();
    }

    clear() {
        this.data = "";
        return Promise.resolve();
    }

}

export class LocalStorageSource implements Source {

    constructor(private key: string) {}

    get() {
        return Promise.resolve(localStorage.getItem(this.key));
    };

    set(data) {
        localStorage.setItem(this.key, data);
        return Promise.resolve();
    };

    clear() {
        localStorage.removeItem(this.key);
        return Promise.resolve();
    };

}

interface CloudAuthToken {
    email: string;
    token: string;
    id: string;
}

interface SyncParams {
    sync_host_url?: string;
    sync_custom_host?: boolean;
    sync_email?: string;
    sync_key?: string;
    sync_connected?: boolean;
    sync_sub_status?: string;
    sync_trial_end?: number;
    sync_id?: string;
}

export class CloudSource implements Source {

    constructor(public syncParams: SyncParams) {}

    request(method: Method, path: string, data?: string, headers?: Map<string, string>): Promise<string> {
        let host = this.syncParams.sync_custom_host ?
            this.syncParams.sync_host_url : "https://cloud.padlock.io";

        // Remove any trailing slashes
        host = host.replace(/\/+$/, "");
        const url = host + path;

        headers = headers || new Map<string, string>();

        headers.set("Accept", "application/vnd.padlock;version=1");
        if (this.syncParams.sync_email && this.syncParams.sync_key) {
            headers.set("Authorization",
                "AuthToken " + this.syncParams.sync_email + ":" + this.syncParams.sync_key);
        }

        // headers.set("X-Client-Version", padlock.version);
        // headers.set("X-Client-Platform", padlock.platform.getPlatformName());

        return request(method, url, data, headers)
            .then((req) => {
                this.syncParams["sync_sub_status"] = req.getResponseHeader("X-Sub-Status");
                try {
                    this.syncParams["sync_trial_end"] = parseInt(req.getResponseHeader("X-Sub-Trial-End"), 10);
                } catch (e) {
                    //
                }
                return req.responseText;
            });
    }

    get() {
        return this.request("GET", "/store/");
    }

    set(data) {
        return this.request("PUT", "/store/", data).then(() => {});
    }

    clear() {
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
