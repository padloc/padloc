import { setPlatform } from "@padloc/core/src/platform";
import { ExtensionPlatform } from "./platform";
import "../assets/icon.png";
import "../assets/icon-warning.png";
import "../assets/icon-locked.png";

(async () => {
    setPlatform(new ExtensionPlatform());

    await import("./app");

    window.onload = () => {
        const app = document.createElement("pl-extension-app");
        document.body.appendChild(app);
    };
})();
