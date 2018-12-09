import { Err, ErrorCode } from "@padloc/core/lib/error.js";
import { marshal, unmarshal } from "@padloc/core/lib/encoding.js";
import { Request, Response, Sender } from "@padloc/core/lib/transport.js";

export type Method = "GET" | "POST" | "PUT" | "DELETE";

export async function request(
    method: Method,
    url: string,
    body?: string,
    headers?: Map<string, string>
): Promise<XMLHttpRequest> {
    let req = new XMLHttpRequest();

    return new Promise<XMLHttpRequest>((resolve, reject) => {
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                if (!req.status) {
                    reject(new Err(ErrorCode.FAILED_CONNECTION));
                } else {
                    resolve(req);
                }
            }
        };

        try {
            req.open(method, url, true);
            if (headers) {
                headers.forEach((value, key) => req.setRequestHeader(key, value));
            }
            req.send(body);
        } catch (e) {
            reject(new Err(ErrorCode.FAILED_CONNECTION));
        }
    });
}

export class AjaxSender implements Sender {
    constructor(public url: string) {}

    async send(req: Request): Promise<Response> {
        const res = await request(
            "POST",
            this.url,
            marshal(req),
            new Map<string, string>([["Content-Type", "application/json"], ["Accept", "application/json"]])
        );
        try {
            return unmarshal(res.responseText);
        } catch (e) {
            throw new Err(ErrorCode.SERVER_ERROR);
        }
    }

    async receive(): Promise<Response> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }
}
