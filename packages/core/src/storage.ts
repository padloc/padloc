import { Serializable, marshal, unmarshal } from "./encoding";
import { Client } from "./client";
import { Err, ErrorCode } from "./error";

export interface Storable extends Serializable {
    storageKey: string;
    storageKind: string;
}

export interface Storage {
    set(s: Storable): Promise<void>;
    get(s: Storable): Promise<void>;
    delete(s: Storable): Promise<void>;
    clear(): Promise<void>;
}

export class MemoryStorage implements Storage {
    private _storage: Map<string, any>;

    constructor() {
        this.clear();
    }

    async set(s: Storable) {
        this._storage.set(s.storageKey, await s.serialize());
    }

    async get(s: Storable) {
        if (!this._storage.has(s.storageKey)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        await s.deserialize(this._storage.get(s.storageKey));
    }

    async delete(s: Storable) {
        this._storage.delete(s.storageKey);
    }

    async clear() {
        this._storage = new Map<string, any>();
    }
}

export class LocalStorage implements Storage {
    keyFor(s: Storable) {
        return `${s.storageKind || ""}_${s.storageKey || ""}`;
    }

    async set(s: Storable) {
        localStorage.setItem(this.keyFor(s), marshal(await s.serialize()));
    }

    async get(s: Storable) {
        const data = localStorage.getItem(this.keyFor(s));
        if (!data) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        await s.deserialize(unmarshal(data));
    }

    async delete(s: Storable) {
        localStorage.removeItem(this.keyFor(s));
    }

    async clear() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                localStorage.removeItem(key);
            }
        }
    }
}

export class RemoteStorage implements Storage {
    constructor(public client: Client) {}

    pathFor(s: Storable) {
        return `${s.storageKind}/${s.storageKey}`;
    }

    async get(s: Storable) {
        const req = await this.client.request("GET", this.pathFor(s));
        await s.deserialize(unmarshal(req.responseText));
    }

    async set(s: Storable) {
        const data = await s.serialize();
        await this.client.request(
            "PUT",
            this.pathFor(s),
            marshal(data),
            new Map<string, string>([["Content-Type", "application/json"]])
        );
    }

    async delete(s: Storable) {
        await this.client.request("DELETE", this.pathFor(s));
    }

    async clear() {
        throw "not supported";
    }
}

//
// export class EncryptedStorage implements Storage {
//     public user?: Participant;
//     public password?: string;
//     private containers: Map<string, Container> = new Map<string, Container>();
//
//     constructor(public storage: Storage) {}
//
//     private getContainer(s: Storable) {
//         if (!this.containers.has(s.storageKey)) {
//             const container = new Container();
//             container.storageKey = s.storageKey;
//             this.containers.set(s.storageKey, container);
//         }
//         return this.containers.get(s.storageKey)!;
//     }
//
//     async get(s: Storable) {
//         const container = this.getContainer(s);
//         container.password = this.password;
//         container.user = this.user;
//         await this.storage.get(container);
//         await container.get(s);
//     }
//
//     async set(s: Storable) {
//         const container = this.getContainer(s);
//         container.password = this.password;
//         container.user = this.user;
//         await container.set(s);
//         await this.storage.set(container);
//     }
//
//     async setAs(s: Storable, scheme: EncryptionScheme) {
//         const container = this.getContainer(s);
//         container.scheme = scheme;
//         return this.set(s);
//     }
// }
