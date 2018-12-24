import { App } from "../app";
import { Server } from "../server";
import { Vault } from "../vault";
import { StubMessenger } from "../messenger";
import { EmailVerificationMessage, InviteCreatedMessage } from "../messages";
import { DirectSender } from "../transport";
import { MemoryStorage } from "../storage";
import { ErrorCode } from "../error";
import { Spec } from "./spec";

export function appSpec(): Spec {
    const clientUrl = "https://padloc.app";
    const messenger = new StubMessenger();
    const server = new Server({ clientUrl, reportErrors: "support@padloc.app" }, new MemoryStorage(), messenger);
    const app = new App(new MemoryStorage(), new DirectSender(server));
    const otherApp = new App(new MemoryStorage(), new DirectSender(server));

    const user = {
        email: "lengden@olga.com",
        name: "Lengden Olga",
        password: "correct battery horse staple"
    };
    const otherUser = {
        email: "max@mustermann.com",
        name: "Max Mustermann",
        password: "password"
    };
    let sharedVaultID = "";
    let otherVaultID = "";

    return (test, assert) => {
        test("App initializes successfully", async () => {
            await app.loaded;
        });

        test("Signup", async () => {
            await app.verifyEmail(user.email);
            const message = messenger.lastMessage(user.email);

            assert.instanceOf(message, EmailVerificationMessage);

            const verify = (message! as EmailVerificationMessage).verification.code;

            await app.signup({ ...user, verify });

            assert.isFalse(app.locked);
            assert.isNotNull(app.account);

            const account = app.account!;
            assert.ownInclude(account, user);
            assert.isNotNull(app.mainVault);
            assert.isTrue(app.mainVault!.isOwner(account));
            assert.isTrue(app.mainVault!.isAdmin(account));
        });

        test("Create Vault", async () => {
            const name = "My Shared Vault";
            const vault = await app.createVault(name);
            sharedVaultID = vault.id;
            assert.equal(vault.name, name);
            assert.isTrue(vault.isOwner(app.account));
            assert.isTrue(vault.isAdmin(app.account));
            assert.equal(app.vaults.length, 2);
            assert.isTrue(await app.mainVault!.verifySubVault(vault.info));
        });

        test("Create Subvault", async () => {
            const name = "My Subvault";
            const parent = app.getVault(sharedVaultID)!;
            const vault = await app.createVault(name, parent);
            assert.equal(vault.name, name);
            assert.isTrue(vault.isOwner(app.account));
            assert.isTrue(vault.isAdmin(app.account));
            assert.equal(app.vaults.length, 3);
            assert.isTrue(await parent.verifySubVault(vault.info));
        });

        test("Create Vault Item", async () => {
            const vault = app.vaults[1];
            const name = "My Vault Item";
            const item = await app.createItem(name, vault);
            assert.ownInclude(item, { name });
            const listItem = app.getItem(item.id)!;
            assert.equal(listItem.item.name, item.name);
            assert.equal(listItem.vault.id, vault.id);
            assert.equal(app.items.length, 1);
            assert.equal(vault.items.size, 1);
            await app.syncVault(vault);
        });

        test("Invite Member", async () => {
            let vault = app.vaults[1];
            let invite = await app.createInvite(vault, otherUser.email);
            // Remember secret - in practice this will be communicated
            // directly between the invitor and invitee
            const { secret } = invite;
            assert.equal(invite.email, otherUser.email);
            const message = messenger.lastMessage(otherUser.email) as InviteCreatedMessage;
            const linkPattern = new RegExp(`${clientUrl}/invite/${vault.id}/${invite.id}\\?verify=(.*)`);
            assert.match(message.link, linkPattern);
            const [, verify] = message.link.match(linkPattern)!;
            await otherApp.signup({ ...otherUser, verify });
            assert.ownInclude(otherApp.account, otherUser);
            invite = (await otherApp.getInvite(vault.id, invite.id))!;
            await otherApp.acceptInvite(invite, secret);
            invite = (await app.getInvite(vault.id, invite.id))!;
            assert.isTrue(await invite.verify());
            await app.confirmInvite(invite);
            vault = app.getVault(vault.id)!;
            assert.isTrue(vault.isMember(otherApp.account));
            await otherApp.synchronize();
            assert.equal(otherApp.vaults.length, 2);
            assert.equal(otherApp.vaults[1].id, vault.id);
            assert.isTrue(otherApp.vaults[1].isMember(otherApp.account));
            assert.equal(otherApp.items.length, 1);
            assert.equal(otherApp.vaults[1].items.size, 1);
            assert.equal(app.vaults[1].invites.size, 0);
        });

        test("Add Member To Subvault", async () => {
            app.vaults[2].addMember(app.vaults[1].members.get(otherApp.account!.id)!);
            await app.syncVault(app.vaults[2]);
            await otherApp.synchronize();
            assert.equal(otherApp.vaults.length, 3);
        });

        test("Make Admin", async () => {
            const vault = app.getVault(sharedVaultID)!;
            const member = vault.members.get(otherApp.account!.id)!;
            vault.members.update({ ...member, permissions: { ...member.permissions, manage: true } });
            await app.syncVault(vault);
            await otherApp.syncVault(vault);
            assert.isTrue(app.getVault(sharedVaultID)!.isAdmin(otherApp.account));
            assert.isTrue(otherApp.getVault(sharedVaultID)!.isAdmin(otherApp.account));
            // @ts-ignore
            assert.isOk(otherApp.getVault(sharedVaultID)!._privateKey);
            await otherApp.syncVault(vault);
            await app.syncVault(vault);
        });

        test("Remove Admin", async () => {
            const vault = app.getVault(sharedVaultID)!;
            const member = vault.members.get(otherApp.account!.id)!;
            vault.members.update({ ...member, permissions: { ...member.permissions, manage: false } });
            await app.reinitializeVault(vault);
            await otherApp.synchronize();

            assert.isFalse(
                otherApp.getVault(sharedVaultID)!.isAdmin(otherApp.account),
                "Other member should no longer be admin"
            );

            assert.isTrue(
                otherApp.getVault(sharedVaultID)!.getMember(otherApp.account!)!.suspended,
                "Other member should be suspended"
            );

            const message = messenger.lastMessage(otherApp.account!.email);
            assert.instanceOf(message, InviteCreatedMessage);
            const { id: inviteID } = (message as InviteCreatedMessage).invite;
            const { secret } = vault.invites.get(inviteID)!;
            let invite = (await otherApp.getInvite(vault.id, inviteID))!;
            await otherApp.acceptInvite(invite, secret);
            invite = (await app.getInvite(vault.id, invite.id))!;
            assert.isTrue(await invite.verify());
            await app.confirmInvite(invite);
            await otherApp.syncVault(vault);
            assert.isFalse(otherApp.getVault(sharedVaultID)!.isAdmin());
            assert.isFalse(otherApp.getVault(sharedVaultID)!.isSuspended());
            assert.equal(app.items.length, 1);
        });

        test("Simulataneous Edit", async () => {
            const [item1, item2] = await Promise.all([
                app.createItem("Added Item 1", app.getVault(sharedVaultID)!),
                otherApp.createItem("Added Item 2", otherApp.getVault(sharedVaultID)!)
            ]);
            await Promise.all([app.syncVault({ id: sharedVaultID }), otherApp.syncVault({ id: sharedVaultID })]);

            assert.ok(app.getItem(item2.id));
            assert.ok(otherApp.getItem(item1.id));

            await app.updateItem(app.getVault(sharedVaultID)!, item1, { name: "Edited Item" });
            const item3 = await app.createItem("Added Item 3", app.getVault(sharedVaultID)!);
            await otherApp.deleteItems([{ vault: otherApp.getVault(sharedVaultID)!, item: item2 }]);

            await Promise.all([app.syncVault({ id: sharedVaultID }), otherApp.syncVault({ id: sharedVaultID })]);
            await Promise.all([app.syncVault({ id: sharedVaultID }), otherApp.syncVault({ id: sharedVaultID })]);

            assert.isNull(app.getItem(item2.id));
            assert.ok(otherApp.getItem(item3.id));
            assert.equal(otherApp.getItem(item1.id)!.item.name, "Edited Item");
        });

        test("Archive Vault", async () => {
            let vault = await app.createVault("Test");
            otherVaultID = vault.id;
            // const invite = await app.createInvite(vault, otherApp.account!.email);
            // await otherApp.acceptInvite(invite, invite.secret);
            // await app.confirmInvite(invite);
            // await app.syncVault(vault);
            assert.isTrue(vault.isMember(app.account!));
            await app.archiveVault(vault);
            vault = app.getVault(vault.id)!;
            assert.isTrue(vault.archived);
        });

        test("Unarchive Vault", async () => {
            await app.unarchiveVault(app.getVault(otherVaultID)!);
            assert.isFalse(app.getVault(otherVaultID)!.archived);
        });

        test("Delete Vault", async () => {
            await app.deleteVault(app.getVault(otherVaultID)!);
            assert.isNull(app.getVault(otherVaultID));
        });

        test("Remove Member", async () => {
            await app.removeMember(app.vaults[1], app.vaults[1].members.get(otherApp.account!.id)!);
            await otherApp.synchronize();
            assert.isNull(app.vaults[1].members.get(otherApp.account!.id));
            assert.isNull(app.vaults[2].members.get(otherApp.account!.id));
            assert.equal(otherApp.vaults.length, 1);
            assert.isNull(otherApp.getVault(app.vaults[1].id));
            assert.isNull(otherApp.getVault(app.vaults[2].id));
        });

        test("Lock", async () => {
            await app.lock();
            assert.isTrue(app.locked);
            assert.ownInclude(app.account, { password: "", privateKey: "" });
            assert.isNull(app.mainVault);
        });

        test("Unlock", async () => {
            await app.unlock(user.password);
            assert.isFalse(app.locked);
            assert.isNotNull(app.mainVault);
            assert.equal(app.items.length, 3);
        });

        test("Logout", async () => {
            await app.logout();
            assert.isNull(app.account);
            assert.isNull(app.session);
            let err = null;
            try {
                await app.storage.get(new Vault(sharedVaultID));
            } catch (e) {
                err = e;
            }
            assert.isNotNull(err);
            assert.equal(err.code, ErrorCode.NOT_FOUND);
        });

        test("Login", async () => {
            await app.login(user.email, user.password);
            assert.isNotNull(app.account);
            const account = app.account!;
            assert.ownInclude(account, user);
            assert.equal(app.vaults.length, 3);
        });
    };
}
