import { Serializable, marshal, unmarshal } from "./encoding";
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
