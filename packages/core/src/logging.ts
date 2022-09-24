// import { AsDate } from "./encoding";
import { Config, ConfigParam } from "./config";
import { AsDate, Raw } from "./encoding";
import { DeviceInfo } from "./platform";
import { ProvisioningStatus } from "./provisioning";
import { Context } from "./server";
import { Storage, Storable, StorageListOptions, StorableConstructor, StorageQuery } from "./storage";
import { unsafeUUID } from "./util";

// /**
//  * Unsave (but fast) implementation of uuid v4
//  * Good enough for log events.
//  */
// function uuid() {
//     return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
//         var r = (Math.random() * 16) | 0,
//             v = c == "x" ? r : (r & 0x3) | 0x8;
//         return v.toString(16);
//     });
// }

export class LogEvent<T = any> extends Storable {
    id: string = "";

    time: Date = new Date();

    context?: {
        id: string;

        sessionId?: string;

        device?: Partial<DeviceInfo>;

        account?: {
            name?: string;
            email?: string;
            id?: string;
        };

        provisioning?: {
            status: ProvisioningStatus;
            metaData?: any;
        };

        location?: {
            city?: string;
            country?: string;
        };
    } = undefined;

    constructor(public type = "", public data?: T, context?: Context) {
        super();
        if (context) {
            this.context = {
                id: context.id,
                account: context.auth && {
                    email: context.auth.email,
                    id: context.auth.accountId,
                    name: context.account?.name,
                },
                provisioning: context.provisioning?.account && {
                    status: context.provisioning.account.status,
                    metaData: context.provisioning.account.metaData || undefined,
                },
                device: context.device?.toRaw(),
                sessionId: context.session?.id,
                location: context.location,
            };
        }
    }
}

export interface LoggerListOptions extends StorageListOptions {
    types?: string[];
    before?: Date;
    after?: Date;
    emails?: string[];
}

export interface Logger {
    log(type: string, data?: any): LogEvent;

    list(opts: LoggerListOptions): Promise<LogEvent[]>;

    withContext(context: Context): Logger;
}

export class VoidLogger implements Logger {
    constructor(public context?: Context) {}

    withContext(context: Context) {
        return new VoidLogger(context);
    }

    log(type: string, data?: any) {
        return new LogEvent(type, data);
    }

    async list(_opts: LoggerListOptions & { before?: Date; after?: Date }) {
        return [];
    }
}

export class MultiLogger implements Logger {
    private _loggers: Logger[] = [];
    public context?: Context;

    constructor(...loggers: Logger[]) {
        this._loggers = loggers;
    }

    withContext(context: Context) {
        return new MultiLogger(...this._loggers.map((logger) => logger.withContext(context)));
    }

    log(type: string, data?: any) {
        const [primary, ...rest] = this._loggers;

        const event = primary.log(type, data);
        rest.forEach((l) => l.log(type, data));

        return event;
    }

    list(opts: LoggerListOptions) {
        return this._loggers[0].list(opts);
    }
}

export type ChangeLogAction = "create" | "update" | "delete";

export class ChangeLogEntry<T extends Storable = Storable> extends Storable {
    get objectKind() {
        return this.before?.kind || this.after!.kind;
    }

    get objectId() {
        return this.before?.kind || this.after!.kind;
    }

    id: string = unsafeUUID();

    action: ChangeLogAction;

    @AsDate()
    time: Date = new Date();

    before?: Raw<T>;

    after?: Raw<T>;

    context: {
        id: string;

        sessionId?: string;

        device?: Partial<DeviceInfo>;

        account?: {
            name?: string;
            email?: string;
            id?: string;
        };

        location?: {
            city?: string;
            country?: string;
        };
    } = { id: "" };

    constructor(context?: Context, action: ChangeLogAction = "create", before?: T, after?: T) {
        super();
        this.context = context
            ? {
                  id: context.id,
                  account: context.auth && {
                      email: context.auth.email,
                      id: context.auth.accountId,
                      name: context.account?.name,
                  },
                  device: context.device?.toRaw(),
                  sessionId: context.session?.id,
                  location: context.location,
              }
            : { id: "" };
        this.action = action;
        this.before = before?.toRaw();
        this.after = after?.toRaw();
    }

    toRaw(
        version?: string
    ): Pick<this, "id" | "kind" | "objectKind" | "objectId" | "action" | "time" | "before" | "after" | "context"> {
        return super.toRaw(version);
    }
}

export class ChangeLoggerConfig extends Config {
    @ConfigParam("boolean")
    enabled: boolean = false;

    @ConfigParam("string[]")
    excludeKinds: string[] = ["auth", "session", "srpsession", "autrequest"];
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
            console.log("skipping...", obj.kind);
            return this._storage.save(obj);
        }

        const before = await this._storage
            .get(obj.constructor as StorableConstructor<T>, obj.id)
            .catch(() => undefined);

        await this._storage.save(obj);

        const action = before ? "update" : "create";

        console.log("logging", action, obj, this._changeLogStorage);

        this._changeLogStorage.save(new ChangeLogEntry(this._context, action, before, obj));
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string): Promise<T> {
        return this._storage.get(cls, id);
    }

    async delete<T extends Storable>(obj: T) {
        await this._storage.delete(obj);
        if (!this._config.enabled || this._config.excludeKinds.includes(obj.kind)) {
            console.log("skipping delete", obj.kind);
            return;
        }
        console.log("logging delete", obj, this._changeLogStorage);
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
