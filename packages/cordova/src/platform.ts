import { Platform, getCryptoProvider } from "@padloc/core/src/platform";
import { bytesToBase64 } from "@padloc/core/src/encoding";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import "cordova-plugin-qrscanner";

const cordovaReady = new Promise(resolve => document.addEventListener("deviceready", resolve));

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

    async isBiometricAuthAvailable() {
        await cordovaReady;
        return new Promise<boolean>(resolve => {
            try {
                Fingerprint.isAvailable((result: string) => resolve(!!result), () => resolve(false));
            } catch (e) {
                resolve(false);
            }
        });
    }

    async biometricAuth(message?: string) {
        await cordovaReady;
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                Fingerprint.show(
                    {
                        clientId: "Padloc",
                        clientSecret: bytesToBase64(await getCryptoProvider().randomBytes(16)),
                        localizedReason: message,
                        disableBackup: true
                    },
                    () => resolve(true),
                    (e: any) => {
                        reject(new Error(e.message));
                    }
                );
            } catch (e) {
                reject(e);
            }
        });
    }

    private async _getSecureStorage() {
        await cordovaReady;
        return new Promise<any>((resolve, reject) => {
            try {
                const ss = new cordova.plugins.SecureStorage(() => resolve(ss), reject, "padloc");
            } catch (e) {
                reject(e);
            }
        });
    }

    async isKeyStoreAvailable() {
        return this._getSecureStorage().then(() => true, () => false);
    }

    async keyStoreGet(name: string) {
        const ss = await this._getSecureStorage();
        return new Promise<string>((resolve, reject) => ss.get(resolve, reject, name));
    }

    async keyStoreSet(name: string, value: string) {
        const ss = await this._getSecureStorage();
        return new Promise<void>((resolve, reject) => ss.set(() => resolve(), reject, name, value));
    }

    async keyStoreDelete(name: string) {
        const ss = await this._getSecureStorage();
        return new Promise<void>((resolve, reject) => ss.remove(resolve, reject, name));
    }

    async getDeviceInfo() {
        await cordovaReady;
        const { manufacturer, model, platform, version: osVersion } = device;
        const [supportsBioAuth, supportsKeyStore] = await Promise.all([
            this.isBiometricAuthAvailable(),
            this.isKeyStoreAvailable()
        ]);
        return Object.assign(await super.getDeviceInfo(), {
            supportsBioAuth,
            supportsKeyStore,
            manufacturer,
            model,
            platform,
            osVersion
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
}
