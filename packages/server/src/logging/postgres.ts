import { Logger, LogEvent, LoggerListOptions } from "@padloc/core/src/logging";
import { Context } from "@padloc/core/src/server";
import { PostgresStorage } from "../storage/postgres";

export class PostgresLogger implements Logger {
    constructor(private _storage: PostgresStorage, public context?: Context) {}

    withContext(context: Context) {
        return new PostgresLogger(this._storage, context);
    }

    log(type: string, data?: any) {
        const event = new LogEvent(type, data);
        event.id = `${event.time.toISOString()}_${Math.floor(Math.random() * 1e6)}`;
        (async () => {
            try {
                this._storage.save(event);
            } catch (e) {}
        })();
        return event;
    }

    list(opts: LoggerListOptions<LogEvent>) {
        return this._storage.list(LogEvent, opts);
    }
}
