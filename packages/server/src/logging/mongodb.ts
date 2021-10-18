import { Logger, LogEvent } from "@padloc/core/src/logging";
import { ObjectId } from "mongodb";
import { MongoDBStorage } from "../storage/mongodb";

export class MongoDBLogger implements Logger {
    constructor(private _storage: MongoDBStorage) {}

    log(type: string, data?: any) {
        const event = new LogEvent(type, data);
        event.id = new ObjectId().toString();
        this._storage.save(event, { useObjectId: true, acknowledge: false });
        return event;
    }
}
