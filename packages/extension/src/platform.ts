import { WebPlatform } from "@padloc/app/src/lib/platform";
import { ExtensionStorage } from "./storage";

export class ExtensionPlatform extends WebPlatform {
    storage = new ExtensionStorage();

    async getDeviceInfo() {
        const info = await super.getDeviceInfo();
        info.description = `${info.browser} extension on ${info.platform}`;
        return info;
    }
}
