import { setPlatform } from "@padloc/core/src/platform";
import { TauriPlatform, isMobile } from "./platform";
import { initializeExternalLinks } from "./links";

function createApp() {
    const app = document.createElement("pl-app");
    document.body.appendChild(app);
    if (isMobile) {
        import("./lifecycle")
            .then(({ initializeLifecycle }) => initializeLifecycle())
            .catch((error) => console.error("Unable to initialize mobile lifecycle", error));
    }
    if (process.env.NODE_ENV === "production" && !isMobile) {
        checkForUpdates().catch((error) => console.warn("Unable to check for updates", error));
    }
}

(async () => {
    setPlatform(new TauriPlatform());
    initializeExternalLinks();

    if (process.env.PL_IOS === "true") {
        try {
            const { migrateCordovaStorage } = await import("./migration");
            await migrateCordovaStorage();
        } catch {
            // Do not initialize App: its normal load path can persist a blank
            // state after a storage error. Preserve both origins for recovery.
            const message = document.createElement("div");
            message.style.cssText = "padding:80px 24px;max-width:36em;margin:auto;font:18px system-ui";
            const text = document.createElement("p");
            text.textContent = "Padloc could not safely restore local data from the previous app. Your original data has been kept. Please retry, or contact support if the problem continues.";
            const retry = document.createElement("button");
            retry.textContent = "Retry";
            retry.onclick = () => location.reload();
            message.append(text, retry);
            document.body.replaceChildren(message);
            // This screen displays no vault data. Keep it usable if the user
            // backgrounds and returns before the normal lifecycle starts.
            const { invoke } = await import("@tauri-apps/api/core");
            const revealError = async () => {
                try {
                    const state = await invoke<{ inactive: boolean; generation: number }>("background_state");
                    if (!state.inactive) await invoke("resume_complete", { generation: state.generation });
                } catch { /* Leave the native cover in place on IPC failure. */ }
            };
            window.addEventListener("padloc-native-resume", revealError);
            void revealError();
            return;
        }
    }

    await import("@padloc/app/src/elements/app");

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createApp);
    } else {
        createApp();
    }
})();

async function checkForUpdates() {
    const { check } = await import("@tauri-apps/plugin-updater");
    const { confirm, alert } = await import("@padloc/app/src/lib/dialog");
    const update = await check();
    if (!update) {
        return;
    }
    try {
        if (!(await confirm(`Padloc ${update.version} is available. Download and install it?`, "Update", "Later"))) {
            return;
        }
        await update.downloadAndInstall();
        if (await confirm("The update is installed. Restart Padloc to use it?", "Restart", "Later")) {
            const { relaunch } = await import("@tauri-apps/plugin-process");
            await relaunch();
        }
    } catch (error) {
        console.warn("Unable to install update", error);
        await alert("The update could not be installed. Please try again later.", { type: "warning" });
    } finally {
        await update.close();
    }
}
