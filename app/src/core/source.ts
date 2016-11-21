import { request, Method, ErrorResponse } from "./ajax";

export const ERR_INVALID_AUTH_TOKEN = "invalid_auth_token";
export const ERR_EXPIRED_AUTH_TOKEN = "expired_auth_token";
export const ERR_SERVER_ERROR = "internal_server_error";
export const ERR_VERSION_DEPRECATED = "deprecated_api_version";
export const ERR_SUBSCRIPTION_REQUIRED = "subscription_required";
export const ERR_NOT_FOUND = "account_not_found";
export const ERR_LIMIT_EXCEEDED = "rate_limit_exceeded";

export interface Source {
    fetch(key: string): Promise<string>;
    save(key: string, data: string): Promise<void>;
    clear(key: string): Promise<void>;
}

export class MemorySource implements Source {

    private data: string;

    fetch(key) {
        return Promise.resolve(this.data);
    }

    save(key, data) {
        this.data = data;
        return Promise.resolve();
    }

    clear(key) {
        this.data = "";
        return Promise.resolve();
    }

}

export class LocalStorageSource implements Source {

    fetch(key) {
        return Promise.resolve(localStorage.getItem(key));
    };

    save(key, data) {
        localStorage.setItem(key, data);
        return Promise.resolve();
    };

    clear(key) {
        localStorage.removeItem(key);
        return Promise.resolve();
    };

}

interface CloudAuthToken {
    email: string;
    token: string;
    id: string;
}

interface Settings {
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

    constructor(public settings: Settings) {}

    request(method: Method, path: string, data?: string, headers?: Map<string, string>): Promise<string> {
        let host = this.settings.sync_custom_host ?
            this.settings.sync_host_url : "https://cloud.padlock.io";

        // Remove any trailing slashes
        host = host.replace(/\/+$/, "");
        const url = host + path;

        headers = headers || new Map<string, string>();

        headers.set("Accept", "application/vnd.padlock;version=1");
        if (this.settings.sync_email && this.settings.sync_key) {
            headers.set("Authorization",
                "AuthToken " + this.settings.sync_email + ":" + this.settings.sync_key);
        }

        // headers.set("X-Client-Version", padlock.version);
        // headers.set("X-Client-Platform", padlock.platform.getPlatformName());

        return request(method, url, data, headers)
            .then((req) => {
                this.settings["sync_sub_status"] = req.getResponseHeader("X-Sub-Status");
                try {
                    this.settings["sync_trial_end"] = parseInt(req.getResponseHeader("X-Sub-Trial-End"), 10);
                } catch (e) {
                    //
                }
                return req.responseText;
            });
    }

    fetch(key) {
        return this.request("GET", "/store/");
    }

    save(key, data) {
        return this.request("PUT", "/store/", data).then(() => {});
    }

    clear(key) {
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
        return this.fetch("")
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
