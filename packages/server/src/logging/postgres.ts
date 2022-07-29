import { Logger, LogEvent } from "@padloc/core/src/logging";
import { unsafeUUID } from "@padloc/core/src/util";
import { PostgresStorage } from "../storage/postgres";

export class PostgresLogger implements Logger {
    constructor(private _storage: PostgresStorage) {}

    log(type: string, data?: any) {
        const event = new LogEvent(type, data);
        event.id = unsafeUUID();
        (async () => {
            try {
                this._storage.save(event);
            } catch (e) {}
        })();
        return event;
    }
}
