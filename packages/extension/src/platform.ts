import { PublicKeyAuthClient } from "@padloc/core/src/auth/public-key";
import { StartRegisterAuthenticatorResponse, StartAuthRequestResponse } from "@padloc/core/src/api";
import { StubBiometricKeyStore } from "@padloc/core/src/platform";
import { SafariBiometricKeyStore } from "./safari-biometric";
import browser from "webextension-polyfill";
import { supportsExtensionBiometrics } from "./biometric";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import { webAuthnClient } from "@padloc/app/src/lib/auth/webauthn";
import { AuthType } from "@padloc/core/src/auth";
import { ExtensionLocalStorage } from "./storage";

export class ExtensionPlatform extends WebPlatform {
    storage = new ExtensionLocalStorage();

    biometricKeyStore =
        process.env.PL_EXTENSION_BROWSER === "safari"
            ? new SafariBiometricKeyStore(browser)
            : new StubBiometricKeyStore();
    private _publicKeyAuthClient = new PublicKeyAuthClient(this.biometricKeyStore);
    readonly platformAuthType =
        process.env.PL_EXTENSION_BROWSER === "safari" ? AuthType.PublicKey : AuthType.WebAuthnPlatform;

    protected async _prepareRegisterAuthenticator(res: StartRegisterAuthenticatorResponse) {
        return process.env.PL_EXTENSION_BROWSER === "safari" && res.type === AuthType.PublicKey
            ? this._publicKeyAuthClient.prepareRegistration(res.data)
            : super._prepareRegisterAuthenticator(res);
    }

    protected async _prepareCompleteAuthRequest(res: StartAuthRequestResponse) {
        return process.env.PL_EXTENSION_BROWSER === "safari" && res.type === AuthType.PublicKey
            ? this._publicKeyAuthClient.prepareAuthentication(res.data)
            : super._prepareCompleteAuthRequest(res);
    }

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
        if (process.env.PL_EXTENSION_BROWSER === "safari") return [AuthType.Email, AuthType.Totp, AuthType.PublicKey];
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
        if (process.env.PL_EXTENSION_BROWSER === "safari") return this.biometricKeyStore.isSupported();
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
