import { Storage, Storable } from "@padloc/core/lib/storage.js";
import { marshal, unmarshal } from "@padloc/core/lib/encoding.js";
import { Err, ErrorCode } from "@padloc/core/lib/error.js";
// @ts-ignore
import localStorage from "localforage/src/localforage";

export class LocalStorage implements Storage {
    keyFor(s: Storable) {
        return `${s.kind || ""}_${s.pk || ""}`;
    }

    async set(s: Storable) {
        localStorage.setItem(this.keyFor(s), marshal(await s.serialize()));
    }

    async get(s: Storable) {
        const data = (await localStorage.getItem(this.keyFor(s))) as string;
        if (!data) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        await s.deserialize(unmarshal(data));
    }

    async delete(s: Storable) {
        await localStorage.removeItem(this.keyFor(s));
    }

    async clear() {
        await localStorage.clear();
    }
}
