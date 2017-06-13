declare var cordova: any;
declare var chrome: any;
declare var electron: any;

let vPrefix: {
    lowercase: string,
    css: string
};

/**
 *  Detects the vendor prefix to be used in the current browser
 *
 * @return {Object} object containing the simple lowercase vendor prefix as well as the css prefix
 * @example
 *
 *     {
 *         lowercase: "webkit",
 *         css: "-webkit-"
 *     }
 */
export function getVendorPrefix() {
    if (!vPrefix) {
        var styles = getComputedStyle(document.documentElement, "");
        var pre = Array.prototype.slice.call(styles).join("").match(/-(moz|webkit|ms)-/);
        vPrefix = {
            lowercase: pre,
            css: "-" + pre + "-"
        };
    }
    return vPrefix;
}

// Names for transition end events on various platforms
const transitionEndEventNames = {
    webkit: "webkitTransitionEnd",
    moz: "transitionend",
    ms: "MSTransitionEnd",
    o: "otransitionend"
};

/**
 * Returns the appropriate transition end event name for the current platform
 * @return {String} Name of the transition end event name on this platform
 */
export function getTransitionEndEventName() {
    return transitionEndEventNames[getVendorPrefix().lowercase];
}

// Names for animation end events on various platforms
const animationEndEventNames = {
    webkit: "webkitAnimationEnd",
    moz: "animationend",
    ms: "MSAnimationEnd",
    o: "oanimationend"
};

/**
 * Returns the appropriate animation end event name for the current platform
 * @return {String} Name of the animation end event name on this platform
 */
export function getAnimationEndEventName() {
    return animationEndEventNames[getVendorPrefix().lowercase];
}

// Names for animation start events on various platforms
const animationStartEventNames = {
    webkit: "webkitAnimationStart",
    moz: "animationstart",
    ms: "MSAnimationStart",
    o: "oanimationstart"
}

/**
 * Returns the appropriate animation start event name for the current platform
 * @return {String} Name of the animation end event name on this platform
 */
export function getAnimationStartEventName() {
    return animationStartEventNames[getVendorPrefix().lowercase];
}

//* Checks if the app is running as a packaged Chrome app
function isChromeApp(): boolean {
    return (typeof chrome !== "undefined") && chrome.app && !!chrome.app.runtime;
}

/**
 * Checks the _navigator.platform_ property to see if we are on a device
 * running iOS
 */
export function isIOS(): boolean {
    return /ipad|iphone|ipod/i.test(navigator.platform);
}

export function isAndroid(): boolean {
    return /android/i.test(navigator.userAgent);
}

// Textarea used for copying/pasting using the dom
let clipboardTextArea: HTMLTextAreaElement;

// Set clipboard text using `document.execCommand("cut")`.
// NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
function domSetClipboard(text: string) {
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

//* Sets the clipboard text to a given string
export function setClipboard(text: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        // If cordova clipboard plugin is available, use that one. Otherwise use the execCommand implemenation
        if (typeof cordova !== "undefined" && cordova.plugins && cordova.plugins.clipboard) {
            cordova.plugins.clipboard.copy(text, resolve, reject);
        } else {
            domSetClipboard(text);
            resolve();
        }
    });
}

//* Retrieves the clipboard text
export function getClipboard(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        // If cordova clipboard plugin is available, use that one. Otherwise use the execCommand implemenation
        if (typeof cordova !== "undefined" && cordova.plugins && cordova.plugins.clipboard) {
            cordova.plugins.clipboard.paste(resolve, reject);
        } else {
            resolve(domGetClipboard());
        }
    });
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

//* Disables scrolling the viewport on iOS when virtual keyboard is showing. Does nothing on other
//* Platforms so can be safely called independtly of the platform
export function keyboardDisableScroll(disable: boolean) {
    typeof cordova != "undefined" && cordova.plugins && cordova.plugins.Keyboard &&
        cordova.plugins.Keyboard.disableScroll(disable);
}

export function getAppStoreLink(): string {
    if (isIOS()) {
        return "https://itunes.apple.com/app/id871710139";
    } else if (isAndroid()) {
        return "https://play.google.com/store/apps/details?id=com.maklesoft.padlock";
    } else if (isChromeApp()) {
        return "https://chrome.google.com/webstore/detail/padlock/npkoefjfcjbknoeadfkbcdpbapaamcif";
    } else {
        return "http://padlock.io";
    }
}

export async function getAppVersion(): Promise<string> {
    if (typeof electron !== "undefined") {
        return electron.remote.app.getVersion();
    } else if (typeof cordova !== "undefined" && cordova.getAppVersion) {
        return await new Promise<string>((resolve, reject) => {
            cordova.getAppVersion.getVersionNumber(resolve, reject);
        });
    } else if (isChromeApp()) {
        return chrome.runtime.getManifest().version;
    }

    return "";
}

export function getPlatformName(): string {
    if (typeof require !== "undefined" && require("os")) {
        return require("os").platform();
    } else if (isIOS()) {
        return "ios";
    } else if (isAndroid()) {
        return "android";
    } else if (isChromeApp()) {
        return "chrome";
    } else {
        return "";
    }
}
