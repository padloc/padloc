import { Logger, LogEvent, LoggerListOptions } from "@padloc/core/src/logging";
import { Context } from "@padloc/core/src/server";
import { ObjectId } from "mongodb";
import { MongoDBStorage } from "../storage/mongodb";

export class MongoDBLogger implements Logger {
    constructor(private _storage: MongoDBStorage, public context?: Context) {}

    withContext(context: Context) {
        return new MongoDBLogger(this._storage, context);
    }

    log(type: string, data?: any) {
        const event = new LogEvent(type, data, this.context);
        event.id = new ObjectId().toString();
        (async () => {
            try {
                this._storage.save(event, { useObjectId: true, acknowledge: false });
            } catch (e) {}
        })();
        return event;
    }

    list(opts: LoggerListOptions) {
        return this._storage.list(LogEvent, opts);
    }
}
