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
    private _storage = new Map<string, string>();

    async set(s: Storable) {
        this._storage.set(this._getKey(s), marshal(await s.serialize()));
    }

    async get(s: Storable) {
        if (!this._storage.has(this._getKey(s))) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        await s.deserialize(unmarshal(this._storage.get(this._getKey(s))!));
    }

    async delete(s: Storable) {
        this._storage.delete(this._getKey(s));
    }

    async clear() {
        this._storage = new Map<string, any>();
    }

    private _getKey(s: Storable) {
        return `${s.kind}_${s.pk}`;
    }
}
