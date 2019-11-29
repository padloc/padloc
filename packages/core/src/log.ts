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

export interface ListEventsOptions {
    from?: Date;
    to?: Date;
    offset?: number;
    limit?: number;
    type?: string;
    account?: string;
    org?: string;
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

    async listEvents({
        from,
        to,
        offset = 0,
        limit = 50,
        type,
        account,
        org,
        reverse = true
    }: ListEventsOptions = {}): Promise<Event[]> {
        const typeReg = type && new RegExp(type, "i");
        const accReg = account && new RegExp(account, "i");
        const orgReg = org && new RegExp(org, "i");

        const filter = (e: Event) =>
            (!typeReg || typeReg.test(e.type)) &&
            (!accReg ||
                (e.data.account && accReg.test(e.data.account.id + e.data.account.name + e.data.account.email))) &&
            (!orgReg || (e.data.org && orgReg.test(e.data.org.id + e.data.org.name)));
        return this.storage.list(Event, {
            gt: from ? `event_${from.getTime()}` : undefined,
            lt: to ? `event_${to.getTime()}` : undefined,
            reverse,
            offset,
            limit,
            filter
        });
    }

    async getEvent(id: string) {
        return this.storage.get(Event, id);
    }
}
