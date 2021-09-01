import { Platform } from "@padloc/core/src/platform";
import { base64ToBytes, bytesToBase64 } from "@padloc/core/src/encoding";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import "cordova-plugin-qrscanner";
import { MFAType, PublicKeyMFAClient } from "@padloc/core/src/mfa";
import { StartRegisterMFAuthenticatorResponse, StartMFARequestResponse } from "@padloc/core/src/api";
import { appleDeviceNames } from "./apple-device-names";

const cordovaReady = new Promise((resolve) => document.addEventListener("deviceready", resolve));

declare var Fingerprint: any;
declare var cordova: any;
declare var device: any;
declare var plugins: any;

export class CordovaPlatform extends WebPlatform implements Platform {
    async scanQR() {
        await cordovaReady;
        return new Promise<string>((resolve, reject) => {
            QRScanner.scan((err, result) => {
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

    supportsMFAType(type: MFAType) {
        return [MFAType.Email, MFAType.Totp, MFAType.PublicKey].includes(type);
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

    private _publicKeyMFAClient = new PublicKeyMFAClient(this.biometricKeyStore);

    protected async _prepareRegisterMFAuthenticator(res: StartRegisterMFAuthenticatorResponse) {
        switch (res.type) {
            case MFAType.PublicKey:
                return this._publicKeyMFAClient.prepareRegistration(res.data);
            default:
                return super._prepareRegisterMFAuthenticator(res);
        }
    }

    protected async _prepareCompleteMFARequest(res: StartMFARequestResponse) {
        switch (res.type) {
            case MFAType.PublicKey:
                return this._publicKeyMFAClient.prepareAuthentication(res.data);
            default:
                return super._prepareCompleteMFARequest(res);
        }
    }

    readonly platformMFAType = MFAType.PublicKey;

    supportsPlatformAuthenticator() {
        return this.biometricKeyStore.isSupported();
    }
}
