// @ts-ignore
import level from "level";
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
    private _db: any;

    private _initPromise?: Promise<void>;
    private _disposePromise?: Promise<void>;

    constructor(public readonly config: LevelDBStorageConfig) {
        this._db = level(`${this.config.dir}`);
        this._initPromise = new Promise<void>((resolve, reject) =>
            this._db.open((err: Error) => (err ? reject(err) : resolve()))
        ).then(() => console.log("database open!"));
    }

    async init() {
        return this._initPromise;
    }

    async dispose() {
        if (!this._disposePromise) {
            this._disposePromise = new Promise<void>((resolve, reject) =>
                this._db.close((err: Error) => (err ? reject(err) : resolve()))
            ).then(() => console.log("database closed"));
        }
        return this._disposePromise;
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string) {
        await this._initPromise;
        const res = cls instanceof Storable ? cls : new cls();
        try {
            const raw = await this._db.get(`${res.kind}_${id}`);
            return res.fromJSON(raw);
        } catch (e) {
            if (e.notFound) {
                throw new Err(ErrorCode.NOT_FOUND, `Cannot find object: ${res.kind}_${id}`);
            } else {
                throw e;
            }
        }
    }

    async save<T extends Storable>(obj: T) {
        await this._db.put(`${obj.kind}_${obj.id}`, obj.toJSON());
    }

    async delete<T extends Storable>(obj: T) {
        await this._db.del(`${obj.kind}_${obj.id}`);
    }

    async clear() {
        throw "not implemented";
    }

    async list<T extends Storable>(
        cls: StorableConstructor<T>,
        { offset = 0, limit = Infinity, query, orderBy, orderByDirection }: StorageListOptions = {}
    ): Promise<T[]> {
        return new Promise((resolve, reject) => {
            const results: T[] = [];
            const kind = new cls().kind;
            const sort = orderBy && sortBy(orderBy, orderByDirection || "asc");

            const stream = this._db.createReadStream();

            stream
                .on("data", ({ key, value }: { key: string; value: string }) => {
                    if (key.indexOf(kind + "_") !== 0) {
                        return;
                    }
                    try {
                        const item = new cls().fromJSON(value);
                        if (!query || filterByQuery(item, query)) {
                            results.push(item);
                        }
                    } catch (e) {
                        console.error(
                            `Failed to load ${key}:${JSON.stringify(JSON.parse(value), null, 4)} (Error: ${e})`
                        );
                    }
                })
                .on("error", (err: Error) => reject(err))
                .on("close", () => reject("Stream closed unexpectedly."))
                .on("end", () => {
                    if (sort) {
                        results.sort(sort);
                    }
                    resolve(results.slice(offset, offset + limit));
                });
        });
    }

    async count<T extends Storable>(cls: StorableConstructor<T>, query?: StorageQuery): Promise<number> {
        return this.list(cls, { query }).then((res) => res.length);
    }
}
