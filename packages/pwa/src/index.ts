import { setPlatform } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";

(async () => {
    setPlatform(new WebPlatform());

    await import("@padloc/app/src/elements/app");

    window.onload = () => {
        const app = document.createElement("pl-app");
        document.body.appendChild(app);
    };
})();
