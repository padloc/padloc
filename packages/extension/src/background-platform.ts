import { DeviceInfo, StubPlatform } from "@padloc/core/src/platform";
import { WebCryptoProvider } from "@padloc/app/src/lib/crypto";
import { ExtensionLocalStorage } from "./storage";

// Do not import WebPlatform here: it loads UI elements and the window-scoped app.
export class BackgroundPlatform extends StubPlatform {
    crypto = new WebCryptoProvider();
    storage = new ExtensionLocalStorage();

    async getDeviceInfo() {
        const { default: UAParser } = await import("ua-parser-js");
        const { os, browser } = new UAParser(navigator.userAgent).getResult();
        return new DeviceInfo({
            platform: os.name || "",
            osVersion: os.version || "",
            browser: browser.name || "",
            browserVersion: browser.version || "",
            userAgent: navigator.userAgent,
            locale: navigator.language || "en",
            appVersion: process.env.PL_VERSION || "",
            vendorVersion: process.env.PL_VENDOR_VERSION || "",
            runtime: "extension",
            description: `${browser.name} extension on ${os.name}`,
        });
    }
}
