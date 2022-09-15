import { Serializable } from "./encoding";
import { Err, ErrorCode } from "./error";
import { Logger } from "./logging";
import { getPath } from "./util";

/**
 * Base class for objects intended to be used in conjunction with an
 * implementation of the [[Storage]] interface.
 */
export abstract class Storable extends Serializable {
    abstract id: string;
}

type Primitive = string | number | boolean | null | undefined;
export type StorageQuery = {
    [path: string]: Primitive | Primitive[];
};

/**
 * Generic type representing the constructor of a class extending [[Storable]]
 */
export type StorableConstructor<T extends Storable> = new (...args: any[]) => T;

export interface StorageListOptions {
    offset?: number;
    limit?: number;
    query?: StorageQuery;
    orderBy?: string;
    orderByDirection?: "asc" | "desc";
}

export function filterByQuery<T>(obj: T, query: StorageQuery): boolean {
    switch (query.op) {
        case "and":
            return query.queries.every((q) => filterByQuery(obj, q));
        case "or":
            return query.queries.some((q) => filterByQuery(obj, q));
        case "not":
            return !filterByQuery(obj, query.query);
        case "regex":
            return new RegExp(query.value).test(getPath(obj, query.path));
        case "negex":
            return !new RegExp(query.value).test(getPath(obj, query.path));
        case "gt":
            return query.value ? getPath(obj, query.path) > query.value : false;
        case "gte":
            return query.value ? getPath(obj, query.path) >= query.value : false;
        case "lt":
            return query.value ? getPath(obj, query.path) < query.value : false;
        case "lte":
            return query.value ? getPath(obj, query.path) <= query.value : false;
        case "ne":
            return getPath(obj, query.path) !== query.value;
        default:
            return getPath(obj, query.path) === query.value;
    }
}

export function sortBy<T>(path: string, direction: "asc" | "desc") {
    return (a: T, b: T) => {
        const valA = getPath(a, path);
        const valB = getPath(b, path);
        if (direction === "asc") {
            return valA < valB ? -1 : valA > valB ? 1 : 0;
        } else {
            return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
    };
}

export interface StorageEvent {
    action: "get" | "create" | "update" | "delete";
    object: Storable;
    before?: Storable;
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
    list<T extends Storable>(cls: StorableConstructor<T>, opts?: StorageListOptions): Promise<T[]>;
}

export class VoidStorage implements Storage {
    async save<T extends Storable>(_obj: T) {}
    async get<T extends Storable>(_cls: StorableConstructor<T> | T, _id: string): Promise<T> {
        throw new Err(ErrorCode.NOT_FOUND);
    }
    async delete<T extends Storable>(_obj: T) {}
    async clear() {}
    async list<T extends Storable>(_cls: StorableConstructor<T>, _opts?: StorageListOptions) {
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
        { offset = 0, limit = Infinity, query, orderBy, orderByDirection }: StorageListOptions = {}
    ): Promise<T[]> {
        const results: T[] = [];
        const sort = orderBy && sortBy(orderBy, orderByDirection || "asc");
        const iter = this._storage[Symbol.iterator]();

        let value: object;
        let done: boolean | undefined;

        while (
            (({
                value: [, value],
                done,
            } = iter.next()),
            !done && results.length < limit)
        ) {
            const item = new cls().fromRaw(value);
            if (!query || filterByQuery(item, query)) {
                results.push(item);
            }
        }

        if (sort) {
            results.sort(sort);
        }

        return results.slice(offset, offset + limit);
    }
}

export class AuditedStorage implements Storage {
    constructor(private _storage: Storage, private _logger: Logger) {}

    async save<T extends Storable>(obj: T) {
        const before = await this._storage
            .get(obj.constructor as StorableConstructor<T>, obj.id)
            .catch(() => undefined);

        await this._storage.save(obj);

        const action = before ? "update" : "create";

        this._logger.log(`storage.${obj.kind}.${action}`, { object: obj.toRaw(), before: before?.toRaw() });
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string): Promise<T> {
        return this._storage.get(cls, id);
    }

    async delete<T extends Storable>(obj: T) {
        await this._storage.delete(obj);
        this._logger.log(`storage.${obj.kind}.delete`, { object: obj.toRaw() });
    }

    async clear() {
        return this._storage.clear();
    }

    async list<T extends Storable>(cls: StorableConstructor<T>, opts?: StorageListOptions) {
        return this._storage.list(cls, opts);
    }
}
