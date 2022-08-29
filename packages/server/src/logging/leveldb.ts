import { Logger, LogEvent } from "@padloc/core/src/logging";
import { Context } from "@padloc/core/src/server";
import { StorageListOptions } from "@padloc/core/src/storage";
import { LevelDBStorage } from "../storage/leveldb";

export class LevelDBLogger implements Logger {
    constructor(private _storage: LevelDBStorage, public context?: Context) {}

    withContext(context: Context) {
        return new LevelDBLogger(this._storage, context);
    }

    log(type: string, data?: any) {
        const event = new LogEvent(type, data, this.context);
        event.id = `${event.time.toISOString()}_${Math.floor(Math.random() * 1e6)}`;
        (async () => {
            try {
                this._storage.save(event);
            } catch (e) {}
        })();
        return event;
    }

    list(opts: StorageListOptions<LogEvent>) {
        opts.reverse = true;
        return this._storage.list(LogEvent, opts);
    }
}
