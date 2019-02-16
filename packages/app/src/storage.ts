import { Storage, Storable, StorableConstructor } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";
// @ts-ignore
import localStorage from "localforage/src/localforage";

export class LocalStorage implements Storage {
    keyFor(s: Storable) {
        return `${s.type}_${s.id}`;
    }

    async save(s: Storable) {
        await localStorage.setItem(this.keyFor(s), s);
    }

    async get<T extends Storable>(cls: T | StorableConstructor<T>) {
        const s = cls instanceof Storable ? cls : new cls();
        const data = (await localStorage.getItem(this.keyFor(s))) as string;
        if (!data) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        return s.fromJSON(data);
    }

    async delete(s: Storable) {
        await localStorage.removeItem(this.keyFor(s));
    }

    async clear() {
        await localStorage.clear();
    }
}
