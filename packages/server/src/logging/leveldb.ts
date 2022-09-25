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

    list(opts: LoggerListOptions) {
        return this._storage.list(LogEvent, opts);
    }
}
