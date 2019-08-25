// @ts-ignore
import level from "level";
import { Storage, Storable, StorableConstructor } from "@padloc/core/src/storage";
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
}
