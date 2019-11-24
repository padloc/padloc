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
        { offset = 0, limit = Infinity, filter, lt, gt, reverse }: StorageListOptions<T> = {}
    ): Promise<T[]> {
        return new Promise((resolve, reject) => {
            const results: T[] = [];
            const kind = new cls().kind;

            const opts: any = { reverse };
            typeof lt !== "undefined" && (opts.lt = lt);
            typeof gt !== "undefined" && (opts.gt = gt);

            const stream = this._db.createReadStream(opts);

            stream
                .on("data", ({ key, value }: { key: string; value: string }) => {
                    if (results.length >= limit || key.indexOf(kind + "_") !== 0) {
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
                        stream.destroy();
                    }
                })
                .on("error", (err: Error) => reject(err))
                .on("close", () => reject("Stream closed unexpectedly."))
                .on("end", () => resolve(results));
        });
    }
}
