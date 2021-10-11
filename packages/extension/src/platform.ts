import { WebPlatform } from "@padloc/app/src/lib/platform";
import { AuthType } from "@padloc/core/src/auth";
import { ExtensionStorage } from "./storage";

export class ExtensionPlatform extends WebPlatform {
    storage = new ExtensionStorage();

    get supportedAuthTypes() {
        return [AuthType.Email, AuthType.Totp];
    }

    async getDeviceInfo() {
        const info = await super.getDeviceInfo();
        info.description = `${info.browser} extension on ${info.platform}`;
        return info;
    }
}
