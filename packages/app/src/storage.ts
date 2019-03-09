import { Storage, Storable, StorableConstructor } from "@padloc/core/lib/storage";
import { Err, ErrorCode } from "@padloc/core/lib/error";
// @ts-ignore
import localStorage from "localforage/src/localforage";

export class LocalStorage implements Storage {
    async save(s: Storable) {
        await localStorage.setItem(`${s.type}_${s.id}`, s.toRaw());
    }

    async get<T extends Storable>(cls: T | StorableConstructor<T>, id: string) {
        const s = cls instanceof Storable ? cls : new cls();
        const data = await localStorage.getItem(`${s.type}_${id}`);
        if (!data) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        return s.fromRaw(data);
    }

    async delete(s: Storable) {
        await localStorage.removeItem(`${s.type}_${s.id}`);
    }

    async clear() {
        await localStorage.clear();
    }
}
