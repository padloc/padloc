import { app, router } from "@padloc/app/src/globals";
import { Dialog } from "@padloc/app/src/elements/dialog";

// Reconcile the native iOS timestamp before acknowledging the privacy cover.
// JavaScript pause events cannot reliably run when iOS suspends the webview.
export async function reconcileBackgroundLock(pausedAt: number) {
    if (!app.settings.autoLock || app.state.locked || Date.now() - pausedAt <= app.settings.autoLockDelay * 60 * 1000)
        return;

    // Sync may still own decrypted objects. Keep the native cover in place
    // until it settles, then wipe those objects before navigating to unlock.
    if (app.state.syncing) {
        await new Promise<void>((resolve) => {
            const unsubscribe = app.subscribe(() => {
                if (!app.state.syncing) {
                    unsubscribe();
                    resolve();
                }
            });
            if (!app.state.syncing) {
                unsubscribe();
                resolve();
            }
        });
    }
    Dialog.closeAll();
    await app.lock();
    router.go("unlock");
}
