import { Platform, StubBiometricKeyStore } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import { AuthType } from "@padloc/core/src/auth";
import { PublicKeyAuthClient } from "@padloc/core/src/auth/public-key";
import { StartRegisterAuthenticatorResponse, StartAuthRequestResponse } from "@padloc/core/src/api";
import { IosBiometricKeyStore } from "./biometric";
import { NativeClipboard } from "./clipboard";
import { NativeQRScanner } from "./qr";
import { launchExternalLink, openExternalLink } from "./links";
import { shareFile } from "./files";

const isIos = process.env.PL_IOS === "true";

export class TauriPlatform extends WebPlatform implements Platform {
    saveFile(name: string, type: string, contents: Uint8Array): Promise<void> {
        return isIos ? shareFile(name, contents) : super.saveFile(name, type, contents);
    }

    openExternalUrl(url: string): void {
        launchExternalLink(url);
    }

    composeEmail(address: string, subject: string, message: string): Promise<void> {
        return openExternalLink(`mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`);
    }

    private _qr = new NativeQRScanner();

    scanQR(): Promise<string> {
        return isIos ? this._qr.scan() : super.scanQR();
    }

    stopScanQR(): Promise<void> {
        return isIos ? this._qr.stop() : super.stopScanQR();
    }

    private _clipboard = new NativeClipboard();

    setClipboard(text: string): Promise<void> {
        return this._clipboard.set(text);
    }

    getClipboard(): Promise<string> {
        return this._clipboard.get();
    }

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
