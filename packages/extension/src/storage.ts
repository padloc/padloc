import { Storage, Storable, StorableConstructor, StorageListOptions } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { browser } from "webextension-polyfill-ts";

export class ExtensionStorage implements Storage {
    async save(s: Storable) {
        const data = { [`${s.kind}_${s.id}`]: s.toRaw() };
        await browser.storage.local.set(data);
    }

    async get<T extends Storable>(cls: T | StorableConstructor<T>, id: string) {
        const s = cls instanceof Storable ? cls : new cls();
        const key = `${s.kind}_${id}`;
        const data = await browser.storage.local.get(key);
        if (!data[key]) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        return s.fromRaw(data[key]);
    }

    async delete(s: Storable) {
        await browser.storage.local.remove(`${s.kind}_${s.id}`);
    }

    async clear() {
        await browser.storage.local.clear();
    }

    async list<T extends Storable>(_cls: StorableConstructor<T>, _: StorageListOptions<T>): Promise<T[]> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }
}
