import { Serializable, marshal, unmarshal } from "./encoding";
import { Client } from "./client";
import { Err, ErrorCode } from "./error";

export interface Storable extends Serializable {
    kind: string;
    pk: string;
}

export interface Storage {
    set(s: Storable): Promise<void>;
    get(s: Storable): Promise<void>;
    delete(s: Storable): Promise<void>;
    clear(): Promise<void>;
}

export class MemoryStorage implements Storage {
    private _storage = new Map<string, any>();

    async set(s: Storable) {
        this._storage.set(s.pk, await s.serialize());
    }

    async get(s: Storable) {
        if (!this._storage.has(s.pk)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        await s.deserialize(this._storage.get(s.pk));
    }

    async delete(s: Storable) {
        this._storage.delete(s.pk);
    }

    async clear() {
        this._storage = new Map<string, any>();
    }
}

export class LocalStorage implements Storage {
    keyFor(s: Storable) {
        return `${s.kind || ""}_${s.pk || ""}`;
    }

    async set(s: Storable) {
        localStorage.setItem(this.keyFor(s), marshal(await s.serialize()));
    }

    async get(s: Storable) {
        const data = localStorage.getItem(this.keyFor(s));
        if (!data) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        await s.deserialize(unmarshal(data));
    }

    async delete(s: Storable) {
        localStorage.removeItem(this.keyFor(s));
    }

    async clear() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                localStorage.removeItem(key);
            }
        }
    }
}

export class RemoteStorage implements Storage {
    constructor(public client: Client) {}

    pathFor(s: Storable) {
        switch (s.kind) {
            case "account-store":
                return "me/store";
            case "shared-store":
                return `store/${s.pk}`;
            default:
                throw new Err(ErrorCode.NOT_SUPPORTED);
        }
    }

    async get(s: Storable) {
        const req = await this.client.request("GET", this.pathFor(s));
        await s.deserialize(unmarshal(req.responseText));
    }

    async set(s: Storable) {
        const data = await s.serialize();
        const response = await this.client.request(
            "PUT",
            this.pathFor(s),
            marshal(data),
            new Map<string, string>([["Content-Type", "application/json"]])
        );
        await s.deserialize(unmarshal(response.responseText));
    }

    async delete(s: Storable) {
        await this.client.request("DELETE", this.pathFor(s));
    }

    async clear() {
        throw "not supported";
    }
}
