import { setPlatform } from "@padloc/core/src/platform";
import { TauriPlatform } from "./platform";

window.onload = () => console.log("window loaded");

function createApp() {
    console.log("creating app component");
    const app = document.createElement("pl-app");
    document.body.appendChild(app);
}

(async () => {
    setPlatform(new TauriPlatform());

    await import("@padloc/app/src/elements/app");


    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createApp);
    } else {
        createApp();
    }
})();
