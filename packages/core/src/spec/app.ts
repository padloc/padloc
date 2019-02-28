import { App, AppState } from "../app";
import { Server } from "../server";
import { Vault } from "../vault";
import { StubMessenger } from "../messenger";
import { EmailVerificationMessage, InviteCreatedMessage, MemberAddedMessage } from "../messages";
import { DirectSender } from "../transport";
import { MemoryStorage } from "../storage";
import { ErrorCode } from "../error";
import { MemoryAttachmentStorage } from "../attachment";
import { Spec } from "./spec";
import { assertReject } from "./test-util";

export function appSpec(): Spec {
    console.log("testing app");

    const clientUrl = "https://padloc.app";
    const messenger = new StubMessenger();
    const server = new Server(
        { clientUrl, reportErrors: "support@padloc.app" },
        new MemoryStorage(),
        messenger,
        new MemoryAttachmentStorage()
    );
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
    // let sharedVaultID = "";
    // let otherVaultID = "";

    return (test, assert) => {
        test("App initializes successfully", async () => {
            await app.loaded;
        });

        test("Signup", async () => {
            await app.requestEmailVerification(user.email);
            const message = messenger.lastMessage(user.email);

            assert.instanceOf(message, EmailVerificationMessage);

            const code = (message! as EmailVerificationMessage).verification.code;

            const verify = await app.completeEmailVerification(user.email, code);

            await app.signup({ ...user, verify });

            assert.isFalse(app.locked, "App should be in unlocked state after signup.");
            assert.isNotNull(app.account, "Account object should be populated after signup.");

            const account = app.account!;
            assert.ownInclude(account, { email: user.email, name: user.name }, "Account info should be set correctly.");
            assert.isNotNull(app.mainVault, "Main vault should be created.");
        });

        test("Create Personal Vault Item", async () => {
            const item = await app.createItem("My First Item");
            assert.equal(app.items.length, 1, "Item count should be 1.");
            assert.ok(app.getItem(item.id), "Item should be accessible by ID.");
            assert.equal(app.getItem(item.id)!.item, item);
            assert.equal(app.getItem(item.id)!.vault, app.mainVault);
        });

        test("Create Org", async () => {
            const org = await app.createOrg("My Org");
            assert.equal(org.name, "My Org", "Organization name should be correct.");
            assert.ok(org.id, "Organization ID should be set.");
            assert.equal(org.owner, app.account!.id, "Account should be organization owner.");
            assert.isTrue(org.isAdmin(app.account!), "Account should be org admin.");
            assert.equal(app.orgs.length, 1);
        });

        test("Create Vault", async () => {
            const name = "My Shared Vault";
            const vault = await app.createVault(name, app.orgs[0], [app.orgs[0].everyone]);
            assert.equal(vault.name, name);
            assert.equal(app.vaults.length, 2);
        });

        test("Invite Member", async () => {
            const org = app.orgs[0];
            let invite = await app.createInvite(org, otherUser.email);
            // Remember secret - in practice this will be communicated
            // directly between the invitor and invitee
            const { secret } = invite;
            assert.equal(invite.email, otherUser.email);
            const inviteMessage = messenger.lastMessage(otherUser.email) as InviteCreatedMessage;
            assert.instanceOf(inviteMessage, InviteCreatedMessage);
            const linkPattern = new RegExp(`${clientUrl}/invite/${org.id}/${invite.id}\\?verify=(.*)`);
            assert.match(inviteMessage.link, linkPattern);
            const [, verify] = inviteMessage.link.match(linkPattern)!;

            await otherApp.signup({ ...otherUser, verify });
            invite = (await otherApp.getInvite(org.id, invite.id))!;
            await otherApp.acceptInvite(invite, secret);
            invite = (await app.getInvite(org.id, invite.id))!;
            invite.secret = secret;
            assert.isTrue(await invite.verify());
            await app.confirmInvite(invite);
            assert.isTrue(org.isMember(otherApp.account!));
            await otherApp.synchronize();
            assert.equal(otherApp.orgs.length, 1);
            assert.equal(otherApp.vaults.length, 2);
            assert.isTrue(otherApp.orgs[0].isMember(otherApp.account!));

            const addedMessage = messenger.lastMessage(otherUser.email) as MemberAddedMessage;
            assert.instanceOf(addedMessage, MemberAddedMessage);
            assert.equal(addedMessage.org.id, org.id);
        });
        //
        // test("Add Member To Subvault", async () => {
        //     app.vaults[2].addMember(app.vaults[1].members.get(otherApp.account!.id)!);
        //     await app.syncVault(app.vaults[2]);
        //     await otherApp.synchronize();
        //     assert.equal(otherApp.vaults.length, 3);
        // });
        //
        // test("Make Admin", async () => {
        //     const vault = app.getVault(sharedVaultID)!;
        //     const member = vault.members.get(otherApp.account!.id)!;
        //     vault.members.update({ ...member, permissions: { ...member.permissions, manage: true } });
        //     await app.syncVault(vault);
        //     await otherApp.syncVault(vault);
        //     assert.isTrue(app.getVault(sharedVaultID)!.isAdmin(otherApp.account));
        //     assert.isTrue(otherApp.getVault(sharedVaultID)!.isAdmin(otherApp.account));
        //     // @ts-ignore
        //     assert.isOk(otherApp.getVault(sharedVaultID)!._privateKey);
        //     await otherApp.syncVault(vault);
        //     await app.syncVault(vault);
        // });
        //
        // test("Remove Admin", async () => {
        //     const vault = app.getVault(sharedVaultID)!;
        //     const member = vault.members.get(otherApp.account!.id)!;
        //     vault.members.update({ ...member, permissions: { ...member.permissions, manage: false } });
        //     await app.reinitializeVault(vault);
        //     await otherApp.synchronize();
        //
        //     assert.isFalse(
        //         otherApp.getVault(sharedVaultID)!.isAdmin(otherApp.account),
        //         "Other member should no longer be admin"
        //     );
        //
        //     assert.isTrue(
        //         otherApp.getVault(sharedVaultID)!.getMember(otherApp.account!)!.suspended,
        //         "Other member should be suspended"
        //     );
        //
        //     const message = messenger.lastMessage(otherApp.account!.email);
        //     assert.instanceOf(message, InviteCreatedMessage);
        //     const { id: inviteID } = (message as InviteCreatedMessage).invite;
        //     const { secret } = vault.invites.get(inviteID)!;
        //     let invite = (await otherApp.getInvite(vault.id, inviteID))!;
        //     await otherApp.acceptInvite(invite, secret);
        //     invite = (await app.getInvite(vault.id, invite.id))!;
        //     assert.isTrue(await invite.verify());
        //     await app.confirmInvite(invite);
        //     await otherApp.syncVault(vault);
        //     assert.isFalse(otherApp.getVault(sharedVaultID)!.isAdmin());
        //     assert.isFalse(otherApp.getVault(sharedVaultID)!.isSuspended());
        //     assert.isTrue(otherApp.getVault(sharedVaultID)!.hasItemsAccess());
        //     assert.equal(app.items.length, 1);
        // });
        //
        // test("Simulataneous Edit", async () => {
        //     const [item1, item2] = await Promise.all([
        //         app.createItem("Added Item 1", app.getVault(sharedVaultID)!),
        //         otherApp.createItem("Added Item 2", otherApp.getVault(sharedVaultID)!)
        //     ]);
        //     await Promise.all([app.syncVault({ id: sharedVaultID }), otherApp.syncVault({ id: sharedVaultID })]);
        //
        //     assert.ok(app.getItem(item2.id));
        //     assert.ok(otherApp.getItem(item1.id));
        //
        //     await app.updateItem(app.getVault(sharedVaultID)!, item1, { name: "Edited Item" });
        //     const item3 = await app.createItem("Added Item 3", app.getVault(sharedVaultID)!);
        //     await otherApp.deleteItems([{ vault: otherApp.getVault(sharedVaultID)!, item: item2 }]);
        //
        //     await Promise.all([app.syncVault({ id: sharedVaultID }), otherApp.syncVault({ id: sharedVaultID })]);
        //     await Promise.all([app.syncVault({ id: sharedVaultID }), otherApp.syncVault({ id: sharedVaultID })]);
        //
        //     assert.isNull(app.getItem(item2.id));
        //     assert.ok(otherApp.getItem(item3.id));
        //     assert.equal(otherApp.getItem(item1.id)!.item.name, "Edited Item");
        // });
        //
        // test("Archive Vault", async () => {
        //     let vault = await app.createVault("Test");
        //     otherVaultID = vault.id;
        //     // const invite = await app.createInvite(vault, otherApp.account!.email);
        //     // await otherApp.acceptInvite(invite, invite.secret);
        //     // await app.confirmInvite(invite);
        //     // await app.syncVault(vault);
        //     assert.isTrue(vault.isMember(app.account!));
        //     await app.archiveVault(vault);
        //     vault = app.getVault(vault.id)!;
        //     assert.isTrue(vault.archived);
        // });
        //
        // test("Unarchive Vault", async () => {
        //     await app.unarchiveVault(app.getVault(otherVaultID)!);
        //     assert.isFalse(app.getVault(otherVaultID)!.archived);
        // });
        //
        // test("Delete Vault", async () => {
        //     await app.deleteVault(app.getVault(otherVaultID)!);
        //     assert.isNull(app.getVault(otherVaultID));
        // });
        //
        // test("Remove Member", async () => {
        //     await app.removeMember(app.vaults[1], app.vaults[1].members.get(otherApp.account!.id)!);
        //     await otherApp.synchronize();
        //     assert.isNull(app.vaults[1].members.get(otherApp.account!.id));
        //     assert.isNull(app.vaults[2].members.get(otherApp.account!.id));
        //     assert.equal(otherApp.vaults.length, 1);
        //     assert.isNull(otherApp.getVault(app.vaults[1].id));
        //     assert.isNull(otherApp.getVault(app.vaults[2].id));
        // });
        //
        test("Lock", async () => {
            await app.lock();
            assert.isTrue(app.locked, "App should be in 'locked' state.");
            assert.isNotOk(app.account!.privateKey, "Private key should be inaccessible after locking.");
            assert.isNull(app.mainVault, "Main vault should be in acessible after locking.");
        });

        test("Unlock", async () => {
            await app.unlock(user.password);
            assert.isFalse(app.locked, "App should be in 'unlocked' state.");
            assert.instanceOf(app.account!.privateKey, Uint8Array, "Private key should be loaded.");
            assert.isNotNull(app.mainVault, "Main vault should be loaded.");
            assert.equal(app.items.length, 1, "Items should be loaded.");
        });

        test("Logout", async () => {
            const mainVaultId = app.account!.mainVault;
            await app.logout();
            assert.isNotOk(app.account, "Account should be unloaded.");
            assert.isNotOk(app.state.session, "Session should be unloaded.");
            assertReject(
                () => app.storage.get(Vault, mainVaultId),
                ErrorCode.NOT_FOUND,
                "Main Vault should be purged from storage"
            );
            assertReject(
                () => app.storage.get(AppState, app.state.id),
                ErrorCode.NOT_FOUND,
                "Application state should be perged from strorage"
            );
        });

        test("Login", async () => {
            await app.login(user.email, user.password);
            assert.isNotNull(app.account, "Account should be loaded.");
            const account = app.account!;
            assert.ownInclude(account, { email: user.email, name: user.name }, "Account info should be correct.");
            assert.equal(app.items.length, 1, "Vault Items should be loaded");
        });
    };
}
