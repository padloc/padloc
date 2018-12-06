import { Server } from "./server";
import { DeviceInfo } from "./platform";

export interface Request {
    method: string;
    params?: any[];
    auth?: Authentication;
    device?: DeviceInfo;
}

export interface Response {
    result: any;
    error?: Error;
    auth?: Authentication;
}

export interface Authentication {
    session: string;
    time: string;
    signature: string;
}

export interface Error {
    code: number | string;
    message: string;
}

export interface Sender {
    send(req: Request): Promise<Response>;
}

export interface Receiver {
    listen(handler: (req: Request) => Promise<Response>): void;
}

export class DirectSender implements Sender {
    constructor(private server: Server) {}

    send(req: Request) {
        return this.server.handle(req);
    }
}
