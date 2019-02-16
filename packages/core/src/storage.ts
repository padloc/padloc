import { Serializable } from "./encoding";
import { Err, ErrorCode } from "./error";

export abstract class Storable extends Serializable {
    abstract id: string;
}

export type StorableConstructor<T extends Storable> = new (...args: any[]) => T;

export type Query = { [prop: string]: any };

export interface Storage {
    save<T extends Storable>(obj: T): Promise<void>;
    get<T extends Storable>(cls: StorableConstructor<T> | T, id: string): Promise<T>;
    delete<T extends Storable>(obj: T): Promise<void>;
    clear(): Promise<void>;
}

// function testVal(obj: object, path: string[], value: any): boolean {
//     const arr = Array.isArray(obj) ? obj : [obj];
//
//     for (const each of arr) {
//         if (path.length ? testVal(each, path.slice(1), value) : each === value) {
//             return true;
//         }
//     }
//
//     return false;
// }
//
// function testQuery(obj: object, query: Query) {
//     return Object.entries(query).every(([prop, val]) => testVal(obj, prop.split("."), val));
// }

export class MemoryStorage implements Storage {
    private _storage = new Map<string, object>();

    async save<T extends Storable>(obj: T) {
        this._storage.set(`${obj.type}_${obj.id}`, obj.toRaw());
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string) {
        const res = cls instanceof Storable ? cls : new cls();
        const raw = this._storage.get(`${res.type}_${id}`);
        if (!raw) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        return res.fromRaw(raw);
    }

    async delete<T extends Storable>(obj: T) {
        this._storage.delete(`${obj.type}_${obj.id}`);
    }

    async clear() {
        this._storage.clear();
    }

    // async _findRaw(kind: string, query: Query): Promise<object> {
    //     for (const [key, obj] of this._storage.entries()) {
    //         if (key.startsWith(kind) && testQuery(obj, query)) {
    //             return obj;
    //         }
    //     }
    //
    //     throw new Err(ErrorCode.NOT_FOUND);
    // }
}
