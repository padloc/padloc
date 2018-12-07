import { Platform } from "@padlock/core/lib/platform.js";
import { loadScript } from "./util.js";

const browserInfo = (async () => {
    const uaparser = await loadScript("/vendor/ua-parser.js", "UAParser");
    return uaparser(navigator.userAgent);
})();

// Textarea used for copying/pasting using the dom
let clipboardTextArea: HTMLTextAreaElement;

export class WebPlatform implements Platform {
    // Set clipboard text using `document.execCommand("cut")`.
    // NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
    async setClipboard(text: string): Promise<void> {
        clipboardTextArea = clipboardTextArea || document.createElement("textarea");
        clipboardTextArea.contentEditable = "true";
        clipboardTextArea.readOnly = false;
        clipboardTextArea.value = text;
        document.body.appendChild(clipboardTextArea);
        const range = document.createRange();
        range.selectNodeContents(clipboardTextArea);

        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(range);
        clipboardTextArea.select();

        clipboardTextArea.setSelectionRange(0, clipboardTextArea.value.length); // A big number, to cover anything that could be inside the element.

        document.execCommand("cut");
        document.body.removeChild(clipboardTextArea);
    }

    // Get clipboard text using `document.execCommand("paste")`
    // NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
    async getClipboard(): Promise<string> {
        clipboardTextArea = clipboardTextArea || document.createElement("textarea");
        document.body.appendChild(clipboardTextArea);
        clipboardTextArea.value = "";
        clipboardTextArea.select();
        document.execCommand("paste");
        document.body.removeChild(clipboardTextArea);
        return clipboardTextArea.value;
    }

    async getDeviceInfo() {
        const { os, browser } = await browserInfo;
        return {
            platform: os.name.replace(" ", ""),
            osVersion: os.version.replace(" ", ""),
            id: "",
            appVersion: "",
            manufacturer: "",
            model: "",
            browser: browser.name,
            userAgent: navigator.userAgent,
            locale: navigator.language || "en"
        };
    }
}
