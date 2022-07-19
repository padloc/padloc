import { setPlatform } from "@padloc/core/src/platform";
import { ElectronPlatform } from "./platform";

(async () => {
    setPlatform(new ElectronPlatform());

    await import("@padloc/app/src/elements/app");

    // @ts-ignore
    window.router.basePath = window.location.pathname.replace(/index.html$/, "");

    window.onload = () => {
        const app = document.createElement("pl-app");
        document.body.appendChild(app);
    };
})();
