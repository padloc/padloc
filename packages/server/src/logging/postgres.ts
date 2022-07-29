import { Logger, LogEvent } from "@padloc/core/src/logging";
import { PostgresStorage } from "../storage/postgres";

export class PostgresLogger implements Logger {
    constructor(private _storage: PostgresStorage) {}

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
}
