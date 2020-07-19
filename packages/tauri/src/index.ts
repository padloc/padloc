import { setPlatform } from "@padloc/core/src/platform";
import { TauriPlatform } from "./platform";

(async () => {
    setPlatform(new TauriPlatform());

    await import("@padloc/app/src/elements/app");

    window.onload = () => {
        const app = document.createElement("pl-app");
        document.body.appendChild(app);
    };
})();
