import { WebPlatform } from "@padloc/app/src/lib/platform";
import type { Platform } from "@padloc/core/src/platform";

export class TauriPlatform extends WebPlatform implements Platform {
    async getDeviceInfo() {
        const device = await super.getDeviceInfo();
        device.runtime = "tauri";
        device.description = `${device.platform} Device`;
        return device;
    }
}
