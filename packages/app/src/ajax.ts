import { Err, ErrorCode } from "@padloc/core/src/error";
import { marshal, unmarshal } from "@padloc/core/src/encoding";
import { Request, Response, Sender, RequestProgress } from "@padloc/core/src/transport";

export type Method = "GET" | "POST" | "PUT" | "DELETE";

export async function request(
    method: Method,
    url: string,
    body?: string,
    headers?: Map<string, string>,
    progress?: RequestProgress
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
            if (progress) {
                req.onprogress = (pg: { loaded: number; total: number }) => (progress.downloadProgress = pg);
                req.upload.onprogress = (pg: { loaded: number; total: number }) => (progress.uploadProgress = pg);
            }
            req.send(body);
        } catch (e) {
            reject(new Err(ErrorCode.FAILED_CONNECTION));
        }
    });
}

export class AjaxSender implements Sender {
    constructor(public url: string) {}

    async send(req: Request, progress?: RequestProgress): Promise<Response> {
        const body = marshal(req.toRaw());
        const res = await request(
            "POST",
            this.url,
            body,
            new Map<string, string>([["Content-Type", "application/json"], ["Accept", "application/json"]]),
            progress
        );
        try {
            return new Response().fromRaw(unmarshal(res.responseText));
        } catch (e) {
            throw new Err(ErrorCode.SERVER_ERROR);
        }
    }
}
