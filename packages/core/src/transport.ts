export interface Request {
    method: string;
    params?: any[];
    auth?: Authentication;
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
