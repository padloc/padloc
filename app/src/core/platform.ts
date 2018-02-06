declare var cordova: any | undefined;
declare var chrome: any | undefined;
declare var device: any | undefined;

const nodeRequire = window.require;
const electron = nodeRequire && nodeRequire("electron");
const cordovaReady = new Promise<void>((r) => document.addEventListener("deviceready", () => r()));

// Textarea used for copying/pasting using the dom
let clipboardTextArea: HTMLTextAreaElement;

// Set clipboard text using `document.execCommand("cut")`.
// NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
function domSetClipboard(text: string) {
    // copying an empty string does not work with this method, so copy a single space instead.
    if (text === "") {
        text = " ";
    }
    clipboardTextArea = clipboardTextArea || document.createElement("textarea");
    clipboardTextArea.value = text;
    document.body.appendChild(clipboardTextArea);
    clipboardTextArea.select();
    document.execCommand("cut");
    document.body.removeChild(clipboardTextArea);
}

// Get clipboard text using `document.execCommand("paste")`
// NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
function domGetClipboard(): string {
    clipboardTextArea = clipboardTextArea || document.createElement("textarea");
    document.body.appendChild(clipboardTextArea);
    clipboardTextArea.value = "";
    clipboardTextArea.select();
    document.execCommand("paste");
    document.body.removeChild(clipboardTextArea);
    return clipboardTextArea.value;
}

export function isCordova(): Boolean {
    return typeof cordova !== "undefined";
}

//* Checks if the app is running as a packaged Chrome app
export function isChromeApp(): boolean {
    return (typeof chrome !== "undefined") && chrome.app && !!chrome.app.runtime;
}

export async function isIOS(): Promise<boolean> {
    return (await getPlatformName()).toLowerCase() === "ios";
}

export async function isAndroid(): Promise<boolean> {
    return (await getPlatformName()).toLowerCase() === "android";
}

export async function isChromeOS(): Promise<boolean> {
    return (await getPlatformName()).toLowerCase() === "chromeos";
}

//* Checks if the current environment supports touch events
export function isTouch() {
    try {
        document.createEvent("TouchEvent");
        return true;
    } catch (e) {
        return false;
    }
}

//* Sets the clipboard text to a given string
export async function setClipboard(text: string): Promise<void> {
    // If cordova clipboard plugin is available, use that one. Otherwise use the execCommand implemenation
    if (isCordova()) {
        await cordovaReady;
        return new Promise<void>((resolve, reject) => {
            cordova.plugins.clipboard.copy(text, resolve, reject);
        });
    } else if (isElectron()) {
        electron.clipboard.writeText(text);
    } else {
        domSetClipboard(text);
    }
}

//* Retrieves the clipboard text
export async function getClipboard(): Promise<string> {
    // If cordova clipboard plugin is available, use that one. Otherwise use the execCommand implemenation
    if (isCordova()) {
        await cordovaReady;
        return new Promise<string>((resolve, reject) => {
            cordova.plugins.clipboard.paste(resolve, reject);
        });
    } else if (isElectron()) {
        return electron.clipboard.readText();
    } else {
        return domGetClipboard();
    }
}

export async function getAppStoreLink(): Promise<string> {
    if (await isIOS()) {
        return "https://itunes.apple.com/app/id871710139";
    } else if (await isAndroid()) {
        return "https://play.google.com/store/apps/details?id=com.maklesoft.padlock";
    } else if (await isChromeApp()) {
        return "https://chrome.google.com/webstore/detail/padlock/npkoefjfcjbknoeadfkbcdpbapaamcif";
    } else {
        return "https://padlock.io";
    }
}

export async function getReviewLink(rating:number): Promise<string> {
    if (await isIOS()) {
        return "https://itunes.apple.com/app/id871710139?action=write-review";
    } else if (await isAndroid()) {
        return "https://play.google.com/store/apps/details?id=com.maklesoft.padlock";
    } else if (await isChromeApp()) {
        return "https://chrome.google.com/webstore/detail/padlock/npkoefjfcjbknoeadfkbcdpbapaamcif/reviews";
    } else {
        const version = await getAppVersion();
        const platform = await getPlatformName();
        return `https://padlock.io/feedback/?r=${rating}&p=${encodeURIComponent(platform)}&v=${version}`;
    }
}

export function hasNode(): Boolean {
    return !!nodeRequire;
}

export function isElectron(): Boolean {
    return !!electron;
}

export async function getAppVersion(): Promise<string> {
    if (isElectron()) {
        return electron.remote.app.getVersion();
    } else if (isCordova()) {
        await cordovaReady;
        return new Promise<string>((resolve, reject) => {
            cordova.getAppVersion.getVersionNumber(resolve, reject);
        });
    } else if (isChromeApp()) {
        return chrome.runtime.getManifest().version;
    }

    return "";
}

export async function getPlatformName(): Promise<string> {
    if (isElectron()) {
        const platform = nodeRequire("os").platform();
        return {
            darwin: "MacOS",
            win32: "Windows",
            linux: "Linux"
        }[platform] || platform;
    } else if (isCordova()) {
        await cordovaReady;
        return device.platform;
    } else if (isChromeApp()) {
        const info = await new Promise<{os: string}>((r) => chrome.runtime.getPlatformInfo(r));
        return {
            cros: "ChromeOS",
            win: "Windows (Chrome)",
            linux: "Linux (Chrome)",
            android: "Android (Chrome)",
            mac: "MacOS (Chrome)",
            openbsd: "OpenBSD (Chrome)"
        }[info.os] || info.os;
    } else {
        return "";
    }
}

export function getDesktopSettings(): any {
    return isElectron() ? electron.remote.getGlobal("settings") : null;
}

export async function getDeviceUUID(): Promise<string> {
    if (isCordova()) {
        await cordovaReady;
        return device.uuid;
    } else if (isElectron()) {
        return getDesktopSettings().get("uuid");
    } else {
        return "";
    }
}

export async function getOSVersion(): Promise<string> {
    if (isCordova()) {
        await cordovaReady;
        return device.version;
    } else if (hasNode()) {
        return nodeRequire("os").release();
    } else {
        return "";
    }
}

export async function checkForUpdates(): Promise<void> {
    if (isElectron()) {
        electron.ipcRenderer.send("check-updates");
    } else {
        window.open(await getAppStoreLink(), "_system");
    }
}

export function getLocale(): string {
    // TODO: Is there a more reliable way to get the system locale,
    // e.g. through `electron.remote.app.getLocale()`?
    return navigator.language || "en";
}

export interface DeviceInfo {
    platform: string,
    osVersion: string,
    uuid: string,
    appVersion: string,
    manufacturer?: string,
    model?: string,
    hostName?: string
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
    const info: DeviceInfo = {
        platform: await getPlatformName(),
        osVersion: await getOSVersion(),
        appVersion: await getAppVersion(),
        uuid: await getDeviceUUID()
    };

    if (isCordova()) {
        await cordovaReady;
        info.model = device.model;
        info.manufacturer = device.manufacturer;
    }

    if (isElectron()) {
        info.hostName = nodeRequire("os").hostname();
    }

    return info;
}
