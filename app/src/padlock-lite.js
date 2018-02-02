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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvc3JjL2NvcmUvYWpheC50cyIsImFwcC9zcmMvY29yZS9tYWluLWxpdGUudHMiLCJhcHAvc3JjL2NvcmUvcGxhdGZvcm0udHMiLCJhcHAvc3JjL2NvcmUvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7SUFDSSxZQUNXLElBSVcsRUFDWCxPQUF1QjtRQUx2QixTQUFJLEdBQUosSUFBSSxDQUlPO1FBQ1gsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7SUFDL0IsQ0FBQztJQUFBLENBQUM7Q0FDUjtBQVRELDhCQVNDO0FBSUQsMEJBQTBCLEdBQW1CO0lBQ3pDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLEtBQUssR0FBRztZQUNKLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuRCxLQUFLLEdBQUc7WUFDSixNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMscUJBQXFCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckQsS0FBSyxHQUFHO1lBQ0osTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM5QyxLQUFLLEdBQUc7WUFDSixNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzlDO1lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQTtJQUNmLENBQUM7QUFDTCxDQUFDO0FBRUQsaUJBQXdCLE1BQWMsRUFBRSxHQUFXLEVBQUUsSUFBYSxFQUFFLE9BQTZCO0lBQzdGLElBQUksR0FBRyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7SUFFL0IsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFpQixDQUFDLE9BQU8sRUFBRSxNQUFNO1FBQy9D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LENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDYixDQUFDO1FBRUQsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFiRCwwQ0FhQztBQUVELHFCQUE0QixTQUFjLEVBQUUsR0FBRyxNQUE2QjtJQUN4RSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLEtBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ2hFLENBQUM7QUFGRCxrQ0FFQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJleHBvcnQgY2xhc3MgQWpheEVycm9yIHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHVibGljIGNvZGU6XG4gICAgICAgICAgICBcImZhaWxlZF9jb25uZWN0aW9uXCIgfFxuICAgICAgICAgICAgXCJ1bmV4cGVjdGVkX3JlZGlyZWN0XCIgfFxuICAgICAgICAgICAgXCJjbGllbnRfZXJyb3JcIiB8XG4gICAgICAgICAgICBcInNlcnZlcl9lcnJvclwiLFxuICAgICAgICBwdWJsaWMgcmVxdWVzdDogWE1MSHR0cFJlcXVlc3RcbiAgICApIHt9O1xufVxuXG5leHBvcnQgdHlwZSBNZXRob2QgPSBcIkdFVFwiIHwgXCJQT1NUXCIgfCBcIlBVVFwiIHwgXCJERUxFVEVcIjtcblxuZnVuY3Rpb24gZXJyb3JGcm9tUmVxdWVzdChyZXE6IFhNTEh0dHBSZXF1ZXN0KTogQWpheEVycm9yIHwgbnVsbCB7XG4gICAgc3dpdGNoIChyZXEuc3RhdHVzLnRvU3RyaW5nKClbMF0pIHtcbiAgICBjYXNlIFwiMFwiOlxuICAgICAgICByZXR1cm4gbmV3IEFqYXhFcnJvcihcImZhaWxlZF9jb25uZWN0aW9uXCIsIHJlcSk7XG4gICAgY2FzZSBcIjNcIjpcbiAgICAgICAgcmV0dXJuIG5ldyBBamF4RXJyb3IoXCJ1bmV4cGVjdGVkX3JlZGlyZWN0XCIsIHJlcSk7XG4gICAgY2FzZSBcIjRcIjpcbiAgICAgICAgcmV0dXJuIG5ldyBBamF4RXJyb3IoXCJjbGllbnRfZXJyb3JcIiwgcmVxKTtcbiAgICBjYXNlIFwiNVwiOlxuICAgICAgICByZXR1cm4gbmV3IEFqYXhFcnJvcihcInNlcnZlcl9lcnJvclwiLCByZXEpO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVxdWVzdChtZXRob2Q6IE1ldGhvZCwgdXJsOiBzdHJpbmcsIGJvZHk/OiBzdHJpbmcsIGhlYWRlcnM/OiBNYXA8c3RyaW5nLCBzdHJpbmc+KTogUHJvbWlzZTxYTUxIdHRwUmVxdWVzdD4ge1xuICAgIGxldCByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxYTUxIdHRwUmVxdWVzdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyID0gZXJyb3JGcm9tUmVxdWVzdChyZXEpO1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXEub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoaGVhZGVycykge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4gcmVxLnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVxLnNlbmQoYm9keSk7XG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBBamF4RXJyb3IoXCJmYWlsZWRfY29ubmVjdGlvblwiLCByZXEpKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuIiwiaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi91dGlsXCI7XG5pbXBvcnQgKiBhcyBwbGF0Zm9ybSBmcm9tIFwiLi9wbGF0Zm9ybVwiO1xuaW1wb3J0ICogYXMgYWpheCBmcm9tIFwiLi9hamF4XCI7XG5cbmV4cG9ydCB7XG4gICAgdXRpbCxcbiAgICBhamF4LFxuICAgIHBsYXRmb3JtXG59XG4iLCJkZWNsYXJlIHZhciBjb3Jkb3ZhOiBhbnkgfCB1bmRlZmluZWQ7XG5kZWNsYXJlIHZhciBjaHJvbWU6IGFueSB8IHVuZGVmaW5lZDtcbmRlY2xhcmUgdmFyIGRldmljZTogYW55IHwgdW5kZWZpbmVkO1xuXG5jb25zdCBub2RlUmVxdWlyZSA9IHdpbmRvdy5yZXF1aXJlO1xuY29uc3QgZWxlY3Ryb24gPSBub2RlUmVxdWlyZSAmJiBub2RlUmVxdWlyZShcImVsZWN0cm9uXCIpO1xuY29uc3QgY29yZG92YVJlYWR5ID0gbmV3IFByb21pc2U8dm9pZD4oKHIpID0+IGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJkZXZpY2VyZWFkeVwiLCAoKSA9PiByKCkpKTtcblxuLy8gVGV4dGFyZWEgdXNlZCBmb3IgY29weWluZy9wYXN0aW5nIHVzaW5nIHRoZSBkb21cbmxldCBjbGlwYm9hcmRUZXh0QXJlYTogSFRNTFRleHRBcmVhRWxlbWVudDtcblxuLy8gU2V0IGNsaXBib2FyZCB0ZXh0IHVzaW5nIGBkb2N1bWVudC5leGVjQ29tbWFuZChcImN1dFwiKWAuXG4vLyBOT1RFOiBUaGlzIG9ubHkgd29ya3MgaW4gY2VydGFpbiBlbnZpcm9ubWVudHMgbGlrZSBHb29nbGUgQ2hyb21lIGFwcHMgd2l0aCB0aGUgYXBwcm9wcmlhdGUgcGVybWlzc2lvbnMgc2V0XG5mdW5jdGlvbiBkb21TZXRDbGlwYm9hcmQodGV4dDogc3RyaW5nKSB7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEgPSBjbGlwYm9hcmRUZXh0QXJlYSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEudmFsdWUgPSB0ZXh0O1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY2xpcGJvYXJkVGV4dEFyZWEpO1xuICAgIGNsaXBib2FyZFRleHRBcmVhLnNlbGVjdCgpO1xuICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKFwiY3V0XCIpO1xuICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoY2xpcGJvYXJkVGV4dEFyZWEpO1xufVxuXG4vLyBHZXQgY2xpcGJvYXJkIHRleHQgdXNpbmcgYGRvY3VtZW50LmV4ZWNDb21tYW5kKFwicGFzdGVcIilgXG4vLyBOT1RFOiBUaGlzIG9ubHkgd29ya3MgaW4gY2VydGFpbiBlbnZpcm9ubWVudHMgbGlrZSBHb29nbGUgQ2hyb21lIGFwcHMgd2l0aCB0aGUgYXBwcm9wcmlhdGUgcGVybWlzc2lvbnMgc2V0XG5mdW5jdGlvbiBkb21HZXRDbGlwYm9hcmQoKTogc3RyaW5nIHtcbiAgICBjbGlwYm9hcmRUZXh0QXJlYSA9IGNsaXBib2FyZFRleHRBcmVhIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNsaXBib2FyZFRleHRBcmVhKTtcbiAgICBjbGlwYm9hcmRUZXh0QXJlYS52YWx1ZSA9IFwiXCI7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEuc2VsZWN0KCk7XG4gICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJwYXN0ZVwiKTtcbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGNsaXBib2FyZFRleHRBcmVhKTtcbiAgICByZXR1cm4gY2xpcGJvYXJkVGV4dEFyZWEudmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0NvcmRvdmEoKTogQm9vbGVhbiB7XG4gICAgcmV0dXJuIHR5cGVvZiBjb3Jkb3ZhICE9PSBcInVuZGVmaW5lZFwiO1xufVxuXG4vLyogQ2hlY2tzIGlmIHRoZSBhcHAgaXMgcnVubmluZyBhcyBhIHBhY2thZ2VkIENocm9tZSBhcHBcbmV4cG9ydCBmdW5jdGlvbiBpc0Nocm9tZUFwcCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIpICYmIGNocm9tZS5hcHAgJiYgISFjaHJvbWUuYXBwLnJ1bnRpbWU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpc0lPUygpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gKGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpKS50b0xvd2VyQ2FzZSgpID09PSBcImlvc1wiO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNBbmRyb2lkKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiAoYXdhaXQgZ2V0UGxhdGZvcm1OYW1lKCkpLnRvTG93ZXJDYXNlKCkgPT09IFwiYW5kcm9pZFwiO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNDaHJvbWVPUygpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gKGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpKS50b0xvd2VyQ2FzZSgpID09PSBcImNocm9tZW9zXCI7XG59XG5cbi8vKiBDaGVja3MgaWYgdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQgc3VwcG9ydHMgdG91Y2ggZXZlbnRzXG5leHBvcnQgZnVuY3Rpb24gaXNUb3VjaCgpIHtcbiAgICB0cnkge1xuICAgICAgICBkb2N1bWVudC5jcmVhdGVFdmVudChcIlRvdWNoRXZlbnRcIik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuLy8qIFNldHMgdGhlIGNsaXBib2FyZCB0ZXh0IHRvIGEgZ2l2ZW4gc3RyaW5nXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q2xpcGJvYXJkKHRleHQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIElmIGNvcmRvdmEgY2xpcGJvYXJkIHBsdWdpbiBpcyBhdmFpbGFibGUsIHVzZSB0aGF0IG9uZS4gT3RoZXJ3aXNlIHVzZSB0aGUgZXhlY0NvbW1hbmQgaW1wbGVtZW5hdGlvblxuICAgIGlmIChpc0NvcmRvdmEoKSkge1xuICAgICAgICBhd2FpdCBjb3Jkb3ZhUmVhZHk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb3Jkb3ZhLnBsdWdpbnMuY2xpcGJvYXJkLmNvcHkodGV4dCwgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZG9tU2V0Q2xpcGJvYXJkKHRleHQpO1xuICAgIH1cbn1cblxuLy8qIFJldHJpZXZlcyB0aGUgY2xpcGJvYXJkIHRleHRcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDbGlwYm9hcmQoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAvLyBJZiBjb3Jkb3ZhIGNsaXBib2FyZCBwbHVnaW4gaXMgYXZhaWxhYmxlLCB1c2UgdGhhdCBvbmUuIE90aGVyd2lzZSB1c2UgdGhlIGV4ZWNDb21tYW5kIGltcGxlbWVuYXRpb25cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb3Jkb3ZhLnBsdWdpbnMuY2xpcGJvYXJkLnBhc3RlKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBkb21HZXRDbGlwYm9hcmQoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBcHBTdG9yZUxpbmsoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoYXdhaXQgaXNJT1MoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL2l0dW5lcy5hcHBsZS5jb20vYXBwL2lkODcxNzEwMTM5XCI7XG4gICAgfSBlbHNlIGlmIChhd2FpdCBpc0FuZHJvaWQoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL3BsYXkuZ29vZ2xlLmNvbS9zdG9yZS9hcHBzL2RldGFpbHM/aWQ9Y29tLm1ha2xlc29mdC5wYWRsb2NrXCI7XG4gICAgfSBlbHNlIGlmIChhd2FpdCBpc0Nocm9tZUFwcCgpKSB7XG4gICAgICAgIHJldHVybiBcImh0dHBzOi8vY2hyb21lLmdvb2dsZS5jb20vd2Vic3RvcmUvZGV0YWlsL3BhZGxvY2svbnBrb2VmamZjamJrbm9lYWRma2JjZHBiYXBhYW1jaWZcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL3BhZGxvY2suaW9cIjtcbiAgICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSZXZpZXdMaW5rKHJhdGluZzpudW1iZXIpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChhd2FpdCBpc0lPUygpKSB7XG4gICAgICAgIHJldHVybiBcImh0dHBzOi8vaXR1bmVzLmFwcGxlLmNvbS9hcHAvaWQ4NzE3MTAxMzk/YWN0aW9uPXdyaXRlLXJldmlld1wiO1xuICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNBbmRyb2lkKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9wbGF5Lmdvb2dsZS5jb20vc3RvcmUvYXBwcy9kZXRhaWxzP2lkPWNvbS5tYWtsZXNvZnQucGFkbG9ja1wiO1xuICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNDaHJvbWVBcHAoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL2Nocm9tZS5nb29nbGUuY29tL3dlYnN0b3JlL2RldGFpbC9wYWRsb2NrL25wa29lZmpmY2pia25vZWFkZmtiY2RwYmFwYWFtY2lmL3Jldmlld3NcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB2ZXJzaW9uID0gYXdhaXQgZ2V0QXBwVmVyc2lvbigpO1xuICAgICAgICBjb25zdCBwbGF0Zm9ybSA9IGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpO1xuICAgICAgICByZXR1cm4gYGh0dHBzOi8vcGFkbG9jay5pby9mZWVkYmFjay8/cj0ke3JhdGluZ30mcD0ke2VuY29kZVVSSUNvbXBvbmVudChwbGF0Zm9ybSl9JnY9JHt2ZXJzaW9ufWA7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzTm9kZSgpOiBCb29sZWFuIHtcbiAgICByZXR1cm4gISFub2RlUmVxdWlyZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRWxlY3Ryb24oKTogQm9vbGVhbiB7XG4gICAgcmV0dXJuICEhZWxlY3Ryb247XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBcHBWZXJzaW9uKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICByZXR1cm4gZWxlY3Ryb24ucmVtb3RlLmFwcC5nZXRWZXJzaW9uKCk7XG4gICAgfSBlbHNlIGlmIChpc0NvcmRvdmEoKSkge1xuICAgICAgICBhd2FpdCBjb3Jkb3ZhUmVhZHk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvcmRvdmEuZ2V0QXBwVmVyc2lvbi5nZXRWZXJzaW9uTnVtYmVyKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoaXNDaHJvbWVBcHAoKSkge1xuICAgICAgICByZXR1cm4gY2hyb21lLnJ1bnRpbWUuZ2V0TWFuaWZlc3QoKS52ZXJzaW9uO1xuICAgIH1cblxuICAgIHJldHVybiBcIlwiO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UGxhdGZvcm1OYW1lKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICBjb25zdCBwbGF0Zm9ybSA9IG5vZGVSZXF1aXJlKFwib3NcIikucGxhdGZvcm0oKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRhcndpbjogXCJNYWNPU1wiLFxuICAgICAgICAgICAgd2luMzI6IFwiV2luZG93c1wiLFxuICAgICAgICAgICAgbGludXg6IFwiTGludXhcIlxuICAgICAgICB9W3BsYXRmb3JtXSB8fCBwbGF0Zm9ybTtcbiAgICB9IGVsc2UgaWYgKGlzQ29yZG92YSgpKSB7XG4gICAgICAgIGF3YWl0IGNvcmRvdmFSZWFkeTtcbiAgICAgICAgcmV0dXJuIGRldmljZS5wbGF0Zm9ybTtcbiAgICB9IGVsc2UgaWYgKGlzQ2hyb21lQXBwKCkpIHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IG5ldyBQcm9taXNlPHtvczogc3RyaW5nfT4oKHIpID0+IGNocm9tZS5ydW50aW1lLmdldFBsYXRmb3JtSW5mbyhyKSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjcm9zOiBcIkNocm9tZU9TXCIsXG4gICAgICAgICAgICB3aW46IFwiV2luZG93cyAoQ2hyb21lKVwiLFxuICAgICAgICAgICAgbGludXg6IFwiTGludXggKENocm9tZSlcIixcbiAgICAgICAgICAgIGFuZHJvaWQ6IFwiQW5kcm9pZCAoQ2hyb21lKVwiLFxuICAgICAgICAgICAgbWFjOiBcIk1hY09TIChDaHJvbWUpXCIsXG4gICAgICAgICAgICBvcGVuYnNkOiBcIk9wZW5CU0QgKENocm9tZSlcIlxuICAgICAgICB9W2luZm8ub3NdIHx8IGluZm8ub3M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVza3RvcFNldHRpbmdzKCk6IGFueSB7XG4gICAgcmV0dXJuIGlzRWxlY3Ryb24oKSA/IGVsZWN0cm9uLnJlbW90ZS5nZXRHbG9iYWwoXCJzZXR0aW5nc1wiKSA6IG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXREZXZpY2VVVUlEKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKGlzQ29yZG92YSgpKSB7XG4gICAgICAgIGF3YWl0IGNvcmRvdmFSZWFkeTtcbiAgICAgICAgcmV0dXJuIGRldmljZS51dWlkO1xuICAgIH0gZWxzZSBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIHJldHVybiBnZXREZXNrdG9wU2V0dGluZ3MoKS5nZXQoXCJ1dWlkXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldE9TVmVyc2lvbigpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0NvcmRvdmEoKSkge1xuICAgICAgICBhd2FpdCBjb3Jkb3ZhUmVhZHk7XG4gICAgICAgIHJldHVybiBkZXZpY2UudmVyc2lvbjtcbiAgICB9IGVsc2UgaWYgKGhhc05vZGUoKSkge1xuICAgICAgICByZXR1cm4gbm9kZVJlcXVpcmUoXCJvc1wiKS5yZWxlYXNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tGb3JVcGRhdGVzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgZWxlY3Ryb24uaXBjUmVuZGVyZXIuc2VuZChcImNoZWNrLXVwZGF0ZXNcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93Lm9wZW4oYXdhaXQgZ2V0QXBwU3RvcmVMaW5rKCksIFwiX3N5c3RlbVwiKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2NhbGUoKTogc3RyaW5nIHtcbiAgICAvLyBUT0RPOiBJcyB0aGVyZSBhIG1vcmUgcmVsaWFibGUgd2F5IHRvIGdldCB0aGUgc3lzdGVtIGxvY2FsZSxcbiAgICAvLyBlLmcuIHRocm91Z2ggYGVsZWN0cm9uLnJlbW90ZS5hcHAuZ2V0TG9jYWxlKClgP1xuICAgIHJldHVybiBuYXZpZ2F0b3IubGFuZ3VhZ2UgfHwgXCJlblwiO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERldmljZUluZm8ge1xuICAgIHBsYXRmb3JtOiBzdHJpbmcsXG4gICAgb3NWZXJzaW9uOiBzdHJpbmcsXG4gICAgdXVpZDogc3RyaW5nLFxuICAgIGFwcFZlcnNpb246IHN0cmluZyxcbiAgICBtYW51ZmFjdHVyZXI/OiBzdHJpbmcsXG4gICAgbW9kZWw/OiBzdHJpbmcsXG4gICAgaG9zdE5hbWU/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERldmljZUluZm8oKTogUHJvbWlzZTxEZXZpY2VJbmZvPiB7XG4gICAgY29uc3QgaW5mbzogRGV2aWNlSW5mbyA9IHtcbiAgICAgICAgcGxhdGZvcm06IGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpLFxuICAgICAgICBvc1ZlcnNpb246IGF3YWl0IGdldE9TVmVyc2lvbigpLFxuICAgICAgICBhcHBWZXJzaW9uOiBhd2FpdCBnZXRBcHBWZXJzaW9uKCksXG4gICAgICAgIHV1aWQ6IGF3YWl0IGdldERldmljZVVVSUQoKVxuICAgIH07XG5cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICBpbmZvLm1vZGVsID0gZGV2aWNlLm1vZGVsO1xuICAgICAgICBpbmZvLm1hbnVmYWN0dXJlciA9IGRldmljZS5tYW51ZmFjdHVyZXI7XG4gICAgfVxuXG4gICAgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICBpbmZvLmhvc3ROYW1lID0gbm9kZVJlcXVpcmUoXCJvc1wiKS5ob3N0bmFtZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBpbmZvO1xufVxuIiwiLy8gUkZDNDEyMi1jb21wbGlhbnQgdXVpZCBnZW5lcmF0b3JcbmV4cG9ydCBmdW5jdGlvbiB1dWlkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFwieHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4XCIucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbihjKSB7XG4gICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSoxNnwwLCB2ID0gYyA9PSBcInhcIiA/IHIgOiAociYweDN8MHg4KTtcbiAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgY29uc3QgY2hhcnMgPSB7XG4gICAgbnVtYmVyczogXCIwMTIzNDU2Nzg5XCIsXG4gICAgbG93ZXI6IFwiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpcIixcbiAgICB1cHBlcjogXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWlwiLFxuICAgIG90aGVyOiBcIi8rKCklXFxcIj0mLSE6JyojPzssXy5AYH4kXlt7XX1cXFxcfDw+XCJcbn07XG5cbmV4cG9ydCBjb25zdCBjaGFyU2V0cyA9IHtcbiAgICBmdWxsOiBjaGFycy5udW1iZXJzICsgY2hhcnMudXBwZXIgKyBjaGFycy5sb3dlciArIGNoYXJzLm90aGVyLFxuICAgIGFscGhhbnVtOiBjaGFycy5udW1iZXJzICsgY2hhcnMudXBwZXIgKyBjaGFycy5sb3dlcixcbiAgICBhbHBoYTogY2hhcnMubG93ZXIgKyBjaGFycy51cHBlcixcbiAgICBudW06IGNoYXJzLm51bWJlcnMsXG4gICAgaGV4YTogY2hhcnMubnVtYmVycyArIFwiYWJjZGVmXCJcbn07XG5cbi8vKiBDcmVhdGVzIGEgcmFuZG9tIHN0cmluZyB3aXRoIGEgZ2l2ZW4gX2xlbmd0aF8gY29tcHJpc2VkIG9mIGdpdmVuIHNldCBvciBjaGFyYWN0ZXJzXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tU3RyaW5nKGxlbmd0aCA9IDMyLCBjaGFyU2V0ID0gY2hhclNldHMuZnVsbCkge1xuICAgIGxldCBybmQgPSBuZXcgVWludDhBcnJheSgxKTtcbiAgICBsZXQgc3RyID0gXCJcIjtcbiAgICB3aGlsZSAoc3RyLmxlbmd0aCA8IGxlbmd0aCkge1xuICAgICAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhybmQpO1xuICAgICAgICAvLyBQcmV2ZW50IG1vZHVsbyBiaWFzIGJ5IHJlamVjdGluZyB2YWx1ZXMgbGFyZ2VyIHRoYW4gdGhlIGhpZ2hlc3QgbXVsaXBsZSBvZiBgY2hhclNldC5sZW5ndGhgXG4gICAgICAgIGlmIChybmRbMF0gPiAyNTUgLSAyNTYgJSBjaGFyU2V0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGNoYXJTZXRbcm5kWzBdICUgY2hhclNldC5sZW5ndGhdO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2UoZm46ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55LCBkZWxheTogbnVtYmVyKSB7XG4gICAgbGV0IHRpbWVvdXQ6IG51bWJlcjtcblxuICAgIHJldHVybiBmdW5jdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBmbihhcmdzKSwgZGVsYXkpO1xuICAgIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YWl0KGR0OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgZHQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVMYW5ndWFnZShsb2NhbGU6IHN0cmluZywgc3VwcG9ydGVkTGFuZ3VhZ2VzOiB7IFtsYW5nOiBzdHJpbmddOiBhbnkgfSk6IHN0cmluZyB7XG4gICAgY29uc3QgbG9jYWxlUGFydHMgPSBsb2NhbGUudG9Mb3dlckNhc2UoKS5zcGxpdChcIi1cIik7XG5cbiAgICB3aGlsZSAobG9jYWxlUGFydHMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGwgPSBsb2NhbGVQYXJ0cy5qb2luKFwiLVwiKTtcbiAgICAgICAgaWYgKHN1cHBvcnRlZExhbmd1YWdlc1tsXSkge1xuICAgICAgICAgICAgcmV0dXJuIGw7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbGVQYXJ0cy5wb3AoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc3VwcG9ydGVkTGFuZ3VhZ2VzKVswXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5TWl4aW5zKGJhc2VDbGFzczogYW55LCAuLi5taXhpbnM6ICgoY2xzOiBhbnkpID0+IGFueSlbXSk6IGFueSB7XG4gICAgcmV0dXJuIG1peGlucy5yZWR1Y2UoKGNscywgbWl4aW4pID0+IG1peGluKGNscyksIGJhc2VDbGFzcyk7XG59XG4iXX0=
