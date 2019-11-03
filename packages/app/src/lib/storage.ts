import { Storage, Storable, StorableConstructor, StorageListOptions } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";
// @ts-ignore
import localStorage from "localforage/src/localforage";

export class LocalStorage implements Storage {
    async save(s: Storable) {
        await localStorage.setItem(`${s.kind}_${s.id}`, s.toRaw());
    }

    async get<T extends Storable>(cls: T | StorableConstructor<T>, id: string) {
        const s = cls instanceof Storable ? cls : new cls();
        const data = await localStorage.getItem(`${s.kind}_${id}`);
        if (!data) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        return s.fromRaw(data);
    }

    async delete(s: Storable) {
        await localStorage.removeItem(`${s.kind}_${s.id}`);
    }

    async clear() {
        await localStorage.clear();
    }

    async list<T extends Storable>(_cls: StorableConstructor<T>, _: StorageListOptions<T>): Promise<T[]> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }
}
