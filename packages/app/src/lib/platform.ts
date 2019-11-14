import { Platform, StubPlatform, DeviceInfo } from "@padloc/core/src/platform";
import { bytesToBase64 } from "@padloc/core/src/encoding";
import { WebCryptoProvider } from "./crypto";

const browserInfo = (async () => {
    const { UAParser } = await import(/* webpackChunkName: "ua-parser" */ "ua-parser-js");
    return new UAParser(navigator.userAgent).getResult();
})();

export class WebPlatform extends StubPlatform implements Platform {
    private _clipboardTextArea: HTMLTextAreaElement;
    private _qrVideo: HTMLVideoElement;
    private _qrCanvas: HTMLCanvasElement;

    crypto = new WebCryptoProvider();

    // Set clipboard text using `document.execCommand("cut")`.
    // NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
    async setClipboard(text: string): Promise<void> {
        this._clipboardTextArea = this._clipboardTextArea || document.createElement("textarea");
        this._clipboardTextArea.contentEditable = "true";
        this._clipboardTextArea.readOnly = false;
        this._clipboardTextArea.value = text;
        document.body.appendChild(this._clipboardTextArea);
        const range = document.createRange();
        range.selectNodeContents(this._clipboardTextArea);

        const s = window.getSelection();
        s!.removeAllRanges();
        s!.addRange(range);
        this._clipboardTextArea.select();

        this._clipboardTextArea.setSelectionRange(0, this._clipboardTextArea.value.length); // A big number, to cover anything that could be inside the element.

        document.execCommand("cut");
        document.body.removeChild(this._clipboardTextArea);
    }

    // Get clipboard text using `document.execCommand("paste")`
    // NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
    async getClipboard(): Promise<string> {
        this._clipboardTextArea = this._clipboardTextArea || document.createElement("textarea");
        document.body.appendChild(this._clipboardTextArea);
        this._clipboardTextArea.value = "";
        this._clipboardTextArea.select();
        document.execCommand("paste");
        document.body.removeChild(this._clipboardTextArea);
        return this._clipboardTextArea.value;
    }

    async getDeviceInfo() {
        const { os, browser } = await browserInfo;
        return new DeviceInfo({
            platform: (os.name && os.name.replace(" ", "")) || "",
            osVersion: (os.version && os.version.replace(" ", "")) || "",
            id: "",
            appVersion: process.env.PL_VERSION || "",
            manufacturer: "",
            model: "",
            browser: browser.name || "",
            userAgent: navigator.userAgent,
            locale: navigator.language || "en"
        });
    }

    async scanQR() {
        return new Promise<string>((resolve, reject) => {
            const tick = async () => {
                if (this._qrVideo.readyState !== this._qrVideo.HAVE_ENOUGH_DATA) {
                    requestAnimationFrame(() => tick());
                    return;
                }

                const { default: jsQR } = await import(/* webpackChunkName: "jsqr" */ "jsqr");

                const canvas = this._qrCanvas.getContext("2d")!;
                this._qrCanvas.height = this._qrVideo.videoHeight;
                this._qrCanvas.width = this._qrVideo.videoWidth;
                canvas.drawImage(this._qrVideo, 0, 0, this._qrCanvas.width, this._qrCanvas.height);
                const imageData = canvas.getImageData(0, 0, this._qrCanvas.width, this._qrCanvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert"
                });
                if (code) {
                    resolve(code.data);
                }
                requestAnimationFrame(() => tick());
            };

            if (!this._qrVideo) {
                this._qrVideo = document.createElement("video");
                this._qrVideo.setAttribute("playsinline", "");
                this._qrVideo.setAttribute("muted", "");
                this._qrVideo.setAttribute("autoplay", "");
            }

            if (!this._qrCanvas) {
                this._qrCanvas = document.createElement("canvas");
                Object.assign(this._qrCanvas.style, {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    zIndex: "-1"
                });
                document.body.appendChild(this._qrCanvas);
            }

            this._qrCanvas.style.display = "block";

            navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "environment" } }).then(stream => {
                // Use facingMode: environment to attemt to get the front camera on phones
                this._qrVideo.srcObject = stream;
                this._qrVideo.play();
                requestAnimationFrame(() => tick());
            }, reject);
        });
    }

    async stopScanQR() {
        const stream: MediaStream | null = this._qrVideo && (this._qrVideo.srcObject as MediaStream);
        if (stream) {
            for (const track of stream.getTracks()) {
                track.stop();
            }
        }

        this._qrVideo && (this._qrVideo.srcObject = null);
        this._qrCanvas.style.display = "none";
    }

    async composeEmail(addr: string, subj: string, msg: string) {
        window.open(`mailto:${addr}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(msg)}`, "_system");
    }

    async saveFile(name: string, type: string, contents: Uint8Array) {
        const a = document.createElement("a");
        a.href = `data:${type};base64,${bytesToBase64(contents)}`;
        a.download = name;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
