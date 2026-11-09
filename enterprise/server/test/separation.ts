import { suite, test } from "mocha";
import { assert } from "chai";
import { AuthType } from "@padloc/core/src/auth";
import { Org, OrgMember, OrgMemberStatus } from "@padloc/core/src/org";
import { ChangeLogEntry } from "@padloc/core/src/logging";
import { Request } from "@padloc/core/src/transport";
import { DataStorageConfig, PadlocConfig } from "@padloc/server/src/config";
import { init } from "@padloc/server/src/runtime";
import { EnterpriseConfig } from "../src/config";
import { EnterpriseExtension } from "../src/services";
import { ScimServer } from "../src/scim";
import { DirectorySync } from "../src/directory";
import { DirectoryProvisioner } from "../src/provisioning/directory";
import { OauthProvisioner } from "../src/provisioning/oauth";
import { ApiProvisioner } from "../src/provisioning/api";
import { StripeProvisioner } from "../src/provisioning/stripe";
import { AccountProvisioning, OrgProvisioning } from "@padloc/core/src/provisioning";
import { getIdFromEmail } from "@padloc/core/src/util";

function memoryConfig<T extends PadlocConfig>(config: T): T {
    config.data.backend = "memory";
    config.attachments.backend = "memory";
    return config;
}

suite("Server edition separation", () => {
    test("enterprise config does not register settings on community config", () => {
        const env = {
            PL_AUTH_TYPES: "email,oauth",
            PL_AUTH_OAUTH_CLIENT_ID: "client",
            PL_AUTH_OAUTH_CLIENT_SECRET: "secret-value",
            PL_PROVISIONING_BACKEND: "oauth",
            PL_PROVISIONING_OAUTH_RESYNC_AFTER: "42",
            PL_PROVISIONING_API_API_KEY: "api-placeholder",
            PL_PROVISIONING_API_PORT: "4001",
            PL_PROVISIONING_STRIPE_SECRET_KEY: "stripe-placeholder",
            PL_DIRECTORY_SCIM_PORT: "6789",
            PL_CHANGE_LOG_ENABLED: "true",
        };
        const enterprise = new EnterpriseConfig().fromEnv(env);
        const community = new PadlocConfig().fromEnv(env);
        assert.equal(enterprise.auth.oauth!.clientId, "client");
        assert.equal(enterprise.provisioning.oauth!.resyncAfter, 42);
        assert.equal(enterprise.provisioning.api!.port, 4001);
        assert.equal(enterprise.directory.scim.port, 6789);
        assert.isTrue(enterprise.changeLog.enabled);
        assert.notInclude(JSON.stringify(enterprise.toRaw()), "secret-value");
        assert.notInclude(JSON.stringify(enterprise.toRaw()), "api-placeholder");
        assert.notInclude(JSON.stringify(enterprise.toRaw()), "stripe-placeholder");
        assert.notProperty(community.auth, "oauth");
        assert.notProperty(community.provisioning, "oauth");
        assert.notProperty(community.provisioning, "api");
        assert.notProperty(community.provisioning, "stripe");
        assert.notProperty(community, "directory");
        assert.notProperty(community, "changeLog");
        assert.isFalse(Object.keys(community.toEnv()).some((key) => key.startsWith("PL_DIRECTORY_")));
        const restored = new EnterpriseConfig().fromRaw(enterprise.toRaw());
        assert.instanceOf(restored, EnterpriseConfig);
        assert.equal(restored.directory.scim.port, 6789);
        assert.equal(restored.provisioning.oauth!.resyncAfter, 42);
    });

    test("community runtime has no enterprise services", async () => {
        const server = await init(memoryConfig(new PadlocConfig()), undefined, { dryRun: true });
        assert.isUndefined(server.directory);
        assert.isUndefined(server.changeLogger);
        assert.isUndefined(server.requestLogger);
        assert.isFalse(server.authServers.some((auth) => auth.supportsType(AuthType.Oauth)));
    });

    test("enterprise directory availability respects configured providers and stored policy", async () => {
        for (const backend of ["basic", "directory"] as const) {
            for (const { available, disabled } of [
                { available: true, disabled: false },
                { available: false, disabled: false },
                { available: true, disabled: true },
            ]) {
                const config = memoryConfig(new EnterpriseConfig());
                config.provisioning.backend = backend;
                config.directory.providers = available ? ["scim"] : [];
                const server = await init(config, new EnterpriseExtension(config), { dryRun: true });
                const email = "owner@example.test";
                const org = new OrgProvisioning({ orgId: "org" });
                org.features.directorySync.disabled = disabled;
                await server.storage.save(org);
                await server.storage.save(
                    new AccountProvisioning({
                        id: await getIdFromEmail(email),
                        email,
                        orgs: [org.orgId],
                    })
                );
                const result = await server.provisioner.getProvisioning({ email });
                assert.equal(result.orgs[0].features.directorySync.disabled, !available || disabled);
                assert.equal(result.orgs[0].features.directorySync.hidden, !available);
                const stored = await server.storage.get(OrgProvisioning, org.orgId);
                assert.equal(stored.features.directorySync.disabled, disabled);
                assert.isFalse(stored.features.directorySync.hidden);
            }
        }
    });

    test("API and Stripe provisioning compose without starting listeners or contacting Stripe during dry runs", async () => {
        const originalApiInit = ApiProvisioner.prototype.init;
        const originalStripeInit = StripeProvisioner.prototype.init;
        const originalScimInit = ScimServer.prototype.init;
        let started = 0;
        ApiProvisioner.prototype.init = async () => {
            started++;
        };
        StripeProvisioner.prototype.init = async () => {
            started++;
        };
        ScimServer.prototype.init = async () => {};
        try {
            for (const backend of ["api", "stripe"] as const) {
                started = 0;
                const config = memoryConfig(
                    new EnterpriseConfig().fromEnv({
                        PL_PROVISIONING_BACKEND: backend,
                        PL_PROVISIONING_API_API_KEY: "api-placeholder",
                        PL_PROVISIONING_STRIPE_SECRET_KEY: "stripe-placeholder",
                    })
                );
                const extension = new EnterpriseExtension(config);
                const server = await init(config, extension, { dryRun: true });
                assert.instanceOf(server.provisioner, backend === "api" ? ApiProvisioner : StripeProvisioner);
                assert.equal(started, 0);

                const services = await extension.initialize(server.storage, { dryRun: false });
                assert.equal(started, 0);
                await services.onServerCreated!(server);
                assert.equal(started, 1);
            }
        } finally {
            ApiProvisioner.prototype.init = originalApiInit;
            StripeProvisioner.prototype.init = originalStripeInit;
            ScimServer.prototype.init = originalScimInit;
        }
    });

    test("API and Stripe provisioning require their configuration", async () => {
        for (const backend of ["api", "stripe"] as const) {
            const config = memoryConfig(new EnterpriseConfig().fromEnv({ PL_PROVISIONING_BACKEND: backend }));
            await init(config, new EnterpriseExtension(config), { dryRun: true }).then(
                () => assert.fail("Missing provisioner configuration should fail"),
                (error) =>
                    assert.match(
                        error.message,
                        backend === "api" ? /PL_PROVISIONING_API_API_KEY/ : /PL_PROVISIONING_STRIPE_SECRET_KEY/
                    )
            );
        }
    });

    test("enterprise dry run composes directory, OAuth and audit without opening a listener", async () => {
        const config = memoryConfig(
            new EnterpriseConfig().fromEnv({
                PL_AUTH_TYPES: "email,oauth",
                PL_AUTH_OAUTH_CLIENT_ID: "client",
                PL_PROVISIONING_BACKEND: "directory",
                PL_CHANGE_LOG_ENABLED: "true",
                PL_REQUEST_LOG_ENABLED: "true",
                PL_DIRECTORY_SCIM_URL: "https://directory.example.test",
            })
        );
        config.changeLog.storage = new DataStorageConfig({ backend: "memory" });
        config.requestLog.storage = new DataStorageConfig({ backend: "memory" });
        const original = ScimServer.prototype.init;
        ScimServer.prototype.init = async () => {
            throw new Error("Dry runs must not open a SCIM listener");
        };
        try {
            const server = await init(config, new EnterpriseExtension(config), { dryRun: true });
            assert.instanceOf(server.provisioner, DirectoryProvisioner);
            assert.isTrue(server.authServers.some((auth) => auth.supportsType(AuthType.Oauth)));
            assert.isDefined(server.directory);
            const org = new Org();
            org.id = "org";
            org.directory.syncProvider = "scim";
            await server.directory!.update(org);
            assert.equal(org.directory.scim!.url, "https://directory.example.test/org");
            assert.isNotEmpty(org.directory.scim!.secretToken);
            const secret = org.directory.scim!.secretToken;
            await server.directory!.update(org);
            assert.equal(org.directory.scim!.secretToken, secret);

            const storage = server.changeLogger!.wrap(server.storage, { id: "test" });
            await storage.save(org);
            assert.lengthOf(await server.changeLogger!.list(), 1);
            const request = new Request();
            request.method = "updateOrg";
            await server.requestLogger!.log(request, 10, { id: "test" });
            assert.lengthOf(await server.requestLogger!.list(), 1);
            request.method = "getOrg";
            await server.requestLogger!.log(request, 10, { id: "test" });
            assert.lengthOf(await server.requestLogger!.list(), 1);
        } finally {
            ScimServer.prototype.init = original;
        }
    });

    test("OAuth provisioning remains selectable through the enterprise entry point", async () => {
        const config = memoryConfig(
            new EnterpriseConfig().fromEnv({
                PL_AUTH_TYPES: "oauth",
                PL_AUTH_OAUTH_CLIENT_ID: "client",
                PL_PROVISIONING_BACKEND: "oauth",
            })
        );
        const server = await init(config, new EnterpriseExtension(config), { dryRun: true });
        assert.instanceOf(server.provisioner, OauthProvisioner);
    });

    test("directory synchronization still provisions organization membership", async () => {
        const config = memoryConfig(new EnterpriseConfig());
        const server = await init(config, new EnterpriseExtension(config), { dryRun: true });
        const org = new Org();
        org.id = "org";
        org.directory.syncMembers = true;
        org.members = [new OrgMember({ id: "owner", email: "owner@example.test", status: OrgMemberStatus.Active })];
        await server.storage.save(org);
        const sync = new DirectorySync(server.makeController({ id: "sync-test" }));
        await sync.userCreated({ email: "new@example.test", active: true }, org.id);
        const updated = await server.storage.get(Org, org.id);
        assert.isTrue(
            updated.members.some(
                (member) => member.email === "new@example.test" && member.status === OrgMemberStatus.Provisioned
            )
        );
    });

    test("disabled audit capture keeps historical entries readable", async () => {
        const config = memoryConfig(new EnterpriseConfig());
        const server = await init(config, new EnterpriseExtension(config), { dryRun: true });
        const historical = new ChangeLogEntry({ id: "historical" }, "create", undefined, new Org());
        await server.storage.save(historical);
        assert.equal((await server.changeLogger!.list())[0].id, historical.id);
        const storage = server.changeLogger!.wrap(server.storage, { id: "new-request" });
        const org = new Org();
        org.id = "new-org";
        await storage.save(org);
        // Look up the historical entry directly: MemoryStorage.list does not filter kinds.
        assert.equal((await server.storage.get(ChangeLogEntry, historical.id)).context.id, "historical");
        assert.isUndefined((await server.changeLogger!.list()).find((entry) => entry.context?.id === "new-request"));
    });
});
