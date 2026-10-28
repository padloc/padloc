import { getBackgroundState, completeResume, onResume } from "../plugins/privacy-cover/guest-js";
import { reconcileBackgroundLock } from "./background-lock";

export async function initializeLifecycle() {
    let pending = Promise.resolve();
    let deferredVisibility = false;
    let forwardingVisibility = false;
    const forwardVisibility = () => {
        if (!deferredVisibility || document.visibilityState !== "visible") return;
        deferredVisibility = false;
        forwardingVisibility = true;
        try {
            document.dispatchEvent(new Event("visibilitychange"));
        } finally {
            forwardingVisibility = false;
        }
    };
    const resume = () => {
        pending = pending
            .then(async () => {
                const state = await getBackgroundState();
                if (state.inactive) return;
                if (!state.pausedAt) {
                    forwardVisibility();
                    return;
                }
                await reconcileBackgroundLock(state.pausedAt);
                // Reuse the existing platform-neutral resume event to restart
                // the shared foreground inactivity timer after reconciliation.
                document.dispatchEvent(new Event("resume"));
                // Leave a paint opportunity for the locked view before uncovering it.
                await new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                );
                await completeResume(state.generation);
                forwardVisibility();
            })
            .catch((error) => {
                // Fail closed: native cover stays in place if reconciliation fails.
                console.error("Unable to restore app after backgrounding", error);
            });
        return pending;
    };
    // Capture before the shared foreground-sync listener. Starting a new sync
    // here would make an expired auto-lock wait for network work unnecessarily.
    document.addEventListener(
        "visibilitychange",
        (event) => {
            if (forwardingVisibility || document.visibilityState !== "visible") return;
            event.stopImmediatePropagation();
            deferredVisibility = true;
            void resume();
        },
        true
    );
    onResume(resume);
    // Recover activation events that happened before the web app mounted.
    await resume();
}
