import { strict as assert } from "assert";
import { FetchSender } from "../src/fetch";
import { Request, Response } from "@padloc/core/src/transport";
import { marshal } from "@padloc/core/src/encoding";
import { ErrorCode } from "@padloc/core/src/error";

describe("worker RPC transport", () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("preserves the existing RPC wire format and application errors", async () => {
        const request = Object.assign(new Request(), { method: "getAccount" });
        const response = Object.assign(new Response(), {
            error: { code: "AUTHENTICATION_FAILED", message: "Test error" },
        });
        globalThis.fetch = (async (url: string, options: RequestInit) => {
            assert.equal(url, "https://padloc.example/server/");
            assert.equal(options.method, "POST");
            assert.equal(options.body, marshal(request.toRaw()));
            assert.deepEqual(options.headers, { "Content-Type": "application/json", Accept: "application/json" });
            return { text: async () => marshal(response.toRaw()) };
        }) as unknown as typeof fetch;
        assert.deepEqual((await new FetchSender("https://padloc.example/server/").send(request)).error, response.error);
    });

    it("distinguishes a failed connection from an invalid server response", async () => {
        const sender = new FetchSender("https://padloc.example/server/");
        globalThis.fetch = async () => {
            throw new Error("offline");
        };
        await assert.rejects(() => sender.send(new Request()), { code: ErrorCode.FAILED_CONNECTION });
        globalThis.fetch = (async () => ({ text: async () => "invalid JSON" })) as unknown as typeof fetch;
        await assert.rejects(() => sender.send(new Request()), { code: ErrorCode.SERVER_ERROR });
    });
});
