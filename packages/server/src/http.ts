import { createServer, IncomingMessage } from "http";
import { Receiver, Request, Response } from "@padloc/core/src/transport";
import { marshal, unmarshal } from "@padloc/core/src/encoding";
import { Err, ErrorCode } from "@padloc/core/src/error";

export function readBody(request: IncomingMessage, maxSize = 1e7): Promise<string> {
    return new Promise((resolve, reject) => {
        const body: Buffer[] = [];
        let size = 0;

        request
            .on("data", chunk => {
                size += chunk.length;
                if (size > maxSize) {
                    console.error("Max request size exceeded!", size, maxSize);
                    request.destroy(new Err(ErrorCode.MAX_REQUEST_SIZE_EXCEEDED));
                }
                body.push(chunk);
            })
            .on("error", e => {
                reject(e);
            })
            .on("end", () => {
                resolve(Buffer.concat(body).toString());
            });
    });
}

export class HTTPReceiver implements Receiver {
    constructor(public port: number, public maxRequestSize = 1e9) {}

    async listen(handler: (req: Request) => Promise<Response>) {
        const server = createServer(async (httpReq, httpRes) => {
            httpRes.on("error", e => {
                // todo
                console.error(e);
            });

            httpRes.setHeader("Access-Control-Allow-Origin", "*");
            httpRes.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST");
            httpRes.setHeader("Access-Control-Allow-Headers", "Content-Type");

            switch (httpReq.method) {
                case "OPTIONS":
                    httpRes.end();
                    break;
                case "POST":
                    const body = await readBody(httpReq, this.maxRequestSize);
                    const res = await handler(new Request().fromRaw(unmarshal(body)));
                    const resBody = marshal(res.toRaw());
                    httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                    httpRes.setHeader("Content-Length", Buffer.byteLength(resBody));
                    httpRes.write(resBody);
                    httpRes.end();
                    break;
                default:
                    httpRes.statusCode = 405;
                    httpRes.end();
            }
        });

        server.listen(this.port);
    }
}
