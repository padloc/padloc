import { setPlatform } from "@padloc/core/src/platform";
import { ExtensionPlatform } from "./platform";

(async () => {
    setPlatform(new ExtensionPlatform());

    await import("./app");

    function focusWindow() {
        if (document.visibilityState !== "hidden") {
            window.focus();
        }
    }

    window.onload = () => {
        const app = document.createElement("pl-extension-app");
        if (new URLSearchParams(window.location.search).has("handoff")) {
            // Keep the window unobtrusive while the OS owns authentication.
            // Cancellation and errors return to the locked toolbar popup.
            app.style.visibility = "hidden";
            document.body.style.width = "auto";
            document.body.style.height = "100vh";
            const progress = document.createElement("div");
            progress.id = "biometric-progress";
            progress.setAttribute("role", "status");
            progress.setAttribute("aria-live", "polite");
            progress.textContent = "Unlocking…";
            progress.style.cssText =
                "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font:14px system-ui;background:var(--color-background,#fff);color:var(--color-foreground,#222)";
            document.body.appendChild(progress);
        }
        document.body.appendChild(app);

        setTimeout(focusWindow, 100);
        setTimeout(focusWindow, 250);
    };
})();
