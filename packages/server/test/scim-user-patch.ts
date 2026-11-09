import { strict as assert } from "assert";
import { suite, test, beforeEach, afterEach } from "mocha";
import { IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";
import { bytesToBase64 } from "@padloc/core/src/encoding";
import { Org, ScimSettings } from "@padloc/core/src/org";
import { getPlatform, setPlatform } from "@padloc/core/src/platform";
import { OrgProvisioning } from "@padloc/core/src/provisioning";
import { MemoryStorage } from "@padloc/core/src/storage";
import { NodePlatform } from "../src/platform/node";
import { ScimServer, ScimServerConfig } from "../src/scim";

suite("SCIM user PATCH", () => {
    const previousPlatform = getPlatform();
    let storage: MemoryStorage;
    let server: ScimServer;
    const secret = new Uint8Array(16).fill(1);

    beforeEach(async () => {
        setPlatform(new NodePlatform());
        storage = new MemoryStorage();
        server = new ScimServer(new ScimServerConfig(), storage);
        for (const id of ["org-a", "org-b"]) {
            const org = new Org();
            org.id = id;
            org.directory.syncProvider = "scim";
            org.directory.scim = Object.assign(new ScimSettings(), { secret });
            await storage.save(org);
            await storage.save(
                new OrgProvisioning({
                    orgId: id,
                    metaData: {
                        scim: {
                            users: [{ id: "user", name: { formatted: "Original" }, active: true, meta: {} }],
                            groups: [],
                        },
                    },
                })
            );
        }
    });

    afterEach(() => {
        Reflect.deleteProperty(Object.prototype, "padlocPolluted");
        setPlatform(previousPlatform);
    });

    async function patch(Operations: unknown[], org = "org-a") {
        const request = Readable.from([Buffer.from(JSON.stringify({ Operations }))]) as IncomingMessage;
        request.url = `/${org}/Users/user`;
        request.headers = { authorization: `Bearer ${bytesToBase64(secret)}` };
        const response = {
            statusCode: 0,
            setHeader() {},
            end(_body: string) {},
        };
        await server["_handleScimUsersPatch"](request, response as unknown as ServerResponse);
        return response.statusCode;
    }

    test("rejects explicit and pathless prototype paths without polluting other tenants", async () => {
        for (const path of ["__proto__.padlocPolluted", "constructor.prototype.padlocPolluted"]) {
            for (const operation of [
                { op: "replace", path, value: "polluted" },
                { op: "replace", value: { [path]: "polluted" } },
            ]) {
                assert.equal(await patch([operation]), 400);
                assert.equal(Object.getOwnPropertyDescriptor(Object.prototype, "padlocPolluted"), undefined);
            }
        }
        assert.equal(await patch([{ op: "replace", path: "name.formatted", value: "Other tenant" }], "org-b"), 200);
    });

    test("validates all operations before applying any changes", async () => {
        assert.equal(
            await patch([
                { op: "replace", path: "name.formatted", value: "Changed" },
                { op: "replace", path: "meta.location", value: "untrusted" },
            ]),
            400
        );
        const provisioning = await storage.get(OrgProvisioning, "org-a");
        assert.equal(provisioning.metaData.scim.users[0].name.formatted, "Original");
    });

    test("accepts supported nested fields and pathless replacements", async () => {
        assert.equal(await patch([{ op: "Replace", path: "name.formatted", value: "Updated" }]), 200);
        assert.equal(await patch([{ op: "replace", value: { active: false, userName: "user@example.com" } }]), 200);
        const provisioning = await storage.get(OrgProvisioning, "org-a");
        assert.equal(provisioning.metaData.scim.users[0].name.formatted, "Updated");
        assert.equal(provisioning.metaData.scim.users[0].active, false);
        assert.equal(provisioning.metaData.scim.users[0].userName, "user@example.com");
    });
});
