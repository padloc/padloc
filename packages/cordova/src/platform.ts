import { Platform } from "@padloc/core/src/platform";
import { base64ToBytes, bytesToBase64 } from "@padloc/core/src/encoding";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import QRScanner from "@noahsun/cordova-plugin-qrscanner";
import { AuthType } from "@padloc/core/src/auth";
import { PublicKeyAuthClient } from "@padloc/core/src/auth/public-key";
import { StartRegisterAuthenticatorResponse, StartAuthRequestResponse } from "@padloc/core/src/api";
import { appleDeviceNames } from "./apple-device-names";

const cordovaReady = new Promise((resolve) => document.addEventListener("deviceready", resolve));

declare var Fingerprint: any;
declare var cordova: any;
declare var device: any;
declare var plugins: any;

export class CordovaPlatform extends WebPlatform implements Platform {
    get supportedAuthTypes() {
        return [AuthType.Email, AuthType.Totp, AuthType.PublicKey];
    }

    async scanQR() {
        await cordovaReady;
        return new Promise<string>((resolve, reject) => {
            QRScanner.scan((err: any, result: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
            QRScanner.show();
            document.body.style.background = document.documentElement.style.background = "transparent";
        });
    }

    async stopScanQR() {
        await cordovaReady;
        document.body.style.background = document.documentElement.style.background = "";
        await QRScanner.destroy();
    }

    async getDeviceInfo() {
        await cordovaReady;
        const { manufacturer, model, platform, version: osVersion } = device;
        return Object.assign(await super.getDeviceInfo(), {
            manufacturer,
            model,
            platform,
            osVersion,
            description: appleDeviceNames[model] || model,
            runtime: "cordova",
        });
    }

    async setClipboard(val: string): Promise<void> {
        await cordovaReady;
        return new Promise((resolve, reject) => {
            cordova.plugins.clipboard.copy(val, resolve, reject);
        });
    }

    async getClipboard(): Promise<string> {
        await cordovaReady;
        return new Promise((resolve, reject) => {
            cordova.plugins.clipboard.paste(resolve, reject);
        });
    }

    async saveFile(fileName: string, type: string, data: Uint8Array) {
        const url = `data:${type};df:${encodeURIComponent(fileName)};base64,${bytesToBase64(data, false)}`;
        plugins.socialsharing.share(null, fileName, [url], null);
    }

    openExternalUrl(url: string) {
        cordova.InAppBrowser.open(url, "_system");
    }

    supportsMFAType(type: AuthType) {
        return [AuthType.Email, AuthType.Totp, AuthType.PublicKey].includes(type);
    }

    biometricKeyStore = {
        async isSupported() {
            await cordovaReady;
            return new Promise<boolean>((resolve) =>
                Fingerprint.isAvailable(
                    (res: string) => resolve(!!res),
                    () => resolve(false)
                )
            );
        },

        async storeKey(_id: string, key: Uint8Array) {
            await cordovaReady;
            return new Promise<void>((resolve, reject) => {
                Fingerprint.registerBiometricSecret(
                    {
                        description: "Enable Biometric Unlock",
                        secret: bytesToBase64(key),
                        invalidateOnEnrollment: true,
                        disableBackup: true,
                    },
                    () => resolve(),
                    (error: Error) => reject(error)
                );
            });
        },

        async getKey(_id: string) {
            await cordovaReady;
            return new Promise<Uint8Array>((resolve, reject) => {
                Fingerprint.loadBiometricSecret(
                    {
                        description: "Biometric Unlock",
                        disableBackup: true,
                    },
                    (key: string) => resolve(base64ToBytes(key)),
                    (error: Error) => reject(error)
                );
            });
        },
    };

    private _publicKeyAuthClient = new PublicKeyAuthClient(this.biometricKeyStore);

    protected async _prepareRegisterAuthenticator(res: StartRegisterAuthenticatorResponse) {
        switch (res.type) {
            case AuthType.PublicKey:
                return this._publicKeyAuthClient.prepareRegistration(res.data);
            default:
                return super._prepareRegisterAuthenticator(res);
        }
    }

    protected async _prepareCompleteAuthRequest(res: StartAuthRequestResponse) {
        switch (res.type) {
            case AuthType.PublicKey:
                return this._publicKeyAuthClient.prepareAuthentication(res.data);
            default:
                return super._prepareCompleteAuthRequest(res);
        }
    }

    readonly platformAuthType = AuthType.PublicKey;

    supportsPlatformAuthenticator() {
        return this.biometricKeyStore.isSupported();
    }
}
