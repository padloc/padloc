import { Storage, Storable, StorableConstructor, StorageListOptions, StorageQuery } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";
import browser, { Storage as BrowserStorage } from "webextension-polyfill";

export class ExtensionStorage implements Storage {
    constructor(private _area: Pick<BrowserStorage.StorageArea, "get" | "set" | "remove" | "clear">) {}

    async save(s: Storable) {
        const data = { [`${s.kind}_${s.id}`]: s.toRaw() };
        await this._area.set(data);
    }

    async get<T extends Storable>(cls: T | StorableConstructor<T>, id: string) {
        const s = cls instanceof Storable ? cls : new cls();
        const key = `${s.kind}_${id}`;
        const data = await this._area.get(key);
        if (!data[key]) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        return s.fromRaw(data[key]);
    }

    async delete(s: Storable) {
        await this._area.remove(`${s.kind}_${s.id}`);
    }

    async clear() {
        await this._area.clear();
    }

    async list<T extends Storable>(_cls: StorableConstructor<T>, _: StorageListOptions): Promise<T[]> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async count<T extends Storable>(_cls: StorableConstructor<T>, _: StorageQuery): Promise<number> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }
}

export class ExtensionLocalStorage extends ExtensionStorage {
    constructor() {
        super(browser.storage.local);
    }
}

export class ExtensionSessionStorage extends ExtensionStorage {
    constructor() {
        super(browser.storage.session);
    }
}
