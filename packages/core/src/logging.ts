// import { AsDate } from "./encoding";
import { ChangeLoggerConfig } from "./config/logging/change-logger";
import { RequestLoggerConfig } from "./config/logging/request-logger";
import { AsDate, AsSerializable, Raw } from "./encoding";
import { DeviceInfo } from "./platform";
import { ProvisioningStatus } from "./provisioning";
import { Context } from "./server";
import { Service, SimpleService } from "./service";
import { Storage, Storable, StorageListOptions, StorableConstructor, StorageQuery } from "./storage";
import { Request } from "./transport";
import { unsafeUUID } from "./util";

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

export interface Logger extends Service {
    log(type: string, data?: any): LogEvent;

    list(opts: LoggerListOptions): Promise<LogEvent[]>;

    withContext(context: Context): Logger;
}

export class VoidLogger extends SimpleService implements Logger {
    constructor(public context?: Context) {
        super();
    }

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

    init() {
        return Promise.all(this._loggers.map((logger) => logger.init())).then(() => {});
    }

    dispose() {
        return Promise.all(this._loggers.map((logger) => logger.dispose())).then(() => {});
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

export class LogEntry extends Storable {
    id: string = unsafeUUID();

    @AsDate()
    time: Date = new Date();

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

    constructor(context?: Context) {
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
    }
}

export type ChangeLogAction = "create" | "update" | "delete";

export class ChangeLogEntry<T extends Storable = Storable> extends LogEntry {
    get objectKind() {
        return this.before?.kind || this.after!.kind;
    }

    get objectId() {
        return this.before?.kind || this.after!.kind;
    }

    action: ChangeLogAction;

    before?: Raw<T>;

    after?: Raw<T>;

    constructor(context?: Context, action: ChangeLogAction = "create", before?: T, after?: T) {
        super(context);
        this.action = action;
        this.before = before?.toRaw();
        this.after = after?.toRaw();
    }
}

export class ChangeLoggingStorage implements Storage {
    constructor(
        private _storage: Storage,
        private _changeLogStorage: Storage,
        private _context: Context,
        private _config: ChangeLoggerConfig
    ) {}

    async init() {
        return Promise.all([this._storage.init(), this._changeLogStorage.init()]).then(() => {});
    }

    async dispose() {
        return Promise.all([this._storage.dispose(), this._changeLogStorage.dispose()]).then(() => {});
    }

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

export class ChangeLogger implements Service {
    constructor(private _storage: Storage, private _config: ChangeLoggerConfig) {}

    async init() {
        return this._storage.init();
    }

    async dispose() {
        return this._storage.dispose();
    }

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

export class RequestLogEntry extends LogEntry {
    @AsSerializable(Request)
    request: Request;

    responseTime: number = 0;

    constructor(request: Request, responseTime: number, context?: Context) {
        super(context);
        this.request = request;
        this.responseTime = responseTime;
    }
}

export class RequestLogger implements Service {
    constructor(private _storage: Storage, private _config: RequestLoggerConfig) {}

    async init() {
        return this._storage.init();
    }

    async dispose() {
        return this._storage.dispose();
    }

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
