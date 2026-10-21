import { setPlatform } from "@padloc/core/src/platform";
import { TauriPlatform } from "./platform";

function createApp() {
    const app = document.createElement("pl-app");
    document.body.appendChild(app);
    if (process.env.PL_IOS === "true") {
        import("./lifecycle")
            .then(({ initializeLifecycle }) => initializeLifecycle())
            .catch((error) => console.error("Unable to initialize iOS lifecycle", error));
    }
    if (process.env.NODE_ENV === "production" && process.env.PL_MOBILE !== "true") {
        checkForUpdates().catch((error) => console.warn("Unable to check for updates", error));
    }
}

(async () => {
    setPlatform(new TauriPlatform());

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
