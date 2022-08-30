import { Logger, LogEvent, LoggerListOptions } from "@padloc/core/src/logging";
import { Context } from "@padloc/core/src/server";
import { LevelDBStorage } from "../storage/leveldb";

export class LevelDBLogger implements Logger {
    constructor(private _storage: LevelDBStorage, public context?: Context) {}

    withContext(context: Context) {
        return new LevelDBLogger(this._storage, context);
    }

    log(type: string, data?: any) {
        const event = new LogEvent(type, data, this.context);
        event.id = `${event.time.getTime()}_${Math.floor(Math.random() * 1e6)}`;
        (async () => {
            try {
                this._storage.save(event);
            } catch (e) {}
        })();
        return event;
    }

    list(opts: LoggerListOptions<LogEvent>) {
        opts.reverse = true;
        opts.lt = opts.before?.getTime().toString();
        opts.gt = opts.after?.getTime().toString();

        if (opts.types || opts.excludeTypes) {
            opts.filter = (event: LogEvent) => {
                if (
                    (opts.types && !opts.types.includes(event.type)) ||
                    (opts.excludeTypes && opts.excludeTypes.includes(event.type))
                ) {
                    return false;
                }

                return true;
            };
        }
        return this._storage.list(LogEvent, opts);
    }
}
