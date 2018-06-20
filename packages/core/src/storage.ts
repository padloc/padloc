import { Serializable, marshal, unmarshal } from "./encoding";
import { Client } from "./client";

export interface Storable extends Serializable {
    id: string;
    kind: string;
}

export interface Storage {
    set(s: Storable): Promise<void>;
    get(s: Storable): Promise<void>;
    clear(): Promise<void>;
}

export class MemoryStorage implements Storage {
    private _storage: Map<string, any>;

    constructor() {
        this.clear();
    }

    async set(s: Storable) {
        this._storage.set(s.id, await s.serialize());
    }

    async get(s: Storable) {
        await s.deserialize(this._storage.get(s.id));
    }

    async clear() {
        this._storage = new Map<string, any>();
    }
}

export class LocalStorage implements Storage {
    keyFor(s: Storable) {
        return `${s.kind || ""}_${s.id || ""}`;
    }

    async set(s: Storable) {
        localStorage.setItem(this.keyFor(s), marshal(await s.serialize()));
    }

    async get(s: Storable) {
        const data = localStorage.getItem(this.keyFor(s));
        if (!data) {
            throw "not_found";
        }
        await s.deserialize(unmarshal(data));
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
        return `${s.kind}/${s.id}`;
    }

    async get(s: Storable) {
        const req = await this.client.request("GET", this.pathFor(s));
        await s.deserialize(unmarshal(req.responseText));
    }

    async set(s: Storable) {
        const data = await s.serialize();
        await this.client.request("POST", this.pathFor(s), marshal(data));
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
//         if (!this.containers.has(s.id)) {
//             const container = new Container();
//             container.id = s.id;
//             this.containers.set(s.id, container);
//         }
//         return this.containers.get(s.id)!;
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
