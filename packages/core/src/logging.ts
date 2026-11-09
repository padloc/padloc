import { AsDate, AsSerializable, Raw } from "./encoding";
import { DeviceInfo } from "./platform";
import { ProvisioningStatus } from "./provisioning";
import { Context } from "./server";
import { Storage, Storable, StorageListOptions, StorageQuery } from "./storage";
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

export interface ChangeLogger {
    list(opts?: StorageListOptions): Promise<ChangeLogEntry[]>;
    count(query?: StorageQuery): Promise<number>;
    wrap(storage: Storage, context: Context): Storage;
}

export interface RequestLogger {
    list(opts?: StorageListOptions): Promise<RequestLogEntry[]>;
    count(query?: StorageQuery): Promise<number>;
    log(request: Request, responseTime: number, context?: Context): Promise<void>;
}
