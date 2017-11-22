(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.padlock = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
exports.util = util;
const platform = require("./platform");
exports.platform = platform;

},{"./platform":2,"./util":3}],2:[function(require,module,exports){
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
function getDeviceUUID() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isCordova()) {
            yield cordovaReady;
            return device.uuid;
        }
        else if (isElectron()) {
            return electron.remote.getGlobal("settings").get("uuid");
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

},{}],3:[function(require,module,exports){
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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvc3JjL2NvcmUvbWFpbi1saXRlLnRzIiwiYXBwL3NyYy9jb3JlL3BsYXRmb3JtLnRzIiwiYXBwL3NyYy9jb3JlL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLCtCQUErQjtBQUkzQixvQkFBSTtBQUhSLHVDQUF1QztBQUluQyw0QkFBUTs7Ozs7Ozs7Ozs7OztBQ0RaLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFDbkMsTUFBTSxRQUFRLEdBQUcsV0FBVyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN4RCxNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRW5HLGtEQUFrRDtBQUNsRCxJQUFJLGlCQUFzQyxDQUFDO0FBRTNDLDBEQUEwRDtBQUMxRCw2R0FBNkc7QUFDN0cseUJBQXlCLElBQVk7SUFDakMsaUJBQWlCLEdBQUcsaUJBQWlCLElBQUksUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1RSxpQkFBaUIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQy9CLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDN0MsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDM0IsUUFBUSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFFRCwyREFBMkQ7QUFDM0QsNkdBQTZHO0FBQzdHO0lBQ0ksaUJBQWlCLEdBQUcsaUJBQWlCLElBQUksUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFV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RkQsb0JBRUM7QUFFRCx5QkFBZ0MsTUFBYyxFQUFFLGtCQUEyQztJQUN2RixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXBELE9BQU8sV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDYixDQUFDO1FBRUQsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFiRCwwQ0FhQztBQUVELHFCQUE0QixTQUFjLEVBQUUsR0FBRyxNQUE2QjtJQUN4RSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLEtBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ2hFLENBQUM7QUFGRCxrQ0FFQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuL3V0aWxcIjtcbmltcG9ydCAqIGFzIHBsYXRmb3JtIGZyb20gXCIuL3BsYXRmb3JtXCI7XG5cbmV4cG9ydCB7XG4gICAgdXRpbCxcbiAgICBwbGF0Zm9ybVxufVxuIiwiZGVjbGFyZSB2YXIgY29yZG92YTogYW55IHwgdW5kZWZpbmVkO1xuZGVjbGFyZSB2YXIgY2hyb21lOiBhbnkgfCB1bmRlZmluZWQ7XG5kZWNsYXJlIHZhciBkZXZpY2U6IGFueSB8IHVuZGVmaW5lZDtcblxuY29uc3Qgbm9kZVJlcXVpcmUgPSB3aW5kb3cucmVxdWlyZTtcbmNvbnN0IGVsZWN0cm9uID0gbm9kZVJlcXVpcmUgJiYgbm9kZVJlcXVpcmUoXCJlbGVjdHJvblwiKTtcbmNvbnN0IGNvcmRvdmFSZWFkeSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyKSA9PiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiZGV2aWNlcmVhZHlcIiwgKCkgPT4gcigpKSk7XG5cbi8vIFRleHRhcmVhIHVzZWQgZm9yIGNvcHlpbmcvcGFzdGluZyB1c2luZyB0aGUgZG9tXG5sZXQgY2xpcGJvYXJkVGV4dEFyZWE6IEhUTUxUZXh0QXJlYUVsZW1lbnQ7XG5cbi8vIFNldCBjbGlwYm9hcmQgdGV4dCB1c2luZyBgZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJjdXRcIilgLlxuLy8gTk9URTogVGhpcyBvbmx5IHdvcmtzIGluIGNlcnRhaW4gZW52aXJvbm1lbnRzIGxpa2UgR29vZ2xlIENocm9tZSBhcHBzIHdpdGggdGhlIGFwcHJvcHJpYXRlIHBlcm1pc3Npb25zIHNldFxuZnVuY3Rpb24gZG9tU2V0Q2xpcGJvYXJkKHRleHQ6IHN0cmluZykge1xuICAgIGNsaXBib2FyZFRleHRBcmVhID0gY2xpcGJvYXJkVGV4dEFyZWEgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuICAgIGNsaXBib2FyZFRleHRBcmVhLnZhbHVlID0gdGV4dDtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNsaXBib2FyZFRleHRBcmVhKTtcbiAgICBjbGlwYm9hcmRUZXh0QXJlYS5zZWxlY3QoKTtcbiAgICBkb2N1bWVudC5leGVjQ29tbWFuZChcImN1dFwiKTtcbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGNsaXBib2FyZFRleHRBcmVhKTtcbn1cblxuLy8gR2V0IGNsaXBib2FyZCB0ZXh0IHVzaW5nIGBkb2N1bWVudC5leGVjQ29tbWFuZChcInBhc3RlXCIpYFxuLy8gTk9URTogVGhpcyBvbmx5IHdvcmtzIGluIGNlcnRhaW4gZW52aXJvbm1lbnRzIGxpa2UgR29vZ2xlIENocm9tZSBhcHBzIHdpdGggdGhlIGFwcHJvcHJpYXRlIHBlcm1pc3Npb25zIHNldFxuZnVuY3Rpb24gZG9tR2V0Q2xpcGJvYXJkKCk6IHN0cmluZyB7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEgPSBjbGlwYm9hcmRUZXh0QXJlYSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjbGlwYm9hcmRUZXh0QXJlYSk7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEudmFsdWUgPSBcIlwiO1xuICAgIGNsaXBib2FyZFRleHRBcmVhLnNlbGVjdCgpO1xuICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKFwicGFzdGVcIik7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChjbGlwYm9hcmRUZXh0QXJlYSk7XG4gICAgcmV0dXJuIGNsaXBib2FyZFRleHRBcmVhLnZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNDb3Jkb3ZhKCk6IEJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgY29yZG92YSAhPT0gXCJ1bmRlZmluZWRcIjtcbn1cblxuLy8qIENoZWNrcyBpZiB0aGUgYXBwIGlzIHJ1bm5pbmcgYXMgYSBwYWNrYWdlZCBDaHJvbWUgYXBwXG5leHBvcnQgZnVuY3Rpb24gaXNDaHJvbWVBcHAoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICh0eXBlb2YgY2hyb21lICE9PSBcInVuZGVmaW5lZFwiKSAmJiBjaHJvbWUuYXBwICYmICEhY2hyb21lLmFwcC5ydW50aW1lO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNJT1MoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIChhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKSkudG9Mb3dlckNhc2UoKSA9PT0gXCJpb3NcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzQW5kcm9pZCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gKGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpKS50b0xvd2VyQ2FzZSgpID09PSBcImFuZHJvaWRcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzQ2hyb21lT1MoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIChhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKSkudG9Mb3dlckNhc2UoKSA9PT0gXCJjaHJvbWVvc1wiO1xufVxuXG4vLyogQ2hlY2tzIGlmIHRoZSBjdXJyZW50IGVudmlyb25tZW50IHN1cHBvcnRzIHRvdWNoIGV2ZW50c1xuZXhwb3J0IGZ1bmN0aW9uIGlzVG91Y2goKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJUb3VjaEV2ZW50XCIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbi8vKiBTZXRzIHRoZSBjbGlwYm9hcmQgdGV4dCB0byBhIGdpdmVuIHN0cmluZ1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldENsaXBib2FyZCh0ZXh0OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBJZiBjb3Jkb3ZhIGNsaXBib2FyZCBwbHVnaW4gaXMgYXZhaWxhYmxlLCB1c2UgdGhhdCBvbmUuIE90aGVyd2lzZSB1c2UgdGhlIGV4ZWNDb21tYW5kIGltcGxlbWVuYXRpb25cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29yZG92YS5wbHVnaW5zLmNsaXBib2FyZC5jb3B5KHRleHQsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRvbVNldENsaXBib2FyZCh0ZXh0KTtcbiAgICB9XG59XG5cbi8vKiBSZXRyaWV2ZXMgdGhlIGNsaXBib2FyZCB0ZXh0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Q2xpcGJvYXJkKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgLy8gSWYgY29yZG92YSBjbGlwYm9hcmQgcGx1Z2luIGlzIGF2YWlsYWJsZSwgdXNlIHRoYXQgb25lLiBPdGhlcndpc2UgdXNlIHRoZSBleGVjQ29tbWFuZCBpbXBsZW1lbmF0aW9uXG4gICAgaWYgKGlzQ29yZG92YSgpKSB7XG4gICAgICAgIGF3YWl0IGNvcmRvdmFSZWFkeTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29yZG92YS5wbHVnaW5zLmNsaXBib2FyZC5wYXN0ZShyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZG9tR2V0Q2xpcGJvYXJkKCk7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXBwU3RvcmVMaW5rKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKGF3YWl0IGlzSU9TKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9pdHVuZXMuYXBwbGUuY29tL2FwcC9pZDg3MTcxMDEzOVwiO1xuICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNBbmRyb2lkKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9wbGF5Lmdvb2dsZS5jb20vc3RvcmUvYXBwcy9kZXRhaWxzP2lkPWNvbS5tYWtsZXNvZnQucGFkbG9ja1wiO1xuICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNDaHJvbWVBcHAoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL2Nocm9tZS5nb29nbGUuY29tL3dlYnN0b3JlL2RldGFpbC9wYWRsb2NrL25wa29lZmpmY2pia25vZWFkZmtiY2RwYmFwYWFtY2lmXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9wYWRsb2NrLmlvXCI7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UmV2aWV3TGluayhyYXRpbmc6bnVtYmVyKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoYXdhaXQgaXNJT1MoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL2l0dW5lcy5hcHBsZS5jb20vYXBwL2lkODcxNzEwMTM5P2FjdGlvbj13cml0ZS1yZXZpZXdcIjtcbiAgICB9IGVsc2UgaWYgKGF3YWl0IGlzQW5kcm9pZCgpKSB7XG4gICAgICAgIHJldHVybiBcImh0dHBzOi8vcGxheS5nb29nbGUuY29tL3N0b3JlL2FwcHMvZGV0YWlscz9pZD1jb20ubWFrbGVzb2Z0LnBhZGxvY2tcIjtcbiAgICB9IGVsc2UgaWYgKGF3YWl0IGlzQ2hyb21lQXBwKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9jaHJvbWUuZ29vZ2xlLmNvbS93ZWJzdG9yZS9kZXRhaWwvcGFkbG9jay9ucGtvZWZqZmNqYmtub2VhZGZrYmNkcGJhcGFhbWNpZi9yZXZpZXdzXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgdmVyc2lvbiA9IGF3YWl0IGdldEFwcFZlcnNpb24oKTtcbiAgICAgICAgY29uc3QgcGxhdGZvcm0gPSBhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKTtcbiAgICAgICAgcmV0dXJuIGBodHRwczovL3BhZGxvY2suaW8vZmVlZGJhY2svP3I9JHtyYXRpbmd9JnA9JHtlbmNvZGVVUklDb21wb25lbnQocGxhdGZvcm0pfSZ2PSR7dmVyc2lvbn1gO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc05vZGUoKTogQm9vbGVhbiB7XG4gICAgcmV0dXJuICEhbm9kZVJlcXVpcmU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VsZWN0cm9uKCk6IEJvb2xlYW4ge1xuICAgIHJldHVybiAhIWVsZWN0cm9uO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXBwVmVyc2lvbigpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgcmV0dXJuIGVsZWN0cm9uLnJlbW90ZS5hcHAuZ2V0VmVyc2lvbigpO1xuICAgIH0gZWxzZSBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb3Jkb3ZhLmdldEFwcFZlcnNpb24uZ2V0VmVyc2lvbk51bWJlcihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGlzQ2hyb21lQXBwKCkpIHtcbiAgICAgICAgcmV0dXJuIGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KCkudmVyc2lvbjtcbiAgICB9XG5cbiAgICByZXR1cm4gXCJcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFBsYXRmb3JtTmFtZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgY29uc3QgcGxhdGZvcm0gPSBub2RlUmVxdWlyZShcIm9zXCIpLnBsYXRmb3JtKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkYXJ3aW46IFwiTWFjT1NcIixcbiAgICAgICAgICAgIHdpbjMyOiBcIldpbmRvd3NcIixcbiAgICAgICAgICAgIGxpbnV4OiBcIkxpbnV4XCJcbiAgICAgICAgfVtwbGF0Zm9ybV0gfHwgcGxhdGZvcm07XG4gICAgfSBlbHNlIGlmIChpc0NvcmRvdmEoKSkge1xuICAgICAgICBhd2FpdCBjb3Jkb3ZhUmVhZHk7XG4gICAgICAgIHJldHVybiBkZXZpY2UucGxhdGZvcm07XG4gICAgfSBlbHNlIGlmIChpc0Nocm9tZUFwcCgpKSB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCBuZXcgUHJvbWlzZTx7b3M6IHN0cmluZ30+KChyKSA9PiBjaHJvbWUucnVudGltZS5nZXRQbGF0Zm9ybUluZm8ocikpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3JvczogXCJDaHJvbWVPU1wiLFxuICAgICAgICAgICAgd2luOiBcIldpbmRvd3MgKENocm9tZSlcIixcbiAgICAgICAgICAgIGxpbnV4OiBcIkxpbnV4IChDaHJvbWUpXCIsXG4gICAgICAgICAgICBhbmRyb2lkOiBcIkFuZHJvaWQgKENocm9tZSlcIixcbiAgICAgICAgICAgIG1hYzogXCJNYWNPUyAoQ2hyb21lKVwiLFxuICAgICAgICAgICAgb3BlbmJzZDogXCJPcGVuQlNEIChDaHJvbWUpXCJcbiAgICAgICAgfVtpbmZvLm9zXSB8fCBpbmZvLm9zO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERldmljZVVVSUQoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gZGV2aWNlLnV1aWQ7XG4gICAgfSBlbHNlIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgcmV0dXJuIGVsZWN0cm9uLnJlbW90ZS5nZXRHbG9iYWwoXCJzZXR0aW5nc1wiKS5nZXQoXCJ1dWlkXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldE9TVmVyc2lvbigpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0NvcmRvdmEoKSkge1xuICAgICAgICBhd2FpdCBjb3Jkb3ZhUmVhZHk7XG4gICAgICAgIHJldHVybiBkZXZpY2UudmVyc2lvbjtcbiAgICB9IGVsc2UgaWYgKGhhc05vZGUoKSkge1xuICAgICAgICByZXR1cm4gbm9kZVJlcXVpcmUoXCJvc1wiKS5yZWxlYXNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tGb3JVcGRhdGVzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgZWxlY3Ryb24uaXBjUmVuZGVyZXIuc2VuZChcImNoZWNrLXVwZGF0ZXNcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93Lm9wZW4oYXdhaXQgZ2V0QXBwU3RvcmVMaW5rKCksIFwiX3N5c3RlbVwiKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2NhbGUoKTogc3RyaW5nIHtcbiAgICAvLyBUT0RPOiBJcyB0aGVyZSBhIG1vcmUgcmVsaWFibGUgd2F5IHRvIGdldCB0aGUgc3lzdGVtIGxvY2FsZSxcbiAgICAvLyBlLmcuIHRocm91Z2ggYGVsZWN0cm9uLnJlbW90ZS5hcHAuZ2V0TG9jYWxlKClgP1xuICAgIHJldHVybiBuYXZpZ2F0b3IubGFuZ3VhZ2UgfHwgXCJlblwiO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERldmljZUluZm8ge1xuICAgIHBsYXRmb3JtOiBzdHJpbmcsXG4gICAgb3NWZXJzaW9uOiBzdHJpbmcsXG4gICAgdXVpZDogc3RyaW5nLFxuICAgIGFwcFZlcnNpb246IHN0cmluZyxcbiAgICBtYW51ZmFjdHVyZXI/OiBzdHJpbmcsXG4gICAgbW9kZWw/OiBzdHJpbmcsXG4gICAgaG9zdE5hbWU/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERldmljZUluZm8oKTogUHJvbWlzZTxEZXZpY2VJbmZvPiB7XG4gICAgY29uc3QgaW5mbzogRGV2aWNlSW5mbyA9IHtcbiAgICAgICAgcGxhdGZvcm06IGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpLFxuICAgICAgICBvc1ZlcnNpb246IGF3YWl0IGdldE9TVmVyc2lvbigpLFxuICAgICAgICBhcHBWZXJzaW9uOiBhd2FpdCBnZXRBcHBWZXJzaW9uKCksXG4gICAgICAgIHV1aWQ6IGF3YWl0IGdldERldmljZVVVSUQoKVxuICAgIH07XG5cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICBpbmZvLm1vZGVsID0gZGV2aWNlLm1vZGVsO1xuICAgICAgICBpbmZvLm1hbnVmYWN0dXJlciA9IGRldmljZS5tYW51ZmFjdHVyZXI7XG4gICAgfVxuXG4gICAgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICBpbmZvLmhvc3ROYW1lID0gbm9kZVJlcXVpcmUoXCJvc1wiKS5ob3N0bmFtZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBpbmZvO1xufVxuIiwiLy8gUkZDNDEyMi1jb21wbGlhbnQgdXVpZCBnZW5lcmF0b3JcbmV4cG9ydCBmdW5jdGlvbiB1dWlkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFwieHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4XCIucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbihjKSB7XG4gICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSoxNnwwLCB2ID0gYyA9PSBcInhcIiA/IHIgOiAociYweDN8MHg4KTtcbiAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgY29uc3QgY2hhcnMgPSB7XG4gICAgbnVtYmVyczogXCIwMTIzNDU2Nzg5XCIsXG4gICAgbG93ZXI6IFwiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpcIixcbiAgICB1cHBlcjogXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWlwiLFxuICAgIG90aGVyOiBcIi8rKCklXFxcIj0mLSE6JyojPzssXy5AYH4kXlt7XX1cXFxcfDw+XCJcbn07XG5cbmV4cG9ydCBjb25zdCBjaGFyU2V0cyA9IHtcbiAgICBmdWxsOiBjaGFycy5udW1iZXJzICsgY2hhcnMudXBwZXIgKyBjaGFycy5sb3dlciArIGNoYXJzLm90aGVyLFxuICAgIGFscGhhbnVtOiBjaGFycy5udW1iZXJzICsgY2hhcnMudXBwZXIgKyBjaGFycy5sb3dlcixcbiAgICBhbHBoYTogY2hhcnMubG93ZXIgKyBjaGFycy51cHBlcixcbiAgICBudW06IGNoYXJzLm51bWJlcnMsXG4gICAgaGV4YTogY2hhcnMubnVtYmVycyArIFwiYWJjZGVmXCJcbn07XG5cbi8vKiBDcmVhdGVzIGEgcmFuZG9tIHN0cmluZyB3aXRoIGEgZ2l2ZW4gX2xlbmd0aF8gY29tcHJpc2VkIG9mIGdpdmVuIHNldCBvciBjaGFyYWN0ZXJzXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tU3RyaW5nKGxlbmd0aCA9IDMyLCBjaGFyU2V0ID0gY2hhclNldHMuZnVsbCkge1xuICAgIGxldCBybmQgPSBuZXcgVWludDhBcnJheSgxKTtcbiAgICBsZXQgc3RyID0gXCJcIjtcbiAgICB3aGlsZSAoc3RyLmxlbmd0aCA8IGxlbmd0aCkge1xuICAgICAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhybmQpO1xuICAgICAgICAvLyBQcmV2ZW50IG1vZHVsbyBiaWFzIGJ5IHJlamVjdGluZyB2YWx1ZXMgbGFyZ2VyIHRoYW4gdGhlIGhpZ2hlc3QgbXVsaXBsZSBvZiBgY2hhclNldC5sZW5ndGhgXG4gICAgICAgIGlmIChybmRbMF0gPiAyNTUgLSAyNTYgJSBjaGFyU2V0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGNoYXJTZXRbcm5kWzBdICUgY2hhclNldC5sZW5ndGhdO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2UoZm46ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55LCBkZWxheTogbnVtYmVyKSB7XG4gICAgbGV0IHRpbWVvdXQ6IG51bWJlcjtcblxuICAgIHJldHVybiBmdW5jdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBmbihhcmdzKSwgZGVsYXkpO1xuICAgIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YWl0KGR0OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgZHQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVMYW5ndWFnZShsb2NhbGU6IHN0cmluZywgc3VwcG9ydGVkTGFuZ3VhZ2VzOiB7IFtsYW5nOiBzdHJpbmddOiBhbnkgfSk6IHN0cmluZyB7XG4gICAgY29uc3QgbG9jYWxlUGFydHMgPSBsb2NhbGUudG9Mb3dlckNhc2UoKS5zcGxpdChcIi1cIik7XG5cbiAgICB3aGlsZSAobG9jYWxlUGFydHMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGwgPSBsb2NhbGVQYXJ0cy5qb2luKFwiLVwiKTtcbiAgICAgICAgaWYgKHN1cHBvcnRlZExhbmd1YWdlc1tsXSkge1xuICAgICAgICAgICAgcmV0dXJuIGw7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbGVQYXJ0cy5wb3AoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc3VwcG9ydGVkTGFuZ3VhZ2VzKVswXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5TWl4aW5zKGJhc2VDbGFzczogYW55LCAuLi5taXhpbnM6ICgoY2xzOiBhbnkpID0+IGFueSlbXSk6IGFueSB7XG4gICAgcmV0dXJuIG1peGlucy5yZWR1Y2UoKGNscywgbWl4aW4pID0+IG1peGluKGNscyksIGJhc2VDbGFzcyk7XG59XG4iXX0=
