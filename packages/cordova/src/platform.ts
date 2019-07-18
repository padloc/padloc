import { Platform } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/platform";
import "cordova-plugin-qrscanner";

const cordovaReady = new Promise(resolve => document.addEventListener("deviceready", resolve));

cordovaReady.then(() => console.log("cordova ready!"));

export class CordovaPlatform extends WebPlatform implements Platform {
    scanQR() {
        return new Promise<string>((resolve, reject) => {
            QRScanner.scan((err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
            QRScanner.show();
        });
    }

    async stopScanQR() {
        document.body.style.background = "";
        await QRScanner.destroy();
    }
}
