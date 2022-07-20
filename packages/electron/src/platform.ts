import { ipcRenderer } from "electron";
import { Platform } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";

export class ElectronPlatform extends WebPlatform implements Platform {
    constructor() {
        super();

        ipcRenderer.on("electron-lock-app", () => {
            window.document.dispatchEvent(new CustomEvent("lock-app"));
        });
    }
}
