import { Serializable } from "./encoding";
import { Err, ErrorCode } from "./error";

/**
 * Base class for objects intended to be used in conjunction with an
 * implementation of the [[Storage]] interface.
 */
export abstract class Storable extends Serializable {
    abstract id: string;
}

/**
 * Generic type representing the constructor of a class extending [[Storable]]
 */
export type StorableConstructor<T extends Storable> = new (...args: any[]) => T;

export interface StorageListOptions<T> {
    offset?: number;
    limit?: number;
    filter?: (obj: T) => boolean;
    lt?: string;
    gt?: string;
    reverse?: boolean;
}

/**
 * Generic interface for data storage
 */
export interface Storage {
    /** Saves an object to the storage */
    save<T extends Storable>(obj: T): Promise<void>;

    /** Retrieves an object of type `T` based on its `id`*/
    get<T extends Storable>(cls: StorableConstructor<T> | T, id: string): Promise<T>;

    /** Deletes an object */
    delete<T extends Storable>(obj: T): Promise<void>;

    /** Deletes all data in this storage */
    clear(): Promise<void>;

    /** Retrieves an object of type `T` based on its `id`*/
    list<T extends Storable>(cls: StorableConstructor<T>, opts?: StorageListOptions<T>): Promise<T[]>;
}

export class VoidStorage implements Storage {
    async save<T extends Storable>(_obj: T) {}
    async get<T extends Storable>(_cls: StorableConstructor<T> | T, _id: string): Promise<T> {
        throw new Err(ErrorCode.NOT_FOUND);
    }
    async delete<T extends Storable>(_obj: T) {}
    async clear() {}
    async list<T extends Storable>(_cls: StorableConstructor<T>, _opts?: StorageListOptions<T>) {
        return [];
    }
}

/**
 * Basic in-memory storage. Useful for testing purposes
 */
export class MemoryStorage implements Storage {
    private _storage = new Map<string, object>();

    async save<T extends Storable>(obj: T) {
        this._storage.set(`${obj.kind}_${obj.id}`, obj.toRaw());
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string) {
        const res = cls instanceof Storable ? cls : new cls();
        const raw = this._storage.get(`${res.kind}_${id}`);
        if (!raw) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        return res.fromRaw(raw);
    }

    async delete<T extends Storable>(obj: T) {
        this._storage.delete(`${obj.kind}_${obj.id}`);
    }

    async clear() {
        this._storage.clear();
    }

    async list<T extends Storable>(
        cls: StorableConstructor<T>,
        { offset = 0, limit = Infinity, filter }: StorageListOptions<T> = {}
    ): Promise<T[]> {
        const results: T[] = [];

        const iter = this._storage[Symbol.iterator]();

        let value: object;
        let done: boolean | undefined;

        while (
            (({
                value: [, value],
                done
            } = iter.next()),
            !done && results.length < limit)
        ) {
            const item = new cls().fromRaw(value);
            if (!filter || filter(item)) {
                if (!filter || filter(item)) {
                    if (offset) {
                        offset--;
                    } else {
                        results.push(item);
                    }
                }
            }
        }

        return results;
    }
}
