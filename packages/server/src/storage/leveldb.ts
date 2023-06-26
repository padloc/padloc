import { Level } from "level";
import {
    Storage,
    Storable,
    StorableConstructor,
    StorageListOptions,
    filterByQuery,
    sortBy,
    StorageQuery,
} from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { LevelDBStorageConfig } from "@padloc/core/src/config/storage/leveldb";

export class LevelDBStorage implements Storage {
    private _db?: Level;

    private _initPromise?: Promise<void>;
    private _disposePromise?: Promise<void>;

    constructor(public readonly config: LevelDBStorageConfig) {}

    async init() {
        if (!this._initPromise) {
            // console.log(this._instanceNumber, "opening database...");
            this._db = new Level(`${this.config.dir}`);
            // this._db.on("opening", () => console.log(this._instanceNumber, "database is OPENING..."));
            // this._db.on("open", () => console.log(this._instanceNumber, "database is OPEN..."));
            // this._db.on("closing", () => console.log(this._instanceNumber, "database is CLOSING..."));
            // this._db.on("closed", () => console.log(this._instanceNumber, "database is CLOSED..."));
            this._initPromise = this._db.open();
        }
        return this._initPromise;
    }

    async dispose() {
        if (!this._disposePromise) {
            this._disposePromise = this._db?.close();
        }
        return this._disposePromise;
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string): Promise<T> {
        if (!this._db) {
            throw "Database has not been initialized yet!";
        }

        const res = cls instanceof Storable ? cls : new cls();
        try {
            const raw = await this._db.get(`${res.kind}_${id}`);
            return res.fromJSON(raw);
        } catch (e) {
            // if (e.code === "LEVEL_DATABASE_NOT_OPEN") {
            //     await this.init();
            //     return this.get(cls, id);
            // }
            if (e.notFound) {
                throw new Err(ErrorCode.NOT_FOUND, `Cannot find object: ${res.kind}_${id}`);
            } else {
                throw e;
            }
        }
    }

    async save<T extends Storable>(obj: T) {
        if (!this._db) {
            throw "Database has not been initialized yet!";
        }

        await this._db.put(`${obj.kind}_${obj.id}`, obj.toJSON());
    }

    async delete<T extends Storable>(obj: T) {
        if (!this._db) {
            throw "Database has not been initialized yet!";
        }

        await this._db.del(`${obj.kind}_${obj.id}`);
    }

    async clear() {
        throw "not implemented";
    }

    async list<T extends Storable>(
        cls: StorableConstructor<T>,
        { offset = 0, limit = Infinity, query, orderBy, orderByDirection }: StorageListOptions = {}
    ): Promise<T[]> {
        if (!this._db) {
            throw "Database has not been initialized yet!";
        }

        const results: T[] = [];
        const kind = new cls().kind;
        const sort = orderBy && sortBy(orderBy, orderByDirection || "asc");

        for await (const [key, value] of this._db.iterator()) {
            if (key.indexOf(kind + "_") !== 0) {
                continue;
            }

            try {
                const item = new cls().fromJSON(value);
                if (!query || filterByQuery(item, query)) {
                    results.push(item);
                }
            } catch (e) {
                console.error(`Failed to load ${key}:${JSON.stringify(JSON.parse(value), null, 4)} (Error: ${e})`);
            }
        }

        if (sort) {
            results.sort(sort);
        }

        return results.slice(offset, offset + limit);
    }

    async count<T extends Storable>(cls: StorableConstructor<T>, query?: StorageQuery): Promise<number> {
        return this.list(cls, { query }).then((res) => res.length);
    }
}
