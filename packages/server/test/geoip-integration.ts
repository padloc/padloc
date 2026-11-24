import { strict as assert } from "assert";
import { suite, test, beforeEach, afterEach } from "mocha";
import { GeoIP } from "@padloc/core/src/geoip";
import { MemoryAttachmentStorage } from "@padloc/core/src/attachment";
import { StubMessenger } from "@padloc/core/src/messenger";
import { getPlatform, setPlatform } from "@padloc/core/src/platform";
import { Server, ServerConfig, Context } from "@padloc/core/src/server";
import { MemoryStorage } from "@padloc/core/src/storage";
import { Request } from "@padloc/core/src/transport";
import { NodePlatform } from "../src/platform/node";

suite("Injected GeoIP service", () => {
    const previousPlatform = getPlatform();
    beforeEach(() => setPlatform(new NodePlatform()));
    afterEach(() => setPlatform(previousPlatform));

    async function handle(geoip?: GeoIP, ip?: string) {
        const server = new Server(
            new ServerConfig(),
            new MemoryStorage(),
            new StubMessenger(),
            undefined,
            [],
            new MemoryAttachmentStorage(),
            undefined,
            geoip
        );
        const req = new Request();
        req.ipAddress = ip;
        req.location = { city: "Untrusted client location" };
        let authenticated = false;
        server.makeController = (context: Context) =>
            ({
                async authenticate(request: Request) {
                    assert.equal(request.location, context.location);
                    authenticated = true;
                },
                async process() {
                    return { location: context.location };
                },
            } as unknown as ReturnType<Server["makeController"]>);
        const response = await server.handle(req);
        assert.equal(response.error, undefined);
        assert.equal(authenticated, true);
        return req.location;
    }

    test("resolves once before authentication and overwrites supplied location", async () => {
        let calls = 0;
        const location = { country: "Germany", city: "Berlin" };
        const geoip: GeoIP = {
            async getLocation(ip) {
                assert.equal(ip, "8.8.8.8");
                calls++;
                return location;
            },
        };
        assert.deepEqual(await handle(geoip, "8.8.8.8"), location);
        assert.equal(calls, 1);
    });
    test("no service clears supplied location", async () => {
        assert.equal(await handle(undefined, "8.8.8.8"), undefined);
    });
    test("no IP skips the lookup", async () => {
        assert.equal(
            await handle({
                async getLocation() {
                    assert.fail("Unexpected lookup");
                },
            }),
            undefined
        );
    });
    test("missing results and thrown errors leave requests usable", async () => {
        assert.equal(
            await handle(
                {
                    async getLocation() {
                        return null;
                    },
                },
                "8.8.8.8"
            ),
            undefined
        );
        assert.equal(
            await handle(
                {
                    async getLocation() {
                        throw new Error("Lookup unavailable");
                    },
                },
                "8.8.8.8"
            ),
            undefined
        );
    });
});
