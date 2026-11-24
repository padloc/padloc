import { strict as assert } from "assert";
import { suite, test, afterEach } from "mocha";
import { Account, UnlockedAccount } from "@padloc/core/src/account";
import { App, AppState } from "@padloc/core/src/app";
import { MemoryAttachmentStorage } from "@padloc/core/src/attachment";
import { Auth } from "@padloc/core/src/auth";
import { RSAEncryptionParams, AESEncryptionParams } from "@padloc/core/src/crypto";
import { VaultItem } from "@padloc/core/src/item";
import { StubMessenger } from "@padloc/core/src/messenger";
import { Org } from "@padloc/core/src/org";
import { getPlatform, setPlatform } from "@padloc/core/src/platform";
import { OrgProvisioning, Provisioning } from "@padloc/core/src/provisioning";
import { Controller, Server, ServerConfig } from "@padloc/core/src/server";
import { Session } from "@padloc/core/src/session";
import { MemoryStorage } from "@padloc/core/src/storage";
import { Vault } from "@padloc/core/src/vault";
import { NodePlatform } from "../src/platform/node";

function gate() {
    let entered!: () => void;
    let release!: () => void;
    const reached = new Promise<void>((resolve) => (entered = resolve));
    const hold = new Promise<void>((resolve) => (release = resolve));
    return {
        hold,
        reached,
        release,
        wait: async () => {
            entered();
            await hold;
        },
    };
}

async function fixture() {
    const local = new MemoryStorage();
    const remote = new MemoryStorage();
    const platform = new NodePlatform();
    platform.storage = local;
    setPlatform(platform);

    const account = Object.assign(new Account(), { id: "account", email: "fixture@example.test", name: "Fixture" });
    account.mainVault = { id: "private", name: "Private", revision: "private-initial" };
    await account.initialize("synthetic password");
    const masterKey = account.masterKey!;
    const org = Object.assign(new Org(), { id: "org", name: "Fixture organization", revision: "org-initial" });
    await org.initialize(account);
    org.vaults.push({ id: "shared", name: "Shared", revision: "shared-initial" });
    org.getMember(account)!.vaults.push({ id: "shared", readonly: false });
    account.orgs.push(org.info);
    await Promise.all([remote.save(account), remote.save(org)]);

    const attachments = new MemoryAttachmentStorage();
    const server = new Server(new ServerConfig(), remote, new StubMessenger(), undefined, [], attachments);
    const provisioning = new Provisioning({ orgs: [new OrgProvisioning({ orgId: org.id })] });
    const controller = async () =>
        new Controller(server, {
            id: "request",
            account: await remote.get(Account, account.id),
            auth: new Auth(),
            session: new Session(),
            provisioning,
        });
    const api = {
        getVault: async (id: string) => (await controller()).getVault(id),
        updateVault: async (vault: Vault) => (await controller()).updateVault(new Vault().fromJSON(vault.toJSON())),
    };

    const app = new App({
        send: async () => {
            throw new Error("Unexpected transport request");
        },
    });
    (app as any).api = api;
    await app.load(false);
    const vaults: Vault[] = [];
    for (const [id, organization] of [
        ["private", undefined],
        ["shared", org.info],
    ] as const) {
        const vault = Object.assign(new Vault(), {
            id,
            owner: account.id,
            org: organization,
            revision: `${id}-initial`,
        });
        await vault.unlock(account as UnlockedAccount);
        vault.items.update(new VaultItem({ id: `item-${id}`, name: "Initial item" }));
        vault.items.clearChanges();
        await vault.commit();
        await remote.save(vault);
        vaults.push(vault);
    }
    app.setState({ account, orgs: [org], vaults });
    await app.save();

    const restart = async () => {
        const fresh = new App({
            send: async () => {
                throw new Error("Unexpected transport request");
            },
        });
        (fresh as any).api = api;
        await fresh.load(false);
        await fresh.unlockWithMasterKey(masterKey, false);
        return fresh;
    };
    const edit = async (id: string, name: string) => {
        const item = app.getItem(`item-${id}`)!.item;
        await app.updateItem(item, { name }, true, false);
    };
    const remoteItem = async (id: string) => {
        const vault = await remote.get(Vault, id);
        const reader = await remote.get(Account, account.id);
        await reader.unlockWithMasterKey(masterKey);
        await vault.unlock(reader as UnlockedAccount);
        return vault.items.get(`item-${id}`)!;
    };
    return { app, local, remote, platform, api, edit, restart, remoteItem };
}

suite("Vault sync integrity", () => {
    const previousPlatform = getPlatform();
    afterEach(() => setPlatform(previousPlatform));

    for (const id of ["private", "shared"]) {
        test(`uploaded ${id} vault has no pending local changes`, async () => {
            const { app, api, edit } = await fixture();
            await edit(id, "Uploaded edit");

            await app.syncVault({ id });
            const uploaded = await api.getVault(id);
            await uploaded.unlock(app.account as UnlockedAccount);

            assert.equal(uploaded.items.hasChanges, false);
            assert.equal(app.getVault(id)!.items.hasChanges, false);
        });

        test(`lock waits for ${id} sync and preserves offline changes`, async () => {
            const { app, platform, edit, restart, remoteItem } = await fixture();
            await edit(id, "Offline edit");
            const original = platform.crypto.decrypt;
            const pause = gate();
            platform.crypto.decrypt = async function (...args: any[]) {
                if (!(args[2] instanceof RSAEncryptionParams)) return original.apply(platform.crypto, args as any);
                platform.crypto.decrypt = original;
                const result = await original.apply(platform.crypto, args as any);
                await pause.wait();
                return result;
            } as typeof original;
            const syncing = app.syncVault({ id });
            await pause.reached;
            const locking = app.lock();
            assert.equal(app.state.locked, false);
            pause.release();
            await syncing;
            await locking;
            assert.equal(app.state.locked, true);
            assert.equal(app.getItem(`item-${id}`), null);
            const fresh = await restart();
            assert.equal(fresh.getItem(`item-${id}`)!.item.name, "Offline edit");
            assert.equal((await remoteItem(id)).name, "Offline edit");
        });

        test(`lock waits for ${id} upload acknowledgment and keeps later changes`, async () => {
            const { app, platform, api, edit, restart, remoteItem } = await fixture();
            await edit(id, "First edit");
            const ready = gate();
            const pause = gate();
            const update = api.updateVault;
            (app.api as any).updateVault = async (vault: Vault) => {
                const acknowledgment = await update(vault);
                const original = platform.crypto.decrypt;
                platform.crypto.decrypt = async function (...args: any[]) {
                    if (!(args[2] instanceof RSAEncryptionParams)) return original.apply(platform.crypto, args as any);
                    platform.crypto.decrypt = original;
                    const result = await original.apply(platform.crypto, args as any);
                    await pause.wait();
                    return result;
                } as typeof original;
                ready.release();
                return acknowledgment;
            };
            const syncing = app.syncVault({ id });
            await ready.hold;
            await pause.reached;
            await edit(id, "Second edit");
            const locking = app.lock();
            pause.release();
            await syncing;
            await locking;
            const fresh = await restart();
            assert.equal(fresh.getItem(`item-${id}`)!.item.name, "Second edit");
            assert.equal(fresh.getVault(id)!.items.hasChanges, true);
            await fresh.syncVault({ id });
            assert.equal((await remoteItem(id)).name, "Second edit");
        });

        test(`overlapping ${id} saves leave decryptable latest data`, async () => {
            const { platform, edit, restart } = await fixture();
            const original = platform.crypto.encrypt;
            const pause = gate();
            platform.crypto.encrypt = async function (...args: any[]) {
                if (!(args[2] instanceof AESEncryptionParams)) return original.apply(platform.crypto, args as any);
                platform.crypto.encrypt = original;
                const result = await original.apply(platform.crypto, args as any);
                await pause.wait();
                return result;
            } as typeof original;
            const first = edit(id, "First edit");
            await pause.reached;
            const second = edit(id, "Second edit");
            pause.release();
            await Promise.all([first, second]);
            const fresh = await restart();
            assert.equal(fresh.getItem(`item-${id}`)!.item.name, "Second edit");
            assert.equal(fresh.getVault(id)!.items.hasChanges, true);
        });
    }

    test("a delayed local save cannot replace a newer vault edit", async () => {
        const { local, edit, restart } = await fixture();
        const save = local.save.bind(local);
        const pause = gate();
        let first = true;
        local.save = async (object) => {
            if (!(object instanceof AppState)) {
                return save(object);
            }
            const snapshot = new AppState().fromJSON(object.toJSON());
            if (first) {
                first = false;
                await pause.wait();
            }
            return save(snapshot);
        };

        const earlier = edit("private", "First edit");
        await pause.reached;
        const later = edit("private", "Second edit");
        pause.release();
        await Promise.all([earlier, later]);

        const fresh = await restart();
        assert.equal(fresh.getItem("item-private")!.item.name, "Second edit");
    });

    test("lock includes a vault save started while an earlier sync is pending", async () => {
        const { app, local, api, edit, restart } = await fixture();
        const network = gate();
        (app.api as any).getVault = async (id: string) => {
            if (id === "private") {
                await network.wait();
                throw new Error("offline");
            }
            return api.getVault(id);
        };
        const syncing = app.syncVault({ id: "private" });
        await network.reached;
        const locking = app.lock();

        const save = local.save.bind(local);
        const persistence = gate();
        let paused = false;
        local.save = async (object) => {
            if (object instanceof AppState && !paused) {
                paused = true;
                const snapshot = new AppState().fromJSON(object.toJSON());
                await persistence.wait();
                return save(snapshot);
            }
            return save(object);
        };
        const editing = edit("shared", "Saved during lock");
        await persistence.reached;
        network.release();
        await syncing;
        let locked = false;
        locking.then(() => (locked = true));
        await Promise.resolve();
        assert.equal(locked, false);

        persistence.release();
        await editing;
        await locking;
        const fresh = await restart();
        assert.equal(fresh.getItem("item-shared")!.item.name, "Saved during lock");
    });
});
