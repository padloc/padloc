import { Serializable } from "./encoding";
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
