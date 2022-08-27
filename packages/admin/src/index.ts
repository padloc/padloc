import { setPlatform } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";

if (window.location.search !== "?spinner") {
    (async () => {
        setPlatform(new WebPlatform());

        await import("./app");

        window.onload = () => {
            const app = document.createElement("pl-admin-app");
            document.body.appendChild(app);
        };
    })();
}
