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
        document.body.appendChild(app);

        setTimeout(focusWindow, 100);
        setTimeout(focusWindow, 250);
    };
})();
