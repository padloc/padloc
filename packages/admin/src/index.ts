import { WebPlatform } from "@padloc/app/src/lib/platform";
import { setPlatform } from "@padloc/core/src/platform";

function mountApp(tagName: string) {
    if (document.querySelector(tagName)) {
        return;
    }
    document.body.appendChild(document.createElement(tagName));
}

if (window.location.search !== "?spinner") {
    (async () => {
        setPlatform(new WebPlatform());

        await import("./app");

        // Vite module scripts run after document load, so window.onload may never fire again.
        if (document.readyState === "complete") {
            mountApp("pl-admin-app");
        } else {
            window.addEventListener("load", () => mountApp("pl-admin-app"), { once: true });
        }
    })();
}
