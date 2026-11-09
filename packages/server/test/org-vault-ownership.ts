import { strict as assert } from "assert";
import { suite, test, beforeEach, afterEach } from "mocha";
import { Account } from "@padloc/core/src/account";
import { MemoryAttachmentStorage } from "@padloc/core/src/attachment";
import { Auth } from "@padloc/core/src/auth";
import { ErrorCode } from "@padloc/core/src/error";
import { StubMessenger } from "@padloc/core/src/messenger";
import { Org, OrgMember, OrgRole } from "@padloc/core/src/org";
import { getPlatform, setPlatform } from "@padloc/core/src/platform";
import { OrgProvisioning, Provisioning } from "@padloc/core/src/provisioning";
import { Controller, Server, ServerConfig } from "@padloc/core/src/server";
import { Session } from "@padloc/core/src/session";
import { MemoryStorage } from "@padloc/core/src/storage";
import { Vault } from "@padloc/core/src/vault";
import { NodePlatform } from "../src/platform/node";

suite("Organization vault ownership", () => {
    const previousPlatform = getPlatform();
    let storage: MemoryStorage;
    let controller: Controller;
    let org: Org;

    beforeEach(async () => {
        setPlatform(new NodePlatform());
        storage = new MemoryStorage();
        const account = Object.assign(new Account(), { id: "owner", email: "owner@example.com" });
        org = Object.assign(new Org(), {
            id: "org",
            name: "Organization",
            members: [new OrgMember({ accountId: account.id, email: account.email, role: OrgRole.Owner })],
        });
        await storage.save(org);
        // Keep the incoming API object independent of MemoryStorage's raw arrays.
        org = new Org().fromRaw(JSON.parse(JSON.stringify(org.toRaw())));
        const server = new Server(
            new ServerConfig(),
            storage,
            new StubMessenger(),
            undefined,
            [],
            new MemoryAttachmentStorage()
        );
        controller = new Controller(server, {
            id: "request",
            account,
            auth: new Auth(),
            session: new Session(),
            provisioning: new Provisioning({ orgs: [new OrgProvisioning({ orgId: org.id })] }),
        });
    });

    afterEach(() => setPlatform(previousPlatform));

    for (const otherOrg of [undefined, { id: "victim-org", name: "Victim organization" }]) {
        test(`rejects claiming a ${otherOrg ? "different organization's" : "private"} vault`, async () => {
            const victim = Object.assign(new Vault(), { id: "victim", owner: "victim-owner", org: otherOrg });
            await storage.save(victim);
            org.vaults.push({ id: victim.id, name: "Claimed vault" });

            await assert.rejects(controller.updateOrg(org), { code: ErrorCode.INSUFFICIENT_PERMISSIONS });
            assert.deepEqual((await storage.get(Vault, victim.id)).org, victim.org);
            assert.deepEqual((await storage.get(Org, org.id)).vaults, []);
            await assert.rejects(controller.deleteVault(victim.id));
            assert.equal((await storage.get(Vault, victim.id)).owner, victim.owner);
        });
    }

    test("metadata updates cannot reassign a foreign vault even from a stale organization list", async () => {
        const victim = Object.assign(new Vault(), { id: "victim", owner: "victim-owner" });
        await storage.save(victim);
        org.vaults.push({ id: victim.id, name: "Claimed vault" });
        await assert.rejects(controller.updateMetaData(org), { code: ErrorCode.INSUFFICIENT_PERMISSIONS });
        assert.equal((await storage.get(Vault, victim.id)).org, undefined);
    });

    test("allows renaming existing vaults and creating vaults through the authorized endpoint", async () => {
        const vault = Object.assign(new Vault(), { name: "Original", org: org.info });
        const created = await controller.createVault(vault);
        org = await storage.get(Org, org.id);
        org.vaults[0].name = "Renamed";
        await controller.updateOrg(org);
        assert.equal((await storage.get(Vault, created.id)).name, "Renamed");
        assert.equal((await storage.get(Vault, created.id)).org!.id, org.id);
    });
});
