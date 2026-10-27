import { Platform, StubBiometricKeyStore } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import { AuthType } from "@padloc/core/src/auth";
import { PublicKeyAuthClient } from "@padloc/core/src/auth/public-key";
import { StartRegisterAuthenticatorResponse, StartAuthRequestResponse } from "@padloc/core/src/api";
import { NativeBiometricKeyStore } from "./biometric";
import { NativeClipboard } from "./clipboard";
import { NativeQRScanner } from "./qr";
import { launchExternalLink, openExternalLink } from "./links";
import { shareFile } from "./files";

const targetPlatform = process.env.PL_PLATFORM || "";
export const isMobile = ["ios", "android"].includes(targetPlatform);

export class TauriPlatform extends WebPlatform implements Platform {
    saveFile(name: string, type: string, contents: Uint8Array): Promise<void> {
        return isMobile ? shareFile(name, contents) : super.saveFile(name, type, contents);
    }

    openExternalUrl(url: string): void {
        launchExternalLink(url);
    }

    composeEmail(address: string, subject: string, message: string): Promise<void> {
        return openExternalLink(`mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`);
    }

    private _qr = new NativeQRScanner();

    scanQR(): Promise<string> {
        return targetPlatform === "ios" ? this._qr.scan() : super.scanQR();
    }

    stopScanQR(): Promise<void> {
        return targetPlatform === "ios" ? this._qr.stop() : super.stopScanQR();
    }

    private _clipboard = new NativeClipboard();

    setClipboard(text: string): Promise<void> {
        return this._clipboard.set(text);
    }

    getClipboard(): Promise<string> {
        return this._clipboard.get();
    }

    biometricKeyStore = isMobile ? new NativeBiometricKeyStore() : new StubBiometricKeyStore();
    private _publicKeyAuthClient = new PublicKeyAuthClient(this.biometricKeyStore);
    readonly platformAuthType = isMobile ? AuthType.PublicKey : AuthType.WebAuthnPlatform;

    get supportedAuthTypes() {
        return isMobile ? [AuthType.Email, AuthType.Totp, AuthType.PublicKey] : super.supportedAuthTypes;
    }

    supportsPlatformAuthenticator() {
        return isMobile ? this.biometricKeyStore.isSupported() : super.supportsPlatformAuthenticator();
    }

    protected async _prepareRegisterAuthenticator(res: StartRegisterAuthenticatorResponse) {
        return isMobile && res.type === AuthType.PublicKey
            ? this._publicKeyAuthClient.prepareRegistration(res.data)
            : super._prepareRegisterAuthenticator(res);
    }

    protected async _prepareCompleteAuthRequest(res: StartAuthRequestResponse) {
        return isMobile && res.type === AuthType.PublicKey
            ? this._publicKeyAuthClient.prepareAuthentication(res.data)
            : super._prepareCompleteAuthRequest(res);
    }

    async getDeviceInfo() {
        const device = await super.getDeviceInfo();
        device.runtime = "tauri";
        const platformNames: Record<string, string> = {
            ios: "iOS",
            android: "Android",
            darwin: "macOS",
            macos: "macOS",
            windows: "Windows",
            linux: "Linux",
        };
        let platform = targetPlatform;
        try {
            // Build-platform versions describe the build environment, not this device.
            const os = await import("@tauri-apps/plugin-os");
            platform = os.platform();
            device.osVersion = os.version() || device.osVersion;
        } catch {
            // Retain the WebView fallback if native OS information is unavailable.
        }
        device.platform = platformNames[platform] || platform || device.platform;
        device.description = `${device.platform} Device`;
        return device;
    }
}
