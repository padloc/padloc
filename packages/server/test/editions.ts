import { suite, test } from "mocha";
import { assert } from "chai";
import { Auth, AuthType } from "@padloc/core/src/auth";
import { Account } from "@padloc/core/src/account";
import { Org, OrgMember, OrgMemberStatus, OrgRole, ScimSettings } from "@padloc/core/src/org";
import { Session } from "@padloc/core/src/session";
import { ErrorCode } from "@padloc/core/src/error";
import { BasicProvisioner, Provisioning, OrgProvisioning } from "@padloc/core/src/provisioning";
import { PadlocConfig } from "../src/config";
import { validateCommunityConfig } from "../src/extensions";
import { init } from "../src/runtime";

async function organizationController() {
    const config = new PadlocConfig();
    config.data.backend = "memory";
    config.attachments.backend = "memory";
    const server = await init(config, undefined, { dryRun: true });
    const account = new Account();
    account.id = "owner";
    account.email = "owner@example.test";
    await server.storage.save(account);
    const org = new Org();
    org.id = "org";
    org.members = [
        new OrgMember({
            id: account.id,
            accountId: account.id,
            email: account.email,
            role: OrgRole.Owner,
            status: OrgMemberStatus.Active,
        }),
    ];
    await server.storage.save(org);
    const controller = server.makeController({
        id: "test",
        account,
        auth: new Auth(),
        session: new Session(),
        provisioning: new Provisioning({ orgs: [new OrgProvisioning({ orgId: org.id })] }),
    });
    return { server, controller, org };
}

suite("Community edition capabilities", () => {
    test("accepts defaults and explicitly disabled legacy audit flags", () => {
        assert.doesNotThrow(() => validateCommunityConfig(new PadlocConfig(), {}));
        assert.doesNotThrow(() =>
            validateCommunityConfig(new PadlocConfig(), {
                PL_CHANGE_LOG_ENABLED: "false",
                PL_REQUEST_LOG_ENABLED: "FALSE",
                PL_PROVISIONING_BACKEND: "basic",
                PL_PROVISIONING_BASIC_DEFAULT_STATUS: "active",
            })
        );
    });

    test("rejects enterprise configuration rather than silently ignoring it", () => {
        for (const key of [
            "PL_DIRECTORY_SCIM_PORT",
            "PL_SERVER_SCIM_SERVER_URL",
            "PL_AUTH_OAUTH_CLIENT_ID",
            "PL_CHANGE_LOG_ENABLED",
            "PL_REQUEST_LOG_ENABLED",
            "PL_PROVISIONING_API_API_KEY",
            "PL_PROVISIONING_STRIPE_SECRET_KEY",
            "PL_PROVISIONING_CUSTOM_OPTION",
        ]) {
            assert.throws(() => validateCommunityConfig(new PadlocConfig(), { [key]: "true" }), /enterprise server/);
        }
        const config = new PadlocConfig();
        config.auth.types = [AuthType.Oauth];
        assert.throws(() => validateCommunityConfig(config, {}), /enterprise server/);
        config.auth.types = [AuthType.Email];
        for (const backend of ["api", "stripe", "oauth", "directory", "future-backend"]) {
            config.provisioning.backend = backend;
            assert.throws(() => validateCommunityConfig(config, {}), /enterprise server/);
        }
    });

    test("hides directory sync while preserving basic sharing capabilities", async () => {
        const { server, org } = await organizationController();
        assert.instanceOf(server.provisioner, BasicProvisioner);
        const account = await server.storage.get(Account, "owner");
        account.orgs = [org.info];
        await server.storage.save(account);
        // Existing provisioning records can still advertise directory sync.
        await server.storage.save(new OrgProvisioning({ orgId: org.id }));
        const result = await server.provisioner.getProvisioning({ email: account.email, accountId: account.id });
        const features = result.orgs[0].features;
        assert.isTrue(features.directorySync.disabled);
        assert.isTrue(features.directorySync.hidden);
        assert.isFalse(features.addMember.disabled);
        assert.isFalse(features.addGroup.disabled);
        assert.isFalse(features.addVault.disabled);
        // Availability is resolved for the response, without rewriting stored policy.
        const stored = await server.storage.get(OrgProvisioning, org.id);
        assert.isFalse(stored.features.directorySync.disabled);
        assert.isFalse(stored.features.directorySync.hidden);
    });

    test("rejects directory activation at the API boundary", async () => {
        const { controller, org, server } = await organizationController();
        const update = org.clone();
        update.directory.syncProvider = "scim";
        try {
            await controller.updateOrg(update);
            assert.fail("Community directory activation should fail");
        } catch (error) {
            assert.equal(error.code, ErrorCode.NOT_SUPPORTED);
        }
        assert.equal((await server.storage.get(Org, org.id)).directory.syncProvider, "none");
    });

    test("keeps existing directory data editable and allows synchronization to be disabled", async () => {
        const { controller, org, server } = await organizationController();
        org.directory.syncProvider = "scim";
        org.directory.syncMembers = true;
        org.directory.scim = new ScimSettings();
        org.directory.scim.secretToken = "existing-token";
        await server.storage.save(org);
        const renamed = org.clone();
        renamed.name = "New name";
        await controller.updateOrg(renamed);
        const saved = await server.storage.get(Org, org.id);
        assert.equal(saved.name, "New name");
        assert.equal(saved.directory.scim!.secretToken, "existing-token");
        saved.directory.syncProvider = "none";
        await controller.updateOrg(saved);
        const disabled = await server.storage.get(Org, org.id);
        assert.isUndefined(disabled.directory.scim);
        assert.isFalse(disabled.directory.syncMembers);
        assert.isFalse(disabled.directory.syncGroups);
    });
});
