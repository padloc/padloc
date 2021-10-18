// import { AsDate } from "./encoding";
import { Storable } from "./storage";

// /**
//  * Unsave (but fast) implementation of uuid v4
//  * Good enough for log events.
//  */
// function uuid() {
//     return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
//         var r = (Math.random() * 16) | 0,
//             v = c == "x" ? r : (r & 0x3) | 0x8;
//         return v.toString(16);
//     });
// }

export class LogEvent extends Storable {
    id: string = "";

    time: Date = new Date();

    constructor(public type = "", public data?: any) {
        super();
    }
}

// export interface ListLogEventsOptions {
//     from?: Date;
//     to?: Date;
//     offset?: number;
//     limit?: number;
//     type?: string;
//     account?: string;
//     org?: string;
//     reverse?: boolean;
// }

export interface Logger {
    log(type: string, data?: any): LogEvent;
}

export class VoidLogger implements Logger {
    log(type: string, data?: any) {
        return new LogEvent(type, data);
    }
}
