(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.padlock = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AjaxError {
    constructor(code, request) {
        this.code = code;
        this.request = request;
    }
    ;
}
exports.AjaxError = AjaxError;
function errorFromRequest(req) {
    switch (req.status.toString()[0]) {
        case "0":
            return new AjaxError("failed_connection", req);
        case "3":
            return new AjaxError("unexpected_redirect", req);
        case "4":
            return new AjaxError("client_error", req);
        case "5":
            return new AjaxError("server_error", req);
        default:
            return null;
    }
}
function request(method, url, body, headers) {
    let req = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                const err = errorFromRequest(req);
                if (err) {
                    reject(err);
                }
                else {
                    resolve(req);
                }
            }
        };
        try {
            req.open(method, url, true);
            if (headers) {
                headers.forEach((value, key) => req.setRequestHeader(key, value));
            }
            req.send(body);
        }
        catch (e) {
            reject(new AjaxError("failed_connection", req));
        }
    });
}
exports.request = request;

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
exports.util = util;
const platform = require("./platform");
exports.platform = platform;
const ajax = require("./ajax");
exports.ajax = ajax;

},{"./ajax":1,"./platform":3,"./util":4}],3:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodeRequire = window.require;
const electron = nodeRequire && nodeRequire("electron");
const cordovaReady = new Promise((r) => document.addEventListener("deviceready", () => r()));
// Textarea used for copying/pasting using the dom
let clipboardTextArea;
// Set clipboard text using `document.execCommand("cut")`.
// NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
function domSetClipboard(text) {
    clipboardTextArea = clipboardTextArea || document.createElement("textarea");
    clipboardTextArea.value = text;
    document.body.appendChild(clipboardTextArea);
    clipboardTextArea.select();
    document.execCommand("cut");
    document.body.removeChild(clipboardTextArea);
}
// Get clipboard text using `document.execCommand("paste")`
// NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
function domGetClipboard() {
    clipboardTextArea = clipboardTextArea || document.createElement("textarea");
    document.body.appendChild(clipboardTextArea);
    clipboardTextArea.value = "";
    clipboardTextArea.select();
    document.execCommand("paste");
    document.body.removeChild(clipboardTextArea);
    return clipboardTextArea.value;
}
function isCordova() {
    return typeof cordova !== "undefined";
}
exports.isCordova = isCordova;
//* Checks if the app is running as a packaged Chrome app
function isChromeApp() {
    return (typeof chrome !== "undefined") && chrome.app && !!chrome.app.runtime;
}
exports.isChromeApp = isChromeApp;
function isIOS() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield getPlatformName()).toLowerCase() === "ios";
    });
}
exports.isIOS = isIOS;
function isAndroid() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield getPlatformName()).toLowerCase() === "android";
    });
}
exports.isAndroid = isAndroid;
function isChromeOS() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield getPlatformName()).toLowerCase() === "chromeos";
    });
}
exports.isChromeOS = isChromeOS;
//* Checks if the current environment supports touch events
function isTouch() {
    try {
        document.createEvent("TouchEvent");
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.isTouch = isTouch;
//* Sets the clipboard text to a given string
function setClipboard(text) {
    return __awaiter(this, void 0, void 0, function* () {
        // If cordova clipboard plugin is available, use that one. Otherwise use the execCommand implemenation
        if (isCordova()) {
            yield cordovaReady;
            return new Promise((resolve, reject) => {
                cordova.plugins.clipboard.copy(text, resolve, reject);
            });
        }
        else if (isElectron()) {
            electron.clipboard.writeText(text);
        }
        else {
            domSetClipboard(text);
        }
    });
}
exports.setClipboard = setClipboard;
//* Retrieves the clipboard text
function getClipboard() {
    return __awaiter(this, void 0, void 0, function* () {
        // If cordova clipboard plugin is available, use that one. Otherwise use the execCommand implemenation
        if (isCordova()) {
            yield cordovaReady;
            return new Promise((resolve, reject) => {
                cordova.plugins.clipboard.paste(resolve, reject);
            });
        }
        else if (isElectron()) {
            return electron.clipboard.readText();
        }
        else {
            return domGetClipboard();
        }
    });
}
exports.getClipboard = getClipboard;
function getAppStoreLink() {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield isIOS()) {
            return "https://itunes.apple.com/app/id871710139";
        }
        else if (yield isAndroid()) {
            return "https://play.google.com/store/apps/details?id=com.maklesoft.padlock";
        }
        else if (yield isChromeApp()) {
            return "https://chrome.google.com/webstore/detail/padlock/npkoefjfcjbknoeadfkbcdpbapaamcif";
        }
        else {
            return "https://padlock.io";
        }
    });
}
exports.getAppStoreLink = getAppStoreLink;
function getReviewLink(rating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield isIOS()) {
            return "https://itunes.apple.com/app/id871710139?action=write-review";
        }
        else if (yield isAndroid()) {
            return "https://play.google.com/store/apps/details?id=com.maklesoft.padlock";
        }
        else if (yield isChromeApp()) {
            return "https://chrome.google.com/webstore/detail/padlock/npkoefjfcjbknoeadfkbcdpbapaamcif/reviews";
        }
        else {
            const version = yield getAppVersion();
            const platform = yield getPlatformName();
            return `https://padlock.io/feedback/?r=${rating}&p=${encodeURIComponent(platform)}&v=${version}`;
        }
    });
}
exports.getReviewLink = getReviewLink;
function hasNode() {
    return !!nodeRequire;
}
exports.hasNode = hasNode;
function isElectron() {
    return !!electron;
}
exports.isElectron = isElectron;
function getAppVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isElectron()) {
            return electron.remote.app.getVersion();
        }
        else if (isCordova()) {
            yield cordovaReady;
            return new Promise((resolve, reject) => {
                cordova.getAppVersion.getVersionNumber(resolve, reject);
            });
        }
        else if (isChromeApp()) {
            return chrome.runtime.getManifest().version;
        }
        return "";
    });
}
exports.getAppVersion = getAppVersion;
function getPlatformName() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isElectron()) {
            const platform = nodeRequire("os").platform();
            return {
                darwin: "MacOS",
                win32: "Windows",
                linux: "Linux"
            }[platform] || platform;
        }
        else if (isCordova()) {
            yield cordovaReady;
            return device.platform;
        }
        else if (isChromeApp()) {
            const info = yield new Promise((r) => chrome.runtime.getPlatformInfo(r));
            return {
                cros: "ChromeOS",
                win: "Windows (Chrome)",
                linux: "Linux (Chrome)",
                android: "Android (Chrome)",
                mac: "MacOS (Chrome)",
                openbsd: "OpenBSD (Chrome)"
            }[info.os] || info.os;
        }
        else {
            return "";
        }
    });
}
exports.getPlatformName = getPlatformName;
function getDesktopSettings() {
    return isElectron() ? electron.remote.getGlobal("settings") : null;
}
exports.getDesktopSettings = getDesktopSettings;
function getDeviceUUID() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isCordova()) {
            yield cordovaReady;
            return device.uuid;
        }
        else if (isElectron()) {
            return getDesktopSettings().get("uuid");
        }
        else {
            return "";
        }
    });
}
exports.getDeviceUUID = getDeviceUUID;
function getOSVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isCordova()) {
            yield cordovaReady;
            return device.version;
        }
        else if (hasNode()) {
            return nodeRequire("os").release();
        }
        else {
            return "";
        }
    });
}
exports.getOSVersion = getOSVersion;
function checkForUpdates() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isElectron()) {
            electron.ipcRenderer.send("check-updates");
        }
        else {
            window.open(yield getAppStoreLink(), "_system");
        }
    });
}
exports.checkForUpdates = checkForUpdates;
function changeDBPath() {
    if (isElectron()) {
        electron.ipcRenderer.send("change-db-path");
    }
}
exports.changeDBPath = changeDBPath;
function getLocale() {
    // TODO: Is there a more reliable way to get the system locale,
    // e.g. through `electron.remote.app.getLocale()`?
    return navigator.language || "en";
}
exports.getLocale = getLocale;
function getDeviceInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        const info = {
            platform: yield getPlatformName(),
            osVersion: yield getOSVersion(),
            appVersion: yield getAppVersion(),
            uuid: yield getDeviceUUID()
        };
        if (isCordova()) {
            yield cordovaReady;
            info.model = device.model;
            info.manufacturer = device.manufacturer;
        }
        if (isElectron()) {
            info.hostName = nodeRequire("os").hostname();
        }
        return info;
    });
}
exports.getDeviceInfo = getDeviceInfo;

},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// RFC4122-compliant uuid generator
function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
exports.uuid = uuid;
exports.chars = {
    numbers: "0123456789",
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    other: "/+()%\"=&-!:'*#?;,_.@`~$^[{]}\\|<>"
};
exports.charSets = {
    full: exports.chars.numbers + exports.chars.upper + exports.chars.lower + exports.chars.other,
    alphanum: exports.chars.numbers + exports.chars.upper + exports.chars.lower,
    alpha: exports.chars.lower + exports.chars.upper,
    num: exports.chars.numbers,
    hexa: exports.chars.numbers + "abcdef"
};
//* Creates a random string with a given _length_ comprised of given set or characters
function randomString(length = 32, charSet = exports.charSets.full) {
    let rnd = new Uint8Array(1);
    let str = "";
    while (str.length < length) {
        window.crypto.getRandomValues(rnd);
        // Prevent modulo bias by rejecting values larger than the highest muliple of `charSet.length`
        if (rnd[0] > 255 - 256 % charSet.length) {
            continue;
        }
        str += charSet[rnd[0] % charSet.length];
    }
    return str;
}
exports.randomString = randomString;
function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(args), delay);
    };
}
exports.debounce = debounce;
function wait(dt) {
    return new Promise((resolve) => setTimeout(resolve, dt));
}
exports.wait = wait;
function resolveLanguage(locale, supportedLanguages) {
    const localeParts = locale.toLowerCase().split("-");
    while (localeParts.length) {
        const l = localeParts.join("-");
        if (supportedLanguages[l]) {
            return l;
        }
        localeParts.pop();
    }
    return Object.keys(supportedLanguages)[0];
}
exports.resolveLanguage = resolveLanguage;
function applyMixins(baseClass, ...mixins) {
    return mixins.reduce((cls, mixin) => mixin(cls), baseClass);
}
exports.applyMixins = applyMixins;

},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvc3JjL2NvcmUvYWpheC50cyIsImFwcC9zcmMvY29yZS9tYWluLWxpdGUudHMiLCJhcHAvc3JjL2NvcmUvcGxhdGZvcm0udHMiLCJhcHAvc3JjL2NvcmUvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7SUFDSSxZQUNXLElBSVcsRUFDWCxPQUF1QjtRQUx2QixTQUFJLEdBQUosSUFBSSxDQUlPO1FBQ1gsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7SUFDL0IsQ0FBQztJQUFBLENBQUM7Q0FDUjtBQVRELDhCQVNDO0FBSUQsMEJBQTBCLEdBQW1CO0lBQ3pDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLEtBQUssR0FBRztZQUNKLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuRCxLQUFLLEdBQUc7WUFDSixNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMscUJBQXFCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckQsS0FBSyxHQUFHO1lBQ0osTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM5QyxLQUFLLEdBQUc7WUFDSixNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzlDO1lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQTtJQUNmLENBQUM7QUFDTCxDQUFDO0FBRUQsaUJBQXdCLE1BQWMsRUFBRSxHQUFXLEVBQUUsSUFBYSxFQUFFLE9BQTZCO0lBQzdGLElBQUksR0FBRyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7SUFFL0IsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFpQixDQUFDLE9BQU8sRUFBRSxNQUFNO1FBQy9D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SUFDdkQsQ0FBQyxDQUFDO0FBQ04sQ0FBQztBQVBELDRCQU9DO0FBRUQsY0FBcUIsRUFBVTtJQUMzQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEtBQUssVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ25FLENBQUM7QUFGRCxvQkFFQztBQUVELHlCQUFnQyxNQUFjLEVBQUUsa0JBQTJDO0lBQ3ZGLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFcEQsT0FBTyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDeEIsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNiLENBQUM7UUFFRCxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQWJELDBDQWFDO0FBRUQscUJBQTRCLFNBQWMsRUFBRSxHQUFHLE1BQTZCO0lBQ3hFLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDaEUsQ0FBQztBQUZELGtDQUVDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImV4cG9ydCBjbGFzcyBBamF4RXJyb3Ige1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwdWJsaWMgY29kZTpcbiAgICAgICAgICAgIFwiZmFpbGVkX2Nvbm5lY3Rpb25cIiB8XG4gICAgICAgICAgICBcInVuZXhwZWN0ZWRfcmVkaXJlY3RcIiB8XG4gICAgICAgICAgICBcImNsaWVudF9lcnJvclwiIHxcbiAgICAgICAgICAgIFwic2VydmVyX2Vycm9yXCIsXG4gICAgICAgIHB1YmxpYyByZXF1ZXN0OiBYTUxIdHRwUmVxdWVzdFxuICAgICkge307XG59XG5cbmV4cG9ydCB0eXBlIE1ldGhvZCA9IFwiR0VUXCIgfCBcIlBPU1RcIiB8IFwiUFVUXCIgfCBcIkRFTEVURVwiO1xuXG5mdW5jdGlvbiBlcnJvckZyb21SZXF1ZXN0KHJlcTogWE1MSHR0cFJlcXVlc3QpOiBBamF4RXJyb3IgfCBudWxsIHtcbiAgICBzd2l0Y2ggKHJlcS5zdGF0dXMudG9TdHJpbmcoKVswXSkge1xuICAgIGNhc2UgXCIwXCI6XG4gICAgICAgIHJldHVybiBuZXcgQWpheEVycm9yKFwiZmFpbGVkX2Nvbm5lY3Rpb25cIiwgcmVxKTtcbiAgICBjYXNlIFwiM1wiOlxuICAgICAgICByZXR1cm4gbmV3IEFqYXhFcnJvcihcInVuZXhwZWN0ZWRfcmVkaXJlY3RcIiwgcmVxKTtcbiAgICBjYXNlIFwiNFwiOlxuICAgICAgICByZXR1cm4gbmV3IEFqYXhFcnJvcihcImNsaWVudF9lcnJvclwiLCByZXEpO1xuICAgIGNhc2UgXCI1XCI6XG4gICAgICAgIHJldHVybiBuZXcgQWpheEVycm9yKFwic2VydmVyX2Vycm9yXCIsIHJlcSk7XG4gICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXF1ZXN0KG1ldGhvZDogTWV0aG9kLCB1cmw6IHN0cmluZywgYm9keT86IHN0cmluZywgaGVhZGVycz86IE1hcDxzdHJpbmcsIHN0cmluZz4pOiBQcm9taXNlPFhNTEh0dHBSZXF1ZXN0PiB7XG4gICAgbGV0IHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFhNTEh0dHBSZXF1ZXN0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnIgPSBlcnJvckZyb21SZXF1ZXN0KHJlcSk7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlcS5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChoZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiByZXEuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXEuc2VuZChib2R5KTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICByZWplY3QobmV3IEFqYXhFcnJvcihcImZhaWxlZF9jb25uZWN0aW9uXCIsIHJlcSkpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4iLCJpbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuL3V0aWxcIjtcbmltcG9ydCAqIGFzIHBsYXRmb3JtIGZyb20gXCIuL3BsYXRmb3JtXCI7XG5pbXBvcnQgKiBhcyBhamF4IGZyb20gXCIuL2FqYXhcIjtcblxuZXhwb3J0IHtcbiAgICB1dGlsLFxuICAgIGFqYXgsXG4gICAgcGxhdGZvcm1cbn1cbiIsImRlY2xhcmUgdmFyIGNvcmRvdmE6IGFueSB8IHVuZGVmaW5lZDtcbmRlY2xhcmUgdmFyIGNocm9tZTogYW55IHwgdW5kZWZpbmVkO1xuZGVjbGFyZSB2YXIgZGV2aWNlOiBhbnkgfCB1bmRlZmluZWQ7XG5cbmNvbnN0IG5vZGVSZXF1aXJlID0gd2luZG93LnJlcXVpcmU7XG5jb25zdCBlbGVjdHJvbiA9IG5vZGVSZXF1aXJlICYmIG5vZGVSZXF1aXJlKFwiZWxlY3Ryb25cIik7XG5jb25zdCBjb3Jkb3ZhUmVhZHkgPSBuZXcgUHJvbWlzZTx2b2lkPigocikgPT4gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImRldmljZXJlYWR5XCIsICgpID0+IHIoKSkpO1xuXG4vLyBUZXh0YXJlYSB1c2VkIGZvciBjb3B5aW5nL3Bhc3RpbmcgdXNpbmcgdGhlIGRvbVxubGV0IGNsaXBib2FyZFRleHRBcmVhOiBIVE1MVGV4dEFyZWFFbGVtZW50O1xuXG4vLyBTZXQgY2xpcGJvYXJkIHRleHQgdXNpbmcgYGRvY3VtZW50LmV4ZWNDb21tYW5kKFwiY3V0XCIpYC5cbi8vIE5PVEU6IFRoaXMgb25seSB3b3JrcyBpbiBjZXJ0YWluIGVudmlyb25tZW50cyBsaWtlIEdvb2dsZSBDaHJvbWUgYXBwcyB3aXRoIHRoZSBhcHByb3ByaWF0ZSBwZXJtaXNzaW9ucyBzZXRcbmZ1bmN0aW9uIGRvbVNldENsaXBib2FyZCh0ZXh0OiBzdHJpbmcpIHtcbiAgICBjbGlwYm9hcmRUZXh0QXJlYSA9IGNsaXBib2FyZFRleHRBcmVhIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtcbiAgICBjbGlwYm9hcmRUZXh0QXJlYS52YWx1ZSA9IHRleHQ7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjbGlwYm9hcmRUZXh0QXJlYSk7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEuc2VsZWN0KCk7XG4gICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJjdXRcIik7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChjbGlwYm9hcmRUZXh0QXJlYSk7XG59XG5cbi8vIEdldCBjbGlwYm9hcmQgdGV4dCB1c2luZyBgZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJwYXN0ZVwiKWBcbi8vIE5PVEU6IFRoaXMgb25seSB3b3JrcyBpbiBjZXJ0YWluIGVudmlyb25tZW50cyBsaWtlIEdvb2dsZSBDaHJvbWUgYXBwcyB3aXRoIHRoZSBhcHByb3ByaWF0ZSBwZXJtaXNzaW9ucyBzZXRcbmZ1bmN0aW9uIGRvbUdldENsaXBib2FyZCgpOiBzdHJpbmcge1xuICAgIGNsaXBib2FyZFRleHRBcmVhID0gY2xpcGJvYXJkVGV4dEFyZWEgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY2xpcGJvYXJkVGV4dEFyZWEpO1xuICAgIGNsaXBib2FyZFRleHRBcmVhLnZhbHVlID0gXCJcIjtcbiAgICBjbGlwYm9hcmRUZXh0QXJlYS5zZWxlY3QoKTtcbiAgICBkb2N1bWVudC5leGVjQ29tbWFuZChcInBhc3RlXCIpO1xuICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoY2xpcGJvYXJkVGV4dEFyZWEpO1xuICAgIHJldHVybiBjbGlwYm9hcmRUZXh0QXJlYS52YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ29yZG92YSgpOiBCb29sZWFuIHtcbiAgICByZXR1cm4gdHlwZW9mIGNvcmRvdmEgIT09IFwidW5kZWZpbmVkXCI7XG59XG5cbi8vKiBDaGVja3MgaWYgdGhlIGFwcCBpcyBydW5uaW5nIGFzIGEgcGFja2FnZWQgQ2hyb21lIGFwcFxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2hyb21lQXBwKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAodHlwZW9mIGNocm9tZSAhPT0gXCJ1bmRlZmluZWRcIikgJiYgY2hyb21lLmFwcCAmJiAhIWNocm9tZS5hcHAucnVudGltZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzSU9TKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiAoYXdhaXQgZ2V0UGxhdGZvcm1OYW1lKCkpLnRvTG93ZXJDYXNlKCkgPT09IFwiaW9zXCI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpc0FuZHJvaWQoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIChhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKSkudG9Mb3dlckNhc2UoKSA9PT0gXCJhbmRyb2lkXCI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpc0Nocm9tZU9TKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiAoYXdhaXQgZ2V0UGxhdGZvcm1OYW1lKCkpLnRvTG93ZXJDYXNlKCkgPT09IFwiY2hyb21lb3NcIjtcbn1cblxuLy8qIENoZWNrcyBpZiB0aGUgY3VycmVudCBlbnZpcm9ubWVudCBzdXBwb3J0cyB0b3VjaCBldmVudHNcbmV4cG9ydCBmdW5jdGlvbiBpc1RvdWNoKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiVG91Y2hFdmVudFwiKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG4vLyogU2V0cyB0aGUgY2xpcGJvYXJkIHRleHQgdG8gYSBnaXZlbiBzdHJpbmdcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRDbGlwYm9hcmQodGV4dDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gSWYgY29yZG92YSBjbGlwYm9hcmQgcGx1Z2luIGlzIGF2YWlsYWJsZSwgdXNlIHRoYXQgb25lLiBPdGhlcndpc2UgdXNlIHRoZSBleGVjQ29tbWFuZCBpbXBsZW1lbmF0aW9uXG4gICAgaWYgKGlzQ29yZG92YSgpKSB7XG4gICAgICAgIGF3YWl0IGNvcmRvdmFSZWFkeTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvcmRvdmEucGx1Z2lucy5jbGlwYm9hcmQuY29weSh0ZXh0LCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICBlbGVjdHJvbi5jbGlwYm9hcmQud3JpdGVUZXh0KHRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRvbVNldENsaXBib2FyZCh0ZXh0KTtcbiAgICB9XG59XG5cbi8vKiBSZXRyaWV2ZXMgdGhlIGNsaXBib2FyZCB0ZXh0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Q2xpcGJvYXJkKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgLy8gSWYgY29yZG92YSBjbGlwYm9hcmQgcGx1Z2luIGlzIGF2YWlsYWJsZSwgdXNlIHRoYXQgb25lLiBPdGhlcndpc2UgdXNlIHRoZSBleGVjQ29tbWFuZCBpbXBsZW1lbmF0aW9uXG4gICAgaWYgKGlzQ29yZG92YSgpKSB7XG4gICAgICAgIGF3YWl0IGNvcmRvdmFSZWFkeTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29yZG92YS5wbHVnaW5zLmNsaXBib2FyZC5wYXN0ZShyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICByZXR1cm4gZWxlY3Ryb24uY2xpcGJvYXJkLnJlYWRUZXh0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGRvbUdldENsaXBib2FyZCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFwcFN0b3JlTGluaygpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChhd2FpdCBpc0lPUygpKSB7XG4gICAgICAgIHJldHVybiBcImh0dHBzOi8vaXR1bmVzLmFwcGxlLmNvbS9hcHAvaWQ4NzE3MTAxMzlcIjtcbiAgICB9IGVsc2UgaWYgKGF3YWl0IGlzQW5kcm9pZCgpKSB7XG4gICAgICAgIHJldHVybiBcImh0dHBzOi8vcGxheS5nb29nbGUuY29tL3N0b3JlL2FwcHMvZGV0YWlscz9pZD1jb20ubWFrbGVzb2Z0LnBhZGxvY2tcIjtcbiAgICB9IGVsc2UgaWYgKGF3YWl0IGlzQ2hyb21lQXBwKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9jaHJvbWUuZ29vZ2xlLmNvbS93ZWJzdG9yZS9kZXRhaWwvcGFkbG9jay9ucGtvZWZqZmNqYmtub2VhZGZrYmNkcGJhcGFhbWNpZlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBcImh0dHBzOi8vcGFkbG9jay5pb1wiO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFJldmlld0xpbmsocmF0aW5nOm51bWJlcik6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKGF3YWl0IGlzSU9TKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9pdHVuZXMuYXBwbGUuY29tL2FwcC9pZDg3MTcxMDEzOT9hY3Rpb249d3JpdGUtcmV2aWV3XCI7XG4gICAgfSBlbHNlIGlmIChhd2FpdCBpc0FuZHJvaWQoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL3BsYXkuZ29vZ2xlLmNvbS9zdG9yZS9hcHBzL2RldGFpbHM/aWQ9Y29tLm1ha2xlc29mdC5wYWRsb2NrXCI7XG4gICAgfSBlbHNlIGlmIChhd2FpdCBpc0Nocm9tZUFwcCgpKSB7XG4gICAgICAgIHJldHVybiBcImh0dHBzOi8vY2hyb21lLmdvb2dsZS5jb20vd2Vic3RvcmUvZGV0YWlsL3BhZGxvY2svbnBrb2VmamZjamJrbm9lYWRma2JjZHBiYXBhYW1jaWYvcmV2aWV3c1wiO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHZlcnNpb24gPSBhd2FpdCBnZXRBcHBWZXJzaW9uKCk7XG4gICAgICAgIGNvbnN0IHBsYXRmb3JtID0gYXdhaXQgZ2V0UGxhdGZvcm1OYW1lKCk7XG4gICAgICAgIHJldHVybiBgaHR0cHM6Ly9wYWRsb2NrLmlvL2ZlZWRiYWNrLz9yPSR7cmF0aW5nfSZwPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHBsYXRmb3JtKX0mdj0ke3ZlcnNpb259YDtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNOb2RlKCk6IEJvb2xlYW4ge1xuICAgIHJldHVybiAhIW5vZGVSZXF1aXJlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFbGVjdHJvbigpOiBCb29sZWFuIHtcbiAgICByZXR1cm4gISFlbGVjdHJvbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFwcFZlcnNpb24oKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIHJldHVybiBlbGVjdHJvbi5yZW1vdGUuYXBwLmdldFZlcnNpb24oKTtcbiAgICB9IGVsc2UgaWYgKGlzQ29yZG92YSgpKSB7XG4gICAgICAgIGF3YWl0IGNvcmRvdmFSZWFkeTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29yZG92YS5nZXRBcHBWZXJzaW9uLmdldFZlcnNpb25OdW1iZXIocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChpc0Nocm9tZUFwcCgpKSB7XG4gICAgICAgIHJldHVybiBjaHJvbWUucnVudGltZS5nZXRNYW5pZmVzdCgpLnZlcnNpb247XG4gICAgfVxuXG4gICAgcmV0dXJuIFwiXCI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQbGF0Zm9ybU5hbWUoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIGNvbnN0IHBsYXRmb3JtID0gbm9kZVJlcXVpcmUoXCJvc1wiKS5wbGF0Zm9ybSgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGFyd2luOiBcIk1hY09TXCIsXG4gICAgICAgICAgICB3aW4zMjogXCJXaW5kb3dzXCIsXG4gICAgICAgICAgICBsaW51eDogXCJMaW51eFwiXG4gICAgICAgIH1bcGxhdGZvcm1dIHx8IHBsYXRmb3JtO1xuICAgIH0gZWxzZSBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gZGV2aWNlLnBsYXRmb3JtO1xuICAgIH0gZWxzZSBpZiAoaXNDaHJvbWVBcHAoKSkge1xuICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgbmV3IFByb21pc2U8e29zOiBzdHJpbmd9PigocikgPT4gY2hyb21lLnJ1bnRpbWUuZ2V0UGxhdGZvcm1JbmZvKHIpKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNyb3M6IFwiQ2hyb21lT1NcIixcbiAgICAgICAgICAgIHdpbjogXCJXaW5kb3dzIChDaHJvbWUpXCIsXG4gICAgICAgICAgICBsaW51eDogXCJMaW51eCAoQ2hyb21lKVwiLFxuICAgICAgICAgICAgYW5kcm9pZDogXCJBbmRyb2lkIChDaHJvbWUpXCIsXG4gICAgICAgICAgICBtYWM6IFwiTWFjT1MgKENocm9tZSlcIixcbiAgICAgICAgICAgIG9wZW5ic2Q6IFwiT3BlbkJTRCAoQ2hyb21lKVwiXG4gICAgICAgIH1baW5mby5vc10gfHwgaW5mby5vcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZXNrdG9wU2V0dGluZ3MoKTogYW55IHtcbiAgICByZXR1cm4gaXNFbGVjdHJvbigpID8gZWxlY3Ryb24ucmVtb3RlLmdldEdsb2JhbChcInNldHRpbmdzXCIpIDogbnVsbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERldmljZVVVSUQoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gZGV2aWNlLnV1aWQ7XG4gICAgfSBlbHNlIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgcmV0dXJuIGdldERlc2t0b3BTZXR0aW5ncygpLmdldChcInV1aWRcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0T1NWZXJzaW9uKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKGlzQ29yZG92YSgpKSB7XG4gICAgICAgIGF3YWl0IGNvcmRvdmFSZWFkeTtcbiAgICAgICAgcmV0dXJuIGRldmljZS52ZXJzaW9uO1xuICAgIH0gZWxzZSBpZiAoaGFzTm9kZSgpKSB7XG4gICAgICAgIHJldHVybiBub2RlUmVxdWlyZShcIm9zXCIpLnJlbGVhc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0ZvclVwZGF0ZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICBlbGVjdHJvbi5pcGNSZW5kZXJlci5zZW5kKFwiY2hlY2stdXBkYXRlc1wiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB3aW5kb3cub3Blbihhd2FpdCBnZXRBcHBTdG9yZUxpbmsoKSwgXCJfc3lzdGVtXCIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNoYW5nZURCUGF0aCgpIHtcbiAgICBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIGVsZWN0cm9uLmlwY1JlbmRlcmVyLnNlbmQoXCJjaGFuZ2UtZGItcGF0aFwiKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2NhbGUoKTogc3RyaW5nIHtcbiAgICAvLyBUT0RPOiBJcyB0aGVyZSBhIG1vcmUgcmVsaWFibGUgd2F5IHRvIGdldCB0aGUgc3lzdGVtIGxvY2FsZSxcbiAgICAvLyBlLmcuIHRocm91Z2ggYGVsZWN0cm9uLnJlbW90ZS5hcHAuZ2V0TG9jYWxlKClgP1xuICAgIHJldHVybiBuYXZpZ2F0b3IubGFuZ3VhZ2UgfHwgXCJlblwiO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERldmljZUluZm8ge1xuICAgIHBsYXRmb3JtOiBzdHJpbmcsXG4gICAgb3NWZXJzaW9uOiBzdHJpbmcsXG4gICAgdXVpZDogc3RyaW5nLFxuICAgIGFwcFZlcnNpb246IHN0cmluZyxcbiAgICBtYW51ZmFjdHVyZXI/OiBzdHJpbmcsXG4gICAgbW9kZWw/OiBzdHJpbmcsXG4gICAgaG9zdE5hbWU/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERldmljZUluZm8oKTogUHJvbWlzZTxEZXZpY2VJbmZvPiB7XG4gICAgY29uc3QgaW5mbzogRGV2aWNlSW5mbyA9IHtcbiAgICAgICAgcGxhdGZvcm06IGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpLFxuICAgICAgICBvc1ZlcnNpb246IGF3YWl0IGdldE9TVmVyc2lvbigpLFxuICAgICAgICBhcHBWZXJzaW9uOiBhd2FpdCBnZXRBcHBWZXJzaW9uKCksXG4gICAgICAgIHV1aWQ6IGF3YWl0IGdldERldmljZVVVSUQoKVxuICAgIH07XG5cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICBpbmZvLm1vZGVsID0gZGV2aWNlLm1vZGVsO1xuICAgICAgICBpbmZvLm1hbnVmYWN0dXJlciA9IGRldmljZS5tYW51ZmFjdHVyZXI7XG4gICAgfVxuXG4gICAgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICBpbmZvLmhvc3ROYW1lID0gbm9kZVJlcXVpcmUoXCJvc1wiKS5ob3N0bmFtZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBpbmZvO1xufVxuIiwiLy8gUkZDNDEyMi1jb21wbGlhbnQgdXVpZCBnZW5lcmF0b3JcbmV4cG9ydCBmdW5jdGlvbiB1dWlkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFwieHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4XCIucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbihjKSB7XG4gICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSoxNnwwLCB2ID0gYyA9PSBcInhcIiA/IHIgOiAociYweDN8MHg4KTtcbiAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgY29uc3QgY2hhcnMgPSB7XG4gICAgbnVtYmVyczogXCIwMTIzNDU2Nzg5XCIsXG4gICAgbG93ZXI6IFwiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpcIixcbiAgICB1cHBlcjogXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWlwiLFxuICAgIG90aGVyOiBcIi8rKCklXFxcIj0mLSE6JyojPzssXy5AYH4kXlt7XX1cXFxcfDw+XCJcbn07XG5cbmV4cG9ydCBjb25zdCBjaGFyU2V0cyA9IHtcbiAgICBmdWxsOiBjaGFycy5udW1iZXJzICsgY2hhcnMudXBwZXIgKyBjaGFycy5sb3dlciArIGNoYXJzLm90aGVyLFxuICAgIGFscGhhbnVtOiBjaGFycy5udW1iZXJzICsgY2hhcnMudXBwZXIgKyBjaGFycy5sb3dlcixcbiAgICBhbHBoYTogY2hhcnMubG93ZXIgKyBjaGFycy51cHBlcixcbiAgICBudW06IGNoYXJzLm51bWJlcnMsXG4gICAgaGV4YTogY2hhcnMubnVtYmVycyArIFwiYWJjZGVmXCJcbn07XG5cbi8vKiBDcmVhdGVzIGEgcmFuZG9tIHN0cmluZyB3aXRoIGEgZ2l2ZW4gX2xlbmd0aF8gY29tcHJpc2VkIG9mIGdpdmVuIHNldCBvciBjaGFyYWN0ZXJzXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tU3RyaW5nKGxlbmd0aCA9IDMyLCBjaGFyU2V0ID0gY2hhclNldHMuZnVsbCkge1xuICAgIGxldCBybmQgPSBuZXcgVWludDhBcnJheSgxKTtcbiAgICBsZXQgc3RyID0gXCJcIjtcbiAgICB3aGlsZSAoc3RyLmxlbmd0aCA8IGxlbmd0aCkge1xuICAgICAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhybmQpO1xuICAgICAgICAvLyBQcmV2ZW50IG1vZHVsbyBiaWFzIGJ5IHJlamVjdGluZyB2YWx1ZXMgbGFyZ2VyIHRoYW4gdGhlIGhpZ2hlc3QgbXVsaXBsZSBvZiBgY2hhclNldC5sZW5ndGhgXG4gICAgICAgIGlmIChybmRbMF0gPiAyNTUgLSAyNTYgJSBjaGFyU2V0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGNoYXJTZXRbcm5kWzBdICUgY2hhclNldC5sZW5ndGhdO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2UoZm46ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55LCBkZWxheTogbnVtYmVyKSB7XG4gICAgbGV0IHRpbWVvdXQ6IG51bWJlcjtcblxuICAgIHJldHVybiBmdW5jdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBmbihhcmdzKSwgZGVsYXkpO1xuICAgIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YWl0KGR0OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgZHQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVMYW5ndWFnZShsb2NhbGU6IHN0cmluZywgc3VwcG9ydGVkTGFuZ3VhZ2VzOiB7IFtsYW5nOiBzdHJpbmddOiBhbnkgfSk6IHN0cmluZyB7XG4gICAgY29uc3QgbG9jYWxlUGFydHMgPSBsb2NhbGUudG9Mb3dlckNhc2UoKS5zcGxpdChcIi1cIik7XG5cbiAgICB3aGlsZSAobG9jYWxlUGFydHMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGwgPSBsb2NhbGVQYXJ0cy5qb2luKFwiLVwiKTtcbiAgICAgICAgaWYgKHN1cHBvcnRlZExhbmd1YWdlc1tsXSkge1xuICAgICAgICAgICAgcmV0dXJuIGw7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbGVQYXJ0cy5wb3AoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc3VwcG9ydGVkTGFuZ3VhZ2VzKVswXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5TWl4aW5zKGJhc2VDbGFzczogYW55LCAuLi5taXhpbnM6ICgoY2xzOiBhbnkpID0+IGFueSlbXSk6IGFueSB7XG4gICAgcmV0dXJuIG1peGlucy5yZWR1Y2UoKGNscywgbWl4aW4pID0+IG1peGluKGNscyksIGJhc2VDbGFzcyk7XG59XG4iXX0=
