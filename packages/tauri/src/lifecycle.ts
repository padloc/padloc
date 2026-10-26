import { getBackgroundState, completeResume, onResume } from "../plugins/privacy-cover/guest-js";
import { reconcileBackgroundLock } from "./background-lock";

export async function initializeLifecycle() {
    let pending = Promise.resolve();
    const resume = () => {
        pending = pending
            .then(async () => {
                const state = await getBackgroundState();
                if (state.inactive || !state.pausedAt) return;
                await reconcileBackgroundLock(state.pausedAt);
                // Reuse the existing platform-neutral resume event to restart
                // the shared foreground inactivity timer after reconciliation.
                document.dispatchEvent(new Event("resume"));
                // Leave a paint opportunity for the locked view before uncovering it.
                await new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                );
                await completeResume(state.generation);
            })
            .catch((error) => {
                // Fail closed: native cover stays in place if reconciliation fails.
                console.error("Unable to restore app after backgrounding", error);
            });
        return pending;
    };
    onResume(resume);
    // Recover activation events that happened before the web app mounted.
    await resume();
}
