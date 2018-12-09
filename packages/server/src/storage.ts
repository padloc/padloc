// @ts-ignore
import * as level from "level";
import { marshal, unmarshal } from "@padloc/core/src/encoding";
import { Storage, Storable } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";

export class LevelDBStorage implements Storage {
    private _db: any;

    constructor(public path: string) {
        this._db = level(`${this.path}`);
    }

    async get(s: Storable) {
        try {
            const data = await this._db.get(this._getKey(s));
            await s.deserialize(unmarshal(data));
        } catch (e) {
            if (e.notFound) {
                throw new Err(ErrorCode.NOT_FOUND);
            } else {
                throw e;
            }
        }
    }

    async set(s: Storable) {
        await this._db.put(this._getKey(s), marshal(await s.serialize()));
    }

    async delete(s: Storable) {
        await this._db.del(this._getKey(s));
    }

    async clear() {
        throw "not implemented";
    }

    private _getKey(s: Storable) {
        return `${s.kind}_${s.pk}`;
    }
}
