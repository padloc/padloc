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

        await import("@padloc/app/src/elements/app");

        // Vite module scripts run after document load, so window.onload may never fire again.
        if (document.readyState === "complete") {
            mountApp("pl-app");
        } else {
            window.addEventListener("load", () => mountApp("pl-app"), { once: true });
        }
    })();
}
