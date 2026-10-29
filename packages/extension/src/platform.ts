import browser from "webextension-polyfill";
import { supportsExtensionBiometrics } from "./biometric";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import { webAuthnClient } from "@padloc/app/src/lib/auth/webauthn";
import { AuthType } from "@padloc/core/src/auth";
import { ExtensionLocalStorage } from "./storage";

export class ExtensionPlatform extends WebPlatform {
    storage = new ExtensionLocalStorage();

    private _firefoxVersion = "";
    private _browserReady = this._initBrowser();

    private async _initBrowser() {
        if (process.env.PL_EXTENSION_BROWSER === "firefox") {
            try {
                this._firefoxVersion = (await browser.runtime.getBrowserInfo()).version;
            } catch (e) {
                // Fail closed if this runtime cannot identify its Firefox version.
            }
        }
    }

    get supportedAuthTypes() {
        return [
            AuthType.Email,
            AuthType.Totp,
            ...(supportsExtensionBiometrics(
                process.env.PL_EXTENSION_BROWSER,
                this._firefoxVersion,
                process.env.PL_WEB_EXTENSION_FIREFOX_ID
            ) && webAuthnClient.supportsType(AuthType.WebAuthnPlatform)
                ? [AuthType.WebAuthnPlatform]
                : []),
        ];
    }

    async supportsPlatformAuthenticator() {
        await Promise.all([webAuthnClient.ready, this._browserReady]);
        return this.supportedAuthTypes.includes(AuthType.WebAuthnPlatform);
    }

    async getDeviceInfo() {
        const info = await super.getDeviceInfo();
        info.description = `${info.browser} extension on ${info.platform}`;
        info.runtime = "extension";
        return info;
    }
}
