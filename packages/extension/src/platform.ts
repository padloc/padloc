import { WebPlatform } from "@padloc/app/src/lib/platform";
import { webAuthnClient } from "@padloc/app/src/lib/auth/webauthn";
import { AuthType } from "@padloc/core/src/auth";
import { ExtensionLocalStorage } from "./storage";

export class ExtensionPlatform extends WebPlatform {
    storage = new ExtensionLocalStorage();

    get supportedAuthTypes() {
        return [
            AuthType.Email,
            AuthType.Totp,
            ...(process.env.PL_EXTENSION_BROWSER === "chromium" &&
            webAuthnClient.supportsType(AuthType.WebAuthnPlatform)
                ? [AuthType.WebAuthnPlatform]
                : []),
        ];
    }

    async supportsPlatformAuthenticator() {
        await webAuthnClient.ready;
        return this.supportedAuthTypes.includes(AuthType.WebAuthnPlatform);
    }

    async getDeviceInfo() {
        const info = await super.getDeviceInfo();
        info.description = `${info.browser} extension on ${info.platform}`;
        info.runtime = "extension";
        return info;
    }
}
