import { Platform, StubBiometricKeyStore } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import { AuthType } from "@padloc/core/src/auth";
import { PublicKeyAuthClient } from "@padloc/core/src/auth/public-key";
import { StartRegisterAuthenticatorResponse, StartAuthRequestResponse } from "@padloc/core/src/api";
import { IosBiometricKeyStore } from "./biometric";

const isIos = process.env.PL_IOS === "true";

export class TauriPlatform extends WebPlatform implements Platform {
    biometricKeyStore = isIos ? new IosBiometricKeyStore() : new StubBiometricKeyStore();
    private _publicKeyAuthClient = new PublicKeyAuthClient(this.biometricKeyStore);
    readonly platformAuthType = isIos ? AuthType.PublicKey : AuthType.WebAuthnPlatform;

    get supportedAuthTypes() {
        return isIos ? [AuthType.Email, AuthType.Totp, AuthType.PublicKey] : super.supportedAuthTypes;
    }

    supportsPlatformAuthenticator() {
        return isIos ? this.biometricKeyStore.isSupported() : super.supportsPlatformAuthenticator();
    }

    protected async _prepareRegisterAuthenticator(res: StartRegisterAuthenticatorResponse) {
        return isIos && res.type === AuthType.PublicKey
            ? this._publicKeyAuthClient.prepareRegistration(res.data)
            : super._prepareRegisterAuthenticator(res);
    }

    protected async _prepareCompleteAuthRequest(res: StartAuthRequestResponse) {
        return isIos && res.type === AuthType.PublicKey
            ? this._publicKeyAuthClient.prepareAuthentication(res.data)
            : super._prepareCompleteAuthRequest(res);
    }

    async getDeviceInfo() {
        const device = await super.getDeviceInfo();
        device.runtime = "tauri";
        device.description = `${device.platform} Device`;
        return device;
    }
}
