import { setPlatform } from "@padloc/core/src/platform";
import { CordovaPlatform } from "./platform";

(async () => {
    setPlatform(new CordovaPlatform());

    await import("@padloc/app/src/elements/app");

    window.onload = () => {
        const app = document.createElement("pl-app");
        document.body.appendChild(app);
    };
})();
