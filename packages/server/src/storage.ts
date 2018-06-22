// @ts-ignore
import * as level from "level";
import { marshal, unmarshal } from "@padlock/core/src/encoding";
import { Storage, Storable } from "@padlock/core/src/storage";
import { mkdirpSync } from "fs-extra";

export class LevelDBStorage implements Storage {
    private dbs = new Map<string, any>();

    constructor(public path: string) {
        mkdirpSync(this.path);
    }

    getDB(s: Storable): any {
        const kind = s.storageKind;

        if (!this.dbs.has(kind)) {
            this.dbs.set(kind, level(`${this.path}/${kind}.db`));
        }

        return this.dbs.get(kind);
    }

    async get(s: Storable) {
        const db = this.getDB(s);
        const data = await db.get(s.storageKey);
        await s.deserialize(unmarshal(data));
    }

    async set(s: Storable) {
        const db = this.getDB(s);
        const data = await s.serialize();
        await db.put(s.storageKey, marshal(data));
    }

    async delete(s: Storable) {
        const db = this.getDB(s);
        await db.del(s.storageKey);
    }

    async clear() {
        throw "not implemented";
    }
}
