import { Storage, Storable } from "./storage";

/**
 * Unsave (but fast) implementation of uuid v4
 * Good enough for log events.
 */
function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export class Event extends Storable {
    time: Date = new Date();
    uuid: string = "";

    constructor(public type = "", public data?: any) {
        super();
    }

    get id() {
        return `${this.time.getTime()}_${this.uuid}`;
    }

    fromRaw({ time, ...rest }: any) {
        return super.fromRaw({
            time: new Date(time),
            ...rest
        });
    }
}

export interface GetLogsOptions {
    from?: Date;
    to?: Date;
    offset?: number;
    limit?: number;
    type?: string | RegExp;
    reverse?: boolean;
}

export class Logger {
    constructor(public storage: Storage) {}

    log(type: string, data?: any) {
        const event = new Event(type, data);
        event.uuid = uuid();
        this.storage.save(event);
        return event;
    }

    async getLogs({ from, to, offset = 0, limit = 100, type, reverse = true }: GetLogsOptions = {}): Promise<Event[]> {
        return this.storage.list(Event, {
            gt: from ? `event_${from.getTime()}` : undefined,
            lt: to ? `event_${to.getTime()}` : undefined,
            reverse,
            offset,
            limit,
            filter: type
                ? (evt: Event) => (type instanceof RegExp ? type.test(evt.type) : evt.type === type)
                : undefined
        });
    }

    async getEvent(id: string) {
        return this.storage.get(Event, id);
    }
}
