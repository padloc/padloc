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
    list<T extends Storable>(
        cls: StorableConstructor<T>,
        offset?: number,
        limit?: number,
        filter?: (obj: T) => boolean
    ): Promise<T[]>;
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
        offset = 0,
        limit: number = Infinity,
        filter?: (obj: T) => boolean
    ): Promise<T[]> {
        const results: T[] = [];

        const iter = this._storage[Symbol.iterator]();

        for (let i = 0; i < offset; i++) {
            iter.next();
        }

        let value: object;
        let done: boolean;

        while (
            (({
                value: [, value],
                done
            } = iter.next()),
            !done && results.length < limit)
        ) {
            const item = new cls().fromRaw(value);
            if (!filter || filter(item)) {
                results.push();
            }
        }

        return results;
    }
}
