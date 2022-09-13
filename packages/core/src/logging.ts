// import { AsDate } from "./encoding";
import { DeviceInfo } from "./platform";
import { ProvisioningStatus } from "./provisioning";
import { Context } from "./server";
import { Storable, StorageListOptions } from "./storage";

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
