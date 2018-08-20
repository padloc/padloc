// @ts-ignore
import * as level from "level";
import { marshal, unmarshal } from "@padlock/core/src/encoding";
import { Storage, Storable } from "@padlock/core/src/storage";
import { Err, ErrorCode } from "@padlock/core/src/error";
import { mkdirpSync } from "fs-extra";

export class LevelDBStorage implements Storage {
    private _dbs = new Map<string, any>();
    // private _index = new Map<string, string>();

    constructor(public path: string) {
        mkdirpSync(this.path);
    }
    //
    // private async _buildIndex(db: any, s: Storable) {
    //     if (!s.lookups || !s.lookups.length) {
    //         return;
    //     }
    //     await new Promise((resolve, reject) => {
    //         db.createValueStream()
    //             .on("data", (data: any) => {
    //                 console.log("building index...", data);
    //                 for (const lookup of s.lookups || []) {
    //                     this._index.set(`${s.kind}_${lookup}_${data[lookup]}`, s.id);
    //                 }
    //             })
    //             .on("end", () => resolve())
    //             .on("error", (e: Error) => reject(e));
    //     });
    // }

    private async _getDB(s: Storable): Promise<any> {
        let db = this._dbs.get(s.kind);
        if (!db) {
            db = level(`${this.path}/${s.kind}.db`);
            this._dbs.set(s.kind, db);
            // await this._buildIndex(db, s);
        }

        return db;
    }
    //
    // private _getID(s: Storable): string {
    //     let id = s.id;
    //     for (const lookup of s.lookups || []) {
    //         id = this._index.get(`${s.kind}_${lookup}_${s[lookup]}`) || "";
    //         if (id) {
    //             break;
    //         }
    //     }
    //     return id;
    // }

    async get(s: Storable) {
        const db = await this._getDB(s);
        // const id = this._getID(s);
        // if (!id) {
        //     throw new Err(ErrorCode.NOT_FOUND);
        // }
        try {
            const data = await db.get(s.pk);
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
        const db = await this._getDB(s);
        const data = await s.serialize();
        await db.put(s.pk, marshal(data));
        // for (const lookup of s.lookups || []) {
        //     this._index.set(`${s.kind}_${lookup}_${data[lookup]}`, s.id);
        // }
    }

    async delete(s: Storable) {
        const db = await this._getDB(s);
        await db.del(s.pk);
    }

    async clear() {
        throw "not implemented";
    }
}
