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
            const typesPatterns = opts.types?.map(
                (type) => new RegExp(type.replace(/\./g, "\\.").replace(/\*/g, ".+"))
            );
            const excludeTypesPatterns = opts.excludeTypes?.map(
                (type) => new RegExp(type.replace(/\./g, "\\.").replace(/\*/g, ".+"))
            );

            console.log("list events", typesPatterns, excludeTypesPatterns);

            opts.filter = (event: LogEvent) => {
                if (
                    (typesPatterns && !typesPatterns.some((type) => type.test(event.type))) ||
                    (excludeTypesPatterns && excludeTypesPatterns.some((type) => type.test(event.type))) ||
                    (opts.emails &&
                        (!event.context?.account?.email || !opts.emails.includes(event.context?.account?.email)))
                ) {
                    return false;
                }

                return true;
            };
        }
        return this._storage.list(LogEvent, opts);
    }
}
