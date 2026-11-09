import { strict as assert } from "assert";
import { suite, test } from "mocha";
import { IncomingMessage } from "http";
import { Readable } from "stream";
import { ErrorCode } from "@padloc/core/src/error";
import { Attachment } from "@padloc/core/src/attachment";
import { marshal } from "@padloc/core/src/encoding";
import { DeviceInfo, getPlatform, setPlatform } from "@padloc/core/src/platform";
import { Request, RequestAuthentication } from "@padloc/core/src/transport";
import { NodePlatform } from "../src/platform/node";
import { HTTPReceiverConfig, readBody } from "../src/transport/http";

suite("HTTP request body limits", () => {
    function request(chunks: Buffer[]) {
        return Readable.from(chunks) as IncomingMessage;
    }

    test("rejects bodies above 10 MB with the receiver's default configuration", async () => {
        const config = new HTTPReceiverConfig();
        const stream = request([Buffer.alloc(5e6), Buffer.alloc(5e6), Buffer.from("x")]);
        await assert.rejects(readBody(stream, config.maxRequestSize), { code: ErrorCode.MAX_REQUEST_SIZE_EXCEEDED });
        assert.equal(stream.destroyed, true);
    });

    test("accepts bodies exactly at the configured byte limit", async () => {
        const body = "Hello world";
        assert.equal(await readBody(request([Buffer.from("Hello "), Buffer.from("world")]), body.length), body);
    });

    test("rejects chunked bodies as soon as their accumulated size exceeds the limit", async () => {
        const stream = request([Buffer.from("123"), Buffer.from("456"), Buffer.from("789")]);
        await assert.rejects(readBody(stream, 5), { code: ErrorCode.MAX_REQUEST_SIZE_EXCEEDED });
        assert.equal(stream.destroyed, true);
    });

    test("counts bytes rather than characters", async () => {
        const body = Buffer.from("é");
        await assert.rejects(readBody(request([body]), 1), { code: ErrorCode.MAX_REQUEST_SIZE_EXCEEDED });
        assert.equal(await readBody(request([body]), 2), "é");
    });

    test("allows an explicitly configured larger limit", async () => {
        const config = new HTTPReceiverConfig().fromEnv(
            { PL_TRANSPORT_HTTP_MAX_REQUEST_SIZE: "12000000" },
            "PL_TRANSPORT_HTTP_"
        );
        const body = await readBody(request([Buffer.alloc(10000001, "x")]), config.maxRequestSize);
        assert.equal(body.length, 10000001);
    });

    test("accepts an encrypted 5 MB attachment with JSON and authentication overhead", async () => {
        const previousPlatform = getPlatform();
        try {
            setPlatform(new NodePlatform());
            const attachment = new Attachment({
                vault: "11111111-1111-4111-8111-111111111111",
                name: "attachment.bin",
                type: "application/octet-stream",
                size: 5e6,
            });
            await attachment.unlock(new Uint8Array(32));
            await attachment.setData(new Uint8Array(attachment.size));
            const upload = new Request();
            upload.method = "createAttachment";
            upload.params = [attachment.toRaw()];
            upload.device = new DeviceInfo();
            upload.auth = new RequestAuthentication({
                session: "22222222-2222-4222-8222-222222222222",
                time: new Date(),
                signature: new Uint8Array(32),
            });
            const body = marshal(upload.toRaw());
            assert.ok(Buffer.byteLength(body) < new HTTPReceiverConfig().maxRequestSize);
            assert.equal(await readBody(request([Buffer.from(body)]), new HTTPReceiverConfig().maxRequestSize), body);
        } finally {
            setPlatform(previousPlatform);
        }
    });

    test("accepts an empty body and propagates stream errors", async () => {
        assert.equal(await readBody(request([])), "");
        const stream = request([]);
        const result = readBody(stream);
        const error = new Error("Connection interrupted");
        stream.destroy(error);
        await assert.rejects(result, error);
    });
});
