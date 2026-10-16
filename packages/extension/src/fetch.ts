import { Err, ErrorCode } from "@padloc/core/src/error";
import { marshal, unmarshal } from "@padloc/core/src/encoding";
import { Request, Response, Sender } from "@padloc/core/src/transport";

// XMLHttpRequest is unavailable in extension service workers. File transfers and
// their progress reporting remain in the popup's AjaxSender.
export class FetchSender implements Sender {
    constructor(public url: string) {}

    async send(req: Request): Promise<Response> {
        let response: globalThis.Response;
        try {
            response = await fetch(this.url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: marshal(req.toRaw()),
            });
        } catch (e) {
            throw new Err(ErrorCode.FAILED_CONNECTION);
        }

        try {
            return new Response().fromRaw(unmarshal(await response.text()));
        } catch (e) {
            throw new Err(ErrorCode.SERVER_ERROR);
        }
    }
}
