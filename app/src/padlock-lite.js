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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvc3JjL2NvcmUvYWpheC50cyIsImFwcC9zcmMvY29yZS9tYWluLWxpdGUudHMiLCJhcHAvc3JjL2NvcmUvcGxhdGZvcm0udHMiLCJhcHAvc3JjL2NvcmUvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7SUFDSSxZQUNXLElBSVcsRUFDWCxPQUF1QjtRQUx2QixTQUFJLEdBQUosSUFBSSxDQUlPO1FBQ1gsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7SUFDL0IsQ0FBQztJQUFBLENBQUM7Q0FDUjtBQVRELDhCQVNDO0FBSUQsMEJBQTBCLEdBQW1CO0lBQ3pDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLEtBQUssR0FBRztZQUNKLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuRCxLQUFLLEdBQUc7WUFDSixNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMscUJBQXFCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckQsS0FBSyxHQUFHO1lBQ0osTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM5QyxLQUFLLEdBQUc7WUFDSixNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzlDO1lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQTtJQUNmLENBQUM7QUFDTCxDQUFDO0FBRUQsaUJBQXdCLE1BQWMsRUFBRSxHQUFXLEVBQUUsSUFBYSxFQUFFLE9BQTZCO0lBQzdGLElBQUksR0FBRyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7SUFFL0IsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFpQixDQUFDLE9BQU8sRUFBRSxNQUFNO1FBQy9D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O0FBRUQsY0FBcUIsRUFBVTtJQUMzQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEtBQUssVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ25FLENBQUM7QUFGRCxvQkFFQztBQUVELHlCQUFnQyxNQUFjLEVBQUUsa0JBQTJDO0lBQ3ZGLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFcEQsT0FBTyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDeEIsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNiLENBQUM7UUFFRCxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQWJELDBDQWFDO0FBRUQscUJBQTRCLFNBQWMsRUFBRSxHQUFHLE1BQTZCO0lBQ3hFLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDaEUsQ0FBQztBQUZELGtDQUVDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImV4cG9ydCBjbGFzcyBBamF4RXJyb3Ige1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwdWJsaWMgY29kZTpcbiAgICAgICAgICAgIFwiZmFpbGVkX2Nvbm5lY3Rpb25cIiB8XG4gICAgICAgICAgICBcInVuZXhwZWN0ZWRfcmVkaXJlY3RcIiB8XG4gICAgICAgICAgICBcImNsaWVudF9lcnJvclwiIHxcbiAgICAgICAgICAgIFwic2VydmVyX2Vycm9yXCIsXG4gICAgICAgIHB1YmxpYyByZXF1ZXN0OiBYTUxIdHRwUmVxdWVzdFxuICAgICkge307XG59XG5cbmV4cG9ydCB0eXBlIE1ldGhvZCA9IFwiR0VUXCIgfCBcIlBPU1RcIiB8IFwiUFVUXCIgfCBcIkRFTEVURVwiO1xuXG5mdW5jdGlvbiBlcnJvckZyb21SZXF1ZXN0KHJlcTogWE1MSHR0cFJlcXVlc3QpOiBBamF4RXJyb3IgfCBudWxsIHtcbiAgICBzd2l0Y2ggKHJlcS5zdGF0dXMudG9TdHJpbmcoKVswXSkge1xuICAgIGNhc2UgXCIwXCI6XG4gICAgICAgIHJldHVybiBuZXcgQWpheEVycm9yKFwiZmFpbGVkX2Nvbm5lY3Rpb25cIiwgcmVxKTtcbiAgICBjYXNlIFwiM1wiOlxuICAgICAgICByZXR1cm4gbmV3IEFqYXhFcnJvcihcInVuZXhwZWN0ZWRfcmVkaXJlY3RcIiwgcmVxKTtcbiAgICBjYXNlIFwiNFwiOlxuICAgICAgICByZXR1cm4gbmV3IEFqYXhFcnJvcihcImNsaWVudF9lcnJvclwiLCByZXEpO1xuICAgIGNhc2UgXCI1XCI6XG4gICAgICAgIHJldHVybiBuZXcgQWpheEVycm9yKFwic2VydmVyX2Vycm9yXCIsIHJlcSk7XG4gICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXF1ZXN0KG1ldGhvZDogTWV0aG9kLCB1cmw6IHN0cmluZywgYm9keT86IHN0cmluZywgaGVhZGVycz86IE1hcDxzdHJpbmcsIHN0cmluZz4pOiBQcm9taXNlPFhNTEh0dHBSZXF1ZXN0PiB7XG4gICAgbGV0IHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFhNTEh0dHBSZXF1ZXN0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnIgPSBlcnJvckZyb21SZXF1ZXN0KHJlcSk7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlcS5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChoZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiByZXEuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXEuc2VuZChib2R5KTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICByZWplY3QobmV3IEFqYXhFcnJvcihcImZhaWxlZF9jb25uZWN0aW9uXCIsIHJlcSkpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4iLCJpbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuL3V0aWxcIjtcbmltcG9ydCAqIGFzIHBsYXRmb3JtIGZyb20gXCIuL3BsYXRmb3JtXCI7XG5pbXBvcnQgKiBhcyBhamF4IGZyb20gXCIuL2FqYXhcIjtcblxuZXhwb3J0IHtcbiAgICB1dGlsLFxuICAgIGFqYXgsXG4gICAgcGxhdGZvcm1cbn1cbiIsImRlY2xhcmUgdmFyIGNvcmRvdmE6IGFueSB8IHVuZGVmaW5lZDtcbmRlY2xhcmUgdmFyIGNocm9tZTogYW55IHwgdW5kZWZpbmVkO1xuZGVjbGFyZSB2YXIgZGV2aWNlOiBhbnkgfCB1bmRlZmluZWQ7XG5cbmNvbnN0IG5vZGVSZXF1aXJlID0gd2luZG93LnJlcXVpcmU7XG5jb25zdCBlbGVjdHJvbiA9IG5vZGVSZXF1aXJlICYmIG5vZGVSZXF1aXJlKFwiZWxlY3Ryb25cIik7XG5jb25zdCBjb3Jkb3ZhUmVhZHkgPSBuZXcgUHJvbWlzZTx2b2lkPigocikgPT4gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImRldmljZXJlYWR5XCIsICgpID0+IHIoKSkpO1xuXG4vLyBUZXh0YXJlYSB1c2VkIGZvciBjb3B5aW5nL3Bhc3RpbmcgdXNpbmcgdGhlIGRvbVxubGV0IGNsaXBib2FyZFRleHRBcmVhOiBIVE1MVGV4dEFyZWFFbGVtZW50O1xuXG4vLyBTZXQgY2xpcGJvYXJkIHRleHQgdXNpbmcgYGRvY3VtZW50LmV4ZWNDb21tYW5kKFwiY3V0XCIpYC5cbi8vIE5PVEU6IFRoaXMgb25seSB3b3JrcyBpbiBjZXJ0YWluIGVudmlyb25tZW50cyBsaWtlIEdvb2dsZSBDaHJvbWUgYXBwcyB3aXRoIHRoZSBhcHByb3ByaWF0ZSBwZXJtaXNzaW9ucyBzZXRcbmZ1bmN0aW9uIGRvbVNldENsaXBib2FyZCh0ZXh0OiBzdHJpbmcpIHtcbiAgICAvLyBjb3B5aW5nIGFuIGVtcHR5IHN0cmluZyBkb2VzIG5vdCB3b3JrIHdpdGggdGhpcyBtZXRob2QsIHNvIGNvcHkgYSBzaW5nbGUgc3BhY2UgaW5zdGVhZC5cbiAgICBpZiAodGV4dCA9PT0gXCJcIikge1xuICAgICAgICB0ZXh0ID0gXCIgXCI7XG4gICAgfVxuICAgIGNsaXBib2FyZFRleHRBcmVhID0gY2xpcGJvYXJkVGV4dEFyZWEgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuICAgIGNsaXBib2FyZFRleHRBcmVhLnZhbHVlID0gdGV4dDtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNsaXBib2FyZFRleHRBcmVhKTtcbiAgICBjbGlwYm9hcmRUZXh0QXJlYS5zZWxlY3QoKTtcbiAgICBkb2N1bWVudC5leGVjQ29tbWFuZChcImN1dFwiKTtcbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGNsaXBib2FyZFRleHRBcmVhKTtcbn1cblxuLy8gR2V0IGNsaXBib2FyZCB0ZXh0IHVzaW5nIGBkb2N1bWVudC5leGVjQ29tbWFuZChcInBhc3RlXCIpYFxuLy8gTk9URTogVGhpcyBvbmx5IHdvcmtzIGluIGNlcnRhaW4gZW52aXJvbm1lbnRzIGxpa2UgR29vZ2xlIENocm9tZSBhcHBzIHdpdGggdGhlIGFwcHJvcHJpYXRlIHBlcm1pc3Npb25zIHNldFxuZnVuY3Rpb24gZG9tR2V0Q2xpcGJvYXJkKCk6IHN0cmluZyB7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEgPSBjbGlwYm9hcmRUZXh0QXJlYSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjbGlwYm9hcmRUZXh0QXJlYSk7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEudmFsdWUgPSBcIlwiO1xuICAgIGNsaXBib2FyZFRleHRBcmVhLnNlbGVjdCgpO1xuICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKFwicGFzdGVcIik7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChjbGlwYm9hcmRUZXh0QXJlYSk7XG4gICAgcmV0dXJuIGNsaXBib2FyZFRleHRBcmVhLnZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNDb3Jkb3ZhKCk6IEJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgY29yZG92YSAhPT0gXCJ1bmRlZmluZWRcIjtcbn1cblxuLy8qIENoZWNrcyBpZiB0aGUgYXBwIGlzIHJ1bm5pbmcgYXMgYSBwYWNrYWdlZCBDaHJvbWUgYXBwXG5leHBvcnQgZnVuY3Rpb24gaXNDaHJvbWVBcHAoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICh0eXBlb2YgY2hyb21lICE9PSBcInVuZGVmaW5lZFwiKSAmJiBjaHJvbWUuYXBwICYmICEhY2hyb21lLmFwcC5ydW50aW1lO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNJT1MoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIChhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKSkudG9Mb3dlckNhc2UoKSA9PT0gXCJpb3NcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzQW5kcm9pZCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gKGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpKS50b0xvd2VyQ2FzZSgpID09PSBcImFuZHJvaWRcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzQ2hyb21lT1MoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIChhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKSkudG9Mb3dlckNhc2UoKSA9PT0gXCJjaHJvbWVvc1wiO1xufVxuXG4vLyogQ2hlY2tzIGlmIHRoZSBjdXJyZW50IGVudmlyb25tZW50IHN1cHBvcnRzIHRvdWNoIGV2ZW50c1xuZXhwb3J0IGZ1bmN0aW9uIGlzVG91Y2goKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJUb3VjaEV2ZW50XCIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbi8vKiBTZXRzIHRoZSBjbGlwYm9hcmQgdGV4dCB0byBhIGdpdmVuIHN0cmluZ1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldENsaXBib2FyZCh0ZXh0OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBJZiBjb3Jkb3ZhIGNsaXBib2FyZCBwbHVnaW4gaXMgYXZhaWxhYmxlLCB1c2UgdGhhdCBvbmUuIE90aGVyd2lzZSB1c2UgdGhlIGV4ZWNDb21tYW5kIGltcGxlbWVuYXRpb25cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29yZG92YS5wbHVnaW5zLmNsaXBib2FyZC5jb3B5KHRleHQsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIGVsZWN0cm9uLmNsaXBib2FyZC53cml0ZVRleHQodGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZG9tU2V0Q2xpcGJvYXJkKHRleHQpO1xuICAgIH1cbn1cblxuLy8qIFJldHJpZXZlcyB0aGUgY2xpcGJvYXJkIHRleHRcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDbGlwYm9hcmQoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAvLyBJZiBjb3Jkb3ZhIGNsaXBib2FyZCBwbHVnaW4gaXMgYXZhaWxhYmxlLCB1c2UgdGhhdCBvbmUuIE90aGVyd2lzZSB1c2UgdGhlIGV4ZWNDb21tYW5kIGltcGxlbWVuYXRpb25cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb3Jkb3ZhLnBsdWdpbnMuY2xpcGJvYXJkLnBhc3RlKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIHJldHVybiBlbGVjdHJvbi5jbGlwYm9hcmQucmVhZFRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZG9tR2V0Q2xpcGJvYXJkKCk7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXBwU3RvcmVMaW5rKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKGF3YWl0IGlzSU9TKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9pdHVuZXMuYXBwbGUuY29tL2FwcC9pZDg3MTcxMDEzOVwiO1xuICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNBbmRyb2lkKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9wbGF5Lmdvb2dsZS5jb20vc3RvcmUvYXBwcy9kZXRhaWxzP2lkPWNvbS5tYWtsZXNvZnQucGFkbG9ja1wiO1xuICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNDaHJvbWVBcHAoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL2Nocm9tZS5nb29nbGUuY29tL3dlYnN0b3JlL2RldGFpbC9wYWRsb2NrL25wa29lZmpmY2pia25vZWFkZmtiY2RwYmFwYWFtY2lmXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9wYWRsb2NrLmlvXCI7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UmV2aWV3TGluayhyYXRpbmc6bnVtYmVyKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoYXdhaXQgaXNJT1MoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL2l0dW5lcy5hcHBsZS5jb20vYXBwL2lkODcxNzEwMTM5P2FjdGlvbj13cml0ZS1yZXZpZXdcIjtcbiAgICB9IGVsc2UgaWYgKGF3YWl0IGlzQW5kcm9pZCgpKSB7XG4gICAgICAgIHJldHVybiBcImh0dHBzOi8vcGxheS5nb29nbGUuY29tL3N0b3JlL2FwcHMvZGV0YWlscz9pZD1jb20ubWFrbGVzb2Z0LnBhZGxvY2tcIjtcbiAgICB9IGVsc2UgaWYgKGF3YWl0IGlzQ2hyb21lQXBwKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9jaHJvbWUuZ29vZ2xlLmNvbS93ZWJzdG9yZS9kZXRhaWwvcGFkbG9jay9ucGtvZWZqZmNqYmtub2VhZGZrYmNkcGJhcGFhbWNpZi9yZXZpZXdzXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgdmVyc2lvbiA9IGF3YWl0IGdldEFwcFZlcnNpb24oKTtcbiAgICAgICAgY29uc3QgcGxhdGZvcm0gPSBhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKTtcbiAgICAgICAgcmV0dXJuIGBodHRwczovL3BhZGxvY2suaW8vZmVlZGJhY2svP3I9JHtyYXRpbmd9JnA9JHtlbmNvZGVVUklDb21wb25lbnQocGxhdGZvcm0pfSZ2PSR7dmVyc2lvbn1gO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc05vZGUoKTogQm9vbGVhbiB7XG4gICAgcmV0dXJuICEhbm9kZVJlcXVpcmU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VsZWN0cm9uKCk6IEJvb2xlYW4ge1xuICAgIHJldHVybiAhIWVsZWN0cm9uO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXBwVmVyc2lvbigpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgcmV0dXJuIGVsZWN0cm9uLnJlbW90ZS5hcHAuZ2V0VmVyc2lvbigpO1xuICAgIH0gZWxzZSBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb3Jkb3ZhLmdldEFwcFZlcnNpb24uZ2V0VmVyc2lvbk51bWJlcihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGlzQ2hyb21lQXBwKCkpIHtcbiAgICAgICAgcmV0dXJuIGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KCkudmVyc2lvbjtcbiAgICB9XG5cbiAgICByZXR1cm4gXCJcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFBsYXRmb3JtTmFtZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgY29uc3QgcGxhdGZvcm0gPSBub2RlUmVxdWlyZShcIm9zXCIpLnBsYXRmb3JtKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkYXJ3aW46IFwiTWFjT1NcIixcbiAgICAgICAgICAgIHdpbjMyOiBcIldpbmRvd3NcIixcbiAgICAgICAgICAgIGxpbnV4OiBcIkxpbnV4XCJcbiAgICAgICAgfVtwbGF0Zm9ybV0gfHwgcGxhdGZvcm07XG4gICAgfSBlbHNlIGlmIChpc0NvcmRvdmEoKSkge1xuICAgICAgICBhd2FpdCBjb3Jkb3ZhUmVhZHk7XG4gICAgICAgIHJldHVybiBkZXZpY2UucGxhdGZvcm07XG4gICAgfSBlbHNlIGlmIChpc0Nocm9tZUFwcCgpKSB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCBuZXcgUHJvbWlzZTx7b3M6IHN0cmluZ30+KChyKSA9PiBjaHJvbWUucnVudGltZS5nZXRQbGF0Zm9ybUluZm8ocikpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3JvczogXCJDaHJvbWVPU1wiLFxuICAgICAgICAgICAgd2luOiBcIldpbmRvd3MgKENocm9tZSlcIixcbiAgICAgICAgICAgIGxpbnV4OiBcIkxpbnV4IChDaHJvbWUpXCIsXG4gICAgICAgICAgICBhbmRyb2lkOiBcIkFuZHJvaWQgKENocm9tZSlcIixcbiAgICAgICAgICAgIG1hYzogXCJNYWNPUyAoQ2hyb21lKVwiLFxuICAgICAgICAgICAgb3BlbmJzZDogXCJPcGVuQlNEIChDaHJvbWUpXCJcbiAgICAgICAgfVtpbmZvLm9zXSB8fCBpbmZvLm9zO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlc2t0b3BTZXR0aW5ncygpOiBhbnkge1xuICAgIHJldHVybiBpc0VsZWN0cm9uKCkgPyBlbGVjdHJvbi5yZW1vdGUuZ2V0R2xvYmFsKFwic2V0dGluZ3NcIikgOiBudWxsO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RGV2aWNlVVVJRCgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0NvcmRvdmEoKSkge1xuICAgICAgICBhd2FpdCBjb3Jkb3ZhUmVhZHk7XG4gICAgICAgIHJldHVybiBkZXZpY2UudXVpZDtcbiAgICB9IGVsc2UgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICByZXR1cm4gZ2V0RGVza3RvcFNldHRpbmdzKCkuZ2V0KFwidXVpZFwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRPU1ZlcnNpb24oKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gZGV2aWNlLnZlcnNpb247XG4gICAgfSBlbHNlIGlmIChoYXNOb2RlKCkpIHtcbiAgICAgICAgcmV0dXJuIG5vZGVSZXF1aXJlKFwib3NcIikucmVsZWFzZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrRm9yVXBkYXRlcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIGVsZWN0cm9uLmlwY1JlbmRlcmVyLnNlbmQoXCJjaGVjay11cGRhdGVzXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHdpbmRvdy5vcGVuKGF3YWl0IGdldEFwcFN0b3JlTGluaygpLCBcIl9zeXN0ZW1cIik7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9jYWxlKCk6IHN0cmluZyB7XG4gICAgLy8gVE9ETzogSXMgdGhlcmUgYSBtb3JlIHJlbGlhYmxlIHdheSB0byBnZXQgdGhlIHN5c3RlbSBsb2NhbGUsXG4gICAgLy8gZS5nLiB0aHJvdWdoIGBlbGVjdHJvbi5yZW1vdGUuYXBwLmdldExvY2FsZSgpYD9cbiAgICByZXR1cm4gbmF2aWdhdG9yLmxhbmd1YWdlIHx8IFwiZW5cIjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZXZpY2VJbmZvIHtcbiAgICBwbGF0Zm9ybTogc3RyaW5nLFxuICAgIG9zVmVyc2lvbjogc3RyaW5nLFxuICAgIHV1aWQ6IHN0cmluZyxcbiAgICBhcHBWZXJzaW9uOiBzdHJpbmcsXG4gICAgbWFudWZhY3R1cmVyPzogc3RyaW5nLFxuICAgIG1vZGVsPzogc3RyaW5nLFxuICAgIGhvc3ROYW1lPzogc3RyaW5nXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXREZXZpY2VJbmZvKCk6IFByb21pc2U8RGV2aWNlSW5mbz4ge1xuICAgIGNvbnN0IGluZm86IERldmljZUluZm8gPSB7XG4gICAgICAgIHBsYXRmb3JtOiBhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKSxcbiAgICAgICAgb3NWZXJzaW9uOiBhd2FpdCBnZXRPU1ZlcnNpb24oKSxcbiAgICAgICAgYXBwVmVyc2lvbjogYXdhaXQgZ2V0QXBwVmVyc2lvbigpLFxuICAgICAgICB1dWlkOiBhd2FpdCBnZXREZXZpY2VVVUlEKClcbiAgICB9O1xuXG4gICAgaWYgKGlzQ29yZG92YSgpKSB7XG4gICAgICAgIGF3YWl0IGNvcmRvdmFSZWFkeTtcbiAgICAgICAgaW5mby5tb2RlbCA9IGRldmljZS5tb2RlbDtcbiAgICAgICAgaW5mby5tYW51ZmFjdHVyZXIgPSBkZXZpY2UubWFudWZhY3R1cmVyO1xuICAgIH1cblxuICAgIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgaW5mby5ob3N0TmFtZSA9IG5vZGVSZXF1aXJlKFwib3NcIikuaG9zdG5hbWUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5mbztcbn1cbiIsIi8vIFJGQzQxMjItY29tcGxpYW50IHV1aWQgZ2VuZXJhdG9yXG5leHBvcnQgZnVuY3Rpb24gdXVpZCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBcInh4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eFwiLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24oYykge1xuICAgICAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkqMTZ8MCwgdiA9IGMgPT0gXCJ4XCIgPyByIDogKHImMHgzfDB4OCk7XG4gICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGNvbnN0IGNoYXJzID0ge1xuICAgIG51bWJlcnM6IFwiMDEyMzQ1Njc4OVwiLFxuICAgIGxvd2VyOiBcImFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6XCIsXG4gICAgdXBwZXI6IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpcIixcbiAgICBvdGhlcjogXCIvKygpJVxcXCI9Ji0hOicqIz87LF8uQGB+JF5be119XFxcXHw8PlwiXG59O1xuXG5leHBvcnQgY29uc3QgY2hhclNldHMgPSB7XG4gICAgZnVsbDogY2hhcnMubnVtYmVycyArIGNoYXJzLnVwcGVyICsgY2hhcnMubG93ZXIgKyBjaGFycy5vdGhlcixcbiAgICBhbHBoYW51bTogY2hhcnMubnVtYmVycyArIGNoYXJzLnVwcGVyICsgY2hhcnMubG93ZXIsXG4gICAgYWxwaGE6IGNoYXJzLmxvd2VyICsgY2hhcnMudXBwZXIsXG4gICAgbnVtOiBjaGFycy5udW1iZXJzLFxuICAgIGhleGE6IGNoYXJzLm51bWJlcnMgKyBcImFiY2RlZlwiXG59O1xuXG4vLyogQ3JlYXRlcyBhIHJhbmRvbSBzdHJpbmcgd2l0aCBhIGdpdmVuIF9sZW5ndGhfIGNvbXByaXNlZCBvZiBnaXZlbiBzZXQgb3IgY2hhcmFjdGVyc1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbVN0cmluZyhsZW5ndGggPSAzMiwgY2hhclNldCA9IGNoYXJTZXRzLmZ1bGwpIHtcbiAgICBsZXQgcm5kID0gbmV3IFVpbnQ4QXJyYXkoMSk7XG4gICAgbGV0IHN0ciA9IFwiXCI7XG4gICAgd2hpbGUgKHN0ci5sZW5ndGggPCBsZW5ndGgpIHtcbiAgICAgICAgd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMocm5kKTtcbiAgICAgICAgLy8gUHJldmVudCBtb2R1bG8gYmlhcyBieSByZWplY3RpbmcgdmFsdWVzIGxhcmdlciB0aGFuIHRoZSBoaWdoZXN0IG11bGlwbGUgb2YgYGNoYXJTZXQubGVuZ3RoYFxuICAgICAgICBpZiAocm5kWzBdID4gMjU1IC0gMjU2ICUgY2hhclNldC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHN0ciArPSBjaGFyU2V0W3JuZFswXSAlIGNoYXJTZXQubGVuZ3RoXTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlKGZuOiAoLi4uYXJnczogYW55W10pID0+IGFueSwgZGVsYXk6IG51bWJlcikge1xuICAgIGxldCB0aW1lb3V0OiBudW1iZXI7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oLi4uYXJnczogYW55W10pIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4gZm4oYXJncyksIGRlbGF5KTtcbiAgICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2FpdChkdDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGR0KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTGFuZ3VhZ2UobG9jYWxlOiBzdHJpbmcsIHN1cHBvcnRlZExhbmd1YWdlczogeyBbbGFuZzogc3RyaW5nXTogYW55IH0pOiBzdHJpbmcge1xuICAgIGNvbnN0IGxvY2FsZVBhcnRzID0gbG9jYWxlLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCItXCIpO1xuXG4gICAgd2hpbGUgKGxvY2FsZVBhcnRzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBsID0gbG9jYWxlUGFydHMuam9pbihcIi1cIik7XG4gICAgICAgIGlmIChzdXBwb3J0ZWRMYW5ndWFnZXNbbF0pIHtcbiAgICAgICAgICAgIHJldHVybiBsO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9jYWxlUGFydHMucG9wKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHN1cHBvcnRlZExhbmd1YWdlcylbMF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseU1peGlucyhiYXNlQ2xhc3M6IGFueSwgLi4ubWl4aW5zOiAoKGNsczogYW55KSA9PiBhbnkpW10pOiBhbnkge1xuICAgIHJldHVybiBtaXhpbnMucmVkdWNlKChjbHMsIG1peGluKSA9PiBtaXhpbihjbHMpLCBiYXNlQ2xhc3MpO1xufVxuIl19
