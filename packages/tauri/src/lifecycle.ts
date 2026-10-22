import { invoke } from "@tauri-apps/api/core";
import { reconcileBackgroundLock } from "./background-lock";

interface BackgroundState {
    generation: number;
    pausedAt: number;
    inactive: boolean;
}

export async function initializeLifecycle() {
    let pending = Promise.resolve();
    const resume = () => {
        pending = pending
            .then(async () => {
                const state = await invoke<BackgroundState>("background_state");
                if (state.inactive || !state.pausedAt) return;
                await reconcileBackgroundLock(state.pausedAt);
                // Reuse the existing platform-neutral resume event to restart
                // the shared foreground inactivity timer after reconciliation.
                document.dispatchEvent(new Event("resume"));
                // Leave a paint opportunity for the locked view before uncovering it.
                await new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                );
                await invoke("resume_complete", { generation: state.generation });
            })
            .catch((error) => {
                // Fail closed: native cover stays in place if reconciliation fails.
                console.error("Unable to restore app after backgrounding", error);
            });
        return pending;
    };
    window.addEventListener("padloc-native-resume", resume);
    // Recover activation events that happened before the web app mounted.
    await resume();
}
