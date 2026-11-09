import { Config, ConfigParam } from "@padloc/core/src/config";
import { ChangeLogEntry, RequestLogEntry } from "@padloc/core/src/logging";
import { Context } from "@padloc/core/src/server";
import { Storage, Storable, StorageListOptions, StorableConstructor, StorageQuery } from "@padloc/core/src/storage";
import { Request } from "@padloc/core/src/transport";

export class ChangeLoggerConfig extends Config {
    @ConfigParam("boolean")
    enabled: boolean = false;

    @ConfigParam("string[]")
    excludeKinds: string[] = ["auth", "session", "srpsession", "authrequest"];
}

export class ChangeLoggingStorage implements Storage {
    constructor(
        private _storage: Storage,
        private _changeLogStorage: Storage,
        private _context: Context,
        private _config: ChangeLoggerConfig
    ) {}

    async save<T extends Storable>(obj: T) {
        if (!this._config.enabled || this._config.excludeKinds.includes(obj.kind)) {
            return this._storage.save(obj);
        }

        const before = await this._storage
            .get(obj.constructor as StorableConstructor<T>, obj.id)
            .catch(() => undefined);

        await this._storage.save(obj);

        const action = before ? "update" : "create";

        this._changeLogStorage.save(new ChangeLogEntry(this._context, action, before, obj));
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string): Promise<T> {
        return this._storage.get(cls, id);
    }

    async delete<T extends Storable>(obj: T) {
        await this._storage.delete(obj);
        if (!this._config.enabled || this._config.excludeKinds.includes(obj.kind)) {
            return;
        }
        this._changeLogStorage.save(new ChangeLogEntry(this._context, "delete", obj));
    }

    async clear() {
        return this._storage.clear();
    }

    async list<T extends Storable>(cls: StorableConstructor<T>, opts?: StorageListOptions) {
        return this._storage.list(cls, opts);
    }

    async count<T extends Storable>(cls: StorableConstructor<T>, query?: StorageQuery) {
        return this._storage.count(cls, query);
    }
}

export class ChangeLogger {
    constructor(private _storage: Storage, private _config: ChangeLoggerConfig) {}

    async list(opts?: StorageListOptions) {
        return this._storage.list(ChangeLogEntry, opts);
    }

    async count(query?: StorageQuery) {
        return this._storage.count(ChangeLogEntry, query);
    }

    wrap(storage: Storage, context: Context) {
        return new ChangeLoggingStorage(storage, this._storage, context, this._config);
    }
}

export class RequestLoggerConfig extends Config {
    @ConfigParam("boolean")
    enabled = false;

    @ConfigParam("string[]")
    excludeEndpoints: string[] = ["get*", "list*"];
}

export class RequestLogger {
    constructor(private _storage: Storage, private _config: RequestLoggerConfig) {}

    async list(opts?: StorageListOptions) {
        return this._storage.list(RequestLogEntry, opts);
    }

    async count(query?: StorageQuery) {
        return this._storage.count(RequestLogEntry, query);
    }

    async log(request: Request, responseTime: number, context?: Context) {
        if (
            !this._config.enabled ||
            this._config.excludeEndpoints.some((exclude) =>
                new RegExp(exclude.replace(/\*/g, ".*")).test(request.method)
            )
        ) {
            return;
        }
        return this._storage.save(new RequestLogEntry(request, responseTime, context));
    }
}
