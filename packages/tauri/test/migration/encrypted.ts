import { setPlatform } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import { AppState } from "@padloc/core/src/app";
import { Account } from "@padloc/core/src/account";
import { Vault } from "@padloc/core/src/vault";
import { Field, FieldType, VaultItem } from "@padloc/core/src/item";
import { uuid } from "@padloc/core/src/util";
import { migrateCordovaStorage } from "../../src/migration";
import { MIGRATION_KEY, STATE_KEY } from "../../src/migration-state";
// @ts-ignore
import localforage from "localforage/src/localforage";

// Public dummy credential: only for this offline, synthetic fixture.
const password = "migration fixture only 2026";
const status = document.getElementById("status")!;
const seed = document.getElementById("seed") as HTMLButtonElement;
const verify = document.getElementById("verify") as HTMLButtonElement;
const fail = (error?: unknown) => { status.textContent = "Fixture check failed: " + (error instanceof Error ? error.message : "unknown") + ". No source data was deleted."; };
setPlatform(new WebPlatform());
seed.onclick = async () => {
    try {
        if (location.protocol !== "ionic:" || await localforage.getItem(STATE_KEY)) throw new Error();
        seed.disabled = true;
        status.textContent = "Generating encrypted synthetic account and offline vault…";
        const state = new AppState(), account = new Account(), vault = new Vault();
        account.id = await uuid(); account.email = "migration@example.invalid";
        await account.initialize(password);
        vault.id = await uuid(); vault.owner = account.id; vault.name = "Migration fixture";
        await vault.unlock(account as any);
        const item = new VaultItem({ id: await uuid(), name: "Unsynced offline edit", fields: [
            new Field({ name: "Password", type: FieldType.Password, value: "" }),
            new Field({ name: "URL", type: FieldType.Url, value: "" }),
            new Field({ name: "TOTP", type: FieldType.Totp, value: "JBSWY3DPEHPK3PXP" }),
        ] });
        vault.items.update(item); await vault.commit();
        account.mainVault = { id: vault.id, name: vault.name };
        state.account = account; state.vaults = [vault];
        state.settings.theme = "dark"; state.settings.autoLockDelay = 2;
        state.device.id = await uuid();
        const raw = state.toRaw();
        if (JSON.stringify(raw).includes(item.name) || JSON.stringify(raw).includes("JBSWY3DPEHPK3PXP")) throw new Error();
        await localforage.setItem(STATE_KEY, raw);
        status.textContent = "Encrypted account, offline item and settings saved at " + location.origin;
    } catch (error) { fail(error); }
};
async function check() {
    try {
        if (location.protocol === "tauri:") await migrateCordovaStorage();
        const raw = await localforage.getItem(STATE_KEY);
        if (!raw) { status.textContent = "No encrypted fixture yet at " + location.origin; return; }
        const state = new AppState().fromRaw(raw);
        await state.account!.unlock(password);
        await state.vaults[0].unlock(state.account as any);
        const item = [...state.vaults[0].items][0];
        if (state.settings.theme !== "dark" || state.settings.autoLockDelay !== 2 ||
            item.name !== "Unsynced offline edit" || item.fields.length !== 3 ||
            item.fields[0].value !== "" || item.fields[1].value !== "" ||
            item.fields[2].type !== FieldType.Totp || item.fields[2].value !== "JBSWY3DPEHPK3PXP" ||
            !state.vaults[0].items.hasChanges) throw new Error();
        status.textContent = JSON.stringify({origin:location.origin, passwordUnlock:true, offlineEdit:true,
            emptyFields:true, totpType:true, settings:true, pendingChanges:true,
            migration:await localforage.getItem(MIGRATION_KEY)},null,2);
    } catch (error) { fail(error); }
}
verify.onclick = check;
const ready = (window as any).cordova ? new Promise(resolve => document.addEventListener("deviceready", resolve, {once:true})) : Promise.resolve();
ready.then(check);
// This fixture contains no real vault data. Acknowledge the normal native cover.
async function uncover() {
    const native = (window as any).__TAURI_INTERNALS__;
    if (!native) return;
    const state = await native.invoke("background_state");
    if (!state.inactive) await native.invoke("resume_complete", {generation:state.generation});
}
window.addEventListener("padloc-native-resume", uncover); uncover();
