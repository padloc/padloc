// @ts-ignore
import * as level from "level";
import { marshal, unmarshal } from "@padlock/core/src/encoding";
import { Storage, Storable } from "@padlock/core/src/storage";
import { Err, ErrorCode } from "@padlock/core/src/error";
import * as path from "path";
import * as fs from "fs";

function mkdir(targetDir: string, { isRelativeToScript = false } = {}) {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : "";
    const baseDir = isRelativeToScript ? __dirname : ".";

    return targetDir.split(sep).reduce((parentDir, childDir) => {
        const curDir = path.resolve(baseDir, parentDir, childDir);
        try {
            fs.mkdirSync(curDir);
        } catch (err) {
            if (err.code === "EEXIST") {
                // curDir already exists!
                return curDir;
            }

            // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
            if (err.code === "ENOENT") {
                // Throw the original parentDir error on curDir `ENOENT` failure.
                throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
            }

            const caughtErr = ["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
            if (!caughtErr || (caughtErr && targetDir === curDir)) {
                throw err; // Throw if it's just the last created dir.
            }
        }

        return curDir;
    }, initDir);
}

export class LevelDBStorage implements Storage {
    private _dbs = new Map<string, any>();
    // private _index = new Map<string, string>();

    constructor(public path: string) {
        mkdir(this.path);
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
