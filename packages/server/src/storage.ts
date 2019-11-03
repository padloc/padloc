// @ts-ignore
import level from "level";
import { Storage, Storable, StorableConstructor, StorageListOptions } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";

export class LevelDBStorage implements Storage {
    private _db: any;

    constructor(public path: string) {
        this._db = level(`${this.path}`);
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string) {
        try {
            const res = cls instanceof Storable ? cls : new cls();
            const raw = await this._db.get(`${res.kind}_${id}`);
            return res.fromJSON(raw);
        } catch (e) {
            if (e.notFound) {
                throw new Err(ErrorCode.NOT_FOUND);
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
        { offset = 0, limit = Infinity, filter, lt, gt }: StorageListOptions<T>
    ): Promise<T[]> {
        return new Promise((resolve, reject) => {
            const results: T[] = [];
            const kind = new cls().kind;

            this._db
                .createReadStream({ lt, gt })
                .on("data", ({ key, value }: { key: string; value: string }) => {
                    if (key.indexOf(kind + "_") !== 0) {
                        return;
                    }
                    try {
                        const item = new cls().fromJSON(value);
                        if (!filter || filter(item)) {
                            if (offset) {
                                offset--;
                            } else {
                                results.push(item);
                            }
                        }
                    } catch (e) {
                        console.error(
                            `Failed to load ${key}:${JSON.stringify(JSON.parse(value), null, 4)} (Error: ${e})`
                        );
                    }
                    if (results.length >= limit) {
                        resolve(results);
                    }
                })
                .on("error", (err: Error) => reject(err))
                .on("close", () => reject("Stream closed unexpectedly."))
                .on("end", () => resolve(results));
        });
    }
}
