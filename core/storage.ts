import { Serializable, marshal, unmarshal } from "./encoding";
import { Container, Participant, EncryptionScheme } from "./crypto";

export interface Storable extends Serializable {
    id: string;
}

export interface Storage {
    set(s: Storable): Promise<void>;
    get(s: Storable): Promise<void>;
}

export class MemoryStorage implements Storage {
    private _storage: Map<string, any>;

    constructor() {
        this._storage = new Map<string, any>();
    }

    async set(s: Storable) {
        this._storage.set(s.id, await s.serialize());
    }

    async get(s: Storable) {
        await s.deserialize(this._storage.get(s.id));
    }
}

export class LocalStorage implements Storage {
    async set(s: Storable) {
        localStorage.setItem(s.id, marshal(await s.serialize()));
    }

    async get(s: Storable) {
        const data = localStorage.getItem(s.id);
        if (!data) {
            throw "not_found";
        }
        await s.deserialize(unmarshal(data));
    }
}

export type Proxy = Storage & Storable;

export class SerialStorage implements Storage {
    constructor(public proxy: Proxy, public storage: Storage) {}

    async set(s: Storable) {
        await this.proxy.set(s);
        await this.storage.set(this.proxy);
    }

    async get(s: Storable) {
        await this.storage.get(this.proxy);
        await this.proxy.get(s);
    }
}

export class EncryptedStorage implements Storage {
    public user?: Participant;
    public password?: string;
    private containers: Map<string, Container> = new Map<string, Container>();

    constructor(public storage: Storage) {}

    private getContainer(s: Storable) {
        if (!this.containers.has(s.id)) {
            const container = new Container();
            container.id = s.id;
            this.containers.set(s.id, container);
        }
        return this.containers.get(s.id)!;
    }

    async get(s: Storable) {
        const container = this.getContainer(s);
        container.password = this.password;
        container.user = this.user;
        await this.storage.get(container);
        await container.get(s);
    }

    async set(s: Storable) {
        const container = this.getContainer(s);
        container.password = this.password;
        container.user = this.user;
        await container.set(s);
        await this.storage.set(container);
    }

    async setAs(s: Storable, scheme: EncryptionScheme) {
        const container = this.getContainer(s);
        container.scheme = scheme;
        return this.set(s);
    }
}
