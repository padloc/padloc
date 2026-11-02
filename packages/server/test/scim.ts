import { suite, test, beforeEach, afterEach } from "mocha";
import { assert } from "chai";
import { createServer, request, Server } from "http";
import { AddressInfo } from "net";
import { Org, ScimSettings } from "@padloc/core/src/org";
import { OrgProvisioning } from "@padloc/core/src/provisioning";
import { MemoryStorage } from "@padloc/core/src/storage";
import { bytesToBase64 } from "@padloc/core/src/encoding";
import { getPlatform, setPlatform } from "@padloc/core/src/platform";
import { NodePlatform } from "../src/platform/node";
// The HTTP transport imports GeoIP, which downloads databases on module load.
// SCIM does not use location lookup; isolate that unrelated network dependency.
const geoipPath = require.resolve("../src/geoip");
const cachedGeoip = require.cache[geoipPath];
require.cache[geoipPath] = { exports: { getLocation: async () => null } } as NodeModule;
const { ScimServer, ScimServerConfig } = require("../src/scim") as typeof import("../src/scim");
if (cachedGeoip) {
    require.cache[geoipPath] = cachedGeoip;
} else {
    delete require.cache[geoipPath];
}

suite("SCIM GET authentication", () => {
    let server: Server;
    let storage: MemoryStorage;
    let org: Org;
    let previousPlatform: ReturnType<typeof getPlatform>;
    const secret = new Uint8Array(32).fill(42);
    const user = { id: "user-1", userName: "alice@example.com", externalId: "external-user-1" };
    const group = { id: "group-1", displayName: "Engineering", members: [{ value: user.id }] };

    beforeEach(async () => {
        previousPlatform = getPlatform();
        setPlatform(new NodePlatform());
        storage = new MemoryStorage();
        org = new Org();
        org.id = "scim-test-org";
        org.directory.scim = Object.assign(new ScimSettings(), { secret });
        await storage.save(org);
        const provisioning = new OrgProvisioning();
        provisioning.orgId = org.id;
        provisioning.metaData = { scim: { users: [user], groups: [group] } };
        await storage.save(provisioning);
        const scim = new ScimServer(new ScimServerConfig(), storage);
        // Exercise the production request dispatcher over HTTP without starting a persistent listener.
        server = createServer((req, res) => (scim as any)._handleScimRequest(req, res));
        await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    });

    afterEach(async () => {
        await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
        setPlatform(previousPlatform);
    });

    async function get(path: string, token?: string, queryToken = false) {
        return new Promise<{ status: number; body: any }>((resolve, reject) => {
            const req = request(
                {
                    host: "127.0.0.1",
                    port: (server.address() as AddressInfo).port,
                    path: `/${org.id}${path}${queryToken ? `?token=${encodeURIComponent(token!)}` : ""}`,
                    headers: token && !queryToken ? { Authorization: `Bearer ${token}` } : {},
                },
                (res) => {
                    let body = "";
                    res.on("data", (chunk) => (body += chunk));
                    res.on("end", () => resolve({ status: res.statusCode!, body: JSON.parse(body) }));
                }
            );
            req.on("error", reject);
            req.end();
        });
    }

    for (const [resource, record] of [
        ["Users", user],
        ["Groups", group],
    ] as const) {
        for (const suffix of ["", `/${record.id}`]) {
            const path = `/${resource}${suffix}`;
            test(`rejects invalid tokens for ${path}`, async () => {
                for (const token of [bytesToBase64(new Uint8Array(32).fill(7)), "AAAA", "malformed"]) {
                    const response = await get(path, token);
                    assert.equal(response.status, 401);
                    assert.equal(response.body.detail, "Invalid SCIM Secret Token");
                    assert.notProperty(response.body, "Resources");
                }
            });
            test(`allows the configured token for ${path}`, async () => {
                const response = await get(path, bytesToBase64(secret));
                assert.equal(response.status, 200);
                assert.deepEqual(response.body.Resources, [record]);
            });
        }
        test(`rejects a missing token for ${resource}`, async () => {
            assert.equal((await get(`/${resource}`)).status, 400);
        });
        test(`validates query tokens for ${resource}`, async () => {
            assert.equal((await get(`/${resource}`, "AAAA", true)).status, 401);
            assert.equal((await get(`/${resource}`, bytesToBase64(secret), true)).status, 200);
        });
    }

    test("rejects reads when SCIM is not configured", async () => {
        org.directory.scim = undefined;
        await storage.save(org);
        assert.equal((await get("/Users", bytesToBase64(secret))).status, 400);
    });

    test("rejects orphaned provisioning data without an organization", async () => {
        await storage.delete(org);
        assert.equal((await get("/Users", bytesToBase64(secret))).status, 404);
    });
});
