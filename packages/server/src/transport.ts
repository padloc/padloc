import { createServer, IncomingMessage } from "http";
import { Receiver, Request, Response } from "@padlock/core/src/transport";
import { marshal, unmarshal } from "@padlock/core/src/encoding";

function readBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const body: Buffer[] = [];
        request
            .on("data", chunk => {
                body.push(chunk);
            })
            .on("error", e => {
                reject(e);
            })
            .on("end", () => {
                resolve(Buffer.concat(body).toString());
                // at this point, `body` has the entire request body stored in it as a string
            });
    });
}

export class HTTPReceiver implements Receiver {
    constructor(public port: number) {}

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
                    httpRes.setHeader("Content-Type", "application/json");
                    const body = await readBody(httpReq);
                    const res = await handler(unmarshal(body));
                    httpRes.write(marshal(res));
                    httpRes.end();
                    break;
                default:
                    throw "blah";
            }
        });

        server.listen(this.port);
    }
}
