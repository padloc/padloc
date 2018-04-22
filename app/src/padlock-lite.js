(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.padlock = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AjaxError {
    constructor(request) {
        this.request = request;
        try {
            const err = JSON.parse(request.responseText);
            this.code = err.error;
            this.message = err.message;
        }
        catch (e) {
            switch (request.status.toString()[0]) {
                case "0":
                    this.code = "failed_connection";
                    this.message = "Failed Connection";
                    break;
                case "3":
                    this.code = "unexpected_redirect";
                    this.message = "Unexpected Redirect";
                    break;
                case "4":
                    this.code = "client_error";
                    this.message = "Unknown Client Error";
                    break;
                default:
                    this.code = "server_error";
                    this.message = "Server Error";
            }
        }
    }
    ;
}
exports.AjaxError = AjaxError;
function request(method, url, body, headers) {
    let req = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                if (req.status.toString()[0] !== "2") {
                    reject(new AjaxError(req));
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
            reject(new AjaxError(req));
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
const tracking = require("./tracking");
exports.tracking = tracking;

},{"./ajax":1,"./platform":3,"./tracking":4,"./util":5}],3:[function(require,module,exports){
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
function saveDBAs() {
    if (isElectron()) {
        electron.ipcRenderer.send("save-db-as");
    }
}
exports.saveDBAs = saveDBAs;
function loadDB() {
    if (isElectron()) {
        electron.ipcRenderer.send("load-db");
    }
}
exports.loadDB = loadDB;
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
const platform_1 = require("./platform");
let initCb;
let client;
let trackingID = "";
let statsApi;
const initialized = new Promise((resolve) => initCb = resolve);
function init(cl, st) {
    client = cl;
    statsApi = st || {
        get() { return Promise.resolve({}); },
        set() { return Promise.resolve(); }
    };
    initCb();
}
exports.init = init;
function setTrackingID(id) {
    trackingID = id;
    return statsApi.set({ trackingID: id });
}
exports.setTrackingID = setTrackingID;
let ready = initialized
    .then(() => Promise.all([
    statsApi.get(),
    platform_1.getAppVersion()
]))
    .then(([stats, version]) => {
    trackingID = stats.trackingID;
    const launchCount = typeof stats.launchCount === "number" ? stats.launchCount + 1 : 1;
    const isFirstLaunch = !stats.firstLaunch;
    const firstLaunch = stats.firstLaunch || new Date().getTime();
    if (isFirstLaunch) {
        track("Install");
    }
    else if (stats.lastVersion !== version) {
        track("Update", { "From Version": stats.lastVersion });
    }
    return statsApi.set({
        firstLaunch: firstLaunch,
        lastLaunch: new Date().getTime(),
        launchCount: launchCount,
        lastVersion: version
    });
});
function track(event, props) {
    const data = {
        event: event,
        props: props || {},
        trackingID: trackingID
    };
    if (data.props.Email) {
        ready = statsApi.set({ "email": data.props.Email });
    }
    ready = ready.then(() => statsApi.get())
        .then((stats) => {
        Object.assign(data.props, {
            "First Launch": stats.firstLaunch && new Date(stats.firstLaunch).toISOString(),
            "Launch Count": stats.launchCount,
            "Custom Server": stats.syncCustomHost || false,
            "Email": stats.email
        });
        if (stats.lastSync) {
            data.props["Last Sync"] = new Date(stats.lastSync).toISOString();
        }
        if (stats.lastAskedFeedback) {
            Object.assign(data.props, {
                "Last Rated": new Date(stats.lastAskedFeedback).toISOString(),
                "Rated Version": stats.lastRatedVersion,
                "Rating": stats.lastRating
            });
        }
        if (stats.lastReviewed) {
            data.props["Last Reviewed"] = new Date(stats.lastReviewed).toISOString();
        }
    })
        .then(() => client.request("POST", client.urlForPath("track"), JSON.stringify(data)))
        .then((r) => {
        const res = JSON.parse(r.responseText);
        return setTrackingID(res.trackingID);
    })
        .catch(() => { });
    return ready;
}
exports.track = track;

},{"./platform":3}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
require("moment-duration-format");
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
function formatDateFromNow(date) {
    return moment(date).fromNow();
}
exports.formatDateFromNow = formatDateFromNow;
function formatDateUntil(startDate, duration) {
    const d = moment.duration(moment(startDate).add(duration, "hours").diff(moment()));
    return d.format("hh:mm:ss");
}
exports.formatDateUntil = formatDateUntil;
function isFuture(date, duration) {
    return moment(date).add(duration, "days").isAfter();
}
exports.isFuture = isFuture;

},{"moment":7,"moment-duration-format":6}],6:[function(require,module,exports){
/*! Moment Duration Format v2.2.2
 *  https://github.com/jsmreese/moment-duration-format
 *  Date: 2018-02-16
 *
 *  Duration format plugin function for the Moment.js library
 *  http://momentjs.com/
 *
 *  Copyright 2018 John Madhavan-Reese
 *  Released under the MIT license
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['moment'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // enviroments that support module.exports, like Node.
        try {
            module.exports = factory(require('moment'));
        } catch (e) {
            // If moment is not available, leave the setup up to the user.
            // Like when using moment-timezone or similar moment-based package.
            module.exports = factory;
        }
    }

    if (root) {
        // Globals.
        root.momentDurationFormatSetup = root.moment ? factory(root.moment) : factory;
    }
})(this, function (moment) {
    // `Number#tolocaleString` is tested on plugin initialization.
    // If the feature test passes, `toLocaleStringWorks` will be set to `true` and the
    // native function will be used to generate formatted output. If the feature
    // test fails, the fallback format function internal to this plugin will be
    // used.
    var toLocaleStringWorks = false;

    // `Number#toLocaleString` rounds incorrectly for select numbers in Microsoft
    // environments (Edge, IE11, Windows Phone) and possibly other environments.
    // If the rounding test fails and `toLocaleString` will be used for formatting,
    // the plugin will "pre-round" number values using the fallback number format
    // function before passing them to `toLocaleString` for final formatting.
    var toLocaleStringRoundingWorks = false;

    // Token type names in order of descending magnitude.
    var types = "escape years months weeks days hours minutes seconds milliseconds general".split(" ");

    var bubbles = [
        {
            type: "seconds",
            targets: [
                { type: "minutes", value: 60 },
                { type: "hours", value: 3600 },
                { type: "days", value: 86400 },
                { type: "weeks", value: 604800 },
                { type: "months", value: 2678400 },
                { type: "years", value: 31536000 }
            ]
        },
        {
            type: "minutes",
            targets: [
                { type: "hours", value: 60 },
                { type: "days", value: 1440 },
                { type: "weeks", value: 10080 },
                { type: "months", value: 44640 },
                { type: "years", value: 525600 }
            ]
        },
        {
            type: "hours",
            targets: [
                { type: "days", value: 24 },
                { type: "weeks", value: 168 },
                { type: "months", value: 744 },
                { type: "years", value: 8760 }
            ]
        },
        {
            type: "days",
            targets: [
                { type: "weeks", value: 7 },
                { type: "months", value: 31 },
                { type: "years", value: 365 }
            ]
        },
        {
            type: "months",
            targets: [
                { type: "years", value: 12 }
            ]
        }
    ];

    // stringIncludes
    function stringIncludes(str, search) {
        if (search.length > str.length) {
          return false;
        }

        return str.indexOf(search) !== -1;
    }

    // repeatZero(qty)
    // Returns "0" repeated `qty` times.
    // `qty` must be a integer >= 0.
    function repeatZero(qty) {
        var result = "";

        while (qty) {
            result += "0";
            qty -= 1;
        }

        return result;
    }

    function stringRound(digits) {
        var digitsArray = digits.split("").reverse();
        var i = 0;
        var carry = true;

        while (carry && i < digitsArray.length) {
            if (i) {
                if (digitsArray[i] === "9") {
                    digitsArray[i] = "0";
                } else {
                    digitsArray[i] = (parseInt(digitsArray[i], 10) + 1).toString();
                    carry = false;
                }
            } else {
                if (parseInt(digitsArray[i], 10) < 5) {
                    carry = false;
                }

                digitsArray[i] = "0";
            }

            i += 1;
        }

        if (carry) {
            digitsArray.push("1");
        }

        return digitsArray.reverse().join("");
    }

    // formatNumber
    // Formats any number greater than or equal to zero using these options:
    // - userLocale
    // - useToLocaleString
    // - useGrouping
    // - grouping
    // - maximumSignificantDigits
    // - minimumIntegerDigits
    // - fractionDigits
    // - groupingSeparator
    // - decimalSeparator
    //
    // `useToLocaleString` will use `toLocaleString` for formatting.
    // `userLocale` option is passed through to `toLocaleString`.
    // `fractionDigits` is passed through to `maximumFractionDigits` and `minimumFractionDigits`
    // Using `maximumSignificantDigits` will override `minimumIntegerDigits` and `fractionDigits`.
    function formatNumber(number, options, userLocale) {
        var useToLocaleString = options.useToLocaleString;
        var useGrouping = options.useGrouping;
        var grouping = useGrouping && options.grouping.slice();
        var maximumSignificantDigits = options.maximumSignificantDigits;
        var minimumIntegerDigits = options.minimumIntegerDigits || 1;
        var fractionDigits = options.fractionDigits || 0;
        var groupingSeparator = options.groupingSeparator;
        var decimalSeparator = options.decimalSeparator;

        if (useToLocaleString && userLocale) {
            var localeStringOptions = {
                minimumIntegerDigits: minimumIntegerDigits,
                useGrouping: useGrouping
            };

            if (fractionDigits) {
                localeStringOptions.maximumFractionDigits = fractionDigits;
                localeStringOptions.minimumFractionDigits = fractionDigits;
            }

            // toLocaleString output is "0.0" instead of "0" for HTC browsers
            // when maximumSignificantDigits is set. See #96.
            if (maximumSignificantDigits && number > 0) {
                localeStringOptions.maximumSignificantDigits = maximumSignificantDigits;
            }

            if (!toLocaleStringRoundingWorks) {
                var roundingOptions = extend({}, options);
                roundingOptions.useGrouping = false;
                roundingOptions.decimalSeparator = ".";
                number = parseFloat(formatNumber(number, roundingOptions), 10);
            }

            return number.toLocaleString(userLocale, localeStringOptions);
        }

        var numberString;

        // Add 1 to digit output length for floating point errors workaround. See below.
        if (maximumSignificantDigits) {
            numberString = number.toPrecision(maximumSignificantDigits + 1);
        } else {
            numberString = number.toFixed(fractionDigits + 1);
        }

        var integerString;
        var fractionString;
        var exponentString;

        var temp = numberString.split("e");

        exponentString = temp[1] || "";

        temp = temp[0].split(".");

        fractionString = temp[1] || "";
        integerString = temp[0] || "";

        // Workaround for floating point errors in `toFixed` and `toPrecision`.
        // (3.55).toFixed(1); --> "3.5"
        // (123.55 - 120).toPrecision(2); --> "3.5"
        // (123.55 - 120); --> 3.549999999999997
        // (123.55 - 120).toFixed(2); --> "3.55"
        // Round by examing the string output of the next digit.

        // *************** Implement String Rounding here ***********************
        // Check integerString + fractionString length of toPrecision before rounding.
        // Check length of fractionString from toFixed output before rounding.
        var integerLength = integerString.length;
        var fractionLength = fractionString.length;
        var digitCount = integerLength + fractionLength;
        var digits = integerString + fractionString;

        if (maximumSignificantDigits && digitCount === (maximumSignificantDigits + 1) || !maximumSignificantDigits && fractionLength === (fractionDigits + 1)) {
            // Round digits.
            digits = stringRound(digits);

            if (digits.length === digitCount + 1) {
                integerLength = integerLength + 1;
            }

            // Discard final fractionDigit.
            if (fractionLength) {
                digits = digits.slice(0, -1);
            }

            // Separate integer and fraction.
            integerString = digits.slice(0, integerLength);
            fractionString = digits.slice(integerLength);
        }

        // Trim trailing zeroes from fractionString because toPrecision outputs
        // precision, not significant digits.
        if (maximumSignificantDigits) {
            fractionString = fractionString.replace(/0*$/, "");
        }

        // Handle exponent.
        var exponent = parseInt(exponentString, 10);

        if (exponent > 0) {
            if (fractionString.length <= exponent) {
                fractionString = fractionString + repeatZero(exponent - fractionString.length);

                integerString = integerString + fractionString;
                fractionString = "";
            } else {
                integerString = integerString + fractionString.slice(0, exponent);
                fractionString = fractionString.slice(exponent);
            }
        } else if (exponent < 0) {
            fractionString = (repeatZero(Math.abs(exponent) - integerString.length) + integerString + fractionString);

            integerString = "0";
        }

        if (!maximumSignificantDigits) {
            // Trim or pad fraction when not using maximumSignificantDigits.
            fractionString = fractionString.slice(0, fractionDigits);

            if (fractionString.length < fractionDigits) {
                fractionString = fractionString + repeatZero(fractionDigits - fractionString.length);
            }

            // Pad integer when using minimumIntegerDigits
            // and not using maximumSignificantDigits.
            if (integerString.length < minimumIntegerDigits) {
                integerString = repeatZero(minimumIntegerDigits - integerString.length) + integerString;
            }
        }

        var formattedString = "";

        // Handle grouping.
        if (useGrouping) {
            temp = integerString;
            var group;

            while (temp.length) {
                if (grouping.length) {
                    group = grouping.shift();
                }

                if (formattedString) {
                    formattedString = groupingSeparator + formattedString;
                }

                formattedString = temp.slice(-group) + formattedString;

                temp = temp.slice(0, -group);
            }
        } else {
            formattedString = integerString;
        }

        // Add decimalSeparator and fraction.
        if (fractionString) {
            formattedString = formattedString + decimalSeparator + fractionString;
        }

        return formattedString;
    }

    // durationLabelCompare
    function durationLabelCompare(a, b) {
        if (a.label.length > b.label.length) {
            return -1;
        }

        if (a.label.length < b.label.length) {
            return 1;
        }

        // a must be equal to b
        return 0;
    }

    // durationGetLabels
    function durationGetLabels(token, localeData) {
        var labels = [];

        each(keys(localeData), function (localeDataKey) {
            if (localeDataKey.slice(0, 15) !== "_durationLabels") {
                return;
            }

            var labelType = localeDataKey.slice(15).toLowerCase();

            each(keys(localeData[localeDataKey]), function (labelKey) {
                if (labelKey.slice(0, 1) === token) {
                    labels.push({
                        type: labelType,
                        key: labelKey,
                        label: localeData[localeDataKey][labelKey]
                    });
                }
            });
        });

        return labels;
    }

    // durationPluralKey
    function durationPluralKey(token, integerValue, decimalValue) {
        // Singular for a value of `1`, but not for `1.0`.
        if (integerValue === 1 && decimalValue === null) {
            return token;
        }

        return token + token;
    }

    var engLocale = {
        durationLabelsStandard: {
            S: 'millisecond',
            SS: 'milliseconds',
            s: 'second',
            ss: 'seconds',
            m: 'minute',
            mm: 'minutes',
            h: 'hour',
            hh: 'hours',
            d: 'day',
            dd: 'days',
            w: 'week',
            ww: 'weeks',
            M: 'month',
            MM: 'months',
            y: 'year',
            yy: 'years'
        },
        durationLabelsShort: {
            S: 'msec',
            SS: 'msecs',
            s: 'sec',
            ss: 'secs',
            m: 'min',
            mm: 'mins',
            h: 'hr',
            hh: 'hrs',
            d: 'dy',
            dd: 'dys',
            w: 'wk',
            ww: 'wks',
            M: 'mo',
            MM: 'mos',
            y: 'yr',
            yy: 'yrs'
        },
        durationTimeTemplates: {
            HMS: 'h:mm:ss',
            HM: 'h:mm',
            MS: 'm:ss'
        },
        durationLabelTypes: [
            { type: "standard", string: "__" },
            { type: "short", string: "_" }
        ],
        durationPluralKey: durationPluralKey
    };

    // isArray
    function isArray(array) {
        return Object.prototype.toString.call(array) === "[object Array]";
    }

    // isObject
    function isObject(obj) {
        return Object.prototype.toString.call(obj) === "[object Object]";
    }

    // findLast
    function findLast(array, callback) {
        var index = array.length;

        while (index -= 1) {
            if (callback(array[index])) { return array[index]; }
        }
    }

    // find
    function find(array, callback) {
        var index = 0;

        var max = array && array.length || 0;

        var match;

        if (typeof callback !== "function") {
            match = callback;
            callback = function (item) {
                return item === match;
            };
        }

        while (index < max) {
            if (callback(array[index])) { return array[index]; }
            index += 1;
        }
    }

    // each
    function each(array, callback) {
        var index = 0,
            max = array.length;

        if (!array || !max) { return; }

        while (index < max) {
            if (callback(array[index], index) === false) { return; }
            index += 1;
        }
    }

    // map
    function map(array, callback) {
        var index = 0,
            max = array.length,
            ret = [];

        if (!array || !max) { return ret; }

        while (index < max) {
            ret[index] = callback(array[index], index);
            index += 1;
        }

        return ret;
    }

    // pluck
    function pluck(array, prop) {
        return map(array, function (item) {
            return item[prop];
        });
    }

    // compact
    function compact(array) {
        var ret = [];

        each(array, function (item) {
            if (item) { ret.push(item); }
        });

        return ret;
    }

    // unique
    function unique(array) {
        var ret = [];

        each(array, function (_a) {
            if (!find(ret, _a)) { ret.push(_a); }
        });

        return ret;
    }

    // intersection
    function intersection(a, b) {
        var ret = [];

        each(a, function (_a) {
            each(b, function (_b) {
                if (_a === _b) { ret.push(_a); }
            });
        });

        return unique(ret);
    }

    // rest
    function rest(array, callback) {
        var ret = [];

        each(array, function (item, index) {
            if (!callback(item)) {
                ret = array.slice(index);
                return false;
            }
        });

        return ret;
    }

    // initial
    function initial(array, callback) {
        var reversed = array.slice().reverse();

        return rest(reversed, callback).reverse();
    }

    // extend
    function extend(a, b) {
        for (var key in b) {
            if (b.hasOwnProperty(key)) { a[key] = b[key]; }
        }

        return a;
    }

    // keys
    function keys(a) {
        var ret = [];

        for (var key in a) {
            if (a.hasOwnProperty(key)) { ret.push(key); }
        }

        return ret;
    }

    // any
    function any(array, callback) {
        var index = 0,
            max = array.length;

        if (!array || !max) { return false; }

        while (index < max) {
            if (callback(array[index], index) === true) { return true; }
            index += 1;
        }

        return false;
    }

    // flatten
    function flatten(array) {
        var ret = [];

        each(array, function(child) {
            ret = ret.concat(child);
        });

        return ret;
    }

    function toLocaleStringSupportsLocales() {
        var number = 0;
        try {
            number.toLocaleString('i');
        } catch (e) {
            return e.name === 'RangeError';
        }
        return false;
    }

    function featureTestToLocaleStringRounding() {
        return (3.55).toLocaleString("en", {
            useGrouping: false,
            minimumIntegerDigits: 1,
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }) === "3.6";
    }

    function featureTestToLocaleString() {
        var passed = true;

        // Test locale.
        passed = passed && toLocaleStringSupportsLocales();
        if (!passed) { return false; }

        // Test minimumIntegerDigits.
        passed = passed && (1).toLocaleString("en", { minimumIntegerDigits: 1 }) === "1";
        passed = passed && (1).toLocaleString("en", { minimumIntegerDigits: 2 }) === "01";
        passed = passed && (1).toLocaleString("en", { minimumIntegerDigits: 3 }) === "001";
        if (!passed) { return false; }

        // Test maximumFractionDigits and minimumFractionDigits.
        passed = passed && (99.99).toLocaleString("en", { maximumFractionDigits: 0, minimumFractionDigits: 0 }) === "100";
        passed = passed && (99.99).toLocaleString("en", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) === "100.0";
        passed = passed && (99.99).toLocaleString("en", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) === "99.99";
        passed = passed && (99.99).toLocaleString("en", { maximumFractionDigits: 3, minimumFractionDigits: 3 }) === "99.990";
        if (!passed) { return false; }

        // Test maximumSignificantDigits.
        passed = passed && (99.99).toLocaleString("en", { maximumSignificantDigits: 1 }) === "100";
        passed = passed && (99.99).toLocaleString("en", { maximumSignificantDigits: 2 }) === "100";
        passed = passed && (99.99).toLocaleString("en", { maximumSignificantDigits: 3 }) === "100";
        passed = passed && (99.99).toLocaleString("en", { maximumSignificantDigits: 4 }) === "99.99";
        passed = passed && (99.99).toLocaleString("en", { maximumSignificantDigits: 5 }) === "99.99";
        if (!passed) { return false; }

        // Test grouping.
        passed = passed && (1000).toLocaleString("en", { useGrouping: true }) === "1,000";
        passed = passed && (1000).toLocaleString("en", { useGrouping: false }) === "1000";
        if (!passed) { return false; }

        return true;
    }

    // durationsFormat(durations [, template] [, precision] [, settings])
    function durationsFormat() {
        var args = [].slice.call(arguments);
        var settings = {};
        var durations;

        // Parse arguments.
        each(args, function (arg, index) {
            if (!index) {
                if (!isArray(arg)) {
                    throw "Expected array as the first argument to durationsFormat.";
                }

                durations = arg;
            }

            if (typeof arg === "string" || typeof arg === "function") {
                settings.template = arg;
                return;
            }

            if (typeof arg === "number") {
                settings.precision = arg;
                return;
            }

            if (isObject(arg)) {
                extend(settings, arg);
            }
        });

        if (!durations || !durations.length) {
            return [];
        }

        settings.returnMomentTypes = true;

        var formattedDurations = map(durations, function (dur) {
            return dur.format(settings);
        });

        // Merge token types from all durations.
        var outputTypes = intersection(types, unique(pluck(flatten(formattedDurations), "type")));

        var largest = settings.largest;

        if (largest) {
            outputTypes = outputTypes.slice(0, largest);
        }

        settings.returnMomentTypes = false;
        settings.outputTypes = outputTypes;

        return map(durations, function (dur) {
            return dur.format(settings);
        });
    }

    // durationFormat([template] [, precision] [, settings])
    function durationFormat() {

        var args = [].slice.call(arguments);
        var settings = extend({}, this.format.defaults);

        // Keep a shadow copy of this moment for calculating remainders.
        // Perform all calculations on positive duration value, handle negative
        // sign at the very end.
        var asMilliseconds = this.asMilliseconds();
        var asMonths = this.asMonths();

        // Treat invalid durations as having a value of 0 milliseconds.
        if (typeof this.isValid === "function" && this.isValid() === false) {
            asMilliseconds = 0;
            asMonths = 0;
        }

        var isNegative = asMilliseconds < 0;

        // Two shadow copies are needed because of the way moment.js handles
        // duration arithmetic for years/months and for weeks/days/hours/minutes/seconds.
        var remainder = moment.duration(Math.abs(asMilliseconds), "milliseconds");
        var remainderMonths = moment.duration(Math.abs(asMonths), "months");

        // Parse arguments.
        each(args, function (arg) {
            if (typeof arg === "string" || typeof arg === "function") {
                settings.template = arg;
                return;
            }

            if (typeof arg === "number") {
                settings.precision = arg;
                return;
            }

            if (isObject(arg)) {
                extend(settings, arg);
            }
        });

        var momentTokens = {
            years: "y",
            months: "M",
            weeks: "w",
            days: "d",
            hours: "h",
            minutes: "m",
            seconds: "s",
            milliseconds: "S"
        };

        var tokenDefs = {
            escape: /\[(.+?)\]/,
            years: /\*?[Yy]+/,
            months: /\*?M+/,
            weeks: /\*?[Ww]+/,
            days: /\*?[Dd]+/,
            hours: /\*?[Hh]+/,
            minutes: /\*?m+/,
            seconds: /\*?s+/,
            milliseconds: /\*?S+/,
            general: /.+?/
        };

        // Types array is available in the template function.
        settings.types = types;

        var typeMap = function (token) {
            return find(types, function (type) {
                return tokenDefs[type].test(token);
            });
        };

        var tokenizer = new RegExp(map(types, function (type) {
            return tokenDefs[type].source;
        }).join("|"), "g");

        // Current duration object is available in the template function.
        settings.duration = this;

        // Eval template function and cache template string.
        var template = typeof settings.template === "function" ? settings.template.apply(settings) : settings.template;

        // outputTypes and returnMomentTypes are settings to support durationsFormat().

        // outputTypes is an array of moment token types that determines
        // the tokens returned in formatted output. This option overrides
        // trim, largest, stopTrim, etc.
        var outputTypes = settings.outputTypes;

        // returnMomentTypes is a boolean that sets durationFormat to return
        // the processed momentTypes instead of formatted output.
        var returnMomentTypes = settings.returnMomentTypes;

        var largest = settings.largest;

        // Setup stopTrim array of token types.
        var stopTrim = [];

        if (!outputTypes) {
            if (isArray(settings.stopTrim)) {
                settings.stopTrim = settings.stopTrim.join("");
            }

            // Parse stopTrim string to create token types array.
            if (settings.stopTrim) {
                each(settings.stopTrim.match(tokenizer), function (token) {
                    var type = typeMap(token);

                    if (type === "escape" || type === "general") {
                        return;
                    }

                    stopTrim.push(type);
                });
            }
        }

        // Cache moment's locale data.
        var localeData = moment.localeData();

        if (!localeData) {
            localeData = {};
        }

        // Fall back to this plugin's `eng` extension.
        each(keys(engLocale), function (key) {
            if (typeof engLocale[key] === "function") {
                if (!localeData[key]) {
                    localeData[key] = engLocale[key];
                }

                return;
            }

            if (!localeData["_" + key]) {
                localeData["_" + key] = engLocale[key];
            }
        });

        // Replace Duration Time Template strings.
        // For locale `eng`: `_HMS_`, `_HM_`, and `_MS_`.
        each(keys(localeData._durationTimeTemplates), function (item) {
            template = template.replace("_" + item + "_", localeData._durationTimeTemplates[item]);
        });

        // Determine user's locale.
        var userLocale = settings.userLocale || moment.locale();

        var useLeftUnits = settings.useLeftUnits;
        var usePlural = settings.usePlural;
        var precision = settings.precision;
        var forceLength = settings.forceLength;
        var useGrouping = settings.useGrouping;
        var trunc = settings.trunc;

        // Use significant digits only when precision is greater than 0.
        var useSignificantDigits = settings.useSignificantDigits && precision > 0;
        var significantDigits = useSignificantDigits ? settings.precision : 0;
        var significantDigitsCache = significantDigits;

        var minValue = settings.minValue;
        var isMinValue = false;

        var maxValue = settings.maxValue;
        var isMaxValue = false;

        // formatNumber fallback options.
        var useToLocaleString = settings.useToLocaleString;
        var groupingSeparator = settings.groupingSeparator;
        var decimalSeparator = settings.decimalSeparator;
        var grouping = settings.grouping;

        useToLocaleString = useToLocaleString && toLocaleStringWorks;

        // Trim options.
        var trim = settings.trim;

        if (isArray(trim)) {
            trim = trim.join(" ");
        }

        if (trim === null && (largest || maxValue || useSignificantDigits)) {
            trim = "all";
        }

        if (trim === null || trim === true || trim === "left" || trim === "right") {
            trim = "large";
        }

        if (trim === false) {
            trim = "";
        }

        var trimIncludes = function (item) {
            return item.test(trim);
        };

        var rLarge = /large/;
        var rSmall = /small/;
        var rBoth = /both/;
        var rMid = /mid/;
        var rAll = /^all|[^sm]all/;
        var rFinal = /final/;

        var trimLarge = largest > 0 || any([rLarge, rBoth, rAll], trimIncludes);
        var trimSmall = any([rSmall, rBoth, rAll], trimIncludes);
        var trimMid = any([rMid, rAll], trimIncludes);
        var trimFinal = any([rFinal, rAll], trimIncludes);

        // Parse format string to create raw tokens array.
        var rawTokens = map(template.match(tokenizer), function (token, index) {
            var type = typeMap(token);

            if (token.slice(0, 1) === "*") {
                token = token.slice(1);

                if (type !== "escape" && type !== "general") {
                    stopTrim.push(type);
                }
            }

            return {
                index: index,
                length: token.length,
                text: "",

                // Replace escaped tokens with the non-escaped token text.
                token: (type === "escape" ? token.replace(tokenDefs.escape, "$1") : token),

                // Ignore type on non-moment tokens.
                type: ((type === "escape" || type === "general") ? null : type)
            };
        });

        // Associate text tokens with moment tokens.
        var currentToken = {
            index: 0,
            length: 0,
            token: "",
            text: "",
            type: null
        };

        var tokens = [];

        if (useLeftUnits) {
            rawTokens.reverse();
        }

        each(rawTokens, function (token) {
            if (token.type) {
                if (currentToken.type || currentToken.text) {
                    tokens.push(currentToken);
                }

                currentToken = token;

                return;
            }

            if (useLeftUnits) {
                currentToken.text = token.token + currentToken.text;
            } else {
                currentToken.text += token.token;
            }
        });

        if (currentToken.type || currentToken.text) {
            tokens.push(currentToken);
        }

        if (useLeftUnits) {
            tokens.reverse();
        }

        // Find unique moment token types in the template in order of
        // descending magnitude.
        var momentTypes = intersection(types, unique(compact(pluck(tokens, "type"))));

        // Exit early if there are no moment token types.
        if (!momentTypes.length) {
            return pluck(tokens, "text").join("");
        }

        // Calculate values for each moment type in the template.
        // For processing the settings, values are associated with moment types.
        // Values will be assigned to tokens at the last step in order to
        // assume nothing about frequency or order of tokens in the template.
        momentTypes = map(momentTypes, function (momentType, index) {
            // Is this the least-magnitude moment token found?
            var isSmallest = ((index + 1) === momentTypes.length);

            // Is this the greatest-magnitude moment token found?
            var isLargest = (!index);

            // Get the raw value in the current units.
            var rawValue;

            if (momentType === "years" || momentType === "months") {
                rawValue = remainderMonths.as(momentType);
            } else {
                rawValue = remainder.as(momentType);
            }

            var wholeValue = Math.floor(rawValue);
            var decimalValue = rawValue - wholeValue;

            var token = find(tokens, function (token) {
                return momentType === token.type;
            });

            if (isLargest && maxValue && rawValue > maxValue) {
                isMaxValue = true;
            }

            if (isSmallest && minValue && Math.abs(settings.duration.as(momentType)) < minValue) {
                isMinValue = true;
            }

            // Note the length of the largest-magnitude moment token:
            // if it is greater than one and forceLength is not set,
            // then default forceLength to `true`.
            //
            // Rationale is this: If the template is "h:mm:ss" and the
            // moment value is 5 minutes, the user-friendly output is
            // "5:00", not "05:00". We shouldn't pad the `minutes` token
            // even though it has length of two if the template is "h:mm:ss";
            //
            // If the minutes output should always include the leading zero
            // even when the hour is trimmed then set `{ forceLength: true }`
            // to output "05:00". If the template is "hh:mm:ss", the user
            // clearly wanted everything padded so we should output "05:00";
            //
            // If the user wants the full padded output, they can use
            // template "hh:mm:ss" and set `{ trim: false }` to output
            // "00:05:00".
            if (isLargest && forceLength === null && token.length > 1) {
                forceLength = true;
            }

            // Update remainder.
            remainder.subtract(wholeValue, momentType);
            remainderMonths.subtract(wholeValue, momentType);

            return {
                rawValue: rawValue,
                wholeValue: wholeValue,
                // Decimal value is only retained for the least-magnitude
                // moment type in the format template.
                decimalValue: isSmallest ? decimalValue : 0,
                isSmallest: isSmallest,
                isLargest: isLargest,
                type: momentType,
                // Tokens can appear multiple times in a template string,
                // but all instances must share the same length.
                tokenLength: token.length
            };
        });

        var truncMethod = trunc ? Math.floor : Math.round;
        var truncate = function (value, places) {
            var factor = Math.pow(10, places);
            return truncMethod(value * factor) / factor;
        };

        var foundFirst = false;
        var bubbled = false;

        var formatValue = function (momentType, index) {
            var formatOptions = {
                useGrouping: useGrouping,
                groupingSeparator: groupingSeparator,
                decimalSeparator: decimalSeparator,
                grouping: grouping,
                useToLocaleString: useToLocaleString
            };

            if (useSignificantDigits) {
                if (significantDigits <= 0) {
                    momentType.rawValue = 0;
                    momentType.wholeValue = 0;
                    momentType.decimalValue = 0;
                } else {
                    formatOptions.maximumSignificantDigits = significantDigits;
                    momentType.significantDigits = significantDigits;
                }
            }

            if (isMaxValue && !bubbled) {
                if (momentType.isLargest) {
                    momentType.wholeValue = maxValue;
                    momentType.decimalValue = 0;
                } else {
                    momentType.wholeValue = 0;
                    momentType.decimalValue = 0;
                }
            }

            if (isMinValue && !bubbled) {
                if (momentType.isSmallest) {
                    momentType.wholeValue = minValue;
                    momentType.decimalValue = 0;
                } else {
                    momentType.wholeValue = 0;
                    momentType.decimalValue = 0;
                }
            }

            if (momentType.isSmallest || momentType.significantDigits && momentType.significantDigits - momentType.wholeValue.toString().length <= 0) {
                // Apply precision to least significant token value.
                if (precision < 0) {
                    momentType.value = truncate(momentType.wholeValue, precision);
                } else if (precision === 0) {
                    momentType.value = truncMethod(momentType.wholeValue + momentType.decimalValue);
                } else { // precision > 0
                    if (useSignificantDigits) {
                        if (trunc) {
                            momentType.value = truncate(momentType.rawValue, significantDigits - momentType.wholeValue.toString().length);
                        } else {
                            momentType.value = momentType.rawValue;
                        }

                        if (momentType.wholeValue) {
                            significantDigits -= momentType.wholeValue.toString().length;
                        }
                    } else {
                        formatOptions.fractionDigits = precision;

                        if (trunc) {
                            momentType.value = momentType.wholeValue + truncate(momentType.decimalValue, precision);
                        } else {
                            momentType.value = momentType.wholeValue + momentType.decimalValue;
                        }
                    }
                }
            } else {
                if (useSignificantDigits && momentType.wholeValue) {
                    // Outer Math.round required here to handle floating point errors.
                    momentType.value = Math.round(truncate(momentType.wholeValue, momentType.significantDigits - momentType.wholeValue.toString().length));

                    significantDigits -= momentType.wholeValue.toString().length;
                } else {
                    momentType.value = momentType.wholeValue;
                }
            }

            if (momentType.tokenLength > 1 && (forceLength || foundFirst)) {
                formatOptions.minimumIntegerDigits = momentType.tokenLength;

                if (bubbled && formatOptions.maximumSignificantDigits < momentType.tokenLength) {
                    delete formatOptions.maximumSignificantDigits;
                }
            }

            if (!foundFirst && (momentType.value > 0 || trim === "" /* trim: false */ || find(stopTrim, momentType.type) || find(outputTypes, momentType.type))) {
                foundFirst = true;
            }

            momentType.formattedValue = formatNumber(momentType.value, formatOptions, userLocale);

            formatOptions.useGrouping = false;
            formatOptions.decimalSeparator = ".";
            momentType.formattedValueEn = formatNumber(momentType.value, formatOptions, "en");

            if (momentType.tokenLength === 2 && momentType.type === "milliseconds") {
                momentType.formattedValueMS = formatNumber(momentType.value, {
                    minimumIntegerDigits: 3,
                    useGrouping: false
                }, "en").slice(0, 2);
            }

            return momentType;
        };

        // Calculate formatted values.
        momentTypes = map(momentTypes, formatValue);
        momentTypes = compact(momentTypes);

        // Bubble rounded values.
        if (momentTypes.length > 1) {
            var findType = function (type) {
                return find(momentTypes, function (momentType) {
                    return momentType.type === type;
                });
            };

            var bubbleTypes = function (bubble) {
                var bubbleMomentType = findType(bubble.type);

                if (!bubbleMomentType) {
                    return;
                }

                each(bubble.targets, function (target) {
                    var targetMomentType = findType(target.type);

                    if (!targetMomentType) {
                        return;
                    }

                    if (parseInt(bubbleMomentType.formattedValueEn, 10) === target.value) {
                        bubbleMomentType.rawValue = 0;
                        bubbleMomentType.wholeValue = 0;
                        bubbleMomentType.decimalValue = 0;
                        targetMomentType.rawValue += 1;
                        targetMomentType.wholeValue += 1;
                        targetMomentType.decimalValue = 0;
                        targetMomentType.formattedValueEn = targetMomentType.wholeValue.toString();
                        bubbled = true;
                    }
                });
            };

            each(bubbles, bubbleTypes);
        }

        // Recalculate formatted values.
        if (bubbled) {
            foundFirst = false;
            significantDigits = significantDigitsCache;
            momentTypes = map(momentTypes, formatValue);
            momentTypes = compact(momentTypes);
        }

        if (outputTypes && !(isMaxValue && !settings.trim)) {
            momentTypes = map(momentTypes, function (momentType) {
                if (find(outputTypes, function (outputType) {
                    return momentType.type === outputType;
                })) {
                    return momentType;
                }

                return null;
            });

            momentTypes = compact(momentTypes);
        } else {
            // Trim Large.
            if (trimLarge) {
                momentTypes = rest(momentTypes, function (momentType) {
                    // Stop trimming on:
                    // - the smallest moment type
                    // - a type marked for stopTrim
                    // - a type that has a whole value
                    return !momentType.isSmallest && !momentType.wholeValue && !find(stopTrim, momentType.type);
                });
            }

            // Largest.
            if (largest && momentTypes.length) {
                momentTypes = momentTypes.slice(0, largest);
            }

            // Trim Small.
            if (trimSmall && momentTypes.length > 1) {
                momentTypes = initial(momentTypes, function (momentType) {
                    // Stop trimming on:
                    // - a type marked for stopTrim
                    // - a type that has a whole value
                    // - the largest momentType
                    return !momentType.wholeValue && !find(stopTrim, momentType.type) && !momentType.isLargest;
                });
            }

            // Trim Mid.
            if (trimMid) {
                momentTypes = map(momentTypes, function (momentType, index) {
                    if (index > 0 && index < momentTypes.length - 1 && !momentType.wholeValue) {
                        return null;
                    }

                    return momentType;
                });

                momentTypes = compact(momentTypes);
            }

            // Trim Final.
            if (trimFinal && momentTypes.length === 1 && !momentTypes[0].wholeValue && !(!trunc && momentTypes[0].isSmallest && momentTypes[0].rawValue < minValue)) {
                momentTypes = [];
            }
        }

        if (returnMomentTypes) {
            return momentTypes;
        }

        // Localize and pluralize unit labels.
        each(tokens, function (token) {
            var key = momentTokens[token.type];

            var momentType = find(momentTypes, function (momentType) {
                return momentType.type === token.type;
            });

            if (!key || !momentType) {
                return;
            }

            var values = momentType.formattedValueEn.split(".");

            values[0] = parseInt(values[0], 10);

            if (values[1]) {
                values[1] = parseFloat("0." + values[1], 10);
            } else {
                values[1] = null;
            }

            var pluralKey = localeData.durationPluralKey(key, values[0], values[1]);

            var labels = durationGetLabels(key, localeData);

            var autoLocalized = false;

            var pluralizedLabels = {};

            // Auto-Localized unit labels.
            each(localeData._durationLabelTypes, function (labelType) {
                var label = find(labels, function (label) {
                    return label.type === labelType.type && label.key === pluralKey;
                });

                if (label) {
                    pluralizedLabels[label.type] = label.label;

                    if (stringIncludes(token.text, labelType.string)) {
                        token.text = token.text.replace(labelType.string, label.label);
                        autoLocalized = true;
                    }
                }
            });

            // Auto-pluralized unit labels.
            if (usePlural && !autoLocalized) {
                labels.sort(durationLabelCompare);

                each(labels, function (label) {
                    if (pluralizedLabels[label.type] === label.label) {
                        if (stringIncludes(token.text, label.label)) {
                            // Stop checking this token if its label is already
                            // correctly pluralized.
                            return false;
                        }

                        // Skip this label if it is correct, but not present in
                        // the token's text.
                        return;
                    }

                    if (stringIncludes(token.text, label.label)) {
                        // Replece this token's label and stop checking.
                        token.text = token.text.replace(label.label, pluralizedLabels[label.type]);
                        return false;
                    }
                });
            }
        });

        // Build ouptut.
        tokens = map(tokens, function (token) {
            if (!token.type) {
                return token.text;
            }

            var momentType = find(momentTypes, function (momentType) {
                return momentType.type === token.type;
            });

            if (!momentType) {
                return "";
            }

            var out = "";

            if (useLeftUnits) {
                out += token.text;
            }

            if (isNegative && isMaxValue || !isNegative && isMinValue) {
                out += "< ";
                isMaxValue = false;
                isMinValue = false;
            }

            if (isNegative && isMinValue || !isNegative && isMaxValue) {
                out += "> ";
                isMaxValue = false;
                isMinValue = false;
            }

            if (isNegative && (momentType.value > 0 || trim === "" || find(stopTrim, momentType.type) || find(outputTypes, momentType.type))) {
                out += "-";
                isNegative = false;
            }

            if (token.type === "milliseconds" && momentType.formattedValueMS) {
                out += momentType.formattedValueMS;
            } else {
                out += momentType.formattedValue;
            }

            if (!useLeftUnits) {
                out += token.text;
            }

            return out;
        });

        // Trim leading and trailing comma, space, colon, and dot.
        return tokens.join("").replace(/(,| |:|\.)*$/, "").replace(/^(,| |:|\.)*/, "");
    }

    // defaultFormatTemplate
    function defaultFormatTemplate() {
        var dur = this.duration;

        var findType = function findType(type) {
            return dur._data[type];
        };

        var firstType = find(this.types, findType);

        var lastType = findLast(this.types, findType);

        // Default template strings for each duration dimension type.
        switch (firstType) {
            case "milliseconds":
                return "S __";
            case "seconds": // Fallthrough.
            case "minutes":
                return "*_MS_";
            case "hours":
                return "_HMS_";
            case "days": // Possible Fallthrough.
                if (firstType === lastType) {
                    return "d __";
                }
            case "weeks":
                if (firstType === lastType) {
                    return "w __";
                }

                if (this.trim === null) {
                    this.trim = "both";
                }

                return "w __, d __, h __";
            case "months": // Possible Fallthrough.
                if (firstType === lastType) {
                    return "M __";
                }
            case "years":
                if (firstType === lastType) {
                    return "y __";
                }

                if (this.trim === null) {
                    this.trim = "both";
                }

                return "y __, M __, d __";
            default:
                if (this.trim === null) {
                    this.trim = "both";
                }

                return "y __, d __, h __, m __, s __";
        }
    }

    // init
    function init(context) {
        if (!context) {
            throw "Moment Duration Format init cannot find moment instance.";
        }

        context.duration.format = durationsFormat;
        context.duration.fn.format = durationFormat;

        context.duration.fn.format.defaults = {
            // Many options are defaulted to `null` to distinguish between
            // 'not set' and 'set to `false`'

            // trim
            // Can be a string, a delimited list of strings, an array of strings,
            // or a boolean.
            // "large" - will trim largest-magnitude zero-value tokens until
            // finding a token with a value, a token identified as 'stopTrim', or
            // the final token of the format string.
            // "small" - will trim smallest-magnitude zero-value tokens until
            // finding a token with a value, a token identified as 'stopTrim', or
            // the final token of the format string.
            // "both" - will execute "large" trim then "small" trim.
            // "mid" - will trim any zero-value tokens that are not the first or
            // last tokens. Usually used in conjunction with "large" or "both".
            // e.g. "large mid" or "both mid".
            // "final" - will trim the final token if it is zero-value. Use this
            // option with "large" or "both" to output an empty string when
            // formatting a zero-value duration. e.g. "large final" or "both final".
            // "all" - Will trim all zero-value tokens. Shorthand for "both mid final".
            // "left" - maps to "large" to support plugin's version 1 API.
            // "right" - maps to "large" to support plugin's version 1 API.
            // `false` - template tokens are not trimmed.
            // `true` - treated as "large".
            // `null` - treated as "large".
            trim: null,

            // stopTrim
            // A moment token string, a delimited set of moment token strings,
            // or an array of moment token strings. Trimming will stop when a token
            // listed in this option is reached. A "*" character in the format
            // template string will also mark a moment token as stopTrim.
            // e.g. "d [days] *h:mm:ss" will always stop trimming at the 'hours' token.
            stopTrim: null,

            // largest
            // Set to a positive integer to output only the "n" largest-magnitude
            // moment tokens that have a value. All lesser-magnitude moment tokens
            // will be ignored. This option takes effect even if `trim` is set
            // to `false`.
            largest: null,

            // maxValue
            // Use `maxValue` to render generalized output for large duration values,
            // e.g. `"> 60 days"`. `maxValue` must be a positive integer and is
            /// applied to the greatest-magnitude moment token in the format template.
            maxValue: null,

            // minValue
            // Use `minValue` to render generalized output for small duration values,
            // e.g. `"< 5 minutes"`. `minValue` must be a positive integer and is
            // applied to the least-magnitude moment token in the format template.
            minValue: null,

            // precision
            // If a positive integer, number of decimal fraction digits to render.
            // If a negative integer, number of integer place digits to truncate to 0.
            // If `useSignificantDigits` is set to `true` and `precision` is a positive
            // integer, sets the maximum number of significant digits used in the
            // formatted output.
            precision: 0,

            // trunc
            // Default behavior rounds final token value. Set to `true` to
            // truncate final token value, which was the default behavior in
            // version 1 of this plugin.
            trunc: false,

            // forceLength
            // Force first moment token with a value to render at full length
            // even when template is trimmed and first moment token has length of 1.
            forceLength: null,

            // userLocale
            // Formatted numerical output is rendered using `toLocaleString`
            // and the locale of the user's environment. Set this option to render
            // numerical output using a different locale. Unit names are rendered
            // and detected using the locale set in moment.js, which can be different
            // from the locale of user's environment.
            userLocale: null,

            // usePlural
            // Will automatically singularize or pluralize unit names when they
            // appear in the text associated with each moment token. Standard and
            // short unit labels are singularized and pluralized, based on locale.
            // e.g. in english, "1 second" or "1 sec" would be rendered instead
            // of "1 seconds" or "1 secs". The default pluralization function
            // renders a plural label for a value with decimal precision.
            // e.g. "1.0 seconds" is never rendered as "1.0 second".
            // Label types and pluralization function are configurable in the
            // localeData extensions.
            usePlural: true,

            // useLeftUnits
            // The text to the right of each moment token in a format string
            // is treated as that token's units for the purposes of trimming,
            // singularizing, and auto-localizing.
            // e.g. "h [hours], m [minutes], s [seconds]".
            // To properly singularize or localize a format string such as
            // "[hours] h, [minutes] m, [seconds] s", where the units appear
            // to the left of each moment token, set useLeftUnits to `true`.
            // This plugin is not tested in the context of rtl text.
            useLeftUnits: false,

            // useGrouping
            // Enables locale-based digit grouping in the formatted output. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
            useGrouping: true,

            // useSignificantDigits
            // Treat the `precision` option as the maximum significant digits
            // to be rendered. Precision must be a positive integer. Significant
            // digits extend across unit types,
            // e.g. "6 hours 37.5 minutes" represents 4 significant digits.
            // Enabling this option causes token length to be ignored. See  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
            useSignificantDigits: false,

            // template
            // The template string used to format the duration. May be a function
            // or a string. Template functions are executed with the `this` binding
            // of the settings object so that template strings may be dynamically
            // generated based on the duration object (accessible via `this.duration`)
            // or any of the other settings. Leading and trailing space, comma,
            // period, and colon characters are trimmed from the resulting string.
            template: defaultFormatTemplate,

            // useToLocaleString
            // Set this option to `false` to ignore the `toLocaleString` feature
            // test and force the use of the `formatNumber` fallback function
            // included in this plugin.
            useToLocaleString: true,

            // formatNumber fallback options.
            // When `toLocaleString` is detected and passes the feature test, the
            // following options will have no effect: `toLocaleString` will be used
            // for formatting and the grouping separator, decimal separator, and
            // integer digit grouping will be determined by the user locale.

            // groupingSeparator
            // The integer digit grouping separator used when using the fallback
            // formatNumber function.
            groupingSeparator: ",",

            // decimalSeparator
            // The decimal separator used when using the fallback formatNumber
            // function.
            decimalSeparator: ".",

            // grouping
            // The integer digit grouping used when using the fallback formatNumber
            // function. Must be an array. The default value of `[3]` gives the
            // standard 3-digit thousand/million/billion digit groupings for the
            // "en" locale. Setting this option to `[3, 2]` would generate the
            // thousand/lakh/crore digit groupings used in the "en-IN" locale.
            grouping: [3]
        };

        context.updateLocale('en', engLocale);
    }

    // Run feature tests for `Number#toLocaleString`.
    toLocaleStringWorks = featureTestToLocaleString();
    toLocaleStringRoundingWorks = toLocaleStringWorks && featureTestToLocaleStringRounding();

    // Initialize duration format on the global moment instance.
    init(moment);

    // Return the init function so that duration format can be
    // initialized on other moment instances.
    return init;
});

},{"moment":7}],7:[function(require,module,exports){
//! moment.js

;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.moment = factory()
}(this, (function () { 'use strict';

var hookCallback;

function hooks () {
    return hookCallback.apply(null, arguments);
}

// This is done to register the method called with moment()
// without creating circular dependencies.
function setHookCallback (callback) {
    hookCallback = callback;
}

function isArray(input) {
    return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
}

function isObject(input) {
    // IE8 will treat undefined and null as object if it wasn't for
    // input != null
    return input != null && Object.prototype.toString.call(input) === '[object Object]';
}

function isObjectEmpty(obj) {
    if (Object.getOwnPropertyNames) {
        return (Object.getOwnPropertyNames(obj).length === 0);
    } else {
        var k;
        for (k in obj) {
            if (obj.hasOwnProperty(k)) {
                return false;
            }
        }
        return true;
    }
}

function isUndefined(input) {
    return input === void 0;
}

function isNumber(input) {
    return typeof input === 'number' || Object.prototype.toString.call(input) === '[object Number]';
}

function isDate(input) {
    return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
}

function map(arr, fn) {
    var res = [], i;
    for (i = 0; i < arr.length; ++i) {
        res.push(fn(arr[i], i));
    }
    return res;
}

function hasOwnProp(a, b) {
    return Object.prototype.hasOwnProperty.call(a, b);
}

function extend(a, b) {
    for (var i in b) {
        if (hasOwnProp(b, i)) {
            a[i] = b[i];
        }
    }

    if (hasOwnProp(b, 'toString')) {
        a.toString = b.toString;
    }

    if (hasOwnProp(b, 'valueOf')) {
        a.valueOf = b.valueOf;
    }

    return a;
}

function createUTC (input, format, locale, strict) {
    return createLocalOrUTC(input, format, locale, strict, true).utc();
}

function defaultParsingFlags() {
    // We need to deep clone this object.
    return {
        empty           : false,
        unusedTokens    : [],
        unusedInput     : [],
        overflow        : -2,
        charsLeftOver   : 0,
        nullInput       : false,
        invalidMonth    : null,
        invalidFormat   : false,
        userInvalidated : false,
        iso             : false,
        parsedDateParts : [],
        meridiem        : null,
        rfc2822         : false,
        weekdayMismatch : false
    };
}

function getParsingFlags(m) {
    if (m._pf == null) {
        m._pf = defaultParsingFlags();
    }
    return m._pf;
}

var some;
if (Array.prototype.some) {
    some = Array.prototype.some;
} else {
    some = function (fun) {
        var t = Object(this);
        var len = t.length >>> 0;

        for (var i = 0; i < len; i++) {
            if (i in t && fun.call(this, t[i], i, t)) {
                return true;
            }
        }

        return false;
    };
}

function isValid(m) {
    if (m._isValid == null) {
        var flags = getParsingFlags(m);
        var parsedParts = some.call(flags.parsedDateParts, function (i) {
            return i != null;
        });
        var isNowValid = !isNaN(m._d.getTime()) &&
            flags.overflow < 0 &&
            !flags.empty &&
            !flags.invalidMonth &&
            !flags.invalidWeekday &&
            !flags.weekdayMismatch &&
            !flags.nullInput &&
            !flags.invalidFormat &&
            !flags.userInvalidated &&
            (!flags.meridiem || (flags.meridiem && parsedParts));

        if (m._strict) {
            isNowValid = isNowValid &&
                flags.charsLeftOver === 0 &&
                flags.unusedTokens.length === 0 &&
                flags.bigHour === undefined;
        }

        if (Object.isFrozen == null || !Object.isFrozen(m)) {
            m._isValid = isNowValid;
        }
        else {
            return isNowValid;
        }
    }
    return m._isValid;
}

function createInvalid (flags) {
    var m = createUTC(NaN);
    if (flags != null) {
        extend(getParsingFlags(m), flags);
    }
    else {
        getParsingFlags(m).userInvalidated = true;
    }

    return m;
}

// Plugins that add properties should also add the key here (null value),
// so we can properly clone ourselves.
var momentProperties = hooks.momentProperties = [];

function copyConfig(to, from) {
    var i, prop, val;

    if (!isUndefined(from._isAMomentObject)) {
        to._isAMomentObject = from._isAMomentObject;
    }
    if (!isUndefined(from._i)) {
        to._i = from._i;
    }
    if (!isUndefined(from._f)) {
        to._f = from._f;
    }
    if (!isUndefined(from._l)) {
        to._l = from._l;
    }
    if (!isUndefined(from._strict)) {
        to._strict = from._strict;
    }
    if (!isUndefined(from._tzm)) {
        to._tzm = from._tzm;
    }
    if (!isUndefined(from._isUTC)) {
        to._isUTC = from._isUTC;
    }
    if (!isUndefined(from._offset)) {
        to._offset = from._offset;
    }
    if (!isUndefined(from._pf)) {
        to._pf = getParsingFlags(from);
    }
    if (!isUndefined(from._locale)) {
        to._locale = from._locale;
    }

    if (momentProperties.length > 0) {
        for (i = 0; i < momentProperties.length; i++) {
            prop = momentProperties[i];
            val = from[prop];
            if (!isUndefined(val)) {
                to[prop] = val;
            }
        }
    }

    return to;
}

var updateInProgress = false;

// Moment prototype object
function Moment(config) {
    copyConfig(this, config);
    this._d = new Date(config._d != null ? config._d.getTime() : NaN);
    if (!this.isValid()) {
        this._d = new Date(NaN);
    }
    // Prevent infinite loop in case updateOffset creates new moment
    // objects.
    if (updateInProgress === false) {
        updateInProgress = true;
        hooks.updateOffset(this);
        updateInProgress = false;
    }
}

function isMoment (obj) {
    return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
}

function absFloor (number) {
    if (number < 0) {
        // -0 -> 0
        return Math.ceil(number) || 0;
    } else {
        return Math.floor(number);
    }
}

function toInt(argumentForCoercion) {
    var coercedNumber = +argumentForCoercion,
        value = 0;

    if (coercedNumber !== 0 && isFinite(coercedNumber)) {
        value = absFloor(coercedNumber);
    }

    return value;
}

// compare two arrays, return the number of differences
function compareArrays(array1, array2, dontConvert) {
    var len = Math.min(array1.length, array2.length),
        lengthDiff = Math.abs(array1.length - array2.length),
        diffs = 0,
        i;
    for (i = 0; i < len; i++) {
        if ((dontConvert && array1[i] !== array2[i]) ||
            (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
            diffs++;
        }
    }
    return diffs + lengthDiff;
}

function warn(msg) {
    if (hooks.suppressDeprecationWarnings === false &&
            (typeof console !==  'undefined') && console.warn) {
        console.warn('Deprecation warning: ' + msg);
    }
}

function deprecate(msg, fn) {
    var firstTime = true;

    return extend(function () {
        if (hooks.deprecationHandler != null) {
            hooks.deprecationHandler(null, msg);
        }
        if (firstTime) {
            var args = [];
            var arg;
            for (var i = 0; i < arguments.length; i++) {
                arg = '';
                if (typeof arguments[i] === 'object') {
                    arg += '\n[' + i + '] ';
                    for (var key in arguments[0]) {
                        arg += key + ': ' + arguments[0][key] + ', ';
                    }
                    arg = arg.slice(0, -2); // Remove trailing comma and space
                } else {
                    arg = arguments[i];
                }
                args.push(arg);
            }
            warn(msg + '\nArguments: ' + Array.prototype.slice.call(args).join('') + '\n' + (new Error()).stack);
            firstTime = false;
        }
        return fn.apply(this, arguments);
    }, fn);
}

var deprecations = {};

function deprecateSimple(name, msg) {
    if (hooks.deprecationHandler != null) {
        hooks.deprecationHandler(name, msg);
    }
    if (!deprecations[name]) {
        warn(msg);
        deprecations[name] = true;
    }
}

hooks.suppressDeprecationWarnings = false;
hooks.deprecationHandler = null;

function isFunction(input) {
    return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
}

function set (config) {
    var prop, i;
    for (i in config) {
        prop = config[i];
        if (isFunction(prop)) {
            this[i] = prop;
        } else {
            this['_' + i] = prop;
        }
    }
    this._config = config;
    // Lenient ordinal parsing accepts just a number in addition to
    // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
    // TODO: Remove "ordinalParse" fallback in next major release.
    this._dayOfMonthOrdinalParseLenient = new RegExp(
        (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
            '|' + (/\d{1,2}/).source);
}

function mergeConfigs(parentConfig, childConfig) {
    var res = extend({}, parentConfig), prop;
    for (prop in childConfig) {
        if (hasOwnProp(childConfig, prop)) {
            if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
                res[prop] = {};
                extend(res[prop], parentConfig[prop]);
                extend(res[prop], childConfig[prop]);
            } else if (childConfig[prop] != null) {
                res[prop] = childConfig[prop];
            } else {
                delete res[prop];
            }
        }
    }
    for (prop in parentConfig) {
        if (hasOwnProp(parentConfig, prop) &&
                !hasOwnProp(childConfig, prop) &&
                isObject(parentConfig[prop])) {
            // make sure changes to properties don't modify parent config
            res[prop] = extend({}, res[prop]);
        }
    }
    return res;
}

function Locale(config) {
    if (config != null) {
        this.set(config);
    }
}

var keys;

if (Object.keys) {
    keys = Object.keys;
} else {
    keys = function (obj) {
        var i, res = [];
        for (i in obj) {
            if (hasOwnProp(obj, i)) {
                res.push(i);
            }
        }
        return res;
    };
}

var defaultCalendar = {
    sameDay : '[Today at] LT',
    nextDay : '[Tomorrow at] LT',
    nextWeek : 'dddd [at] LT',
    lastDay : '[Yesterday at] LT',
    lastWeek : '[Last] dddd [at] LT',
    sameElse : 'L'
};

function calendar (key, mom, now) {
    var output = this._calendar[key] || this._calendar['sameElse'];
    return isFunction(output) ? output.call(mom, now) : output;
}

var defaultLongDateFormat = {
    LTS  : 'h:mm:ss A',
    LT   : 'h:mm A',
    L    : 'MM/DD/YYYY',
    LL   : 'MMMM D, YYYY',
    LLL  : 'MMMM D, YYYY h:mm A',
    LLLL : 'dddd, MMMM D, YYYY h:mm A'
};

function longDateFormat (key) {
    var format = this._longDateFormat[key],
        formatUpper = this._longDateFormat[key.toUpperCase()];

    if (format || !formatUpper) {
        return format;
    }

    this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
        return val.slice(1);
    });

    return this._longDateFormat[key];
}

var defaultInvalidDate = 'Invalid date';

function invalidDate () {
    return this._invalidDate;
}

var defaultOrdinal = '%d';
var defaultDayOfMonthOrdinalParse = /\d{1,2}/;

function ordinal (number) {
    return this._ordinal.replace('%d', number);
}

var defaultRelativeTime = {
    future : 'in %s',
    past   : '%s ago',
    s  : 'a few seconds',
    ss : '%d seconds',
    m  : 'a minute',
    mm : '%d minutes',
    h  : 'an hour',
    hh : '%d hours',
    d  : 'a day',
    dd : '%d days',
    M  : 'a month',
    MM : '%d months',
    y  : 'a year',
    yy : '%d years'
};

function relativeTime (number, withoutSuffix, string, isFuture) {
    var output = this._relativeTime[string];
    return (isFunction(output)) ?
        output(number, withoutSuffix, string, isFuture) :
        output.replace(/%d/i, number);
}

function pastFuture (diff, output) {
    var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
    return isFunction(format) ? format(output) : format.replace(/%s/i, output);
}

var aliases = {};

function addUnitAlias (unit, shorthand) {
    var lowerCase = unit.toLowerCase();
    aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
}

function normalizeUnits(units) {
    return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
}

function normalizeObjectUnits(inputObject) {
    var normalizedInput = {},
        normalizedProp,
        prop;

    for (prop in inputObject) {
        if (hasOwnProp(inputObject, prop)) {
            normalizedProp = normalizeUnits(prop);
            if (normalizedProp) {
                normalizedInput[normalizedProp] = inputObject[prop];
            }
        }
    }

    return normalizedInput;
}

var priorities = {};

function addUnitPriority(unit, priority) {
    priorities[unit] = priority;
}

function getPrioritizedUnits(unitsObj) {
    var units = [];
    for (var u in unitsObj) {
        units.push({unit: u, priority: priorities[u]});
    }
    units.sort(function (a, b) {
        return a.priority - b.priority;
    });
    return units;
}

function zeroFill(number, targetLength, forceSign) {
    var absNumber = '' + Math.abs(number),
        zerosToFill = targetLength - absNumber.length,
        sign = number >= 0;
    return (sign ? (forceSign ? '+' : '') : '-') +
        Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
}

var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

var formatFunctions = {};

var formatTokenFunctions = {};

// token:    'M'
// padded:   ['MM', 2]
// ordinal:  'Mo'
// callback: function () { this.month() + 1 }
function addFormatToken (token, padded, ordinal, callback) {
    var func = callback;
    if (typeof callback === 'string') {
        func = function () {
            return this[callback]();
        };
    }
    if (token) {
        formatTokenFunctions[token] = func;
    }
    if (padded) {
        formatTokenFunctions[padded[0]] = function () {
            return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
        };
    }
    if (ordinal) {
        formatTokenFunctions[ordinal] = function () {
            return this.localeData().ordinal(func.apply(this, arguments), token);
        };
    }
}

function removeFormattingTokens(input) {
    if (input.match(/\[[\s\S]/)) {
        return input.replace(/^\[|\]$/g, '');
    }
    return input.replace(/\\/g, '');
}

function makeFormatFunction(format) {
    var array = format.match(formattingTokens), i, length;

    for (i = 0, length = array.length; i < length; i++) {
        if (formatTokenFunctions[array[i]]) {
            array[i] = formatTokenFunctions[array[i]];
        } else {
            array[i] = removeFormattingTokens(array[i]);
        }
    }

    return function (mom) {
        var output = '', i;
        for (i = 0; i < length; i++) {
            output += isFunction(array[i]) ? array[i].call(mom, format) : array[i];
        }
        return output;
    };
}

// format date using native date object
function formatMoment(m, format) {
    if (!m.isValid()) {
        return m.localeData().invalidDate();
    }

    format = expandFormat(format, m.localeData());
    formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

    return formatFunctions[format](m);
}

function expandFormat(format, locale) {
    var i = 5;

    function replaceLongDateFormatTokens(input) {
        return locale.longDateFormat(input) || input;
    }

    localFormattingTokens.lastIndex = 0;
    while (i >= 0 && localFormattingTokens.test(format)) {
        format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
        localFormattingTokens.lastIndex = 0;
        i -= 1;
    }

    return format;
}

var match1         = /\d/;            //       0 - 9
var match2         = /\d\d/;          //      00 - 99
var match3         = /\d{3}/;         //     000 - 999
var match4         = /\d{4}/;         //    0000 - 9999
var match6         = /[+-]?\d{6}/;    // -999999 - 999999
var match1to2      = /\d\d?/;         //       0 - 99
var match3to4      = /\d\d\d\d?/;     //     999 - 9999
var match5to6      = /\d\d\d\d\d\d?/; //   99999 - 999999
var match1to3      = /\d{1,3}/;       //       0 - 999
var match1to4      = /\d{1,4}/;       //       0 - 9999
var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

var matchUnsigned  = /\d+/;           //       0 - inf
var matchSigned    = /[+-]?\d+/;      //    -inf - inf

var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

// any word (or two) characters or numbers including two/three word month in arabic.
// includes scottish gaelic two word and hyphenated months
var matchWord = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i;

var regexes = {};

function addRegexToken (token, regex, strictRegex) {
    regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
        return (isStrict && strictRegex) ? strictRegex : regex;
    };
}

function getParseRegexForToken (token, config) {
    if (!hasOwnProp(regexes, token)) {
        return new RegExp(unescapeFormat(token));
    }

    return regexes[token](config._strict, config._locale);
}

// Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
function unescapeFormat(s) {
    return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
        return p1 || p2 || p3 || p4;
    }));
}

function regexEscape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

var tokens = {};

function addParseToken (token, callback) {
    var i, func = callback;
    if (typeof token === 'string') {
        token = [token];
    }
    if (isNumber(callback)) {
        func = function (input, array) {
            array[callback] = toInt(input);
        };
    }
    for (i = 0; i < token.length; i++) {
        tokens[token[i]] = func;
    }
}

function addWeekParseToken (token, callback) {
    addParseToken(token, function (input, array, config, token) {
        config._w = config._w || {};
        callback(input, config._w, config, token);
    });
}

function addTimeToArrayFromToken(token, input, config) {
    if (input != null && hasOwnProp(tokens, token)) {
        tokens[token](input, config._a, config, token);
    }
}

var YEAR = 0;
var MONTH = 1;
var DATE = 2;
var HOUR = 3;
var MINUTE = 4;
var SECOND = 5;
var MILLISECOND = 6;
var WEEK = 7;
var WEEKDAY = 8;

// FORMATTING

addFormatToken('Y', 0, 0, function () {
    var y = this.year();
    return y <= 9999 ? '' + y : '+' + y;
});

addFormatToken(0, ['YY', 2], 0, function () {
    return this.year() % 100;
});

addFormatToken(0, ['YYYY',   4],       0, 'year');
addFormatToken(0, ['YYYYY',  5],       0, 'year');
addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

// ALIASES

addUnitAlias('year', 'y');

// PRIORITIES

addUnitPriority('year', 1);

// PARSING

addRegexToken('Y',      matchSigned);
addRegexToken('YY',     match1to2, match2);
addRegexToken('YYYY',   match1to4, match4);
addRegexToken('YYYYY',  match1to6, match6);
addRegexToken('YYYYYY', match1to6, match6);

addParseToken(['YYYYY', 'YYYYYY'], YEAR);
addParseToken('YYYY', function (input, array) {
    array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
});
addParseToken('YY', function (input, array) {
    array[YEAR] = hooks.parseTwoDigitYear(input);
});
addParseToken('Y', function (input, array) {
    array[YEAR] = parseInt(input, 10);
});

// HELPERS

function daysInYear(year) {
    return isLeapYear(year) ? 366 : 365;
}

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// HOOKS

hooks.parseTwoDigitYear = function (input) {
    return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
};

// MOMENTS

var getSetYear = makeGetSet('FullYear', true);

function getIsLeapYear () {
    return isLeapYear(this.year());
}

function makeGetSet (unit, keepTime) {
    return function (value) {
        if (value != null) {
            set$1(this, unit, value);
            hooks.updateOffset(this, keepTime);
            return this;
        } else {
            return get(this, unit);
        }
    };
}

function get (mom, unit) {
    return mom.isValid() ?
        mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
}

function set$1 (mom, unit, value) {
    if (mom.isValid() && !isNaN(value)) {
        if (unit === 'FullYear' && isLeapYear(mom.year()) && mom.month() === 1 && mom.date() === 29) {
            mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value, mom.month(), daysInMonth(value, mom.month()));
        }
        else {
            mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }
}

// MOMENTS

function stringGet (units) {
    units = normalizeUnits(units);
    if (isFunction(this[units])) {
        return this[units]();
    }
    return this;
}


function stringSet (units, value) {
    if (typeof units === 'object') {
        units = normalizeObjectUnits(units);
        var prioritized = getPrioritizedUnits(units);
        for (var i = 0; i < prioritized.length; i++) {
            this[prioritized[i].unit](units[prioritized[i].unit]);
        }
    } else {
        units = normalizeUnits(units);
        if (isFunction(this[units])) {
            return this[units](value);
        }
    }
    return this;
}

function mod(n, x) {
    return ((n % x) + x) % x;
}

var indexOf;

if (Array.prototype.indexOf) {
    indexOf = Array.prototype.indexOf;
} else {
    indexOf = function (o) {
        // I know
        var i;
        for (i = 0; i < this.length; ++i) {
            if (this[i] === o) {
                return i;
            }
        }
        return -1;
    };
}

function daysInMonth(year, month) {
    if (isNaN(year) || isNaN(month)) {
        return NaN;
    }
    var modMonth = mod(month, 12);
    year += (month - modMonth) / 12;
    return modMonth === 1 ? (isLeapYear(year) ? 29 : 28) : (31 - modMonth % 7 % 2);
}

// FORMATTING

addFormatToken('M', ['MM', 2], 'Mo', function () {
    return this.month() + 1;
});

addFormatToken('MMM', 0, 0, function (format) {
    return this.localeData().monthsShort(this, format);
});

addFormatToken('MMMM', 0, 0, function (format) {
    return this.localeData().months(this, format);
});

// ALIASES

addUnitAlias('month', 'M');

// PRIORITY

addUnitPriority('month', 8);

// PARSING

addRegexToken('M',    match1to2);
addRegexToken('MM',   match1to2, match2);
addRegexToken('MMM',  function (isStrict, locale) {
    return locale.monthsShortRegex(isStrict);
});
addRegexToken('MMMM', function (isStrict, locale) {
    return locale.monthsRegex(isStrict);
});

addParseToken(['M', 'MM'], function (input, array) {
    array[MONTH] = toInt(input) - 1;
});

addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
    var month = config._locale.monthsParse(input, token, config._strict);
    // if we didn't find a month name, mark the date as invalid.
    if (month != null) {
        array[MONTH] = month;
    } else {
        getParsingFlags(config).invalidMonth = input;
    }
});

// LOCALES

var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/;
var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
function localeMonths (m, format) {
    if (!m) {
        return isArray(this._months) ? this._months :
            this._months['standalone'];
    }
    return isArray(this._months) ? this._months[m.month()] :
        this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
}

var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
function localeMonthsShort (m, format) {
    if (!m) {
        return isArray(this._monthsShort) ? this._monthsShort :
            this._monthsShort['standalone'];
    }
    return isArray(this._monthsShort) ? this._monthsShort[m.month()] :
        this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
}

function handleStrictParse(monthName, format, strict) {
    var i, ii, mom, llc = monthName.toLocaleLowerCase();
    if (!this._monthsParse) {
        // this is not used
        this._monthsParse = [];
        this._longMonthsParse = [];
        this._shortMonthsParse = [];
        for (i = 0; i < 12; ++i) {
            mom = createUTC([2000, i]);
            this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
            this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
        }
    }

    if (strict) {
        if (format === 'MMM') {
            ii = indexOf.call(this._shortMonthsParse, llc);
            return ii !== -1 ? ii : null;
        } else {
            ii = indexOf.call(this._longMonthsParse, llc);
            return ii !== -1 ? ii : null;
        }
    } else {
        if (format === 'MMM') {
            ii = indexOf.call(this._shortMonthsParse, llc);
            if (ii !== -1) {
                return ii;
            }
            ii = indexOf.call(this._longMonthsParse, llc);
            return ii !== -1 ? ii : null;
        } else {
            ii = indexOf.call(this._longMonthsParse, llc);
            if (ii !== -1) {
                return ii;
            }
            ii = indexOf.call(this._shortMonthsParse, llc);
            return ii !== -1 ? ii : null;
        }
    }
}

function localeMonthsParse (monthName, format, strict) {
    var i, mom, regex;

    if (this._monthsParseExact) {
        return handleStrictParse.call(this, monthName, format, strict);
    }

    if (!this._monthsParse) {
        this._monthsParse = [];
        this._longMonthsParse = [];
        this._shortMonthsParse = [];
    }

    // TODO: add sorting
    // Sorting makes sure if one month (or abbr) is a prefix of another
    // see sorting in computeMonthsParse
    for (i = 0; i < 12; i++) {
        // make the regex if we don't have it already
        mom = createUTC([2000, i]);
        if (strict && !this._longMonthsParse[i]) {
            this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
            this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
        }
        if (!strict && !this._monthsParse[i]) {
            regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
            this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
        }
        // test the regex
        if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
            return i;
        } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
            return i;
        } else if (!strict && this._monthsParse[i].test(monthName)) {
            return i;
        }
    }
}

// MOMENTS

function setMonth (mom, value) {
    var dayOfMonth;

    if (!mom.isValid()) {
        // No op
        return mom;
    }

    if (typeof value === 'string') {
        if (/^\d+$/.test(value)) {
            value = toInt(value);
        } else {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (!isNumber(value)) {
                return mom;
            }
        }
    }

    dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
    mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
    return mom;
}

function getSetMonth (value) {
    if (value != null) {
        setMonth(this, value);
        hooks.updateOffset(this, true);
        return this;
    } else {
        return get(this, 'Month');
    }
}

function getDaysInMonth () {
    return daysInMonth(this.year(), this.month());
}

var defaultMonthsShortRegex = matchWord;
function monthsShortRegex (isStrict) {
    if (this._monthsParseExact) {
        if (!hasOwnProp(this, '_monthsRegex')) {
            computeMonthsParse.call(this);
        }
        if (isStrict) {
            return this._monthsShortStrictRegex;
        } else {
            return this._monthsShortRegex;
        }
    } else {
        if (!hasOwnProp(this, '_monthsShortRegex')) {
            this._monthsShortRegex = defaultMonthsShortRegex;
        }
        return this._monthsShortStrictRegex && isStrict ?
            this._monthsShortStrictRegex : this._monthsShortRegex;
    }
}

var defaultMonthsRegex = matchWord;
function monthsRegex (isStrict) {
    if (this._monthsParseExact) {
        if (!hasOwnProp(this, '_monthsRegex')) {
            computeMonthsParse.call(this);
        }
        if (isStrict) {
            return this._monthsStrictRegex;
        } else {
            return this._monthsRegex;
        }
    } else {
        if (!hasOwnProp(this, '_monthsRegex')) {
            this._monthsRegex = defaultMonthsRegex;
        }
        return this._monthsStrictRegex && isStrict ?
            this._monthsStrictRegex : this._monthsRegex;
    }
}

function computeMonthsParse () {
    function cmpLenRev(a, b) {
        return b.length - a.length;
    }

    var shortPieces = [], longPieces = [], mixedPieces = [],
        i, mom;
    for (i = 0; i < 12; i++) {
        // make the regex if we don't have it already
        mom = createUTC([2000, i]);
        shortPieces.push(this.monthsShort(mom, ''));
        longPieces.push(this.months(mom, ''));
        mixedPieces.push(this.months(mom, ''));
        mixedPieces.push(this.monthsShort(mom, ''));
    }
    // Sorting makes sure if one month (or abbr) is a prefix of another it
    // will match the longer piece.
    shortPieces.sort(cmpLenRev);
    longPieces.sort(cmpLenRev);
    mixedPieces.sort(cmpLenRev);
    for (i = 0; i < 12; i++) {
        shortPieces[i] = regexEscape(shortPieces[i]);
        longPieces[i] = regexEscape(longPieces[i]);
    }
    for (i = 0; i < 24; i++) {
        mixedPieces[i] = regexEscape(mixedPieces[i]);
    }

    this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    this._monthsShortRegex = this._monthsRegex;
    this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
    this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
}

function createDate (y, m, d, h, M, s, ms) {
    // can't just apply() to create a date:
    // https://stackoverflow.com/q/181348
    var date = new Date(y, m, d, h, M, s, ms);

    // the date constructor remaps years 0-99 to 1900-1999
    if (y < 100 && y >= 0 && isFinite(date.getFullYear())) {
        date.setFullYear(y);
    }
    return date;
}

function createUTCDate (y) {
    var date = new Date(Date.UTC.apply(null, arguments));

    // the Date.UTC function remaps years 0-99 to 1900-1999
    if (y < 100 && y >= 0 && isFinite(date.getUTCFullYear())) {
        date.setUTCFullYear(y);
    }
    return date;
}

// start-of-first-week - start-of-year
function firstWeekOffset(year, dow, doy) {
    var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
        fwd = 7 + dow - doy,
        // first-week day local weekday -- which local weekday is fwd
        fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

    return -fwdlw + fwd - 1;
}

// https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
    var localWeekday = (7 + weekday - dow) % 7,
        weekOffset = firstWeekOffset(year, dow, doy),
        dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
        resYear, resDayOfYear;

    if (dayOfYear <= 0) {
        resYear = year - 1;
        resDayOfYear = daysInYear(resYear) + dayOfYear;
    } else if (dayOfYear > daysInYear(year)) {
        resYear = year + 1;
        resDayOfYear = dayOfYear - daysInYear(year);
    } else {
        resYear = year;
        resDayOfYear = dayOfYear;
    }

    return {
        year: resYear,
        dayOfYear: resDayOfYear
    };
}

function weekOfYear(mom, dow, doy) {
    var weekOffset = firstWeekOffset(mom.year(), dow, doy),
        week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
        resWeek, resYear;

    if (week < 1) {
        resYear = mom.year() - 1;
        resWeek = week + weeksInYear(resYear, dow, doy);
    } else if (week > weeksInYear(mom.year(), dow, doy)) {
        resWeek = week - weeksInYear(mom.year(), dow, doy);
        resYear = mom.year() + 1;
    } else {
        resYear = mom.year();
        resWeek = week;
    }

    return {
        week: resWeek,
        year: resYear
    };
}

function weeksInYear(year, dow, doy) {
    var weekOffset = firstWeekOffset(year, dow, doy),
        weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
    return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
}

// FORMATTING

addFormatToken('w', ['ww', 2], 'wo', 'week');
addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

// ALIASES

addUnitAlias('week', 'w');
addUnitAlias('isoWeek', 'W');

// PRIORITIES

addUnitPriority('week', 5);
addUnitPriority('isoWeek', 5);

// PARSING

addRegexToken('w',  match1to2);
addRegexToken('ww', match1to2, match2);
addRegexToken('W',  match1to2);
addRegexToken('WW', match1to2, match2);

addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
    week[token.substr(0, 1)] = toInt(input);
});

// HELPERS

// LOCALES

function localeWeek (mom) {
    return weekOfYear(mom, this._week.dow, this._week.doy).week;
}

var defaultLocaleWeek = {
    dow : 0, // Sunday is the first day of the week.
    doy : 6  // The week that contains Jan 1st is the first week of the year.
};

function localeFirstDayOfWeek () {
    return this._week.dow;
}

function localeFirstDayOfYear () {
    return this._week.doy;
}

// MOMENTS

function getSetWeek (input) {
    var week = this.localeData().week(this);
    return input == null ? week : this.add((input - week) * 7, 'd');
}

function getSetISOWeek (input) {
    var week = weekOfYear(this, 1, 4).week;
    return input == null ? week : this.add((input - week) * 7, 'd');
}

// FORMATTING

addFormatToken('d', 0, 'do', 'day');

addFormatToken('dd', 0, 0, function (format) {
    return this.localeData().weekdaysMin(this, format);
});

addFormatToken('ddd', 0, 0, function (format) {
    return this.localeData().weekdaysShort(this, format);
});

addFormatToken('dddd', 0, 0, function (format) {
    return this.localeData().weekdays(this, format);
});

addFormatToken('e', 0, 0, 'weekday');
addFormatToken('E', 0, 0, 'isoWeekday');

// ALIASES

addUnitAlias('day', 'd');
addUnitAlias('weekday', 'e');
addUnitAlias('isoWeekday', 'E');

// PRIORITY
addUnitPriority('day', 11);
addUnitPriority('weekday', 11);
addUnitPriority('isoWeekday', 11);

// PARSING

addRegexToken('d',    match1to2);
addRegexToken('e',    match1to2);
addRegexToken('E',    match1to2);
addRegexToken('dd',   function (isStrict, locale) {
    return locale.weekdaysMinRegex(isStrict);
});
addRegexToken('ddd',   function (isStrict, locale) {
    return locale.weekdaysShortRegex(isStrict);
});
addRegexToken('dddd',   function (isStrict, locale) {
    return locale.weekdaysRegex(isStrict);
});

addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
    var weekday = config._locale.weekdaysParse(input, token, config._strict);
    // if we didn't get a weekday name, mark the date as invalid
    if (weekday != null) {
        week.d = weekday;
    } else {
        getParsingFlags(config).invalidWeekday = input;
    }
});

addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
    week[token] = toInt(input);
});

// HELPERS

function parseWeekday(input, locale) {
    if (typeof input !== 'string') {
        return input;
    }

    if (!isNaN(input)) {
        return parseInt(input, 10);
    }

    input = locale.weekdaysParse(input);
    if (typeof input === 'number') {
        return input;
    }

    return null;
}

function parseIsoWeekday(input, locale) {
    if (typeof input === 'string') {
        return locale.weekdaysParse(input) % 7 || 7;
    }
    return isNaN(input) ? null : input;
}

// LOCALES

var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
function localeWeekdays (m, format) {
    if (!m) {
        return isArray(this._weekdays) ? this._weekdays :
            this._weekdays['standalone'];
    }
    return isArray(this._weekdays) ? this._weekdays[m.day()] :
        this._weekdays[this._weekdays.isFormat.test(format) ? 'format' : 'standalone'][m.day()];
}

var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
function localeWeekdaysShort (m) {
    return (m) ? this._weekdaysShort[m.day()] : this._weekdaysShort;
}

var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
function localeWeekdaysMin (m) {
    return (m) ? this._weekdaysMin[m.day()] : this._weekdaysMin;
}

function handleStrictParse$1(weekdayName, format, strict) {
    var i, ii, mom, llc = weekdayName.toLocaleLowerCase();
    if (!this._weekdaysParse) {
        this._weekdaysParse = [];
        this._shortWeekdaysParse = [];
        this._minWeekdaysParse = [];

        for (i = 0; i < 7; ++i) {
            mom = createUTC([2000, 1]).day(i);
            this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
            this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
            this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
        }
    }

    if (strict) {
        if (format === 'dddd') {
            ii = indexOf.call(this._weekdaysParse, llc);
            return ii !== -1 ? ii : null;
        } else if (format === 'ddd') {
            ii = indexOf.call(this._shortWeekdaysParse, llc);
            return ii !== -1 ? ii : null;
        } else {
            ii = indexOf.call(this._minWeekdaysParse, llc);
            return ii !== -1 ? ii : null;
        }
    } else {
        if (format === 'dddd') {
            ii = indexOf.call(this._weekdaysParse, llc);
            if (ii !== -1) {
                return ii;
            }
            ii = indexOf.call(this._shortWeekdaysParse, llc);
            if (ii !== -1) {
                return ii;
            }
            ii = indexOf.call(this._minWeekdaysParse, llc);
            return ii !== -1 ? ii : null;
        } else if (format === 'ddd') {
            ii = indexOf.call(this._shortWeekdaysParse, llc);
            if (ii !== -1) {
                return ii;
            }
            ii = indexOf.call(this._weekdaysParse, llc);
            if (ii !== -1) {
                return ii;
            }
            ii = indexOf.call(this._minWeekdaysParse, llc);
            return ii !== -1 ? ii : null;
        } else {
            ii = indexOf.call(this._minWeekdaysParse, llc);
            if (ii !== -1) {
                return ii;
            }
            ii = indexOf.call(this._weekdaysParse, llc);
            if (ii !== -1) {
                return ii;
            }
            ii = indexOf.call(this._shortWeekdaysParse, llc);
            return ii !== -1 ? ii : null;
        }
    }
}

function localeWeekdaysParse (weekdayName, format, strict) {
    var i, mom, regex;

    if (this._weekdaysParseExact) {
        return handleStrictParse$1.call(this, weekdayName, format, strict);
    }

    if (!this._weekdaysParse) {
        this._weekdaysParse = [];
        this._minWeekdaysParse = [];
        this._shortWeekdaysParse = [];
        this._fullWeekdaysParse = [];
    }

    for (i = 0; i < 7; i++) {
        // make the regex if we don't have it already

        mom = createUTC([2000, 1]).day(i);
        if (strict && !this._fullWeekdaysParse[i]) {
            this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\.?') + '$', 'i');
            this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\.?') + '$', 'i');
            this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\.?') + '$', 'i');
        }
        if (!this._weekdaysParse[i]) {
            regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
            this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
        }
        // test the regex
        if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
            return i;
        } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
            return i;
        } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
            return i;
        } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
            return i;
        }
    }
}

// MOMENTS

function getSetDayOfWeek (input) {
    if (!this.isValid()) {
        return input != null ? this : NaN;
    }
    var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
    if (input != null) {
        input = parseWeekday(input, this.localeData());
        return this.add(input - day, 'd');
    } else {
        return day;
    }
}

function getSetLocaleDayOfWeek (input) {
    if (!this.isValid()) {
        return input != null ? this : NaN;
    }
    var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
    return input == null ? weekday : this.add(input - weekday, 'd');
}

function getSetISODayOfWeek (input) {
    if (!this.isValid()) {
        return input != null ? this : NaN;
    }

    // behaves the same as moment#day except
    // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
    // as a setter, sunday should belong to the previous week.

    if (input != null) {
        var weekday = parseIsoWeekday(input, this.localeData());
        return this.day(this.day() % 7 ? weekday : weekday - 7);
    } else {
        return this.day() || 7;
    }
}

var defaultWeekdaysRegex = matchWord;
function weekdaysRegex (isStrict) {
    if (this._weekdaysParseExact) {
        if (!hasOwnProp(this, '_weekdaysRegex')) {
            computeWeekdaysParse.call(this);
        }
        if (isStrict) {
            return this._weekdaysStrictRegex;
        } else {
            return this._weekdaysRegex;
        }
    } else {
        if (!hasOwnProp(this, '_weekdaysRegex')) {
            this._weekdaysRegex = defaultWeekdaysRegex;
        }
        return this._weekdaysStrictRegex && isStrict ?
            this._weekdaysStrictRegex : this._weekdaysRegex;
    }
}

var defaultWeekdaysShortRegex = matchWord;
function weekdaysShortRegex (isStrict) {
    if (this._weekdaysParseExact) {
        if (!hasOwnProp(this, '_weekdaysRegex')) {
            computeWeekdaysParse.call(this);
        }
        if (isStrict) {
            return this._weekdaysShortStrictRegex;
        } else {
            return this._weekdaysShortRegex;
        }
    } else {
        if (!hasOwnProp(this, '_weekdaysShortRegex')) {
            this._weekdaysShortRegex = defaultWeekdaysShortRegex;
        }
        return this._weekdaysShortStrictRegex && isStrict ?
            this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
    }
}

var defaultWeekdaysMinRegex = matchWord;
function weekdaysMinRegex (isStrict) {
    if (this._weekdaysParseExact) {
        if (!hasOwnProp(this, '_weekdaysRegex')) {
            computeWeekdaysParse.call(this);
        }
        if (isStrict) {
            return this._weekdaysMinStrictRegex;
        } else {
            return this._weekdaysMinRegex;
        }
    } else {
        if (!hasOwnProp(this, '_weekdaysMinRegex')) {
            this._weekdaysMinRegex = defaultWeekdaysMinRegex;
        }
        return this._weekdaysMinStrictRegex && isStrict ?
            this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
    }
}


function computeWeekdaysParse () {
    function cmpLenRev(a, b) {
        return b.length - a.length;
    }

    var minPieces = [], shortPieces = [], longPieces = [], mixedPieces = [],
        i, mom, minp, shortp, longp;
    for (i = 0; i < 7; i++) {
        // make the regex if we don't have it already
        mom = createUTC([2000, 1]).day(i);
        minp = this.weekdaysMin(mom, '');
        shortp = this.weekdaysShort(mom, '');
        longp = this.weekdays(mom, '');
        minPieces.push(minp);
        shortPieces.push(shortp);
        longPieces.push(longp);
        mixedPieces.push(minp);
        mixedPieces.push(shortp);
        mixedPieces.push(longp);
    }
    // Sorting makes sure if one weekday (or abbr) is a prefix of another it
    // will match the longer piece.
    minPieces.sort(cmpLenRev);
    shortPieces.sort(cmpLenRev);
    longPieces.sort(cmpLenRev);
    mixedPieces.sort(cmpLenRev);
    for (i = 0; i < 7; i++) {
        shortPieces[i] = regexEscape(shortPieces[i]);
        longPieces[i] = regexEscape(longPieces[i]);
        mixedPieces[i] = regexEscape(mixedPieces[i]);
    }

    this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    this._weekdaysShortRegex = this._weekdaysRegex;
    this._weekdaysMinRegex = this._weekdaysRegex;

    this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
    this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
    this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
}

// FORMATTING

function hFormat() {
    return this.hours() % 12 || 12;
}

function kFormat() {
    return this.hours() || 24;
}

addFormatToken('H', ['HH', 2], 0, 'hour');
addFormatToken('h', ['hh', 2], 0, hFormat);
addFormatToken('k', ['kk', 2], 0, kFormat);

addFormatToken('hmm', 0, 0, function () {
    return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
});

addFormatToken('hmmss', 0, 0, function () {
    return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) +
        zeroFill(this.seconds(), 2);
});

addFormatToken('Hmm', 0, 0, function () {
    return '' + this.hours() + zeroFill(this.minutes(), 2);
});

addFormatToken('Hmmss', 0, 0, function () {
    return '' + this.hours() + zeroFill(this.minutes(), 2) +
        zeroFill(this.seconds(), 2);
});

function meridiem (token, lowercase) {
    addFormatToken(token, 0, 0, function () {
        return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
    });
}

meridiem('a', true);
meridiem('A', false);

// ALIASES

addUnitAlias('hour', 'h');

// PRIORITY
addUnitPriority('hour', 13);

// PARSING

function matchMeridiem (isStrict, locale) {
    return locale._meridiemParse;
}

addRegexToken('a',  matchMeridiem);
addRegexToken('A',  matchMeridiem);
addRegexToken('H',  match1to2);
addRegexToken('h',  match1to2);
addRegexToken('k',  match1to2);
addRegexToken('HH', match1to2, match2);
addRegexToken('hh', match1to2, match2);
addRegexToken('kk', match1to2, match2);

addRegexToken('hmm', match3to4);
addRegexToken('hmmss', match5to6);
addRegexToken('Hmm', match3to4);
addRegexToken('Hmmss', match5to6);

addParseToken(['H', 'HH'], HOUR);
addParseToken(['k', 'kk'], function (input, array, config) {
    var kInput = toInt(input);
    array[HOUR] = kInput === 24 ? 0 : kInput;
});
addParseToken(['a', 'A'], function (input, array, config) {
    config._isPm = config._locale.isPM(input);
    config._meridiem = input;
});
addParseToken(['h', 'hh'], function (input, array, config) {
    array[HOUR] = toInt(input);
    getParsingFlags(config).bigHour = true;
});
addParseToken('hmm', function (input, array, config) {
    var pos = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos));
    array[MINUTE] = toInt(input.substr(pos));
    getParsingFlags(config).bigHour = true;
});
addParseToken('hmmss', function (input, array, config) {
    var pos1 = input.length - 4;
    var pos2 = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos1));
    array[MINUTE] = toInt(input.substr(pos1, 2));
    array[SECOND] = toInt(input.substr(pos2));
    getParsingFlags(config).bigHour = true;
});
addParseToken('Hmm', function (input, array, config) {
    var pos = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos));
    array[MINUTE] = toInt(input.substr(pos));
});
addParseToken('Hmmss', function (input, array, config) {
    var pos1 = input.length - 4;
    var pos2 = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos1));
    array[MINUTE] = toInt(input.substr(pos1, 2));
    array[SECOND] = toInt(input.substr(pos2));
});

// LOCALES

function localeIsPM (input) {
    // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
    // Using charAt should be more compatible.
    return ((input + '').toLowerCase().charAt(0) === 'p');
}

var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
function localeMeridiem (hours, minutes, isLower) {
    if (hours > 11) {
        return isLower ? 'pm' : 'PM';
    } else {
        return isLower ? 'am' : 'AM';
    }
}


// MOMENTS

// Setting the hour should keep the time, because the user explicitly
// specified which hour he wants. So trying to maintain the same hour (in
// a new timezone) makes sense. Adding/subtracting hours does not follow
// this rule.
var getSetHour = makeGetSet('Hours', true);

var baseConfig = {
    calendar: defaultCalendar,
    longDateFormat: defaultLongDateFormat,
    invalidDate: defaultInvalidDate,
    ordinal: defaultOrdinal,
    dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
    relativeTime: defaultRelativeTime,

    months: defaultLocaleMonths,
    monthsShort: defaultLocaleMonthsShort,

    week: defaultLocaleWeek,

    weekdays: defaultLocaleWeekdays,
    weekdaysMin: defaultLocaleWeekdaysMin,
    weekdaysShort: defaultLocaleWeekdaysShort,

    meridiemParse: defaultLocaleMeridiemParse
};

// internal storage for locale config files
var locales = {};
var localeFamilies = {};
var globalLocale;

function normalizeLocale(key) {
    return key ? key.toLowerCase().replace('_', '-') : key;
}

// pick the locale from the array
// try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
// substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
function chooseLocale(names) {
    var i = 0, j, next, locale, split;

    while (i < names.length) {
        split = normalizeLocale(names[i]).split('-');
        j = split.length;
        next = normalizeLocale(names[i + 1]);
        next = next ? next.split('-') : null;
        while (j > 0) {
            locale = loadLocale(split.slice(0, j).join('-'));
            if (locale) {
                return locale;
            }
            if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                //the next array item is better than a shallower substring of this one
                break;
            }
            j--;
        }
        i++;
    }
    return globalLocale;
}

function loadLocale(name) {
    var oldLocale = null;
    // TODO: Find a better way to register and load all the locales in Node
    if (!locales[name] && (typeof module !== 'undefined') &&
            module && module.exports) {
        try {
            oldLocale = globalLocale._abbr;
            var aliasedRequire = require;
            aliasedRequire('./locale/' + name);
            getSetGlobalLocale(oldLocale);
        } catch (e) {}
    }
    return locales[name];
}

// This function will load locale and then set the global locale.  If
// no arguments are passed in, it will simply return the current global
// locale key.
function getSetGlobalLocale (key, values) {
    var data;
    if (key) {
        if (isUndefined(values)) {
            data = getLocale(key);
        }
        else {
            data = defineLocale(key, values);
        }

        if (data) {
            // moment.duration._locale = moment._locale = data;
            globalLocale = data;
        }
        else {
            if ((typeof console !==  'undefined') && console.warn) {
                //warn user if arguments are passed but the locale could not be set
                console.warn('Locale ' + key +  ' not found. Did you forget to load it?');
            }
        }
    }

    return globalLocale._abbr;
}

function defineLocale (name, config) {
    if (config !== null) {
        var locale, parentConfig = baseConfig;
        config.abbr = name;
        if (locales[name] != null) {
            deprecateSimple('defineLocaleOverride',
                    'use moment.updateLocale(localeName, config) to change ' +
                    'an existing locale. moment.defineLocale(localeName, ' +
                    'config) should only be used for creating a new locale ' +
                    'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
            parentConfig = locales[name]._config;
        } else if (config.parentLocale != null) {
            if (locales[config.parentLocale] != null) {
                parentConfig = locales[config.parentLocale]._config;
            } else {
                locale = loadLocale(config.parentLocale);
                if (locale != null) {
                    parentConfig = locale._config;
                } else {
                    if (!localeFamilies[config.parentLocale]) {
                        localeFamilies[config.parentLocale] = [];
                    }
                    localeFamilies[config.parentLocale].push({
                        name: name,
                        config: config
                    });
                    return null;
                }
            }
        }
        locales[name] = new Locale(mergeConfigs(parentConfig, config));

        if (localeFamilies[name]) {
            localeFamilies[name].forEach(function (x) {
                defineLocale(x.name, x.config);
            });
        }

        // backwards compat for now: also set the locale
        // make sure we set the locale AFTER all child locales have been
        // created, so we won't end up with the child locale set.
        getSetGlobalLocale(name);


        return locales[name];
    } else {
        // useful for testing
        delete locales[name];
        return null;
    }
}

function updateLocale(name, config) {
    if (config != null) {
        var locale, tmpLocale, parentConfig = baseConfig;
        // MERGE
        tmpLocale = loadLocale(name);
        if (tmpLocale != null) {
            parentConfig = tmpLocale._config;
        }
        config = mergeConfigs(parentConfig, config);
        locale = new Locale(config);
        locale.parentLocale = locales[name];
        locales[name] = locale;

        // backwards compat for now: also set the locale
        getSetGlobalLocale(name);
    } else {
        // pass null for config to unupdate, useful for tests
        if (locales[name] != null) {
            if (locales[name].parentLocale != null) {
                locales[name] = locales[name].parentLocale;
            } else if (locales[name] != null) {
                delete locales[name];
            }
        }
    }
    return locales[name];
}

// returns locale data
function getLocale (key) {
    var locale;

    if (key && key._locale && key._locale._abbr) {
        key = key._locale._abbr;
    }

    if (!key) {
        return globalLocale;
    }

    if (!isArray(key)) {
        //short-circuit everything else
        locale = loadLocale(key);
        if (locale) {
            return locale;
        }
        key = [key];
    }

    return chooseLocale(key);
}

function listLocales() {
    return keys(locales);
}

function checkOverflow (m) {
    var overflow;
    var a = m._a;

    if (a && getParsingFlags(m).overflow === -2) {
        overflow =
            a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
            a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
            a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
            a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
            a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
            a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
            -1;

        if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
            overflow = DATE;
        }
        if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
            overflow = WEEK;
        }
        if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
            overflow = WEEKDAY;
        }

        getParsingFlags(m).overflow = overflow;
    }

    return m;
}

// Pick the first defined of two or three arguments.
function defaults(a, b, c) {
    if (a != null) {
        return a;
    }
    if (b != null) {
        return b;
    }
    return c;
}

function currentDateArray(config) {
    // hooks is actually the exported moment object
    var nowValue = new Date(hooks.now());
    if (config._useUTC) {
        return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
    }
    return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
}

// convert an array to a date.
// the array should mirror the parameters below
// note: all values past the year are optional and will default to the lowest possible value.
// [year, month, day , hour, minute, second, millisecond]
function configFromArray (config) {
    var i, date, input = [], currentDate, expectedWeekday, yearToUse;

    if (config._d) {
        return;
    }

    currentDate = currentDateArray(config);

    //compute day of the year from weeks and weekdays
    if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
        dayOfYearFromWeekInfo(config);
    }

    //if the day of the year is set, figure out what it is
    if (config._dayOfYear != null) {
        yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

        if (config._dayOfYear > daysInYear(yearToUse) || config._dayOfYear === 0) {
            getParsingFlags(config)._overflowDayOfYear = true;
        }

        date = createUTCDate(yearToUse, 0, config._dayOfYear);
        config._a[MONTH] = date.getUTCMonth();
        config._a[DATE] = date.getUTCDate();
    }

    // Default to current date.
    // * if no year, month, day of month are given, default to today
    // * if day of month is given, default month and year
    // * if month is given, default only year
    // * if year is given, don't default anything
    for (i = 0; i < 3 && config._a[i] == null; ++i) {
        config._a[i] = input[i] = currentDate[i];
    }

    // Zero out whatever was not defaulted, including time
    for (; i < 7; i++) {
        config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
    }

    // Check for 24:00:00.000
    if (config._a[HOUR] === 24 &&
            config._a[MINUTE] === 0 &&
            config._a[SECOND] === 0 &&
            config._a[MILLISECOND] === 0) {
        config._nextDay = true;
        config._a[HOUR] = 0;
    }

    config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
    expectedWeekday = config._useUTC ? config._d.getUTCDay() : config._d.getDay();

    // Apply timezone offset from input. The actual utcOffset can be changed
    // with parseZone.
    if (config._tzm != null) {
        config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
    }

    if (config._nextDay) {
        config._a[HOUR] = 24;
    }

    // check for mismatching day of week
    if (config._w && typeof config._w.d !== 'undefined' && config._w.d !== expectedWeekday) {
        getParsingFlags(config).weekdayMismatch = true;
    }
}

function dayOfYearFromWeekInfo(config) {
    var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow;

    w = config._w;
    if (w.GG != null || w.W != null || w.E != null) {
        dow = 1;
        doy = 4;

        // TODO: We need to take the current isoWeekYear, but that depends on
        // how we interpret now (local, utc, fixed offset). So create
        // a now version of current config (take local/utc/offset flags, and
        // create now).
        weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(createLocal(), 1, 4).year);
        week = defaults(w.W, 1);
        weekday = defaults(w.E, 1);
        if (weekday < 1 || weekday > 7) {
            weekdayOverflow = true;
        }
    } else {
        dow = config._locale._week.dow;
        doy = config._locale._week.doy;

        var curWeek = weekOfYear(createLocal(), dow, doy);

        weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

        // Default to current week.
        week = defaults(w.w, curWeek.week);

        if (w.d != null) {
            // weekday -- low day numbers are considered next week
            weekday = w.d;
            if (weekday < 0 || weekday > 6) {
                weekdayOverflow = true;
            }
        } else if (w.e != null) {
            // local weekday -- counting starts from begining of week
            weekday = w.e + dow;
            if (w.e < 0 || w.e > 6) {
                weekdayOverflow = true;
            }
        } else {
            // default to begining of week
            weekday = dow;
        }
    }
    if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
        getParsingFlags(config)._overflowWeeks = true;
    } else if (weekdayOverflow != null) {
        getParsingFlags(config)._overflowWeekday = true;
    } else {
        temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }
}

// iso 8601 regex
// 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

var isoDates = [
    ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
    ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
    ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
    ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
    ['YYYY-DDD', /\d{4}-\d{3}/],
    ['YYYY-MM', /\d{4}-\d\d/, false],
    ['YYYYYYMMDD', /[+-]\d{10}/],
    ['YYYYMMDD', /\d{8}/],
    // YYYYMM is NOT allowed by the standard
    ['GGGG[W]WWE', /\d{4}W\d{3}/],
    ['GGGG[W]WW', /\d{4}W\d{2}/, false],
    ['YYYYDDD', /\d{7}/]
];

// iso time formats and regexes
var isoTimes = [
    ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
    ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
    ['HH:mm:ss', /\d\d:\d\d:\d\d/],
    ['HH:mm', /\d\d:\d\d/],
    ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
    ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
    ['HHmmss', /\d\d\d\d\d\d/],
    ['HHmm', /\d\d\d\d/],
    ['HH', /\d\d/]
];

var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

// date from iso format
function configFromISO(config) {
    var i, l,
        string = config._i,
        match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
        allowTime, dateFormat, timeFormat, tzFormat;

    if (match) {
        getParsingFlags(config).iso = true;

        for (i = 0, l = isoDates.length; i < l; i++) {
            if (isoDates[i][1].exec(match[1])) {
                dateFormat = isoDates[i][0];
                allowTime = isoDates[i][2] !== false;
                break;
            }
        }
        if (dateFormat == null) {
            config._isValid = false;
            return;
        }
        if (match[3]) {
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(match[3])) {
                    // match[2] should be 'T' or space
                    timeFormat = (match[2] || ' ') + isoTimes[i][0];
                    break;
                }
            }
            if (timeFormat == null) {
                config._isValid = false;
                return;
            }
        }
        if (!allowTime && timeFormat != null) {
            config._isValid = false;
            return;
        }
        if (match[4]) {
            if (tzRegex.exec(match[4])) {
                tzFormat = 'Z';
            } else {
                config._isValid = false;
                return;
            }
        }
        config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
        configFromStringAndFormat(config);
    } else {
        config._isValid = false;
    }
}

// RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
var rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;

function extractFromRFC2822Strings(yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
    var result = [
        untruncateYear(yearStr),
        defaultLocaleMonthsShort.indexOf(monthStr),
        parseInt(dayStr, 10),
        parseInt(hourStr, 10),
        parseInt(minuteStr, 10)
    ];

    if (secondStr) {
        result.push(parseInt(secondStr, 10));
    }

    return result;
}

function untruncateYear(yearStr) {
    var year = parseInt(yearStr, 10);
    if (year <= 49) {
        return 2000 + year;
    } else if (year <= 999) {
        return 1900 + year;
    }
    return year;
}

function preprocessRFC2822(s) {
    // Remove comments and folding whitespace and replace multiple-spaces with a single space
    return s.replace(/\([^)]*\)|[\n\t]/g, ' ').replace(/(\s\s+)/g, ' ').trim();
}

function checkWeekday(weekdayStr, parsedInput, config) {
    if (weekdayStr) {
        // TODO: Replace the vanilla JS Date object with an indepentent day-of-week check.
        var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
            weekdayActual = new Date(parsedInput[0], parsedInput[1], parsedInput[2]).getDay();
        if (weekdayProvided !== weekdayActual) {
            getParsingFlags(config).weekdayMismatch = true;
            config._isValid = false;
            return false;
        }
    }
    return true;
}

var obsOffsets = {
    UT: 0,
    GMT: 0,
    EDT: -4 * 60,
    EST: -5 * 60,
    CDT: -5 * 60,
    CST: -6 * 60,
    MDT: -6 * 60,
    MST: -7 * 60,
    PDT: -7 * 60,
    PST: -8 * 60
};

function calculateOffset(obsOffset, militaryOffset, numOffset) {
    if (obsOffset) {
        return obsOffsets[obsOffset];
    } else if (militaryOffset) {
        // the only allowed military tz is Z
        return 0;
    } else {
        var hm = parseInt(numOffset, 10);
        var m = hm % 100, h = (hm - m) / 100;
        return h * 60 + m;
    }
}

// date and time from ref 2822 format
function configFromRFC2822(config) {
    var match = rfc2822.exec(preprocessRFC2822(config._i));
    if (match) {
        var parsedArray = extractFromRFC2822Strings(match[4], match[3], match[2], match[5], match[6], match[7]);
        if (!checkWeekday(match[1], parsedArray, config)) {
            return;
        }

        config._a = parsedArray;
        config._tzm = calculateOffset(match[8], match[9], match[10]);

        config._d = createUTCDate.apply(null, config._a);
        config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

        getParsingFlags(config).rfc2822 = true;
    } else {
        config._isValid = false;
    }
}

// date from iso format or fallback
function configFromString(config) {
    var matched = aspNetJsonRegex.exec(config._i);

    if (matched !== null) {
        config._d = new Date(+matched[1]);
        return;
    }

    configFromISO(config);
    if (config._isValid === false) {
        delete config._isValid;
    } else {
        return;
    }

    configFromRFC2822(config);
    if (config._isValid === false) {
        delete config._isValid;
    } else {
        return;
    }

    // Final attempt, use Input Fallback
    hooks.createFromInputFallback(config);
}

hooks.createFromInputFallback = deprecate(
    'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
    'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
    'discouraged and will be removed in an upcoming major release. Please refer to ' +
    'http://momentjs.com/guides/#/warnings/js-date/ for more info.',
    function (config) {
        config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
    }
);

// constant that refers to the ISO standard
hooks.ISO_8601 = function () {};

// constant that refers to the RFC 2822 form
hooks.RFC_2822 = function () {};

// date from string and format string
function configFromStringAndFormat(config) {
    // TODO: Move this to another part of the creation flow to prevent circular deps
    if (config._f === hooks.ISO_8601) {
        configFromISO(config);
        return;
    }
    if (config._f === hooks.RFC_2822) {
        configFromRFC2822(config);
        return;
    }
    config._a = [];
    getParsingFlags(config).empty = true;

    // This array is used to make a Date, either with `new Date` or `Date.UTC`
    var string = '' + config._i,
        i, parsedInput, tokens, token, skipped,
        stringLength = string.length,
        totalParsedInputLength = 0;

    tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

    for (i = 0; i < tokens.length; i++) {
        token = tokens[i];
        parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
        // console.log('token', token, 'parsedInput', parsedInput,
        //         'regex', getParseRegexForToken(token, config));
        if (parsedInput) {
            skipped = string.substr(0, string.indexOf(parsedInput));
            if (skipped.length > 0) {
                getParsingFlags(config).unusedInput.push(skipped);
            }
            string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
            totalParsedInputLength += parsedInput.length;
        }
        // don't parse if it's not a known token
        if (formatTokenFunctions[token]) {
            if (parsedInput) {
                getParsingFlags(config).empty = false;
            }
            else {
                getParsingFlags(config).unusedTokens.push(token);
            }
            addTimeToArrayFromToken(token, parsedInput, config);
        }
        else if (config._strict && !parsedInput) {
            getParsingFlags(config).unusedTokens.push(token);
        }
    }

    // add remaining unparsed input length to the string
    getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
    if (string.length > 0) {
        getParsingFlags(config).unusedInput.push(string);
    }

    // clear _12h flag if hour is <= 12
    if (config._a[HOUR] <= 12 &&
        getParsingFlags(config).bigHour === true &&
        config._a[HOUR] > 0) {
        getParsingFlags(config).bigHour = undefined;
    }

    getParsingFlags(config).parsedDateParts = config._a.slice(0);
    getParsingFlags(config).meridiem = config._meridiem;
    // handle meridiem
    config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

    configFromArray(config);
    checkOverflow(config);
}


function meridiemFixWrap (locale, hour, meridiem) {
    var isPm;

    if (meridiem == null) {
        // nothing to do
        return hour;
    }
    if (locale.meridiemHour != null) {
        return locale.meridiemHour(hour, meridiem);
    } else if (locale.isPM != null) {
        // Fallback
        isPm = locale.isPM(meridiem);
        if (isPm && hour < 12) {
            hour += 12;
        }
        if (!isPm && hour === 12) {
            hour = 0;
        }
        return hour;
    } else {
        // this is not supposed to happen
        return hour;
    }
}

// date from string and array of format strings
function configFromStringAndArray(config) {
    var tempConfig,
        bestMoment,

        scoreToBeat,
        i,
        currentScore;

    if (config._f.length === 0) {
        getParsingFlags(config).invalidFormat = true;
        config._d = new Date(NaN);
        return;
    }

    for (i = 0; i < config._f.length; i++) {
        currentScore = 0;
        tempConfig = copyConfig({}, config);
        if (config._useUTC != null) {
            tempConfig._useUTC = config._useUTC;
        }
        tempConfig._f = config._f[i];
        configFromStringAndFormat(tempConfig);

        if (!isValid(tempConfig)) {
            continue;
        }

        // if there is any input that was not parsed add a penalty for that format
        currentScore += getParsingFlags(tempConfig).charsLeftOver;

        //or tokens
        currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

        getParsingFlags(tempConfig).score = currentScore;

        if (scoreToBeat == null || currentScore < scoreToBeat) {
            scoreToBeat = currentScore;
            bestMoment = tempConfig;
        }
    }

    extend(config, bestMoment || tempConfig);
}

function configFromObject(config) {
    if (config._d) {
        return;
    }

    var i = normalizeObjectUnits(config._i);
    config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function (obj) {
        return obj && parseInt(obj, 10);
    });

    configFromArray(config);
}

function createFromConfig (config) {
    var res = new Moment(checkOverflow(prepareConfig(config)));
    if (res._nextDay) {
        // Adding is smart enough around DST
        res.add(1, 'd');
        res._nextDay = undefined;
    }

    return res;
}

function prepareConfig (config) {
    var input = config._i,
        format = config._f;

    config._locale = config._locale || getLocale(config._l);

    if (input === null || (format === undefined && input === '')) {
        return createInvalid({nullInput: true});
    }

    if (typeof input === 'string') {
        config._i = input = config._locale.preparse(input);
    }

    if (isMoment(input)) {
        return new Moment(checkOverflow(input));
    } else if (isDate(input)) {
        config._d = input;
    } else if (isArray(format)) {
        configFromStringAndArray(config);
    } else if (format) {
        configFromStringAndFormat(config);
    }  else {
        configFromInput(config);
    }

    if (!isValid(config)) {
        config._d = null;
    }

    return config;
}

function configFromInput(config) {
    var input = config._i;
    if (isUndefined(input)) {
        config._d = new Date(hooks.now());
    } else if (isDate(input)) {
        config._d = new Date(input.valueOf());
    } else if (typeof input === 'string') {
        configFromString(config);
    } else if (isArray(input)) {
        config._a = map(input.slice(0), function (obj) {
            return parseInt(obj, 10);
        });
        configFromArray(config);
    } else if (isObject(input)) {
        configFromObject(config);
    } else if (isNumber(input)) {
        // from milliseconds
        config._d = new Date(input);
    } else {
        hooks.createFromInputFallback(config);
    }
}

function createLocalOrUTC (input, format, locale, strict, isUTC) {
    var c = {};

    if (locale === true || locale === false) {
        strict = locale;
        locale = undefined;
    }

    if ((isObject(input) && isObjectEmpty(input)) ||
            (isArray(input) && input.length === 0)) {
        input = undefined;
    }
    // object construction must be done this way.
    // https://github.com/moment/moment/issues/1423
    c._isAMomentObject = true;
    c._useUTC = c._isUTC = isUTC;
    c._l = locale;
    c._i = input;
    c._f = format;
    c._strict = strict;

    return createFromConfig(c);
}

function createLocal (input, format, locale, strict) {
    return createLocalOrUTC(input, format, locale, strict, false);
}

var prototypeMin = deprecate(
    'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
    function () {
        var other = createLocal.apply(null, arguments);
        if (this.isValid() && other.isValid()) {
            return other < this ? this : other;
        } else {
            return createInvalid();
        }
    }
);

var prototypeMax = deprecate(
    'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
    function () {
        var other = createLocal.apply(null, arguments);
        if (this.isValid() && other.isValid()) {
            return other > this ? this : other;
        } else {
            return createInvalid();
        }
    }
);

// Pick a moment m from moments so that m[fn](other) is true for all
// other. This relies on the function fn to be transitive.
//
// moments should either be an array of moment objects or an array, whose
// first element is an array of moment objects.
function pickBy(fn, moments) {
    var res, i;
    if (moments.length === 1 && isArray(moments[0])) {
        moments = moments[0];
    }
    if (!moments.length) {
        return createLocal();
    }
    res = moments[0];
    for (i = 1; i < moments.length; ++i) {
        if (!moments[i].isValid() || moments[i][fn](res)) {
            res = moments[i];
        }
    }
    return res;
}

// TODO: Use [].sort instead?
function min () {
    var args = [].slice.call(arguments, 0);

    return pickBy('isBefore', args);
}

function max () {
    var args = [].slice.call(arguments, 0);

    return pickBy('isAfter', args);
}

var now = function () {
    return Date.now ? Date.now() : +(new Date());
};

var ordering = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];

function isDurationValid(m) {
    for (var key in m) {
        if (!(indexOf.call(ordering, key) !== -1 && (m[key] == null || !isNaN(m[key])))) {
            return false;
        }
    }

    var unitHasDecimal = false;
    for (var i = 0; i < ordering.length; ++i) {
        if (m[ordering[i]]) {
            if (unitHasDecimal) {
                return false; // only allow non-integers for smallest unit
            }
            if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
                unitHasDecimal = true;
            }
        }
    }

    return true;
}

function isValid$1() {
    return this._isValid;
}

function createInvalid$1() {
    return createDuration(NaN);
}

function Duration (duration) {
    var normalizedInput = normalizeObjectUnits(duration),
        years = normalizedInput.year || 0,
        quarters = normalizedInput.quarter || 0,
        months = normalizedInput.month || 0,
        weeks = normalizedInput.week || 0,
        days = normalizedInput.day || 0,
        hours = normalizedInput.hour || 0,
        minutes = normalizedInput.minute || 0,
        seconds = normalizedInput.second || 0,
        milliseconds = normalizedInput.millisecond || 0;

    this._isValid = isDurationValid(normalizedInput);

    // representation for dateAddRemove
    this._milliseconds = +milliseconds +
        seconds * 1e3 + // 1000
        minutes * 6e4 + // 1000 * 60
        hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
    // Because of dateAddRemove treats 24 hours as different from a
    // day when working around DST, we need to store them separately
    this._days = +days +
        weeks * 7;
    // It is impossible to translate months into days without knowing
    // which months you are are talking about, so we have to store
    // it separately.
    this._months = +months +
        quarters * 3 +
        years * 12;

    this._data = {};

    this._locale = getLocale();

    this._bubble();
}

function isDuration (obj) {
    return obj instanceof Duration;
}

function absRound (number) {
    if (number < 0) {
        return Math.round(-1 * number) * -1;
    } else {
        return Math.round(number);
    }
}

// FORMATTING

function offset (token, separator) {
    addFormatToken(token, 0, 0, function () {
        var offset = this.utcOffset();
        var sign = '+';
        if (offset < 0) {
            offset = -offset;
            sign = '-';
        }
        return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
    });
}

offset('Z', ':');
offset('ZZ', '');

// PARSING

addRegexToken('Z',  matchShortOffset);
addRegexToken('ZZ', matchShortOffset);
addParseToken(['Z', 'ZZ'], function (input, array, config) {
    config._useUTC = true;
    config._tzm = offsetFromString(matchShortOffset, input);
});

// HELPERS

// timezone chunker
// '+10:00' > ['10',  '00']
// '-1530'  > ['-15', '30']
var chunkOffset = /([\+\-]|\d\d)/gi;

function offsetFromString(matcher, string) {
    var matches = (string || '').match(matcher);

    if (matches === null) {
        return null;
    }

    var chunk   = matches[matches.length - 1] || [];
    var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
    var minutes = +(parts[1] * 60) + toInt(parts[2]);

    return minutes === 0 ?
      0 :
      parts[0] === '+' ? minutes : -minutes;
}

// Return a moment from input, that is local/utc/zone equivalent to model.
function cloneWithOffset(input, model) {
    var res, diff;
    if (model._isUTC) {
        res = model.clone();
        diff = (isMoment(input) || isDate(input) ? input.valueOf() : createLocal(input).valueOf()) - res.valueOf();
        // Use low-level api, because this fn is low-level api.
        res._d.setTime(res._d.valueOf() + diff);
        hooks.updateOffset(res, false);
        return res;
    } else {
        return createLocal(input).local();
    }
}

function getDateOffset (m) {
    // On Firefox.24 Date#getTimezoneOffset returns a floating point.
    // https://github.com/moment/moment/pull/1871
    return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
}

// HOOKS

// This function will be called whenever a moment is mutated.
// It is intended to keep the offset in sync with the timezone.
hooks.updateOffset = function () {};

// MOMENTS

// keepLocalTime = true means only change the timezone, without
// affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
// 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
// +0200, so we adjust the time as needed, to be valid.
//
// Keeping the time actually adds/subtracts (one hour)
// from the actual represented time. That is why we call updateOffset
// a second time. In case it wants us to change the offset again
// _changeInProgress == true case, then we have to adjust, because
// there is no such time in the given timezone.
function getSetOffset (input, keepLocalTime, keepMinutes) {
    var offset = this._offset || 0,
        localAdjust;
    if (!this.isValid()) {
        return input != null ? this : NaN;
    }
    if (input != null) {
        if (typeof input === 'string') {
            input = offsetFromString(matchShortOffset, input);
            if (input === null) {
                return this;
            }
        } else if (Math.abs(input) < 16 && !keepMinutes) {
            input = input * 60;
        }
        if (!this._isUTC && keepLocalTime) {
            localAdjust = getDateOffset(this);
        }
        this._offset = input;
        this._isUTC = true;
        if (localAdjust != null) {
            this.add(localAdjust, 'm');
        }
        if (offset !== input) {
            if (!keepLocalTime || this._changeInProgress) {
                addSubtract(this, createDuration(input - offset, 'm'), 1, false);
            } else if (!this._changeInProgress) {
                this._changeInProgress = true;
                hooks.updateOffset(this, true);
                this._changeInProgress = null;
            }
        }
        return this;
    } else {
        return this._isUTC ? offset : getDateOffset(this);
    }
}

function getSetZone (input, keepLocalTime) {
    if (input != null) {
        if (typeof input !== 'string') {
            input = -input;
        }

        this.utcOffset(input, keepLocalTime);

        return this;
    } else {
        return -this.utcOffset();
    }
}

function setOffsetToUTC (keepLocalTime) {
    return this.utcOffset(0, keepLocalTime);
}

function setOffsetToLocal (keepLocalTime) {
    if (this._isUTC) {
        this.utcOffset(0, keepLocalTime);
        this._isUTC = false;

        if (keepLocalTime) {
            this.subtract(getDateOffset(this), 'm');
        }
    }
    return this;
}

function setOffsetToParsedOffset () {
    if (this._tzm != null) {
        this.utcOffset(this._tzm, false, true);
    } else if (typeof this._i === 'string') {
        var tZone = offsetFromString(matchOffset, this._i);
        if (tZone != null) {
            this.utcOffset(tZone);
        }
        else {
            this.utcOffset(0, true);
        }
    }
    return this;
}

function hasAlignedHourOffset (input) {
    if (!this.isValid()) {
        return false;
    }
    input = input ? createLocal(input).utcOffset() : 0;

    return (this.utcOffset() - input) % 60 === 0;
}

function isDaylightSavingTime () {
    return (
        this.utcOffset() > this.clone().month(0).utcOffset() ||
        this.utcOffset() > this.clone().month(5).utcOffset()
    );
}

function isDaylightSavingTimeShifted () {
    if (!isUndefined(this._isDSTShifted)) {
        return this._isDSTShifted;
    }

    var c = {};

    copyConfig(c, this);
    c = prepareConfig(c);

    if (c._a) {
        var other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
        this._isDSTShifted = this.isValid() &&
            compareArrays(c._a, other.toArray()) > 0;
    } else {
        this._isDSTShifted = false;
    }

    return this._isDSTShifted;
}

function isLocal () {
    return this.isValid() ? !this._isUTC : false;
}

function isUtcOffset () {
    return this.isValid() ? this._isUTC : false;
}

function isUtc () {
    return this.isValid() ? this._isUTC && this._offset === 0 : false;
}

// ASP.NET json date format regex
var aspNetRegex = /^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/;

// from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
// somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
// and further modified to allow for strings containing both week and day
var isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

function createDuration (input, key) {
    var duration = input,
        // matching against regexp is expensive, do it on demand
        match = null,
        sign,
        ret,
        diffRes;

    if (isDuration(input)) {
        duration = {
            ms : input._milliseconds,
            d  : input._days,
            M  : input._months
        };
    } else if (isNumber(input)) {
        duration = {};
        if (key) {
            duration[key] = input;
        } else {
            duration.milliseconds = input;
        }
    } else if (!!(match = aspNetRegex.exec(input))) {
        sign = (match[1] === '-') ? -1 : 1;
        duration = {
            y  : 0,
            d  : toInt(match[DATE])                         * sign,
            h  : toInt(match[HOUR])                         * sign,
            m  : toInt(match[MINUTE])                       * sign,
            s  : toInt(match[SECOND])                       * sign,
            ms : toInt(absRound(match[MILLISECOND] * 1000)) * sign // the millisecond decimal point is included in the match
        };
    } else if (!!(match = isoRegex.exec(input))) {
        sign = (match[1] === '-') ? -1 : (match[1] === '+') ? 1 : 1;
        duration = {
            y : parseIso(match[2], sign),
            M : parseIso(match[3], sign),
            w : parseIso(match[4], sign),
            d : parseIso(match[5], sign),
            h : parseIso(match[6], sign),
            m : parseIso(match[7], sign),
            s : parseIso(match[8], sign)
        };
    } else if (duration == null) {// checks for null or undefined
        duration = {};
    } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
        diffRes = momentsDifference(createLocal(duration.from), createLocal(duration.to));

        duration = {};
        duration.ms = diffRes.milliseconds;
        duration.M = diffRes.months;
    }

    ret = new Duration(duration);

    if (isDuration(input) && hasOwnProp(input, '_locale')) {
        ret._locale = input._locale;
    }

    return ret;
}

createDuration.fn = Duration.prototype;
createDuration.invalid = createInvalid$1;

function parseIso (inp, sign) {
    // We'd normally use ~~inp for this, but unfortunately it also
    // converts floats to ints.
    // inp may be undefined, so careful calling replace on it.
    var res = inp && parseFloat(inp.replace(',', '.'));
    // apply sign while we're at it
    return (isNaN(res) ? 0 : res) * sign;
}

function positiveMomentsDifference(base, other) {
    var res = {milliseconds: 0, months: 0};

    res.months = other.month() - base.month() +
        (other.year() - base.year()) * 12;
    if (base.clone().add(res.months, 'M').isAfter(other)) {
        --res.months;
    }

    res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

    return res;
}

function momentsDifference(base, other) {
    var res;
    if (!(base.isValid() && other.isValid())) {
        return {milliseconds: 0, months: 0};
    }

    other = cloneWithOffset(other, base);
    if (base.isBefore(other)) {
        res = positiveMomentsDifference(base, other);
    } else {
        res = positiveMomentsDifference(other, base);
        res.milliseconds = -res.milliseconds;
        res.months = -res.months;
    }

    return res;
}

// TODO: remove 'name' arg after deprecation is removed
function createAdder(direction, name) {
    return function (val, period) {
        var dur, tmp;
        //invert the arguments, but complain about it
        if (period !== null && !isNaN(+period)) {
            deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' +
            'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
            tmp = val; val = period; period = tmp;
        }

        val = typeof val === 'string' ? +val : val;
        dur = createDuration(val, period);
        addSubtract(this, dur, direction);
        return this;
    };
}

function addSubtract (mom, duration, isAdding, updateOffset) {
    var milliseconds = duration._milliseconds,
        days = absRound(duration._days),
        months = absRound(duration._months);

    if (!mom.isValid()) {
        // No op
        return;
    }

    updateOffset = updateOffset == null ? true : updateOffset;

    if (months) {
        setMonth(mom, get(mom, 'Month') + months * isAdding);
    }
    if (days) {
        set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
    }
    if (milliseconds) {
        mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
    }
    if (updateOffset) {
        hooks.updateOffset(mom, days || months);
    }
}

var add      = createAdder(1, 'add');
var subtract = createAdder(-1, 'subtract');

function getCalendarFormat(myMoment, now) {
    var diff = myMoment.diff(now, 'days', true);
    return diff < -6 ? 'sameElse' :
            diff < -1 ? 'lastWeek' :
            diff < 0 ? 'lastDay' :
            diff < 1 ? 'sameDay' :
            diff < 2 ? 'nextDay' :
            diff < 7 ? 'nextWeek' : 'sameElse';
}

function calendar$1 (time, formats) {
    // We want to compare the start of today, vs this.
    // Getting start-of-today depends on whether we're local/utc/offset or not.
    var now = time || createLocal(),
        sod = cloneWithOffset(now, this).startOf('day'),
        format = hooks.calendarFormat(this, sod) || 'sameElse';

    var output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);

    return this.format(output || this.localeData().calendar(format, this, createLocal(now)));
}

function clone () {
    return new Moment(this);
}

function isAfter (input, units) {
    var localInput = isMoment(input) ? input : createLocal(input);
    if (!(this.isValid() && localInput.isValid())) {
        return false;
    }
    units = normalizeUnits(!isUndefined(units) ? units : 'millisecond');
    if (units === 'millisecond') {
        return this.valueOf() > localInput.valueOf();
    } else {
        return localInput.valueOf() < this.clone().startOf(units).valueOf();
    }
}

function isBefore (input, units) {
    var localInput = isMoment(input) ? input : createLocal(input);
    if (!(this.isValid() && localInput.isValid())) {
        return false;
    }
    units = normalizeUnits(!isUndefined(units) ? units : 'millisecond');
    if (units === 'millisecond') {
        return this.valueOf() < localInput.valueOf();
    } else {
        return this.clone().endOf(units).valueOf() < localInput.valueOf();
    }
}

function isBetween (from, to, units, inclusivity) {
    inclusivity = inclusivity || '()';
    return (inclusivity[0] === '(' ? this.isAfter(from, units) : !this.isBefore(from, units)) &&
        (inclusivity[1] === ')' ? this.isBefore(to, units) : !this.isAfter(to, units));
}

function isSame (input, units) {
    var localInput = isMoment(input) ? input : createLocal(input),
        inputMs;
    if (!(this.isValid() && localInput.isValid())) {
        return false;
    }
    units = normalizeUnits(units || 'millisecond');
    if (units === 'millisecond') {
        return this.valueOf() === localInput.valueOf();
    } else {
        inputMs = localInput.valueOf();
        return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
    }
}

function isSameOrAfter (input, units) {
    return this.isSame(input, units) || this.isAfter(input,units);
}

function isSameOrBefore (input, units) {
    return this.isSame(input, units) || this.isBefore(input,units);
}

function diff (input, units, asFloat) {
    var that,
        zoneDelta,
        output;

    if (!this.isValid()) {
        return NaN;
    }

    that = cloneWithOffset(input, this);

    if (!that.isValid()) {
        return NaN;
    }

    zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

    units = normalizeUnits(units);

    switch (units) {
        case 'year': output = monthDiff(this, that) / 12; break;
        case 'month': output = monthDiff(this, that); break;
        case 'quarter': output = monthDiff(this, that) / 3; break;
        case 'second': output = (this - that) / 1e3; break; // 1000
        case 'minute': output = (this - that) / 6e4; break; // 1000 * 60
        case 'hour': output = (this - that) / 36e5; break; // 1000 * 60 * 60
        case 'day': output = (this - that - zoneDelta) / 864e5; break; // 1000 * 60 * 60 * 24, negate dst
        case 'week': output = (this - that - zoneDelta) / 6048e5; break; // 1000 * 60 * 60 * 24 * 7, negate dst
        default: output = this - that;
    }

    return asFloat ? output : absFloor(output);
}

function monthDiff (a, b) {
    // difference in months
    var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
        // b is in (anchor - 1 month, anchor + 1 month)
        anchor = a.clone().add(wholeMonthDiff, 'months'),
        anchor2, adjust;

    if (b - anchor < 0) {
        anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
        // linear across the month
        adjust = (b - anchor) / (anchor - anchor2);
    } else {
        anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
        // linear across the month
        adjust = (b - anchor) / (anchor2 - anchor);
    }

    //check for negative zero, return zero if negative zero
    return -(wholeMonthDiff + adjust) || 0;
}

hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

function toString () {
    return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
}

function toISOString(keepOffset) {
    if (!this.isValid()) {
        return null;
    }
    var utc = keepOffset !== true;
    var m = utc ? this.clone().utc() : this;
    if (m.year() < 0 || m.year() > 9999) {
        return formatMoment(m, utc ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ');
    }
    if (isFunction(Date.prototype.toISOString)) {
        // native implementation is ~50x faster, use it when we can
        if (utc) {
            return this.toDate().toISOString();
        } else {
            return new Date(this.valueOf() + this.utcOffset() * 60 * 1000).toISOString().replace('Z', formatMoment(m, 'Z'));
        }
    }
    return formatMoment(m, utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ');
}

/**
 * Return a human readable representation of a moment that can
 * also be evaluated to get a new moment which is the same
 *
 * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
 */
function inspect () {
    if (!this.isValid()) {
        return 'moment.invalid(/* ' + this._i + ' */)';
    }
    var func = 'moment';
    var zone = '';
    if (!this.isLocal()) {
        func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
        zone = 'Z';
    }
    var prefix = '[' + func + '("]';
    var year = (0 <= this.year() && this.year() <= 9999) ? 'YYYY' : 'YYYYYY';
    var datetime = '-MM-DD[T]HH:mm:ss.SSS';
    var suffix = zone + '[")]';

    return this.format(prefix + year + datetime + suffix);
}

function format (inputString) {
    if (!inputString) {
        inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
    }
    var output = formatMoment(this, inputString);
    return this.localeData().postformat(output);
}

function from (time, withoutSuffix) {
    if (this.isValid() &&
            ((isMoment(time) && time.isValid()) ||
             createLocal(time).isValid())) {
        return createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
    } else {
        return this.localeData().invalidDate();
    }
}

function fromNow (withoutSuffix) {
    return this.from(createLocal(), withoutSuffix);
}

function to (time, withoutSuffix) {
    if (this.isValid() &&
            ((isMoment(time) && time.isValid()) ||
             createLocal(time).isValid())) {
        return createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
    } else {
        return this.localeData().invalidDate();
    }
}

function toNow (withoutSuffix) {
    return this.to(createLocal(), withoutSuffix);
}

// If passed a locale key, it will set the locale for this
// instance.  Otherwise, it will return the locale configuration
// variables for this instance.
function locale (key) {
    var newLocaleData;

    if (key === undefined) {
        return this._locale._abbr;
    } else {
        newLocaleData = getLocale(key);
        if (newLocaleData != null) {
            this._locale = newLocaleData;
        }
        return this;
    }
}

var lang = deprecate(
    'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
    function (key) {
        if (key === undefined) {
            return this.localeData();
        } else {
            return this.locale(key);
        }
    }
);

function localeData () {
    return this._locale;
}

function startOf (units) {
    units = normalizeUnits(units);
    // the following switch intentionally omits break keywords
    // to utilize falling through the cases.
    switch (units) {
        case 'year':
            this.month(0);
            /* falls through */
        case 'quarter':
        case 'month':
            this.date(1);
            /* falls through */
        case 'week':
        case 'isoWeek':
        case 'day':
        case 'date':
            this.hours(0);
            /* falls through */
        case 'hour':
            this.minutes(0);
            /* falls through */
        case 'minute':
            this.seconds(0);
            /* falls through */
        case 'second':
            this.milliseconds(0);
    }

    // weeks are a special case
    if (units === 'week') {
        this.weekday(0);
    }
    if (units === 'isoWeek') {
        this.isoWeekday(1);
    }

    // quarters are also special
    if (units === 'quarter') {
        this.month(Math.floor(this.month() / 3) * 3);
    }

    return this;
}

function endOf (units) {
    units = normalizeUnits(units);
    if (units === undefined || units === 'millisecond') {
        return this;
    }

    // 'date' is an alias for 'day', so it should be considered as such.
    if (units === 'date') {
        units = 'day';
    }

    return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
}

function valueOf () {
    return this._d.valueOf() - ((this._offset || 0) * 60000);
}

function unix () {
    return Math.floor(this.valueOf() / 1000);
}

function toDate () {
    return new Date(this.valueOf());
}

function toArray () {
    var m = this;
    return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
}

function toObject () {
    var m = this;
    return {
        years: m.year(),
        months: m.month(),
        date: m.date(),
        hours: m.hours(),
        minutes: m.minutes(),
        seconds: m.seconds(),
        milliseconds: m.milliseconds()
    };
}

function toJSON () {
    // new Date(NaN).toJSON() === null
    return this.isValid() ? this.toISOString() : null;
}

function isValid$2 () {
    return isValid(this);
}

function parsingFlags () {
    return extend({}, getParsingFlags(this));
}

function invalidAt () {
    return getParsingFlags(this).overflow;
}

function creationData() {
    return {
        input: this._i,
        format: this._f,
        locale: this._locale,
        isUTC: this._isUTC,
        strict: this._strict
    };
}

// FORMATTING

addFormatToken(0, ['gg', 2], 0, function () {
    return this.weekYear() % 100;
});

addFormatToken(0, ['GG', 2], 0, function () {
    return this.isoWeekYear() % 100;
});

function addWeekYearFormatToken (token, getter) {
    addFormatToken(0, [token, token.length], 0, getter);
}

addWeekYearFormatToken('gggg',     'weekYear');
addWeekYearFormatToken('ggggg',    'weekYear');
addWeekYearFormatToken('GGGG',  'isoWeekYear');
addWeekYearFormatToken('GGGGG', 'isoWeekYear');

// ALIASES

addUnitAlias('weekYear', 'gg');
addUnitAlias('isoWeekYear', 'GG');

// PRIORITY

addUnitPriority('weekYear', 1);
addUnitPriority('isoWeekYear', 1);


// PARSING

addRegexToken('G',      matchSigned);
addRegexToken('g',      matchSigned);
addRegexToken('GG',     match1to2, match2);
addRegexToken('gg',     match1to2, match2);
addRegexToken('GGGG',   match1to4, match4);
addRegexToken('gggg',   match1to4, match4);
addRegexToken('GGGGG',  match1to6, match6);
addRegexToken('ggggg',  match1to6, match6);

addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
    week[token.substr(0, 2)] = toInt(input);
});

addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
    week[token] = hooks.parseTwoDigitYear(input);
});

// MOMENTS

function getSetWeekYear (input) {
    return getSetWeekYearHelper.call(this,
            input,
            this.week(),
            this.weekday(),
            this.localeData()._week.dow,
            this.localeData()._week.doy);
}

function getSetISOWeekYear (input) {
    return getSetWeekYearHelper.call(this,
            input, this.isoWeek(), this.isoWeekday(), 1, 4);
}

function getISOWeeksInYear () {
    return weeksInYear(this.year(), 1, 4);
}

function getWeeksInYear () {
    var weekInfo = this.localeData()._week;
    return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
}

function getSetWeekYearHelper(input, week, weekday, dow, doy) {
    var weeksTarget;
    if (input == null) {
        return weekOfYear(this, dow, doy).year;
    } else {
        weeksTarget = weeksInYear(input, dow, doy);
        if (week > weeksTarget) {
            week = weeksTarget;
        }
        return setWeekAll.call(this, input, week, weekday, dow, doy);
    }
}

function setWeekAll(weekYear, week, weekday, dow, doy) {
    var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
        date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

    this.year(date.getUTCFullYear());
    this.month(date.getUTCMonth());
    this.date(date.getUTCDate());
    return this;
}

// FORMATTING

addFormatToken('Q', 0, 'Qo', 'quarter');

// ALIASES

addUnitAlias('quarter', 'Q');

// PRIORITY

addUnitPriority('quarter', 7);

// PARSING

addRegexToken('Q', match1);
addParseToken('Q', function (input, array) {
    array[MONTH] = (toInt(input) - 1) * 3;
});

// MOMENTS

function getSetQuarter (input) {
    return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
}

// FORMATTING

addFormatToken('D', ['DD', 2], 'Do', 'date');

// ALIASES

addUnitAlias('date', 'D');

// PRIOROITY
addUnitPriority('date', 9);

// PARSING

addRegexToken('D',  match1to2);
addRegexToken('DD', match1to2, match2);
addRegexToken('Do', function (isStrict, locale) {
    // TODO: Remove "ordinalParse" fallback in next major release.
    return isStrict ?
      (locale._dayOfMonthOrdinalParse || locale._ordinalParse) :
      locale._dayOfMonthOrdinalParseLenient;
});

addParseToken(['D', 'DD'], DATE);
addParseToken('Do', function (input, array) {
    array[DATE] = toInt(input.match(match1to2)[0]);
});

// MOMENTS

var getSetDayOfMonth = makeGetSet('Date', true);

// FORMATTING

addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

// ALIASES

addUnitAlias('dayOfYear', 'DDD');

// PRIORITY
addUnitPriority('dayOfYear', 4);

// PARSING

addRegexToken('DDD',  match1to3);
addRegexToken('DDDD', match3);
addParseToken(['DDD', 'DDDD'], function (input, array, config) {
    config._dayOfYear = toInt(input);
});

// HELPERS

// MOMENTS

function getSetDayOfYear (input) {
    var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
    return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
}

// FORMATTING

addFormatToken('m', ['mm', 2], 0, 'minute');

// ALIASES

addUnitAlias('minute', 'm');

// PRIORITY

addUnitPriority('minute', 14);

// PARSING

addRegexToken('m',  match1to2);
addRegexToken('mm', match1to2, match2);
addParseToken(['m', 'mm'], MINUTE);

// MOMENTS

var getSetMinute = makeGetSet('Minutes', false);

// FORMATTING

addFormatToken('s', ['ss', 2], 0, 'second');

// ALIASES

addUnitAlias('second', 's');

// PRIORITY

addUnitPriority('second', 15);

// PARSING

addRegexToken('s',  match1to2);
addRegexToken('ss', match1to2, match2);
addParseToken(['s', 'ss'], SECOND);

// MOMENTS

var getSetSecond = makeGetSet('Seconds', false);

// FORMATTING

addFormatToken('S', 0, 0, function () {
    return ~~(this.millisecond() / 100);
});

addFormatToken(0, ['SS', 2], 0, function () {
    return ~~(this.millisecond() / 10);
});

addFormatToken(0, ['SSS', 3], 0, 'millisecond');
addFormatToken(0, ['SSSS', 4], 0, function () {
    return this.millisecond() * 10;
});
addFormatToken(0, ['SSSSS', 5], 0, function () {
    return this.millisecond() * 100;
});
addFormatToken(0, ['SSSSSS', 6], 0, function () {
    return this.millisecond() * 1000;
});
addFormatToken(0, ['SSSSSSS', 7], 0, function () {
    return this.millisecond() * 10000;
});
addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
    return this.millisecond() * 100000;
});
addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
    return this.millisecond() * 1000000;
});


// ALIASES

addUnitAlias('millisecond', 'ms');

// PRIORITY

addUnitPriority('millisecond', 16);

// PARSING

addRegexToken('S',    match1to3, match1);
addRegexToken('SS',   match1to3, match2);
addRegexToken('SSS',  match1to3, match3);

var token;
for (token = 'SSSS'; token.length <= 9; token += 'S') {
    addRegexToken(token, matchUnsigned);
}

function parseMs(input, array) {
    array[MILLISECOND] = toInt(('0.' + input) * 1000);
}

for (token = 'S'; token.length <= 9; token += 'S') {
    addParseToken(token, parseMs);
}
// MOMENTS

var getSetMillisecond = makeGetSet('Milliseconds', false);

// FORMATTING

addFormatToken('z',  0, 0, 'zoneAbbr');
addFormatToken('zz', 0, 0, 'zoneName');

// MOMENTS

function getZoneAbbr () {
    return this._isUTC ? 'UTC' : '';
}

function getZoneName () {
    return this._isUTC ? 'Coordinated Universal Time' : '';
}

var proto = Moment.prototype;

proto.add               = add;
proto.calendar          = calendar$1;
proto.clone             = clone;
proto.diff              = diff;
proto.endOf             = endOf;
proto.format            = format;
proto.from              = from;
proto.fromNow           = fromNow;
proto.to                = to;
proto.toNow             = toNow;
proto.get               = stringGet;
proto.invalidAt         = invalidAt;
proto.isAfter           = isAfter;
proto.isBefore          = isBefore;
proto.isBetween         = isBetween;
proto.isSame            = isSame;
proto.isSameOrAfter     = isSameOrAfter;
proto.isSameOrBefore    = isSameOrBefore;
proto.isValid           = isValid$2;
proto.lang              = lang;
proto.locale            = locale;
proto.localeData        = localeData;
proto.max               = prototypeMax;
proto.min               = prototypeMin;
proto.parsingFlags      = parsingFlags;
proto.set               = stringSet;
proto.startOf           = startOf;
proto.subtract          = subtract;
proto.toArray           = toArray;
proto.toObject          = toObject;
proto.toDate            = toDate;
proto.toISOString       = toISOString;
proto.inspect           = inspect;
proto.toJSON            = toJSON;
proto.toString          = toString;
proto.unix              = unix;
proto.valueOf           = valueOf;
proto.creationData      = creationData;
proto.year       = getSetYear;
proto.isLeapYear = getIsLeapYear;
proto.weekYear    = getSetWeekYear;
proto.isoWeekYear = getSetISOWeekYear;
proto.quarter = proto.quarters = getSetQuarter;
proto.month       = getSetMonth;
proto.daysInMonth = getDaysInMonth;
proto.week           = proto.weeks        = getSetWeek;
proto.isoWeek        = proto.isoWeeks     = getSetISOWeek;
proto.weeksInYear    = getWeeksInYear;
proto.isoWeeksInYear = getISOWeeksInYear;
proto.date       = getSetDayOfMonth;
proto.day        = proto.days             = getSetDayOfWeek;
proto.weekday    = getSetLocaleDayOfWeek;
proto.isoWeekday = getSetISODayOfWeek;
proto.dayOfYear  = getSetDayOfYear;
proto.hour = proto.hours = getSetHour;
proto.minute = proto.minutes = getSetMinute;
proto.second = proto.seconds = getSetSecond;
proto.millisecond = proto.milliseconds = getSetMillisecond;
proto.utcOffset            = getSetOffset;
proto.utc                  = setOffsetToUTC;
proto.local                = setOffsetToLocal;
proto.parseZone            = setOffsetToParsedOffset;
proto.hasAlignedHourOffset = hasAlignedHourOffset;
proto.isDST                = isDaylightSavingTime;
proto.isLocal              = isLocal;
proto.isUtcOffset          = isUtcOffset;
proto.isUtc                = isUtc;
proto.isUTC                = isUtc;
proto.zoneAbbr = getZoneAbbr;
proto.zoneName = getZoneName;
proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);

function createUnix (input) {
    return createLocal(input * 1000);
}

function createInZone () {
    return createLocal.apply(null, arguments).parseZone();
}

function preParsePostFormat (string) {
    return string;
}

var proto$1 = Locale.prototype;

proto$1.calendar        = calendar;
proto$1.longDateFormat  = longDateFormat;
proto$1.invalidDate     = invalidDate;
proto$1.ordinal         = ordinal;
proto$1.preparse        = preParsePostFormat;
proto$1.postformat      = preParsePostFormat;
proto$1.relativeTime    = relativeTime;
proto$1.pastFuture      = pastFuture;
proto$1.set             = set;

proto$1.months            =        localeMonths;
proto$1.monthsShort       =        localeMonthsShort;
proto$1.monthsParse       =        localeMonthsParse;
proto$1.monthsRegex       = monthsRegex;
proto$1.monthsShortRegex  = monthsShortRegex;
proto$1.week = localeWeek;
proto$1.firstDayOfYear = localeFirstDayOfYear;
proto$1.firstDayOfWeek = localeFirstDayOfWeek;

proto$1.weekdays       =        localeWeekdays;
proto$1.weekdaysMin    =        localeWeekdaysMin;
proto$1.weekdaysShort  =        localeWeekdaysShort;
proto$1.weekdaysParse  =        localeWeekdaysParse;

proto$1.weekdaysRegex       =        weekdaysRegex;
proto$1.weekdaysShortRegex  =        weekdaysShortRegex;
proto$1.weekdaysMinRegex    =        weekdaysMinRegex;

proto$1.isPM = localeIsPM;
proto$1.meridiem = localeMeridiem;

function get$1 (format, index, field, setter) {
    var locale = getLocale();
    var utc = createUTC().set(setter, index);
    return locale[field](utc, format);
}

function listMonthsImpl (format, index, field) {
    if (isNumber(format)) {
        index = format;
        format = undefined;
    }

    format = format || '';

    if (index != null) {
        return get$1(format, index, field, 'month');
    }

    var i;
    var out = [];
    for (i = 0; i < 12; i++) {
        out[i] = get$1(format, i, field, 'month');
    }
    return out;
}

// ()
// (5)
// (fmt, 5)
// (fmt)
// (true)
// (true, 5)
// (true, fmt, 5)
// (true, fmt)
function listWeekdaysImpl (localeSorted, format, index, field) {
    if (typeof localeSorted === 'boolean') {
        if (isNumber(format)) {
            index = format;
            format = undefined;
        }

        format = format || '';
    } else {
        format = localeSorted;
        index = format;
        localeSorted = false;

        if (isNumber(format)) {
            index = format;
            format = undefined;
        }

        format = format || '';
    }

    var locale = getLocale(),
        shift = localeSorted ? locale._week.dow : 0;

    if (index != null) {
        return get$1(format, (index + shift) % 7, field, 'day');
    }

    var i;
    var out = [];
    for (i = 0; i < 7; i++) {
        out[i] = get$1(format, (i + shift) % 7, field, 'day');
    }
    return out;
}

function listMonths (format, index) {
    return listMonthsImpl(format, index, 'months');
}

function listMonthsShort (format, index) {
    return listMonthsImpl(format, index, 'monthsShort');
}

function listWeekdays (localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
}

function listWeekdaysShort (localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
}

function listWeekdaysMin (localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
}

getSetGlobalLocale('en', {
    dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
    ordinal : function (number) {
        var b = number % 10,
            output = (toInt(number % 100 / 10) === 1) ? 'th' :
            (b === 1) ? 'st' :
            (b === 2) ? 'nd' :
            (b === 3) ? 'rd' : 'th';
        return number + output;
    }
});

// Side effect imports

hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', getSetGlobalLocale);
hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', getLocale);

var mathAbs = Math.abs;

function abs () {
    var data           = this._data;

    this._milliseconds = mathAbs(this._milliseconds);
    this._days         = mathAbs(this._days);
    this._months       = mathAbs(this._months);

    data.milliseconds  = mathAbs(data.milliseconds);
    data.seconds       = mathAbs(data.seconds);
    data.minutes       = mathAbs(data.minutes);
    data.hours         = mathAbs(data.hours);
    data.months        = mathAbs(data.months);
    data.years         = mathAbs(data.years);

    return this;
}

function addSubtract$1 (duration, input, value, direction) {
    var other = createDuration(input, value);

    duration._milliseconds += direction * other._milliseconds;
    duration._days         += direction * other._days;
    duration._months       += direction * other._months;

    return duration._bubble();
}

// supports only 2.0-style add(1, 's') or add(duration)
function add$1 (input, value) {
    return addSubtract$1(this, input, value, 1);
}

// supports only 2.0-style subtract(1, 's') or subtract(duration)
function subtract$1 (input, value) {
    return addSubtract$1(this, input, value, -1);
}

function absCeil (number) {
    if (number < 0) {
        return Math.floor(number);
    } else {
        return Math.ceil(number);
    }
}

function bubble () {
    var milliseconds = this._milliseconds;
    var days         = this._days;
    var months       = this._months;
    var data         = this._data;
    var seconds, minutes, hours, years, monthsFromDays;

    // if we have a mix of positive and negative values, bubble down first
    // check: https://github.com/moment/moment/issues/2166
    if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
            (milliseconds <= 0 && days <= 0 && months <= 0))) {
        milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
        days = 0;
        months = 0;
    }

    // The following code bubbles up values, see the tests for
    // examples of what that means.
    data.milliseconds = milliseconds % 1000;

    seconds           = absFloor(milliseconds / 1000);
    data.seconds      = seconds % 60;

    minutes           = absFloor(seconds / 60);
    data.minutes      = minutes % 60;

    hours             = absFloor(minutes / 60);
    data.hours        = hours % 24;

    days += absFloor(hours / 24);

    // convert days to months
    monthsFromDays = absFloor(daysToMonths(days));
    months += monthsFromDays;
    days -= absCeil(monthsToDays(monthsFromDays));

    // 12 months -> 1 year
    years = absFloor(months / 12);
    months %= 12;

    data.days   = days;
    data.months = months;
    data.years  = years;

    return this;
}

function daysToMonths (days) {
    // 400 years have 146097 days (taking into account leap year rules)
    // 400 years have 12 months === 4800
    return days * 4800 / 146097;
}

function monthsToDays (months) {
    // the reverse of daysToMonths
    return months * 146097 / 4800;
}

function as (units) {
    if (!this.isValid()) {
        return NaN;
    }
    var days;
    var months;
    var milliseconds = this._milliseconds;

    units = normalizeUnits(units);

    if (units === 'month' || units === 'year') {
        days   = this._days   + milliseconds / 864e5;
        months = this._months + daysToMonths(days);
        return units === 'month' ? months : months / 12;
    } else {
        // handle milliseconds separately because of floating point math errors (issue #1867)
        days = this._days + Math.round(monthsToDays(this._months));
        switch (units) {
            case 'week'   : return days / 7     + milliseconds / 6048e5;
            case 'day'    : return days         + milliseconds / 864e5;
            case 'hour'   : return days * 24    + milliseconds / 36e5;
            case 'minute' : return days * 1440  + milliseconds / 6e4;
            case 'second' : return days * 86400 + milliseconds / 1000;
            // Math.floor prevents floating point math errors here
            case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
            default: throw new Error('Unknown unit ' + units);
        }
    }
}

// TODO: Use this.as('ms')?
function valueOf$1 () {
    if (!this.isValid()) {
        return NaN;
    }
    return (
        this._milliseconds +
        this._days * 864e5 +
        (this._months % 12) * 2592e6 +
        toInt(this._months / 12) * 31536e6
    );
}

function makeAs (alias) {
    return function () {
        return this.as(alias);
    };
}

var asMilliseconds = makeAs('ms');
var asSeconds      = makeAs('s');
var asMinutes      = makeAs('m');
var asHours        = makeAs('h');
var asDays         = makeAs('d');
var asWeeks        = makeAs('w');
var asMonths       = makeAs('M');
var asYears        = makeAs('y');

function clone$1 () {
    return createDuration(this);
}

function get$2 (units) {
    units = normalizeUnits(units);
    return this.isValid() ? this[units + 's']() : NaN;
}

function makeGetter(name) {
    return function () {
        return this.isValid() ? this._data[name] : NaN;
    };
}

var milliseconds = makeGetter('milliseconds');
var seconds      = makeGetter('seconds');
var minutes      = makeGetter('minutes');
var hours        = makeGetter('hours');
var days         = makeGetter('days');
var months       = makeGetter('months');
var years        = makeGetter('years');

function weeks () {
    return absFloor(this.days() / 7);
}

var round = Math.round;
var thresholds = {
    ss: 44,         // a few seconds to seconds
    s : 45,         // seconds to minute
    m : 45,         // minutes to hour
    h : 22,         // hours to day
    d : 26,         // days to month
    M : 11          // months to year
};

// helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
    return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
}

function relativeTime$1 (posNegDuration, withoutSuffix, locale) {
    var duration = createDuration(posNegDuration).abs();
    var seconds  = round(duration.as('s'));
    var minutes  = round(duration.as('m'));
    var hours    = round(duration.as('h'));
    var days     = round(duration.as('d'));
    var months   = round(duration.as('M'));
    var years    = round(duration.as('y'));

    var a = seconds <= thresholds.ss && ['s', seconds]  ||
            seconds < thresholds.s   && ['ss', seconds] ||
            minutes <= 1             && ['m']           ||
            minutes < thresholds.m   && ['mm', minutes] ||
            hours   <= 1             && ['h']           ||
            hours   < thresholds.h   && ['hh', hours]   ||
            days    <= 1             && ['d']           ||
            days    < thresholds.d   && ['dd', days]    ||
            months  <= 1             && ['M']           ||
            months  < thresholds.M   && ['MM', months]  ||
            years   <= 1             && ['y']           || ['yy', years];

    a[2] = withoutSuffix;
    a[3] = +posNegDuration > 0;
    a[4] = locale;
    return substituteTimeAgo.apply(null, a);
}

// This function allows you to set the rounding function for relative time strings
function getSetRelativeTimeRounding (roundingFunction) {
    if (roundingFunction === undefined) {
        return round;
    }
    if (typeof(roundingFunction) === 'function') {
        round = roundingFunction;
        return true;
    }
    return false;
}

// This function allows you to set a threshold for relative time strings
function getSetRelativeTimeThreshold (threshold, limit) {
    if (thresholds[threshold] === undefined) {
        return false;
    }
    if (limit === undefined) {
        return thresholds[threshold];
    }
    thresholds[threshold] = limit;
    if (threshold === 's') {
        thresholds.ss = limit - 1;
    }
    return true;
}

function humanize (withSuffix) {
    if (!this.isValid()) {
        return this.localeData().invalidDate();
    }

    var locale = this.localeData();
    var output = relativeTime$1(this, !withSuffix, locale);

    if (withSuffix) {
        output = locale.pastFuture(+this, output);
    }

    return locale.postformat(output);
}

var abs$1 = Math.abs;

function sign(x) {
    return ((x > 0) - (x < 0)) || +x;
}

function toISOString$1() {
    // for ISO strings we do not use the normal bubbling rules:
    //  * milliseconds bubble up until they become hours
    //  * days do not bubble at all
    //  * months bubble up until they become years
    // This is because there is no context-free conversion between hours and days
    // (think of clock changes)
    // and also not between days and months (28-31 days per month)
    if (!this.isValid()) {
        return this.localeData().invalidDate();
    }

    var seconds = abs$1(this._milliseconds) / 1000;
    var days         = abs$1(this._days);
    var months       = abs$1(this._months);
    var minutes, hours, years;

    // 3600 seconds -> 60 minutes -> 1 hour
    minutes           = absFloor(seconds / 60);
    hours             = absFloor(minutes / 60);
    seconds %= 60;
    minutes %= 60;

    // 12 months -> 1 year
    years  = absFloor(months / 12);
    months %= 12;


    // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
    var Y = years;
    var M = months;
    var D = days;
    var h = hours;
    var m = minutes;
    var s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';
    var total = this.asSeconds();

    if (!total) {
        // this is the same as C#'s (Noda) and python (isodate)...
        // but not other JS (goog.date)
        return 'P0D';
    }

    var totalSign = total < 0 ? '-' : '';
    var ymSign = sign(this._months) !== sign(total) ? '-' : '';
    var daysSign = sign(this._days) !== sign(total) ? '-' : '';
    var hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

    return totalSign + 'P' +
        (Y ? ymSign + Y + 'Y' : '') +
        (M ? ymSign + M + 'M' : '') +
        (D ? daysSign + D + 'D' : '') +
        ((h || m || s) ? 'T' : '') +
        (h ? hmsSign + h + 'H' : '') +
        (m ? hmsSign + m + 'M' : '') +
        (s ? hmsSign + s + 'S' : '');
}

var proto$2 = Duration.prototype;

proto$2.isValid        = isValid$1;
proto$2.abs            = abs;
proto$2.add            = add$1;
proto$2.subtract       = subtract$1;
proto$2.as             = as;
proto$2.asMilliseconds = asMilliseconds;
proto$2.asSeconds      = asSeconds;
proto$2.asMinutes      = asMinutes;
proto$2.asHours        = asHours;
proto$2.asDays         = asDays;
proto$2.asWeeks        = asWeeks;
proto$2.asMonths       = asMonths;
proto$2.asYears        = asYears;
proto$2.valueOf        = valueOf$1;
proto$2._bubble        = bubble;
proto$2.clone          = clone$1;
proto$2.get            = get$2;
proto$2.milliseconds   = milliseconds;
proto$2.seconds        = seconds;
proto$2.minutes        = minutes;
proto$2.hours          = hours;
proto$2.days           = days;
proto$2.weeks          = weeks;
proto$2.months         = months;
proto$2.years          = years;
proto$2.humanize       = humanize;
proto$2.toISOString    = toISOString$1;
proto$2.toString       = toISOString$1;
proto$2.toJSON         = toISOString$1;
proto$2.locale         = locale;
proto$2.localeData     = localeData;

proto$2.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', toISOString$1);
proto$2.lang = lang;

// Side effect imports

// FORMATTING

addFormatToken('X', 0, 0, 'unix');
addFormatToken('x', 0, 0, 'valueOf');

// PARSING

addRegexToken('x', matchSigned);
addRegexToken('X', matchTimestamp);
addParseToken('X', function (input, array, config) {
    config._d = new Date(parseFloat(input, 10) * 1000);
});
addParseToken('x', function (input, array, config) {
    config._d = new Date(toInt(input));
});

// Side effect imports


hooks.version = '2.21.0';

setHookCallback(createLocal);

hooks.fn                    = proto;
hooks.min                   = min;
hooks.max                   = max;
hooks.now                   = now;
hooks.utc                   = createUTC;
hooks.unix                  = createUnix;
hooks.months                = listMonths;
hooks.isDate                = isDate;
hooks.locale                = getSetGlobalLocale;
hooks.invalid               = createInvalid;
hooks.duration              = createDuration;
hooks.isMoment              = isMoment;
hooks.weekdays              = listWeekdays;
hooks.parseZone             = createInZone;
hooks.localeData            = getLocale;
hooks.isDuration            = isDuration;
hooks.monthsShort           = listMonthsShort;
hooks.weekdaysMin           = listWeekdaysMin;
hooks.defineLocale          = defineLocale;
hooks.updateLocale          = updateLocale;
hooks.locales               = listLocales;
hooks.weekdaysShort         = listWeekdaysShort;
hooks.normalizeUnits        = normalizeUnits;
hooks.relativeTimeRounding  = getSetRelativeTimeRounding;
hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
hooks.calendarFormat        = getCalendarFormat;
hooks.prototype             = proto;

// currently HTML5 input type only supports 24-hour formats
hooks.HTML5_FMT = {
    DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',             // <input type="datetime-local" />
    DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',  // <input type="datetime-local" step="1" />
    DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',   // <input type="datetime-local" step="0.001" />
    DATE: 'YYYY-MM-DD',                             // <input type="date" />
    TIME: 'HH:mm',                                  // <input type="time" />
    TIME_SECONDS: 'HH:mm:ss',                       // <input type="time" step="1" />
    TIME_MS: 'HH:mm:ss.SSS',                        // <input type="time" step="0.001" />
    WEEK: 'YYYY-[W]WW',                             // <input type="week" />
    MONTH: 'YYYY-MM'                                // <input type="month" />
};

return hooks;

})));

},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvc3JjL2NvcmUvYWpheC50cyIsImFwcC9zcmMvY29yZS9tYWluLWxpdGUudHMiLCJhcHAvc3JjL2NvcmUvcGxhdGZvcm0udHMiLCJhcHAvc3JjL2NvcmUvdHJhY2tpbmcudHMiLCJhcHAvc3JjL2NvcmUvdXRpbC50cyIsIm5vZGVfbW9kdWxlcy9tb21lbnQtZHVyYXRpb24tZm9ybWF0L2xpYi9tb21lbnQtZHVyYXRpb24tZm9ybWF0LmpzIiwibm9kZV9tb2R1bGVzL21vbWVudC9tb21lbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBO0lBTUksWUFDVyxPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUU5QixJQUFJLENBQUM7WUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7WUFDdEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO1FBQy9CLENBQUM7UUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1QsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZDLEtBQUssR0FBRztvQkFDSixJQUFJLENBQUMsSUFBSSxHQUFHLG1CQUFtQixDQUFDO29CQUNoQyxJQUFJLENBQUMsT0FBTyxHQUFHLG1CQUFtQixDQUFDO29CQUNuQyxLQUFLLENBQUM7Z0JBQ1YsS0FBSyxHQUFHO29CQUNKLElBQUksQ0FBQyxJQUFJLEdBQUcscUJBQXFCLENBQUM7b0JBQ2xDLElBQUksQ0FBQyxPQUFPLEdBQUcscUJBQXFCLENBQUM7b0JBQ3JDLEtBQUssQ0FBQztnQkFDVixLQUFLLEdBQUc7b0JBQ0osSUFBSSxDQUFDLElBQUksR0FBRyxjQUFjLENBQUM7b0JBQzNCLElBQUksQ0FBQyxPQUFPLEdBQUcsc0JBQXNCLENBQUM7b0JBQ3RDLEtBQUssQ0FBQztnQkFDVjtvQkFDSSxJQUFJLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQztvQkFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUM7WUFDbEMsQ0FBQztRQUNMLENBQUM7SUFDTCxDQUFDO0lBQUEsQ0FBQztDQUNMO0FBakNELDhCQWlDQztBQUlELGlCQUF3QixNQUFjLEVBQUUsR0FBVyxFQUFFLElBQWEsRUFBRSxPQUE2QjtJQUM3RixJQUFJLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO0lBRS9CLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBaUIsQ0FBQyxPQUFPLEVBQUUsTUFBTTtRQUMvQyxHQUFHLENBQUMsa0JBQWtCLEdBQUc7WUFDckIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ25DLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakIsQ0FBQztZQUNMLENBQUM7UUFDTCxDQUFDLENBQUE7UUFFRCxJQUFJLENBQUM7WUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDNUIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDVixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsS0FBSyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDdEUsQ0FBQztZQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkIsQ0FBQztRQUFDLEtBQUssQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDUixNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQixDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBeEJELDBCQXdCQzs7Ozs7QUM3REQsK0JBQStCO0FBTTNCLG9CQUFJO0FBTFIsdUNBQXVDO0FBT25DLDRCQUFRO0FBTlosK0JBQStCO0FBSzNCLG9CQUFJO0FBSlIsdUNBQXVDO0FBTW5DLDRCQUFROzs7Ozs7Ozs7Ozs7O0FDTFosTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUNuQyxNQUFNLFFBQVEsR0FBRyxXQUFXLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFbkcsa0RBQWtEO0FBQ2xELElBQUksaUJBQXNDLENBQUM7QUFFM0MsMERBQTBEO0FBQzFELDZHQUE2RztBQUM3Ryx5QkFBeUIsSUFBWTtJQUNqQyxpQkFBaUIsR0FBRyxpQkFBaUIsSUFBSSxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVFLGlCQUFpQixDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDL0IsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUM3QyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMzQixRQUFRLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVCLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDakQsQ0FBQztBQUVELDJEQUEyRDtBQUMzRCw2R0FBNkc7QUFDN0c7SUFDSSxpQkFBaUIsR0FBRyxpQkFBaUIsSUFBSSxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVFLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDN0MsaUJBQWlCLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUM3QixpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMzQixRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlCLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDN0MsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztBQUNuQyxDQUFDO0FBRUQ7SUFDSSxNQUFNLENBQUMsT0FBTyxPQUFPLEtBQUssV0FBVyxDQUFDO0FBQzFDLENBQUM7QUFGRCw4QkFFQztBQUVELHlEQUF5RDtBQUN6RDtJQUNJLE1BQU0sQ0FBQyxDQUFDLE9BQU8sTUFBTSxLQUFLLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO0FBQ2pGLENBQUM7QUFGRCxrQ0FFQztBQUVEOztRQUNJLE1BQU0sQ0FBQyxDQUFDLE1BQU0sZUFBZSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxLQUFLLENBQUM7SUFDN0QsQ0FBQztDQUFBO0FBRkQsc0JBRUM7QUFFRDs7UUFDSSxNQUFNLENBQUMsQ0FBQyxNQUFNLGVBQWUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssU0FBUyxDQUFDO0lBQ2pFLENBQUM7Q0FBQTtBQUZELDhCQUVDO0FBRUQ7O1FBQ0ksTUFBTSxDQUFDLENBQUMsTUFBTSxlQUFlLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLFVBQVUsQ0FBQztJQUNsRSxDQUFDO0NBQUE7QUFGRCxnQ0FFQztBQUVELDJEQUEyRDtBQUMzRDtJQUNJLElBQUksQ0FBQztRQUNELFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNoQixDQUFDO0lBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNULE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDakIsQ0FBQztBQUNMLENBQUM7QUFQRCwwQkFPQztBQUVELDZDQUE2QztBQUM3QyxzQkFBbUMsSUFBWTs7UUFDM0Msc0dBQXNHO1FBQ3RHLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNkLE1BQU0sWUFBWSxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNO2dCQUNyQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxRCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBWkQsb0NBWUM7QUFFRCxnQ0FBZ0M7QUFDaEM7O1FBQ0ksc0dBQXNHO1FBQ3RHLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNkLE1BQU0sWUFBWSxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNO2dCQUN2QyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JELENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDekMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzdCLENBQUM7SUFDTCxDQUFDO0NBQUE7QUFaRCxvQ0FZQztBQUVEOztRQUNJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE1BQU0sQ0FBQywwQ0FBMEMsQ0FBQztRQUN0RCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNCLE1BQU0sQ0FBQyxxRUFBcUUsQ0FBQztRQUNqRixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxvRkFBb0YsQ0FBQztRQUNoRyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixNQUFNLENBQUMsb0JBQW9CLENBQUM7UUFDaEMsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQVZELDBDQVVDO0FBRUQsdUJBQW9DLE1BQWE7O1FBQzdDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE1BQU0sQ0FBQyw4REFBOEQsQ0FBQztRQUMxRSxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNCLE1BQU0sQ0FBQyxxRUFBcUUsQ0FBQztRQUNqRixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdCLE1BQU0sQ0FBQyw0RkFBNEYsQ0FBQztRQUN4RyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBZSxFQUFFLENBQUM7WUFDekMsTUFBTSxDQUFDLGtDQUFrQyxNQUFNLE1BQU0sa0JBQWtCLENBQUMsUUFBUSxDQUFDLE1BQU0sT0FBTyxFQUFFLENBQUM7UUFDckcsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQVpELHNDQVlDO0FBRUQ7SUFDSSxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUN6QixDQUFDO0FBRkQsMEJBRUM7QUFFRDtJQUNJLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ3RCLENBQUM7QUFGRCxnQ0FFQztBQUVEOztRQUNJLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNmLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUM1QyxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNyQixNQUFNLFlBQVksQ0FBQztZQUNuQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTTtnQkFDdkMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDNUQsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN2QixNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUM7UUFDaEQsQ0FBQztRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUM7SUFDZCxDQUFDO0NBQUE7QUFiRCxzQ0FhQztBQUVEOztRQUNJLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNmLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM5QyxNQUFNLENBQUM7Z0JBQ0gsTUFBTSxFQUFFLE9BQU87Z0JBQ2YsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLEtBQUssRUFBRSxPQUFPO2FBQ2pCLENBQUMsUUFBUSxDQUFDLElBQUksUUFBUSxDQUFDO1FBQzVCLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLE1BQU0sWUFBWSxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQzNCLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQWUsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2RixNQUFNLENBQUM7Z0JBQ0gsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLEdBQUcsRUFBRSxrQkFBa0I7Z0JBQ3ZCLEtBQUssRUFBRSxnQkFBZ0I7Z0JBQ3ZCLE9BQU8sRUFBRSxrQkFBa0I7Z0JBQzNCLEdBQUcsRUFBRSxnQkFBZ0I7Z0JBQ3JCLE9BQU8sRUFBRSxrQkFBa0I7YUFDOUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUMxQixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ2QsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQXhCRCwwQ0F3QkM7QUFFRDtJQUNJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDdkUsQ0FBQztBQUZELGdEQUVDO0FBRUQ7O1FBQ0ksRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2QsTUFBTSxZQUFZLENBQUM7WUFDbkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDdkIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEIsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDZCxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBVEQsc0NBU0M7QUFFRDs7UUFDSSxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDZCxNQUFNLFlBQVksQ0FBQztZQUNuQixNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUMxQixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZDLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDZCxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBVEQsb0NBU0M7QUFFRDs7UUFDSSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDZixRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sZUFBZSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDcEQsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQU5ELDBDQU1DO0FBRUQ7SUFDSSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDZixRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM1QyxDQUFDO0FBQ0wsQ0FBQztBQUpELDRCQUlDO0FBRUQ7SUFDSSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDZixRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6QyxDQUFDO0FBQ0wsQ0FBQztBQUpELHdCQUlDO0FBRUQ7SUFDSSwrREFBK0Q7SUFDL0Qsa0RBQWtEO0lBQ2xELE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQztBQUN0QyxDQUFDO0FBSkQsOEJBSUM7QUFZRDs7UUFDSSxNQUFNLElBQUksR0FBZTtZQUNyQixRQUFRLEVBQUUsTUFBTSxlQUFlLEVBQUU7WUFDakMsU0FBUyxFQUFFLE1BQU0sWUFBWSxFQUFFO1lBQy9CLFVBQVUsRUFBRSxNQUFNLGFBQWEsRUFBRTtZQUNqQyxJQUFJLEVBQUUsTUFBTSxhQUFhLEVBQUU7U0FDOUIsQ0FBQztRQUVGLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNkLE1BQU0sWUFBWSxDQUFDO1lBQ25CLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztZQUMxQixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUM7UUFDNUMsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNmLElBQUksQ0FBQyxRQUFRLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pELENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQW5CRCxzQ0FtQkM7Ozs7O0FDMVBELHlDQUEyQztBQUUzQyxJQUFJLE1BQWtCLENBQUM7QUFDdkIsSUFBSSxNQUFjLENBQUM7QUFDbkIsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDO0FBQ3BCLElBQUksUUFBK0QsQ0FBRTtBQUVyRSxNQUFNLFdBQVcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sS0FBSyxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFFL0QsY0FBcUIsRUFBVSxFQUFFLEVBQTJEO0lBQ3hGLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDWixRQUFRLEdBQUcsRUFBRSxJQUFJO1FBQ2IsR0FBRyxLQUFLLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNwQyxHQUFHLEtBQUssTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQSxDQUFDLENBQUM7S0FDckMsQ0FBQztJQUNGLE1BQU0sRUFBRSxDQUFDO0FBQ2IsQ0FBQztBQVBELG9CQU9DO0FBRUQsdUJBQThCLEVBQVU7SUFDcEMsVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUNoQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFIRCxzQ0FHQztBQUVELElBQUksS0FBSyxHQUFHLFdBQVc7S0FDbEIsSUFBSSxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztJQUNwQixRQUFRLENBQUMsR0FBRyxFQUFFO0lBQ2Qsd0JBQWEsRUFBRTtDQUNsQixDQUFDLENBQUM7S0FDRixJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUM7SUFDbkIsVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFvQixDQUFDO0lBQ3hDLE1BQU0sV0FBVyxHQUFHLE9BQU8sS0FBSyxDQUFDLFdBQVcsS0FBSyxRQUFRLEdBQUksS0FBSyxDQUFDLFdBQXNCLEdBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqRyxNQUFNLGFBQWEsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7SUFDekMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRTlELEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDaEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1FBQ2hCLFdBQVcsRUFBRSxXQUFXO1FBQ3hCLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRTtRQUNoQyxXQUFXLEVBQUUsV0FBVztRQUN4QixXQUFXLEVBQUUsT0FBTztLQUN2QixDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQztBQUVQLGVBQXNCLEtBQWEsRUFBRSxLQUF5QztJQUMxRSxNQUFNLElBQUksR0FBRztRQUNULEtBQUssRUFBRSxLQUFLO1FBQ1osS0FBSyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xCLFVBQVUsRUFBRSxVQUFVO0tBQ3pCLENBQUM7SUFFRixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkIsS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNuQyxJQUFJLENBQUMsQ0FBQyxLQUFLO1FBQ1IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ3RCLGNBQWMsRUFBRSxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFxQixDQUFDLENBQUMsV0FBVyxFQUFFO1lBQ3hGLGNBQWMsRUFBRSxLQUFLLENBQUMsV0FBVztZQUNqQyxlQUFlLEVBQUUsS0FBSyxDQUFDLGNBQWMsSUFBSSxLQUFLO1lBQzlDLE9BQU8sRUFBRSxLQUFLLENBQUMsS0FBSztTQUN2QixDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNqQixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFrQixDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDL0UsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO2dCQUN0QixZQUFZLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUEyQixDQUFDLENBQUMsV0FBVyxFQUFFO2dCQUN2RSxlQUFlLEVBQUUsS0FBSyxDQUFDLGdCQUFnQjtnQkFDdkMsUUFBUSxFQUFFLEtBQUssQ0FBQyxVQUFVO2FBQzdCLENBQUMsQ0FBQztRQUNQLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFzQixDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDdkYsQ0FBQztJQUNMLENBQUMsQ0FBQztTQUNELElBQUksQ0FBQyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQ3RCLE1BQU0sRUFDTixNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUMxQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUN2QixDQUFDO1NBQ0QsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNKLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQztTQUNELEtBQUssQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDO0lBRXJCLE1BQU0sQ0FBQyxLQUFLLENBQUM7QUFDakIsQ0FBQztBQWhERCxzQkFnREM7Ozs7O0FDakdELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUVsQyxtQ0FBbUM7QUFDbkM7SUFDSSxNQUFNLENBQUMsc0NBQXNDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxVQUFTLENBQUM7UUFDckUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLEdBQUcsR0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUFMRCxvQkFLQztBQUVZLFFBQUEsS0FBSyxHQUFHO0lBQ2pCLE9BQU8sRUFBRSxZQUFZO0lBQ3JCLEtBQUssRUFBRSw0QkFBNEI7SUFDbkMsS0FBSyxFQUFFLDRCQUE0QjtJQUNuQyxLQUFLLEVBQUUsb0NBQW9DO0NBQzlDLENBQUM7QUFFVyxRQUFBLFFBQVEsR0FBRztJQUNwQixJQUFJLEVBQUUsYUFBSyxDQUFDLE9BQU8sR0FBRyxhQUFLLENBQUMsS0FBSyxHQUFHLGFBQUssQ0FBQyxLQUFLLEdBQUcsYUFBSyxDQUFDLEtBQUs7SUFDN0QsUUFBUSxFQUFFLGFBQUssQ0FBQyxPQUFPLEdBQUcsYUFBSyxDQUFDLEtBQUssR0FBRyxhQUFLLENBQUMsS0FBSztJQUNuRCxLQUFLLEVBQUUsYUFBSyxDQUFDLEtBQUssR0FBRyxhQUFLLENBQUMsS0FBSztJQUNoQyxHQUFHLEVBQUUsYUFBSyxDQUFDLE9BQU87SUFDbEIsSUFBSSxFQUFFLGFBQUssQ0FBQyxPQUFPLEdBQUcsUUFBUTtDQUNqQyxDQUFDO0FBRUYsc0ZBQXNGO0FBQ3RGLHNCQUE2QixNQUFNLEdBQUcsRUFBRSxFQUFFLE9BQU8sR0FBRyxnQkFBUSxDQUFDLElBQUk7SUFDN0QsSUFBSSxHQUFHLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUIsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2IsT0FBTyxHQUFHLENBQUMsTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLDhGQUE4RjtRQUM5RixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN0QyxRQUFRLENBQUM7UUFDYixDQUFDO1FBQ0QsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO0FBQ2YsQ0FBQztBQVpELG9DQVlDO0FBRUQsa0JBQXlCLEVBQTJCLEVBQUUsS0FBYTtJQUMvRCxJQUFJLE9BQWUsQ0FBQztJQUVwQixNQUFNLENBQUMsVUFBUyxHQUFHLElBQVc7UUFDMUIsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RCLE9BQU8sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQztBQUNOLENBQUM7QUFQRCw0QkFPQztBQUVELGNBQXFCLEVBQVU7SUFDM0IsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxLQUFLLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNuRSxDQUFDO0FBRkQsb0JBRUM7QUFFRCx5QkFBZ0MsTUFBYyxFQUFFLGtCQUEyQztJQUN2RixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXBELE9BQU8sV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDYixDQUFDO1FBRUQsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFiRCwwQ0FhQztBQUVELHFCQUE0QixTQUFjLEVBQUUsR0FBRyxNQUE2QjtJQUN4RSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLEtBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ2hFLENBQUM7QUFGRCxrQ0FFQztBQUVELDJCQUFrQyxJQUFVO0lBQ3hDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDbEMsQ0FBQztBQUZELDhDQUVDO0FBRUQseUJBQWdDLFNBQTZCLEVBQUUsUUFBZ0I7SUFDM0UsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ25GLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2hDLENBQUM7QUFIRCwwQ0FHQztBQUVELGtCQUF5QixJQUF3QixFQUFFLFFBQWdCO0lBQy9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUN2RCxDQUFDO0FBRkQsNEJBRUM7OztBQ3BGRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDem9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJleHBvcnQgY2xhc3MgQWpheEVycm9yIHtcblxuICAgIHB1YmxpYyBjb2RlOiBzdHJpbmc7XG5cbiAgICBwdWJsaWMgbWVzc2FnZTogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHB1YmxpYyByZXF1ZXN0OiBYTUxIdHRwUmVxdWVzdFxuICAgICkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXJyID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB0aGlzLmNvZGUgPSBlcnIuZXJyb3I7XG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2UgPSBlcnIubWVzc2FnZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgc3dpdGNoIChyZXF1ZXN0LnN0YXR1cy50b1N0cmluZygpWzBdKSB7XG4gICAgICAgICAgICBjYXNlIFwiMFwiOlxuICAgICAgICAgICAgICAgIHRoaXMuY29kZSA9IFwiZmFpbGVkX2Nvbm5lY3Rpb25cIjtcbiAgICAgICAgICAgICAgICB0aGlzLm1lc3NhZ2UgPSBcIkZhaWxlZCBDb25uZWN0aW9uXCI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiM1wiOlxuICAgICAgICAgICAgICAgIHRoaXMuY29kZSA9IFwidW5leHBlY3RlZF9yZWRpcmVjdFwiO1xuICAgICAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IFwiVW5leHBlY3RlZCBSZWRpcmVjdFwiO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjRcIjpcbiAgICAgICAgICAgICAgICB0aGlzLmNvZGUgPSBcImNsaWVudF9lcnJvclwiO1xuICAgICAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IFwiVW5rbm93biBDbGllbnQgRXJyb3JcIjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy5jb2RlID0gXCJzZXJ2ZXJfZXJyb3JcIjtcbiAgICAgICAgICAgICAgICB0aGlzLm1lc3NhZ2UgPSBcIlNlcnZlciBFcnJvclwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn1cblxuZXhwb3J0IHR5cGUgTWV0aG9kID0gXCJHRVRcIiB8IFwiUE9TVFwiIHwgXCJQVVRcIiB8IFwiREVMRVRFXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXF1ZXN0KG1ldGhvZDogTWV0aG9kLCB1cmw6IHN0cmluZywgYm9keT86IHN0cmluZywgaGVhZGVycz86IE1hcDxzdHJpbmcsIHN0cmluZz4pOiBQcm9taXNlPFhNTEh0dHBSZXF1ZXN0PiB7XG4gICAgbGV0IHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFhNTEh0dHBSZXF1ZXN0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVxLnN0YXR1cy50b1N0cmluZygpWzBdICE9PSBcIjJcIikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEFqYXhFcnJvcihyZXEpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlcS5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChoZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiByZXEuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXEuc2VuZChib2R5KTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICByZWplY3QobmV3IEFqYXhFcnJvcihyZXEpKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaWVudCB7XG4gICAgcmVxdWVzdChtZXRob2Q6IE1ldGhvZCwgdXJsOiBzdHJpbmcsIGJvZHk/OiBzdHJpbmcsIGhlYWRlcnM/OiBNYXA8c3RyaW5nLCBzdHJpbmc+KTogUHJvbWlzZTxYTUxIdHRwUmVxdWVzdD5cbiAgICB1cmxGb3JQYXRoKHBhdGg6IHN0cmluZyk6IHN0cmluZ1xufVxuIiwiaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi91dGlsXCI7XG5pbXBvcnQgKiBhcyBwbGF0Zm9ybSBmcm9tIFwiLi9wbGF0Zm9ybVwiO1xuaW1wb3J0ICogYXMgYWpheCBmcm9tIFwiLi9hamF4XCI7XG5pbXBvcnQgKiBhcyB0cmFja2luZyBmcm9tIFwiLi90cmFja2luZ1wiO1xuXG5leHBvcnQge1xuICAgIHV0aWwsXG4gICAgYWpheCxcbiAgICBwbGF0Zm9ybSxcbiAgICB0cmFja2luZ1xufVxuIiwiZGVjbGFyZSB2YXIgY29yZG92YTogYW55IHwgdW5kZWZpbmVkO1xuZGVjbGFyZSB2YXIgY2hyb21lOiBhbnkgfCB1bmRlZmluZWQ7XG5kZWNsYXJlIHZhciBkZXZpY2U6IGFueSB8IHVuZGVmaW5lZDtcblxuY29uc3Qgbm9kZVJlcXVpcmUgPSB3aW5kb3cucmVxdWlyZTtcbmNvbnN0IGVsZWN0cm9uID0gbm9kZVJlcXVpcmUgJiYgbm9kZVJlcXVpcmUoXCJlbGVjdHJvblwiKTtcbmNvbnN0IGNvcmRvdmFSZWFkeSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyKSA9PiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiZGV2aWNlcmVhZHlcIiwgKCkgPT4gcigpKSk7XG5cbi8vIFRleHRhcmVhIHVzZWQgZm9yIGNvcHlpbmcvcGFzdGluZyB1c2luZyB0aGUgZG9tXG5sZXQgY2xpcGJvYXJkVGV4dEFyZWE6IEhUTUxUZXh0QXJlYUVsZW1lbnQ7XG5cbi8vIFNldCBjbGlwYm9hcmQgdGV4dCB1c2luZyBgZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJjdXRcIilgLlxuLy8gTk9URTogVGhpcyBvbmx5IHdvcmtzIGluIGNlcnRhaW4gZW52aXJvbm1lbnRzIGxpa2UgR29vZ2xlIENocm9tZSBhcHBzIHdpdGggdGhlIGFwcHJvcHJpYXRlIHBlcm1pc3Npb25zIHNldFxuZnVuY3Rpb24gZG9tU2V0Q2xpcGJvYXJkKHRleHQ6IHN0cmluZykge1xuICAgIGNsaXBib2FyZFRleHRBcmVhID0gY2xpcGJvYXJkVGV4dEFyZWEgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuICAgIGNsaXBib2FyZFRleHRBcmVhLnZhbHVlID0gdGV4dDtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNsaXBib2FyZFRleHRBcmVhKTtcbiAgICBjbGlwYm9hcmRUZXh0QXJlYS5zZWxlY3QoKTtcbiAgICBkb2N1bWVudC5leGVjQ29tbWFuZChcImN1dFwiKTtcbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGNsaXBib2FyZFRleHRBcmVhKTtcbn1cblxuLy8gR2V0IGNsaXBib2FyZCB0ZXh0IHVzaW5nIGBkb2N1bWVudC5leGVjQ29tbWFuZChcInBhc3RlXCIpYFxuLy8gTk9URTogVGhpcyBvbmx5IHdvcmtzIGluIGNlcnRhaW4gZW52aXJvbm1lbnRzIGxpa2UgR29vZ2xlIENocm9tZSBhcHBzIHdpdGggdGhlIGFwcHJvcHJpYXRlIHBlcm1pc3Npb25zIHNldFxuZnVuY3Rpb24gZG9tR2V0Q2xpcGJvYXJkKCk6IHN0cmluZyB7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEgPSBjbGlwYm9hcmRUZXh0QXJlYSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjbGlwYm9hcmRUZXh0QXJlYSk7XG4gICAgY2xpcGJvYXJkVGV4dEFyZWEudmFsdWUgPSBcIlwiO1xuICAgIGNsaXBib2FyZFRleHRBcmVhLnNlbGVjdCgpO1xuICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKFwicGFzdGVcIik7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChjbGlwYm9hcmRUZXh0QXJlYSk7XG4gICAgcmV0dXJuIGNsaXBib2FyZFRleHRBcmVhLnZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNDb3Jkb3ZhKCk6IEJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgY29yZG92YSAhPT0gXCJ1bmRlZmluZWRcIjtcbn1cblxuLy8qIENoZWNrcyBpZiB0aGUgYXBwIGlzIHJ1bm5pbmcgYXMgYSBwYWNrYWdlZCBDaHJvbWUgYXBwXG5leHBvcnQgZnVuY3Rpb24gaXNDaHJvbWVBcHAoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICh0eXBlb2YgY2hyb21lICE9PSBcInVuZGVmaW5lZFwiKSAmJiBjaHJvbWUuYXBwICYmICEhY2hyb21lLmFwcC5ydW50aW1lO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNJT1MoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIChhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKSkudG9Mb3dlckNhc2UoKSA9PT0gXCJpb3NcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzQW5kcm9pZCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gKGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpKS50b0xvd2VyQ2FzZSgpID09PSBcImFuZHJvaWRcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzQ2hyb21lT1MoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIChhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKSkudG9Mb3dlckNhc2UoKSA9PT0gXCJjaHJvbWVvc1wiO1xufVxuXG4vLyogQ2hlY2tzIGlmIHRoZSBjdXJyZW50IGVudmlyb25tZW50IHN1cHBvcnRzIHRvdWNoIGV2ZW50c1xuZXhwb3J0IGZ1bmN0aW9uIGlzVG91Y2goKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJUb3VjaEV2ZW50XCIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbi8vKiBTZXRzIHRoZSBjbGlwYm9hcmQgdGV4dCB0byBhIGdpdmVuIHN0cmluZ1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldENsaXBib2FyZCh0ZXh0OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBJZiBjb3Jkb3ZhIGNsaXBib2FyZCBwbHVnaW4gaXMgYXZhaWxhYmxlLCB1c2UgdGhhdCBvbmUuIE90aGVyd2lzZSB1c2UgdGhlIGV4ZWNDb21tYW5kIGltcGxlbWVuYXRpb25cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29yZG92YS5wbHVnaW5zLmNsaXBib2FyZC5jb3B5KHRleHQsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIGVsZWN0cm9uLmNsaXBib2FyZC53cml0ZVRleHQodGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZG9tU2V0Q2xpcGJvYXJkKHRleHQpO1xuICAgIH1cbn1cblxuLy8qIFJldHJpZXZlcyB0aGUgY2xpcGJvYXJkIHRleHRcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDbGlwYm9hcmQoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAvLyBJZiBjb3Jkb3ZhIGNsaXBib2FyZCBwbHVnaW4gaXMgYXZhaWxhYmxlLCB1c2UgdGhhdCBvbmUuIE90aGVyd2lzZSB1c2UgdGhlIGV4ZWNDb21tYW5kIGltcGxlbWVuYXRpb25cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb3Jkb3ZhLnBsdWdpbnMuY2xpcGJvYXJkLnBhc3RlKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIHJldHVybiBlbGVjdHJvbi5jbGlwYm9hcmQucmVhZFRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZG9tR2V0Q2xpcGJvYXJkKCk7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXBwU3RvcmVMaW5rKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKGF3YWl0IGlzSU9TKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9pdHVuZXMuYXBwbGUuY29tL2FwcC9pZDg3MTcxMDEzOVwiO1xuICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNBbmRyb2lkKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9wbGF5Lmdvb2dsZS5jb20vc3RvcmUvYXBwcy9kZXRhaWxzP2lkPWNvbS5tYWtsZXNvZnQucGFkbG9ja1wiO1xuICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNDaHJvbWVBcHAoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL2Nocm9tZS5nb29nbGUuY29tL3dlYnN0b3JlL2RldGFpbC9wYWRsb2NrL25wa29lZmpmY2pia25vZWFkZmtiY2RwYmFwYWFtY2lmXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9wYWRsb2NrLmlvXCI7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UmV2aWV3TGluayhyYXRpbmc6bnVtYmVyKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoYXdhaXQgaXNJT1MoKSkge1xuICAgICAgICByZXR1cm4gXCJodHRwczovL2l0dW5lcy5hcHBsZS5jb20vYXBwL2lkODcxNzEwMTM5P2FjdGlvbj13cml0ZS1yZXZpZXdcIjtcbiAgICB9IGVsc2UgaWYgKGF3YWl0IGlzQW5kcm9pZCgpKSB7XG4gICAgICAgIHJldHVybiBcImh0dHBzOi8vcGxheS5nb29nbGUuY29tL3N0b3JlL2FwcHMvZGV0YWlscz9pZD1jb20ubWFrbGVzb2Z0LnBhZGxvY2tcIjtcbiAgICB9IGVsc2UgaWYgKGF3YWl0IGlzQ2hyb21lQXBwKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiaHR0cHM6Ly9jaHJvbWUuZ29vZ2xlLmNvbS93ZWJzdG9yZS9kZXRhaWwvcGFkbG9jay9ucGtvZWZqZmNqYmtub2VhZGZrYmNkcGJhcGFhbWNpZi9yZXZpZXdzXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgdmVyc2lvbiA9IGF3YWl0IGdldEFwcFZlcnNpb24oKTtcbiAgICAgICAgY29uc3QgcGxhdGZvcm0gPSBhd2FpdCBnZXRQbGF0Zm9ybU5hbWUoKTtcbiAgICAgICAgcmV0dXJuIGBodHRwczovL3BhZGxvY2suaW8vZmVlZGJhY2svP3I9JHtyYXRpbmd9JnA9JHtlbmNvZGVVUklDb21wb25lbnQocGxhdGZvcm0pfSZ2PSR7dmVyc2lvbn1gO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc05vZGUoKTogQm9vbGVhbiB7XG4gICAgcmV0dXJuICEhbm9kZVJlcXVpcmU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VsZWN0cm9uKCk6IEJvb2xlYW4ge1xuICAgIHJldHVybiAhIWVsZWN0cm9uO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXBwVmVyc2lvbigpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgcmV0dXJuIGVsZWN0cm9uLnJlbW90ZS5hcHAuZ2V0VmVyc2lvbigpO1xuICAgIH0gZWxzZSBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb3Jkb3ZhLmdldEFwcFZlcnNpb24uZ2V0VmVyc2lvbk51bWJlcihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGlzQ2hyb21lQXBwKCkpIHtcbiAgICAgICAgcmV0dXJuIGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KCkudmVyc2lvbjtcbiAgICB9XG5cbiAgICByZXR1cm4gXCJcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFBsYXRmb3JtTmFtZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0VsZWN0cm9uKCkpIHtcbiAgICAgICAgY29uc3QgcGxhdGZvcm0gPSBub2RlUmVxdWlyZShcIm9zXCIpLnBsYXRmb3JtKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkYXJ3aW46IFwiTWFjT1NcIixcbiAgICAgICAgICAgIHdpbjMyOiBcIldpbmRvd3NcIixcbiAgICAgICAgICAgIGxpbnV4OiBcIkxpbnV4XCJcbiAgICAgICAgfVtwbGF0Zm9ybV0gfHwgcGxhdGZvcm07XG4gICAgfSBlbHNlIGlmIChpc0NvcmRvdmEoKSkge1xuICAgICAgICBhd2FpdCBjb3Jkb3ZhUmVhZHk7XG4gICAgICAgIHJldHVybiBkZXZpY2UucGxhdGZvcm07XG4gICAgfSBlbHNlIGlmIChpc0Nocm9tZUFwcCgpKSB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCBuZXcgUHJvbWlzZTx7b3M6IHN0cmluZ30+KChyKSA9PiBjaHJvbWUucnVudGltZS5nZXRQbGF0Zm9ybUluZm8ocikpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3JvczogXCJDaHJvbWVPU1wiLFxuICAgICAgICAgICAgd2luOiBcIldpbmRvd3MgKENocm9tZSlcIixcbiAgICAgICAgICAgIGxpbnV4OiBcIkxpbnV4IChDaHJvbWUpXCIsXG4gICAgICAgICAgICBhbmRyb2lkOiBcIkFuZHJvaWQgKENocm9tZSlcIixcbiAgICAgICAgICAgIG1hYzogXCJNYWNPUyAoQ2hyb21lKVwiLFxuICAgICAgICAgICAgb3BlbmJzZDogXCJPcGVuQlNEIChDaHJvbWUpXCJcbiAgICAgICAgfVtpbmZvLm9zXSB8fCBpbmZvLm9zO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlc2t0b3BTZXR0aW5ncygpOiBhbnkge1xuICAgIHJldHVybiBpc0VsZWN0cm9uKCkgPyBlbGVjdHJvbi5yZW1vdGUuZ2V0R2xvYmFsKFwic2V0dGluZ3NcIikgOiBudWxsO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RGV2aWNlVVVJRCgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChpc0NvcmRvdmEoKSkge1xuICAgICAgICBhd2FpdCBjb3Jkb3ZhUmVhZHk7XG4gICAgICAgIHJldHVybiBkZXZpY2UudXVpZDtcbiAgICB9IGVsc2UgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICByZXR1cm4gZ2V0RGVza3RvcFNldHRpbmdzKCkuZ2V0KFwidXVpZFwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRPU1ZlcnNpb24oKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICByZXR1cm4gZGV2aWNlLnZlcnNpb247XG4gICAgfSBlbHNlIGlmIChoYXNOb2RlKCkpIHtcbiAgICAgICAgcmV0dXJuIG5vZGVSZXF1aXJlKFwib3NcIikucmVsZWFzZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrRm9yVXBkYXRlcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoaXNFbGVjdHJvbigpKSB7XG4gICAgICAgIGVsZWN0cm9uLmlwY1JlbmRlcmVyLnNlbmQoXCJjaGVjay11cGRhdGVzXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHdpbmRvdy5vcGVuKGF3YWl0IGdldEFwcFN0b3JlTGluaygpLCBcIl9zeXN0ZW1cIik7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZURCQXMoKSB7XG4gICAgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICBlbGVjdHJvbi5pcGNSZW5kZXJlci5zZW5kKFwic2F2ZS1kYi1hc1wiKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkREIoKSB7XG4gICAgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICBlbGVjdHJvbi5pcGNSZW5kZXJlci5zZW5kKFwibG9hZC1kYlwiKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2NhbGUoKTogc3RyaW5nIHtcbiAgICAvLyBUT0RPOiBJcyB0aGVyZSBhIG1vcmUgcmVsaWFibGUgd2F5IHRvIGdldCB0aGUgc3lzdGVtIGxvY2FsZSxcbiAgICAvLyBlLmcuIHRocm91Z2ggYGVsZWN0cm9uLnJlbW90ZS5hcHAuZ2V0TG9jYWxlKClgP1xuICAgIHJldHVybiBuYXZpZ2F0b3IubGFuZ3VhZ2UgfHwgXCJlblwiO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERldmljZUluZm8ge1xuICAgIHBsYXRmb3JtOiBzdHJpbmcsXG4gICAgb3NWZXJzaW9uOiBzdHJpbmcsXG4gICAgdXVpZDogc3RyaW5nLFxuICAgIGFwcFZlcnNpb246IHN0cmluZyxcbiAgICBtYW51ZmFjdHVyZXI/OiBzdHJpbmcsXG4gICAgbW9kZWw/OiBzdHJpbmcsXG4gICAgaG9zdE5hbWU/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERldmljZUluZm8oKTogUHJvbWlzZTxEZXZpY2VJbmZvPiB7XG4gICAgY29uc3QgaW5mbzogRGV2aWNlSW5mbyA9IHtcbiAgICAgICAgcGxhdGZvcm06IGF3YWl0IGdldFBsYXRmb3JtTmFtZSgpLFxuICAgICAgICBvc1ZlcnNpb246IGF3YWl0IGdldE9TVmVyc2lvbigpLFxuICAgICAgICBhcHBWZXJzaW9uOiBhd2FpdCBnZXRBcHBWZXJzaW9uKCksXG4gICAgICAgIHV1aWQ6IGF3YWl0IGdldERldmljZVVVSUQoKVxuICAgIH07XG5cbiAgICBpZiAoaXNDb3Jkb3ZhKCkpIHtcbiAgICAgICAgYXdhaXQgY29yZG92YVJlYWR5O1xuICAgICAgICBpbmZvLm1vZGVsID0gZGV2aWNlLm1vZGVsO1xuICAgICAgICBpbmZvLm1hbnVmYWN0dXJlciA9IGRldmljZS5tYW51ZmFjdHVyZXI7XG4gICAgfVxuXG4gICAgaWYgKGlzRWxlY3Ryb24oKSkge1xuICAgICAgICBpbmZvLmhvc3ROYW1lID0gbm9kZVJlcXVpcmUoXCJvc1wiKS5ob3N0bmFtZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBpbmZvO1xufVxuIiwiaW1wb3J0IHsgQ2xpZW50IH0gZnJvbSBcIi4vYWpheFwiO1xuaW1wb3J0IHsgZ2V0QXBwVmVyc2lvbiB9IGZyb20gXCIuL3BsYXRmb3JtXCI7XG5cbmxldCBpbml0Q2I6ICgpID0+IHZvaWQ7XG5sZXQgY2xpZW50OiBDbGllbnQ7XG5sZXQgdHJhY2tpbmdJRCA9IFwiXCI7XG5sZXQgc3RhdHNBcGk6eyBnZXQoKTogUHJvbWlzZTxhbnk+LCBzZXQoZGF0YTogYW55KTogUHJvbWlzZTx2b2lkPiB9IDtcblxuY29uc3QgaW5pdGlhbGl6ZWQgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gaW5pdENiID0gcmVzb2x2ZSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KGNsOiBDbGllbnQsIHN0PzogeyBnZXQoKTogUHJvbWlzZTxhbnk+LCBzZXQoZGF0YTogYW55KTogUHJvbWlzZTx2b2lkPiB9KSB7XG4gICAgY2xpZW50ID0gY2w7XG4gICAgc3RhdHNBcGkgPSBzdCB8fCB7XG4gICAgICAgIGdldCgpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7fSkgfSxcbiAgICAgICAgc2V0KCkgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkgfVxuICAgIH07XG4gICAgaW5pdENiKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRUcmFja2luZ0lEKGlkOiBzdHJpbmcpIHtcbiAgICB0cmFja2luZ0lEID0gaWQ7XG4gICAgcmV0dXJuIHN0YXRzQXBpLnNldCh7IHRyYWNraW5nSUQ6IGlkIH0pO1xufVxuXG5sZXQgcmVhZHkgPSBpbml0aWFsaXplZFxuICAgIC50aGVuKCgpID0+IFByb21pc2UuYWxsKFtcbiAgICAgICAgc3RhdHNBcGkuZ2V0KCksXG4gICAgICAgIGdldEFwcFZlcnNpb24oKVxuICAgIF0pKVxuICAgIC50aGVuKChbc3RhdHMsIHZlcnNpb25dKSA9PiB7XG4gICAgICAgIHRyYWNraW5nSUQgPSBzdGF0cy50cmFja2luZ0lEIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbGF1bmNoQ291bnQgPSB0eXBlb2Ygc3RhdHMubGF1bmNoQ291bnQgPT09IFwibnVtYmVyXCIgPyAoc3RhdHMubGF1bmNoQ291bnQgYXMgbnVtYmVyKSsgMSA6IDE7XG4gICAgICAgIGNvbnN0IGlzRmlyc3RMYXVuY2ggPSAhc3RhdHMuZmlyc3RMYXVuY2g7XG4gICAgICAgIGNvbnN0IGZpcnN0TGF1bmNoID0gc3RhdHMuZmlyc3RMYXVuY2ggfHwgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICAgICAgaWYgKGlzRmlyc3RMYXVuY2gpIHtcbiAgICAgICAgICAgIHRyYWNrKFwiSW5zdGFsbFwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0cy5sYXN0VmVyc2lvbiAhPT0gdmVyc2lvbikge1xuICAgICAgICAgICAgdHJhY2soXCJVcGRhdGVcIiwgeyBcIkZyb20gVmVyc2lvblwiOiBzdGF0cy5sYXN0VmVyc2lvbiB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdGF0c0FwaS5zZXQoe1xuICAgICAgICAgICAgZmlyc3RMYXVuY2g6IGZpcnN0TGF1bmNoLFxuICAgICAgICAgICAgbGFzdExhdW5jaDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICAgICAgICBsYXVuY2hDb3VudDogbGF1bmNoQ291bnQsXG4gICAgICAgICAgICBsYXN0VmVyc2lvbjogdmVyc2lvblxuICAgICAgICB9KTtcbiAgICB9KTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRyYWNrKGV2ZW50OiBzdHJpbmcsIHByb3BzPzogeyBbcHJvcDogc3RyaW5nXTogbnVtYmVyfHN0cmluZyB9KSB7XG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgZXZlbnQ6IGV2ZW50LFxuICAgICAgICBwcm9wczogcHJvcHMgfHwge30sXG4gICAgICAgIHRyYWNraW5nSUQ6IHRyYWNraW5nSURcbiAgICB9O1xuXG4gICAgaWYgKGRhdGEucHJvcHMuRW1haWwpIHtcbiAgICAgICAgcmVhZHkgPSBzdGF0c0FwaS5zZXQoeyBcImVtYWlsXCI6IGRhdGEucHJvcHMuRW1haWwgfSk7XG4gICAgfVxuXG4gICAgcmVhZHkgPSByZWFkeS50aGVuKCgpID0+IHN0YXRzQXBpLmdldCgpKVxuICAgICAgICAudGhlbigoc3RhdHMpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oZGF0YS5wcm9wcywge1xuICAgICAgICAgICAgICAgIFwiRmlyc3QgTGF1bmNoXCI6IHN0YXRzLmZpcnN0TGF1bmNoICYmIG5ldyBEYXRlKHN0YXRzLmZpcnN0TGF1bmNoIGFzIG51bWJlcikudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBcIkxhdW5jaCBDb3VudFwiOiBzdGF0cy5sYXVuY2hDb3VudCxcbiAgICAgICAgICAgICAgICBcIkN1c3RvbSBTZXJ2ZXJcIjogc3RhdHMuc3luY0N1c3RvbUhvc3QgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJFbWFpbFwiOiBzdGF0cy5lbWFpbFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChzdGF0cy5sYXN0U3luYykge1xuICAgICAgICAgICAgICAgIGRhdGEucHJvcHNbXCJMYXN0IFN5bmNcIl0gPSBuZXcgRGF0ZShzdGF0cy5sYXN0U3luYyBhcyBudW1iZXIpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0cy5sYXN0QXNrZWRGZWVkYmFjaykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oZGF0YS5wcm9wcywge1xuICAgICAgICAgICAgICAgICAgICBcIkxhc3QgUmF0ZWRcIjogbmV3IERhdGUoc3RhdHMubGFzdEFza2VkRmVlZGJhY2sgYXMgbnVtYmVyKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICBcIlJhdGVkIFZlcnNpb25cIjogc3RhdHMubGFzdFJhdGVkVmVyc2lvbixcbiAgICAgICAgICAgICAgICAgICAgXCJSYXRpbmdcIjogc3RhdHMubGFzdFJhdGluZ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhdHMubGFzdFJldmlld2VkKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5wcm9wc1tcIkxhc3QgUmV2aWV3ZWRcIl0gPSBuZXcgRGF0ZShzdGF0cy5sYXN0UmV2aWV3ZWQgYXMgbnVtYmVyKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiBjbGllbnQucmVxdWVzdChcbiAgICAgICAgICAgIFwiUE9TVFwiLFxuICAgICAgICAgICAgY2xpZW50LnVybEZvclBhdGgoXCJ0cmFja1wiKSxcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGRhdGEpXG4gICAgICAgICkpXG4gICAgICAgIC50aGVuKChyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIHJldHVybiBzZXRUcmFja2luZ0lEKHJlcy50cmFja2luZ0lEKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKCgpID0+IHt9KTtcblxuICAgIHJldHVybiByZWFkeTtcbn1cbiIsImNvbnN0IG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG5yZXF1aXJlKFwibW9tZW50LWR1cmF0aW9uLWZvcm1hdFwiKTtcblxuLy8gUkZDNDEyMi1jb21wbGlhbnQgdXVpZCBnZW5lcmF0b3JcbmV4cG9ydCBmdW5jdGlvbiB1dWlkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFwieHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4XCIucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbihjKSB7XG4gICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSoxNnwwLCB2ID0gYyA9PSBcInhcIiA/IHIgOiAociYweDN8MHg4KTtcbiAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgY29uc3QgY2hhcnMgPSB7XG4gICAgbnVtYmVyczogXCIwMTIzNDU2Nzg5XCIsXG4gICAgbG93ZXI6IFwiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpcIixcbiAgICB1cHBlcjogXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWlwiLFxuICAgIG90aGVyOiBcIi8rKCklXFxcIj0mLSE6JyojPzssXy5AYH4kXlt7XX1cXFxcfDw+XCJcbn07XG5cbmV4cG9ydCBjb25zdCBjaGFyU2V0cyA9IHtcbiAgICBmdWxsOiBjaGFycy5udW1iZXJzICsgY2hhcnMudXBwZXIgKyBjaGFycy5sb3dlciArIGNoYXJzLm90aGVyLFxuICAgIGFscGhhbnVtOiBjaGFycy5udW1iZXJzICsgY2hhcnMudXBwZXIgKyBjaGFycy5sb3dlcixcbiAgICBhbHBoYTogY2hhcnMubG93ZXIgKyBjaGFycy51cHBlcixcbiAgICBudW06IGNoYXJzLm51bWJlcnMsXG4gICAgaGV4YTogY2hhcnMubnVtYmVycyArIFwiYWJjZGVmXCJcbn07XG5cbi8vKiBDcmVhdGVzIGEgcmFuZG9tIHN0cmluZyB3aXRoIGEgZ2l2ZW4gX2xlbmd0aF8gY29tcHJpc2VkIG9mIGdpdmVuIHNldCBvciBjaGFyYWN0ZXJzXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tU3RyaW5nKGxlbmd0aCA9IDMyLCBjaGFyU2V0ID0gY2hhclNldHMuZnVsbCkge1xuICAgIGxldCBybmQgPSBuZXcgVWludDhBcnJheSgxKTtcbiAgICBsZXQgc3RyID0gXCJcIjtcbiAgICB3aGlsZSAoc3RyLmxlbmd0aCA8IGxlbmd0aCkge1xuICAgICAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhybmQpO1xuICAgICAgICAvLyBQcmV2ZW50IG1vZHVsbyBiaWFzIGJ5IHJlamVjdGluZyB2YWx1ZXMgbGFyZ2VyIHRoYW4gdGhlIGhpZ2hlc3QgbXVsaXBsZSBvZiBgY2hhclNldC5sZW5ndGhgXG4gICAgICAgIGlmIChybmRbMF0gPiAyNTUgLSAyNTYgJSBjaGFyU2V0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGNoYXJTZXRbcm5kWzBdICUgY2hhclNldC5sZW5ndGhdO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2UoZm46ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55LCBkZWxheTogbnVtYmVyKSB7XG4gICAgbGV0IHRpbWVvdXQ6IG51bWJlcjtcblxuICAgIHJldHVybiBmdW5jdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBmbihhcmdzKSwgZGVsYXkpO1xuICAgIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YWl0KGR0OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgZHQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVMYW5ndWFnZShsb2NhbGU6IHN0cmluZywgc3VwcG9ydGVkTGFuZ3VhZ2VzOiB7IFtsYW5nOiBzdHJpbmddOiBhbnkgfSk6IHN0cmluZyB7XG4gICAgY29uc3QgbG9jYWxlUGFydHMgPSBsb2NhbGUudG9Mb3dlckNhc2UoKS5zcGxpdChcIi1cIik7XG5cbiAgICB3aGlsZSAobG9jYWxlUGFydHMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGwgPSBsb2NhbGVQYXJ0cy5qb2luKFwiLVwiKTtcbiAgICAgICAgaWYgKHN1cHBvcnRlZExhbmd1YWdlc1tsXSkge1xuICAgICAgICAgICAgcmV0dXJuIGw7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbGVQYXJ0cy5wb3AoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc3VwcG9ydGVkTGFuZ3VhZ2VzKVswXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5TWl4aW5zKGJhc2VDbGFzczogYW55LCAuLi5taXhpbnM6ICgoY2xzOiBhbnkpID0+IGFueSlbXSk6IGFueSB7XG4gICAgcmV0dXJuIG1peGlucy5yZWR1Y2UoKGNscywgbWl4aW4pID0+IG1peGluKGNscyksIGJhc2VDbGFzcyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREYXRlRnJvbU5vdyhkYXRlOiBEYXRlKSB7XG4gICAgcmV0dXJuIG1vbWVudChkYXRlKS5mcm9tTm93KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREYXRlVW50aWwoc3RhcnREYXRlOiBEYXRlfHN0cmluZ3xudW1iZXIsIGR1cmF0aW9uOiBudW1iZXIpIHtcbiAgICBjb25zdCBkID0gbW9tZW50LmR1cmF0aW9uKG1vbWVudChzdGFydERhdGUpLmFkZChkdXJhdGlvbiwgXCJob3Vyc1wiKS5kaWZmKG1vbWVudCgpKSk7XG4gICAgcmV0dXJuIGQuZm9ybWF0KFwiaGg6bW06c3NcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1dHVyZShkYXRlOiBEYXRlfHN0cmluZ3xudW1iZXIsIGR1cmF0aW9uOiBudW1iZXIpIHtcbiAgICByZXR1cm4gbW9tZW50KGRhdGUpLmFkZChkdXJhdGlvbiwgXCJkYXlzXCIpLmlzQWZ0ZXIoKVxufVxuIiwiLyohIE1vbWVudCBEdXJhdGlvbiBGb3JtYXQgdjIuMi4yXG4gKiAgaHR0cHM6Ly9naXRodWIuY29tL2pzbXJlZXNlL21vbWVudC1kdXJhdGlvbi1mb3JtYXRcbiAqICBEYXRlOiAyMDE4LTAyLTE2XG4gKlxuICogIER1cmF0aW9uIGZvcm1hdCBwbHVnaW4gZnVuY3Rpb24gZm9yIHRoZSBNb21lbnQuanMgbGlicmFyeVxuICogIGh0dHA6Ly9tb21lbnRqcy5jb20vXG4gKlxuICogIENvcHlyaWdodCAyMDE4IEpvaG4gTWFkaGF2YW4tUmVlc2VcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqL1xuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICAgICAgZGVmaW5lKFsnbW9tZW50J10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dCBvbmx5IENvbW1vbkpTLWxpa2VcbiAgICAgICAgLy8gZW52aXJvbWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnbW9tZW50JykpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBJZiBtb21lbnQgaXMgbm90IGF2YWlsYWJsZSwgbGVhdmUgdGhlIHNldHVwIHVwIHRvIHRoZSB1c2VyLlxuICAgICAgICAgICAgLy8gTGlrZSB3aGVuIHVzaW5nIG1vbWVudC10aW1lem9uZSBvciBzaW1pbGFyIG1vbWVudC1iYXNlZCBwYWNrYWdlLlxuICAgICAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHJvb3QpIHtcbiAgICAgICAgLy8gR2xvYmFscy5cbiAgICAgICAgcm9vdC5tb21lbnREdXJhdGlvbkZvcm1hdFNldHVwID0gcm9vdC5tb21lbnQgPyBmYWN0b3J5KHJvb3QubW9tZW50KSA6IGZhY3Rvcnk7XG4gICAgfVxufSkodGhpcywgZnVuY3Rpb24gKG1vbWVudCkge1xuICAgIC8vIGBOdW1iZXIjdG9sb2NhbGVTdHJpbmdgIGlzIHRlc3RlZCBvbiBwbHVnaW4gaW5pdGlhbGl6YXRpb24uXG4gICAgLy8gSWYgdGhlIGZlYXR1cmUgdGVzdCBwYXNzZXMsIGB0b0xvY2FsZVN0cmluZ1dvcmtzYCB3aWxsIGJlIHNldCB0byBgdHJ1ZWAgYW5kIHRoZVxuICAgIC8vIG5hdGl2ZSBmdW5jdGlvbiB3aWxsIGJlIHVzZWQgdG8gZ2VuZXJhdGUgZm9ybWF0dGVkIG91dHB1dC4gSWYgdGhlIGZlYXR1cmVcbiAgICAvLyB0ZXN0IGZhaWxzLCB0aGUgZmFsbGJhY2sgZm9ybWF0IGZ1bmN0aW9uIGludGVybmFsIHRvIHRoaXMgcGx1Z2luIHdpbGwgYmVcbiAgICAvLyB1c2VkLlxuICAgIHZhciB0b0xvY2FsZVN0cmluZ1dvcmtzID0gZmFsc2U7XG5cbiAgICAvLyBgTnVtYmVyI3RvTG9jYWxlU3RyaW5nYCByb3VuZHMgaW5jb3JyZWN0bHkgZm9yIHNlbGVjdCBudW1iZXJzIGluIE1pY3Jvc29mdFxuICAgIC8vIGVudmlyb25tZW50cyAoRWRnZSwgSUUxMSwgV2luZG93cyBQaG9uZSkgYW5kIHBvc3NpYmx5IG90aGVyIGVudmlyb25tZW50cy5cbiAgICAvLyBJZiB0aGUgcm91bmRpbmcgdGVzdCBmYWlscyBhbmQgYHRvTG9jYWxlU3RyaW5nYCB3aWxsIGJlIHVzZWQgZm9yIGZvcm1hdHRpbmcsXG4gICAgLy8gdGhlIHBsdWdpbiB3aWxsIFwicHJlLXJvdW5kXCIgbnVtYmVyIHZhbHVlcyB1c2luZyB0aGUgZmFsbGJhY2sgbnVtYmVyIGZvcm1hdFxuICAgIC8vIGZ1bmN0aW9uIGJlZm9yZSBwYXNzaW5nIHRoZW0gdG8gYHRvTG9jYWxlU3RyaW5nYCBmb3IgZmluYWwgZm9ybWF0dGluZy5cbiAgICB2YXIgdG9Mb2NhbGVTdHJpbmdSb3VuZGluZ1dvcmtzID0gZmFsc2U7XG5cbiAgICAvLyBUb2tlbiB0eXBlIG5hbWVzIGluIG9yZGVyIG9mIGRlc2NlbmRpbmcgbWFnbml0dWRlLlxuICAgIHZhciB0eXBlcyA9IFwiZXNjYXBlIHllYXJzIG1vbnRocyB3ZWVrcyBkYXlzIGhvdXJzIG1pbnV0ZXMgc2Vjb25kcyBtaWxsaXNlY29uZHMgZ2VuZXJhbFwiLnNwbGl0KFwiIFwiKTtcblxuICAgIHZhciBidWJibGVzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBcInNlY29uZHNcIixcbiAgICAgICAgICAgIHRhcmdldHM6IFtcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwibWludXRlc1wiLCB2YWx1ZTogNjAgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwiaG91cnNcIiwgdmFsdWU6IDM2MDAgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwiZGF5c1wiLCB2YWx1ZTogODY0MDAgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwid2Vla3NcIiwgdmFsdWU6IDYwNDgwMCB9LFxuICAgICAgICAgICAgICAgIHsgdHlwZTogXCJtb250aHNcIiwgdmFsdWU6IDI2Nzg0MDAgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwieWVhcnNcIiwgdmFsdWU6IDMxNTM2MDAwIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogXCJtaW51dGVzXCIsXG4gICAgICAgICAgICB0YXJnZXRzOiBbXG4gICAgICAgICAgICAgICAgeyB0eXBlOiBcImhvdXJzXCIsIHZhbHVlOiA2MCB9LFxuICAgICAgICAgICAgICAgIHsgdHlwZTogXCJkYXlzXCIsIHZhbHVlOiAxNDQwIH0sXG4gICAgICAgICAgICAgICAgeyB0eXBlOiBcIndlZWtzXCIsIHZhbHVlOiAxMDA4MCB9LFxuICAgICAgICAgICAgICAgIHsgdHlwZTogXCJtb250aHNcIiwgdmFsdWU6IDQ0NjQwIH0sXG4gICAgICAgICAgICAgICAgeyB0eXBlOiBcInllYXJzXCIsIHZhbHVlOiA1MjU2MDAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBcImhvdXJzXCIsXG4gICAgICAgICAgICB0YXJnZXRzOiBbXG4gICAgICAgICAgICAgICAgeyB0eXBlOiBcImRheXNcIiwgdmFsdWU6IDI0IH0sXG4gICAgICAgICAgICAgICAgeyB0eXBlOiBcIndlZWtzXCIsIHZhbHVlOiAxNjggfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwibW9udGhzXCIsIHZhbHVlOiA3NDQgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwieWVhcnNcIiwgdmFsdWU6IDg3NjAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBcImRheXNcIixcbiAgICAgICAgICAgIHRhcmdldHM6IFtcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwid2Vla3NcIiwgdmFsdWU6IDcgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwibW9udGhzXCIsIHZhbHVlOiAzMSB9LFxuICAgICAgICAgICAgICAgIHsgdHlwZTogXCJ5ZWFyc1wiLCB2YWx1ZTogMzY1IH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogXCJtb250aHNcIixcbiAgICAgICAgICAgIHRhcmdldHM6IFtcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFwieWVhcnNcIiwgdmFsdWU6IDEyIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIF07XG5cbiAgICAvLyBzdHJpbmdJbmNsdWRlc1xuICAgIGZ1bmN0aW9uIHN0cmluZ0luY2x1ZGVzKHN0ciwgc2VhcmNoKSB7XG4gICAgICAgIGlmIChzZWFyY2gubGVuZ3RoID4gc3RyLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdHIuaW5kZXhPZihzZWFyY2gpICE9PSAtMTtcbiAgICB9XG5cbiAgICAvLyByZXBlYXRaZXJvKHF0eSlcbiAgICAvLyBSZXR1cm5zIFwiMFwiIHJlcGVhdGVkIGBxdHlgIHRpbWVzLlxuICAgIC8vIGBxdHlgIG11c3QgYmUgYSBpbnRlZ2VyID49IDAuXG4gICAgZnVuY3Rpb24gcmVwZWF0WmVybyhxdHkpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFwiXCI7XG5cbiAgICAgICAgd2hpbGUgKHF0eSkge1xuICAgICAgICAgICAgcmVzdWx0ICs9IFwiMFwiO1xuICAgICAgICAgICAgcXR5IC09IDE7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0cmluZ1JvdW5kKGRpZ2l0cykge1xuICAgICAgICB2YXIgZGlnaXRzQXJyYXkgPSBkaWdpdHMuc3BsaXQoXCJcIikucmV2ZXJzZSgpO1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBjYXJyeSA9IHRydWU7XG5cbiAgICAgICAgd2hpbGUgKGNhcnJ5ICYmIGkgPCBkaWdpdHNBcnJheS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpZ2l0c0FycmF5W2ldID09PSBcIjlcIikge1xuICAgICAgICAgICAgICAgICAgICBkaWdpdHNBcnJheVtpXSA9IFwiMFwiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRpZ2l0c0FycmF5W2ldID0gKHBhcnNlSW50KGRpZ2l0c0FycmF5W2ldLCAxMCkgKyAxKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBjYXJyeSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KGRpZ2l0c0FycmF5W2ldLCAxMCkgPCA1KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhcnJ5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZGlnaXRzQXJyYXlbaV0gPSBcIjBcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhcnJ5KSB7XG4gICAgICAgICAgICBkaWdpdHNBcnJheS5wdXNoKFwiMVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkaWdpdHNBcnJheS5yZXZlcnNlKCkuam9pbihcIlwiKTtcbiAgICB9XG5cbiAgICAvLyBmb3JtYXROdW1iZXJcbiAgICAvLyBGb3JtYXRzIGFueSBudW1iZXIgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvIHplcm8gdXNpbmcgdGhlc2Ugb3B0aW9uczpcbiAgICAvLyAtIHVzZXJMb2NhbGVcbiAgICAvLyAtIHVzZVRvTG9jYWxlU3RyaW5nXG4gICAgLy8gLSB1c2VHcm91cGluZ1xuICAgIC8vIC0gZ3JvdXBpbmdcbiAgICAvLyAtIG1heGltdW1TaWduaWZpY2FudERpZ2l0c1xuICAgIC8vIC0gbWluaW11bUludGVnZXJEaWdpdHNcbiAgICAvLyAtIGZyYWN0aW9uRGlnaXRzXG4gICAgLy8gLSBncm91cGluZ1NlcGFyYXRvclxuICAgIC8vIC0gZGVjaW1hbFNlcGFyYXRvclxuICAgIC8vXG4gICAgLy8gYHVzZVRvTG9jYWxlU3RyaW5nYCB3aWxsIHVzZSBgdG9Mb2NhbGVTdHJpbmdgIGZvciBmb3JtYXR0aW5nLlxuICAgIC8vIGB1c2VyTG9jYWxlYCBvcHRpb24gaXMgcGFzc2VkIHRocm91Z2ggdG8gYHRvTG9jYWxlU3RyaW5nYC5cbiAgICAvLyBgZnJhY3Rpb25EaWdpdHNgIGlzIHBhc3NlZCB0aHJvdWdoIHRvIGBtYXhpbXVtRnJhY3Rpb25EaWdpdHNgIGFuZCBgbWluaW11bUZyYWN0aW9uRGlnaXRzYFxuICAgIC8vIFVzaW5nIGBtYXhpbXVtU2lnbmlmaWNhbnREaWdpdHNgIHdpbGwgb3ZlcnJpZGUgYG1pbmltdW1JbnRlZ2VyRGlnaXRzYCBhbmQgYGZyYWN0aW9uRGlnaXRzYC5cbiAgICBmdW5jdGlvbiBmb3JtYXROdW1iZXIobnVtYmVyLCBvcHRpb25zLCB1c2VyTG9jYWxlKSB7XG4gICAgICAgIHZhciB1c2VUb0xvY2FsZVN0cmluZyA9IG9wdGlvbnMudXNlVG9Mb2NhbGVTdHJpbmc7XG4gICAgICAgIHZhciB1c2VHcm91cGluZyA9IG9wdGlvbnMudXNlR3JvdXBpbmc7XG4gICAgICAgIHZhciBncm91cGluZyA9IHVzZUdyb3VwaW5nICYmIG9wdGlvbnMuZ3JvdXBpbmcuc2xpY2UoKTtcbiAgICAgICAgdmFyIG1heGltdW1TaWduaWZpY2FudERpZ2l0cyA9IG9wdGlvbnMubWF4aW11bVNpZ25pZmljYW50RGlnaXRzO1xuICAgICAgICB2YXIgbWluaW11bUludGVnZXJEaWdpdHMgPSBvcHRpb25zLm1pbmltdW1JbnRlZ2VyRGlnaXRzIHx8IDE7XG4gICAgICAgIHZhciBmcmFjdGlvbkRpZ2l0cyA9IG9wdGlvbnMuZnJhY3Rpb25EaWdpdHMgfHwgMDtcbiAgICAgICAgdmFyIGdyb3VwaW5nU2VwYXJhdG9yID0gb3B0aW9ucy5ncm91cGluZ1NlcGFyYXRvcjtcbiAgICAgICAgdmFyIGRlY2ltYWxTZXBhcmF0b3IgPSBvcHRpb25zLmRlY2ltYWxTZXBhcmF0b3I7XG5cbiAgICAgICAgaWYgKHVzZVRvTG9jYWxlU3RyaW5nICYmIHVzZXJMb2NhbGUpIHtcbiAgICAgICAgICAgIHZhciBsb2NhbGVTdHJpbmdPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG1pbmltdW1JbnRlZ2VyRGlnaXRzOiBtaW5pbXVtSW50ZWdlckRpZ2l0cyxcbiAgICAgICAgICAgICAgICB1c2VHcm91cGluZzogdXNlR3JvdXBpbmdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChmcmFjdGlvbkRpZ2l0cykge1xuICAgICAgICAgICAgICAgIGxvY2FsZVN0cmluZ09wdGlvbnMubWF4aW11bUZyYWN0aW9uRGlnaXRzID0gZnJhY3Rpb25EaWdpdHM7XG4gICAgICAgICAgICAgICAgbG9jYWxlU3RyaW5nT3B0aW9ucy5taW5pbXVtRnJhY3Rpb25EaWdpdHMgPSBmcmFjdGlvbkRpZ2l0cztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdG9Mb2NhbGVTdHJpbmcgb3V0cHV0IGlzIFwiMC4wXCIgaW5zdGVhZCBvZiBcIjBcIiBmb3IgSFRDIGJyb3dzZXJzXG4gICAgICAgICAgICAvLyB3aGVuIG1heGltdW1TaWduaWZpY2FudERpZ2l0cyBpcyBzZXQuIFNlZSAjOTYuXG4gICAgICAgICAgICBpZiAobWF4aW11bVNpZ25pZmljYW50RGlnaXRzICYmIG51bWJlciA+IDApIHtcbiAgICAgICAgICAgICAgICBsb2NhbGVTdHJpbmdPcHRpb25zLm1heGltdW1TaWduaWZpY2FudERpZ2l0cyA9IG1heGltdW1TaWduaWZpY2FudERpZ2l0cztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCF0b0xvY2FsZVN0cmluZ1JvdW5kaW5nV29ya3MpIHtcbiAgICAgICAgICAgICAgICB2YXIgcm91bmRpbmdPcHRpb25zID0gZXh0ZW5kKHt9LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICByb3VuZGluZ09wdGlvbnMudXNlR3JvdXBpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByb3VuZGluZ09wdGlvbnMuZGVjaW1hbFNlcGFyYXRvciA9IFwiLlwiO1xuICAgICAgICAgICAgICAgIG51bWJlciA9IHBhcnNlRmxvYXQoZm9ybWF0TnVtYmVyKG51bWJlciwgcm91bmRpbmdPcHRpb25zKSwgMTApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbnVtYmVyLnRvTG9jYWxlU3RyaW5nKHVzZXJMb2NhbGUsIGxvY2FsZVN0cmluZ09wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG51bWJlclN0cmluZztcblxuICAgICAgICAvLyBBZGQgMSB0byBkaWdpdCBvdXRwdXQgbGVuZ3RoIGZvciBmbG9hdGluZyBwb2ludCBlcnJvcnMgd29ya2Fyb3VuZC4gU2VlIGJlbG93LlxuICAgICAgICBpZiAobWF4aW11bVNpZ25pZmljYW50RGlnaXRzKSB7XG4gICAgICAgICAgICBudW1iZXJTdHJpbmcgPSBudW1iZXIudG9QcmVjaXNpb24obWF4aW11bVNpZ25pZmljYW50RGlnaXRzICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBudW1iZXJTdHJpbmcgPSBudW1iZXIudG9GaXhlZChmcmFjdGlvbkRpZ2l0cyArIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGludGVnZXJTdHJpbmc7XG4gICAgICAgIHZhciBmcmFjdGlvblN0cmluZztcbiAgICAgICAgdmFyIGV4cG9uZW50U3RyaW5nO1xuXG4gICAgICAgIHZhciB0ZW1wID0gbnVtYmVyU3RyaW5nLnNwbGl0KFwiZVwiKTtcblxuICAgICAgICBleHBvbmVudFN0cmluZyA9IHRlbXBbMV0gfHwgXCJcIjtcblxuICAgICAgICB0ZW1wID0gdGVtcFswXS5zcGxpdChcIi5cIik7XG5cbiAgICAgICAgZnJhY3Rpb25TdHJpbmcgPSB0ZW1wWzFdIHx8IFwiXCI7XG4gICAgICAgIGludGVnZXJTdHJpbmcgPSB0ZW1wWzBdIHx8IFwiXCI7XG5cbiAgICAgICAgLy8gV29ya2Fyb3VuZCBmb3IgZmxvYXRpbmcgcG9pbnQgZXJyb3JzIGluIGB0b0ZpeGVkYCBhbmQgYHRvUHJlY2lzaW9uYC5cbiAgICAgICAgLy8gKDMuNTUpLnRvRml4ZWQoMSk7IC0tPiBcIjMuNVwiXG4gICAgICAgIC8vICgxMjMuNTUgLSAxMjApLnRvUHJlY2lzaW9uKDIpOyAtLT4gXCIzLjVcIlxuICAgICAgICAvLyAoMTIzLjU1IC0gMTIwKTsgLS0+IDMuNTQ5OTk5OTk5OTk5OTk3XG4gICAgICAgIC8vICgxMjMuNTUgLSAxMjApLnRvRml4ZWQoMik7IC0tPiBcIjMuNTVcIlxuICAgICAgICAvLyBSb3VuZCBieSBleGFtaW5nIHRoZSBzdHJpbmcgb3V0cHV0IG9mIHRoZSBuZXh0IGRpZ2l0LlxuXG4gICAgICAgIC8vICoqKioqKioqKioqKioqKiBJbXBsZW1lbnQgU3RyaW5nIFJvdW5kaW5nIGhlcmUgKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgLy8gQ2hlY2sgaW50ZWdlclN0cmluZyArIGZyYWN0aW9uU3RyaW5nIGxlbmd0aCBvZiB0b1ByZWNpc2lvbiBiZWZvcmUgcm91bmRpbmcuXG4gICAgICAgIC8vIENoZWNrIGxlbmd0aCBvZiBmcmFjdGlvblN0cmluZyBmcm9tIHRvRml4ZWQgb3V0cHV0IGJlZm9yZSByb3VuZGluZy5cbiAgICAgICAgdmFyIGludGVnZXJMZW5ndGggPSBpbnRlZ2VyU3RyaW5nLmxlbmd0aDtcbiAgICAgICAgdmFyIGZyYWN0aW9uTGVuZ3RoID0gZnJhY3Rpb25TdHJpbmcubGVuZ3RoO1xuICAgICAgICB2YXIgZGlnaXRDb3VudCA9IGludGVnZXJMZW5ndGggKyBmcmFjdGlvbkxlbmd0aDtcbiAgICAgICAgdmFyIGRpZ2l0cyA9IGludGVnZXJTdHJpbmcgKyBmcmFjdGlvblN0cmluZztcblxuICAgICAgICBpZiAobWF4aW11bVNpZ25pZmljYW50RGlnaXRzICYmIGRpZ2l0Q291bnQgPT09IChtYXhpbXVtU2lnbmlmaWNhbnREaWdpdHMgKyAxKSB8fCAhbWF4aW11bVNpZ25pZmljYW50RGlnaXRzICYmIGZyYWN0aW9uTGVuZ3RoID09PSAoZnJhY3Rpb25EaWdpdHMgKyAxKSkge1xuICAgICAgICAgICAgLy8gUm91bmQgZGlnaXRzLlxuICAgICAgICAgICAgZGlnaXRzID0gc3RyaW5nUm91bmQoZGlnaXRzKTtcblxuICAgICAgICAgICAgaWYgKGRpZ2l0cy5sZW5ndGggPT09IGRpZ2l0Q291bnQgKyAxKSB7XG4gICAgICAgICAgICAgICAgaW50ZWdlckxlbmd0aCA9IGludGVnZXJMZW5ndGggKyAxO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaXNjYXJkIGZpbmFsIGZyYWN0aW9uRGlnaXQuXG4gICAgICAgICAgICBpZiAoZnJhY3Rpb25MZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkaWdpdHMgPSBkaWdpdHMuc2xpY2UoMCwgLTEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZXBhcmF0ZSBpbnRlZ2VyIGFuZCBmcmFjdGlvbi5cbiAgICAgICAgICAgIGludGVnZXJTdHJpbmcgPSBkaWdpdHMuc2xpY2UoMCwgaW50ZWdlckxlbmd0aCk7XG4gICAgICAgICAgICBmcmFjdGlvblN0cmluZyA9IGRpZ2l0cy5zbGljZShpbnRlZ2VyTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaW0gdHJhaWxpbmcgemVyb2VzIGZyb20gZnJhY3Rpb25TdHJpbmcgYmVjYXVzZSB0b1ByZWNpc2lvbiBvdXRwdXRzXG4gICAgICAgIC8vIHByZWNpc2lvbiwgbm90IHNpZ25pZmljYW50IGRpZ2l0cy5cbiAgICAgICAgaWYgKG1heGltdW1TaWduaWZpY2FudERpZ2l0cykge1xuICAgICAgICAgICAgZnJhY3Rpb25TdHJpbmcgPSBmcmFjdGlvblN0cmluZy5yZXBsYWNlKC8wKiQvLCBcIlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBleHBvbmVudC5cbiAgICAgICAgdmFyIGV4cG9uZW50ID0gcGFyc2VJbnQoZXhwb25lbnRTdHJpbmcsIDEwKTtcblxuICAgICAgICBpZiAoZXhwb25lbnQgPiAwKSB7XG4gICAgICAgICAgICBpZiAoZnJhY3Rpb25TdHJpbmcubGVuZ3RoIDw9IGV4cG9uZW50KSB7XG4gICAgICAgICAgICAgICAgZnJhY3Rpb25TdHJpbmcgPSBmcmFjdGlvblN0cmluZyArIHJlcGVhdFplcm8oZXhwb25lbnQgLSBmcmFjdGlvblN0cmluZy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaW50ZWdlclN0cmluZyA9IGludGVnZXJTdHJpbmcgKyBmcmFjdGlvblN0cmluZztcbiAgICAgICAgICAgICAgICBmcmFjdGlvblN0cmluZyA9IFwiXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGludGVnZXJTdHJpbmcgPSBpbnRlZ2VyU3RyaW5nICsgZnJhY3Rpb25TdHJpbmcuc2xpY2UoMCwgZXhwb25lbnQpO1xuICAgICAgICAgICAgICAgIGZyYWN0aW9uU3RyaW5nID0gZnJhY3Rpb25TdHJpbmcuc2xpY2UoZXhwb25lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGV4cG9uZW50IDwgMCkge1xuICAgICAgICAgICAgZnJhY3Rpb25TdHJpbmcgPSAocmVwZWF0WmVybyhNYXRoLmFicyhleHBvbmVudCkgLSBpbnRlZ2VyU3RyaW5nLmxlbmd0aCkgKyBpbnRlZ2VyU3RyaW5nICsgZnJhY3Rpb25TdHJpbmcpO1xuXG4gICAgICAgICAgICBpbnRlZ2VyU3RyaW5nID0gXCIwXCI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW1heGltdW1TaWduaWZpY2FudERpZ2l0cykge1xuICAgICAgICAgICAgLy8gVHJpbSBvciBwYWQgZnJhY3Rpb24gd2hlbiBub3QgdXNpbmcgbWF4aW11bVNpZ25pZmljYW50RGlnaXRzLlxuICAgICAgICAgICAgZnJhY3Rpb25TdHJpbmcgPSBmcmFjdGlvblN0cmluZy5zbGljZSgwLCBmcmFjdGlvbkRpZ2l0cyk7XG5cbiAgICAgICAgICAgIGlmIChmcmFjdGlvblN0cmluZy5sZW5ndGggPCBmcmFjdGlvbkRpZ2l0cykge1xuICAgICAgICAgICAgICAgIGZyYWN0aW9uU3RyaW5nID0gZnJhY3Rpb25TdHJpbmcgKyByZXBlYXRaZXJvKGZyYWN0aW9uRGlnaXRzIC0gZnJhY3Rpb25TdHJpbmcubGVuZ3RoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUGFkIGludGVnZXIgd2hlbiB1c2luZyBtaW5pbXVtSW50ZWdlckRpZ2l0c1xuICAgICAgICAgICAgLy8gYW5kIG5vdCB1c2luZyBtYXhpbXVtU2lnbmlmaWNhbnREaWdpdHMuXG4gICAgICAgICAgICBpZiAoaW50ZWdlclN0cmluZy5sZW5ndGggPCBtaW5pbXVtSW50ZWdlckRpZ2l0cykge1xuICAgICAgICAgICAgICAgIGludGVnZXJTdHJpbmcgPSByZXBlYXRaZXJvKG1pbmltdW1JbnRlZ2VyRGlnaXRzIC0gaW50ZWdlclN0cmluZy5sZW5ndGgpICsgaW50ZWdlclN0cmluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmb3JtYXR0ZWRTdHJpbmcgPSBcIlwiO1xuXG4gICAgICAgIC8vIEhhbmRsZSBncm91cGluZy5cbiAgICAgICAgaWYgKHVzZUdyb3VwaW5nKSB7XG4gICAgICAgICAgICB0ZW1wID0gaW50ZWdlclN0cmluZztcbiAgICAgICAgICAgIHZhciBncm91cDtcblxuICAgICAgICAgICAgd2hpbGUgKHRlbXAubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdyb3VwaW5nLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBncm91cCA9IGdyb3VwaW5nLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGZvcm1hdHRlZFN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWRTdHJpbmcgPSBncm91cGluZ1NlcGFyYXRvciArIGZvcm1hdHRlZFN0cmluZztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRTdHJpbmcgPSB0ZW1wLnNsaWNlKC1ncm91cCkgKyBmb3JtYXR0ZWRTdHJpbmc7XG5cbiAgICAgICAgICAgICAgICB0ZW1wID0gdGVtcC5zbGljZSgwLCAtZ3JvdXApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9ybWF0dGVkU3RyaW5nID0gaW50ZWdlclN0cmluZztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBkZWNpbWFsU2VwYXJhdG9yIGFuZCBmcmFjdGlvbi5cbiAgICAgICAgaWYgKGZyYWN0aW9uU3RyaW5nKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRTdHJpbmcgPSBmb3JtYXR0ZWRTdHJpbmcgKyBkZWNpbWFsU2VwYXJhdG9yICsgZnJhY3Rpb25TdHJpbmc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkU3RyaW5nO1xuICAgIH1cblxuICAgIC8vIGR1cmF0aW9uTGFiZWxDb21wYXJlXG4gICAgZnVuY3Rpb24gZHVyYXRpb25MYWJlbENvbXBhcmUoYSwgYikge1xuICAgICAgICBpZiAoYS5sYWJlbC5sZW5ndGggPiBiLmxhYmVsLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGEubGFiZWwubGVuZ3RoIDwgYi5sYWJlbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYSBtdXN0IGJlIGVxdWFsIHRvIGJcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgLy8gZHVyYXRpb25HZXRMYWJlbHNcbiAgICBmdW5jdGlvbiBkdXJhdGlvbkdldExhYmVscyh0b2tlbiwgbG9jYWxlRGF0YSkge1xuICAgICAgICB2YXIgbGFiZWxzID0gW107XG5cbiAgICAgICAgZWFjaChrZXlzKGxvY2FsZURhdGEpLCBmdW5jdGlvbiAobG9jYWxlRGF0YUtleSkge1xuICAgICAgICAgICAgaWYgKGxvY2FsZURhdGFLZXkuc2xpY2UoMCwgMTUpICE9PSBcIl9kdXJhdGlvbkxhYmVsc1wiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbGFiZWxUeXBlID0gbG9jYWxlRGF0YUtleS5zbGljZSgxNSkudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAgICAgZWFjaChrZXlzKGxvY2FsZURhdGFbbG9jYWxlRGF0YUtleV0pLCBmdW5jdGlvbiAobGFiZWxLZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAobGFiZWxLZXkuc2xpY2UoMCwgMSkgPT09IHRva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhYmVscy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGxhYmVsVHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogbGFiZWxLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogbG9jYWxlRGF0YVtsb2NhbGVEYXRhS2V5XVtsYWJlbEtleV1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBsYWJlbHM7XG4gICAgfVxuXG4gICAgLy8gZHVyYXRpb25QbHVyYWxLZXlcbiAgICBmdW5jdGlvbiBkdXJhdGlvblBsdXJhbEtleSh0b2tlbiwgaW50ZWdlclZhbHVlLCBkZWNpbWFsVmFsdWUpIHtcbiAgICAgICAgLy8gU2luZ3VsYXIgZm9yIGEgdmFsdWUgb2YgYDFgLCBidXQgbm90IGZvciBgMS4wYC5cbiAgICAgICAgaWYgKGludGVnZXJWYWx1ZSA9PT0gMSAmJiBkZWNpbWFsVmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0b2tlbiArIHRva2VuO1xuICAgIH1cblxuICAgIHZhciBlbmdMb2NhbGUgPSB7XG4gICAgICAgIGR1cmF0aW9uTGFiZWxzU3RhbmRhcmQ6IHtcbiAgICAgICAgICAgIFM6ICdtaWxsaXNlY29uZCcsXG4gICAgICAgICAgICBTUzogJ21pbGxpc2Vjb25kcycsXG4gICAgICAgICAgICBzOiAnc2Vjb25kJyxcbiAgICAgICAgICAgIHNzOiAnc2Vjb25kcycsXG4gICAgICAgICAgICBtOiAnbWludXRlJyxcbiAgICAgICAgICAgIG1tOiAnbWludXRlcycsXG4gICAgICAgICAgICBoOiAnaG91cicsXG4gICAgICAgICAgICBoaDogJ2hvdXJzJyxcbiAgICAgICAgICAgIGQ6ICdkYXknLFxuICAgICAgICAgICAgZGQ6ICdkYXlzJyxcbiAgICAgICAgICAgIHc6ICd3ZWVrJyxcbiAgICAgICAgICAgIHd3OiAnd2Vla3MnLFxuICAgICAgICAgICAgTTogJ21vbnRoJyxcbiAgICAgICAgICAgIE1NOiAnbW9udGhzJyxcbiAgICAgICAgICAgIHk6ICd5ZWFyJyxcbiAgICAgICAgICAgIHl5OiAneWVhcnMnXG4gICAgICAgIH0sXG4gICAgICAgIGR1cmF0aW9uTGFiZWxzU2hvcnQ6IHtcbiAgICAgICAgICAgIFM6ICdtc2VjJyxcbiAgICAgICAgICAgIFNTOiAnbXNlY3MnLFxuICAgICAgICAgICAgczogJ3NlYycsXG4gICAgICAgICAgICBzczogJ3NlY3MnLFxuICAgICAgICAgICAgbTogJ21pbicsXG4gICAgICAgICAgICBtbTogJ21pbnMnLFxuICAgICAgICAgICAgaDogJ2hyJyxcbiAgICAgICAgICAgIGhoOiAnaHJzJyxcbiAgICAgICAgICAgIGQ6ICdkeScsXG4gICAgICAgICAgICBkZDogJ2R5cycsXG4gICAgICAgICAgICB3OiAnd2snLFxuICAgICAgICAgICAgd3c6ICd3a3MnLFxuICAgICAgICAgICAgTTogJ21vJyxcbiAgICAgICAgICAgIE1NOiAnbW9zJyxcbiAgICAgICAgICAgIHk6ICd5cicsXG4gICAgICAgICAgICB5eTogJ3lycydcbiAgICAgICAgfSxcbiAgICAgICAgZHVyYXRpb25UaW1lVGVtcGxhdGVzOiB7XG4gICAgICAgICAgICBITVM6ICdoOm1tOnNzJyxcbiAgICAgICAgICAgIEhNOiAnaDptbScsXG4gICAgICAgICAgICBNUzogJ206c3MnXG4gICAgICAgIH0sXG4gICAgICAgIGR1cmF0aW9uTGFiZWxUeXBlczogW1xuICAgICAgICAgICAgeyB0eXBlOiBcInN0YW5kYXJkXCIsIHN0cmluZzogXCJfX1wiIH0sXG4gICAgICAgICAgICB7IHR5cGU6IFwic2hvcnRcIiwgc3RyaW5nOiBcIl9cIiB9XG4gICAgICAgIF0sXG4gICAgICAgIGR1cmF0aW9uUGx1cmFsS2V5OiBkdXJhdGlvblBsdXJhbEtleVxuICAgIH07XG5cbiAgICAvLyBpc0FycmF5XG4gICAgZnVuY3Rpb24gaXNBcnJheShhcnJheSkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycmF5KSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICAgIH1cblxuICAgIC8vIGlzT2JqZWN0XG4gICAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgICB9XG5cbiAgICAvLyBmaW5kTGFzdFxuICAgIGZ1bmN0aW9uIGZpbmRMYXN0KGFycmF5LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgaW5kZXggPSBhcnJheS5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IC09IDEpIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayhhcnJheVtpbmRleF0pKSB7IHJldHVybiBhcnJheVtpbmRleF07IH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGZpbmRcbiAgICBmdW5jdGlvbiBmaW5kKGFycmF5LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgaW5kZXggPSAwO1xuXG4gICAgICAgIHZhciBtYXggPSBhcnJheSAmJiBhcnJheS5sZW5ndGggfHwgMDtcblxuICAgICAgICB2YXIgbWF0Y2g7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBtYXRjaCA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtID09PSBtYXRjaDtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBtYXgpIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayhhcnJheVtpbmRleF0pKSB7IHJldHVybiBhcnJheVtpbmRleF07IH1cbiAgICAgICAgICAgIGluZGV4ICs9IDE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBlYWNoXG4gICAgZnVuY3Rpb24gZWFjaChhcnJheSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGluZGV4ID0gMCxcbiAgICAgICAgICAgIG1heCA9IGFycmF5Lmxlbmd0aDtcblxuICAgICAgICBpZiAoIWFycmF5IHx8ICFtYXgpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbWF4KSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2soYXJyYXlbaW5kZXhdLCBpbmRleCkgPT09IGZhbHNlKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgaW5kZXggKz0gMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIG1hcFxuICAgIGZ1bmN0aW9uIG1hcChhcnJheSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGluZGV4ID0gMCxcbiAgICAgICAgICAgIG1heCA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgICAgIHJldCA9IFtdO1xuXG4gICAgICAgIGlmICghYXJyYXkgfHwgIW1heCkgeyByZXR1cm4gcmV0OyB9XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbWF4KSB7XG4gICAgICAgICAgICByZXRbaW5kZXhdID0gY2FsbGJhY2soYXJyYXlbaW5kZXhdLCBpbmRleCk7XG4gICAgICAgICAgICBpbmRleCArPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICAvLyBwbHVja1xuICAgIGZ1bmN0aW9uIHBsdWNrKGFycmF5LCBwcm9wKSB7XG4gICAgICAgIHJldHVybiBtYXAoYXJyYXksIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gY29tcGFjdFxuICAgIGZ1bmN0aW9uIGNvbXBhY3QoYXJyYXkpIHtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuXG4gICAgICAgIGVhY2goYXJyYXksIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICBpZiAoaXRlbSkgeyByZXQucHVzaChpdGVtKTsgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIC8vIHVuaXF1ZVxuICAgIGZ1bmN0aW9uIHVuaXF1ZShhcnJheSkge1xuICAgICAgICB2YXIgcmV0ID0gW107XG5cbiAgICAgICAgZWFjaChhcnJheSwgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICBpZiAoIWZpbmQocmV0LCBfYSkpIHsgcmV0LnB1c2goX2EpOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgLy8gaW50ZXJzZWN0aW9uXG4gICAgZnVuY3Rpb24gaW50ZXJzZWN0aW9uKGEsIGIpIHtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuXG4gICAgICAgIGVhY2goYSwgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICBlYWNoKGIsIGZ1bmN0aW9uIChfYikge1xuICAgICAgICAgICAgICAgIGlmIChfYSA9PT0gX2IpIHsgcmV0LnB1c2goX2EpOyB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHVuaXF1ZShyZXQpO1xuICAgIH1cblxuICAgIC8vIHJlc3RcbiAgICBmdW5jdGlvbiByZXN0KGFycmF5LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmV0ID0gW107XG5cbiAgICAgICAgZWFjaChhcnJheSwgZnVuY3Rpb24gKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICBpZiAoIWNhbGxiYWNrKGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgcmV0ID0gYXJyYXkuc2xpY2UoaW5kZXgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICAvLyBpbml0aWFsXG4gICAgZnVuY3Rpb24gaW5pdGlhbChhcnJheSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJldmVyc2VkID0gYXJyYXkuc2xpY2UoKS5yZXZlcnNlKCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3QocmV2ZXJzZWQsIGNhbGxiYWNrKS5yZXZlcnNlKCk7XG4gICAgfVxuXG4gICAgLy8gZXh0ZW5kXG4gICAgZnVuY3Rpb24gZXh0ZW5kKGEsIGIpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGIpIHtcbiAgICAgICAgICAgIGlmIChiLmhhc093blByb3BlcnR5KGtleSkpIHsgYVtrZXldID0gYltrZXldOyB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYTtcbiAgICB9XG5cbiAgICAvLyBrZXlzXG4gICAgZnVuY3Rpb24ga2V5cyhhKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYSkge1xuICAgICAgICAgICAgaWYgKGEuaGFzT3duUHJvcGVydHkoa2V5KSkgeyByZXQucHVzaChrZXkpOyB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIC8vIGFueVxuICAgIGZ1bmN0aW9uIGFueShhcnJheSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGluZGV4ID0gMCxcbiAgICAgICAgICAgIG1heCA9IGFycmF5Lmxlbmd0aDtcblxuICAgICAgICBpZiAoIWFycmF5IHx8ICFtYXgpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbWF4KSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2soYXJyYXlbaW5kZXhdLCBpbmRleCkgPT09IHRydWUpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgICAgIGluZGV4ICs9IDE7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gZmxhdHRlblxuICAgIGZ1bmN0aW9uIGZsYXR0ZW4oYXJyYXkpIHtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuXG4gICAgICAgIGVhY2goYXJyYXksIGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICByZXQgPSByZXQuY29uY2F0KGNoaWxkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b0xvY2FsZVN0cmluZ1N1cHBvcnRzTG9jYWxlcygpIHtcbiAgICAgICAgdmFyIG51bWJlciA9IDA7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBudW1iZXIudG9Mb2NhbGVTdHJpbmcoJ2knKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGUubmFtZSA9PT0gJ1JhbmdlRXJyb3InO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmZWF0dXJlVGVzdFRvTG9jYWxlU3RyaW5nUm91bmRpbmcoKSB7XG4gICAgICAgIHJldHVybiAoMy41NSkudG9Mb2NhbGVTdHJpbmcoXCJlblwiLCB7XG4gICAgICAgICAgICB1c2VHcm91cGluZzogZmFsc2UsXG4gICAgICAgICAgICBtaW5pbXVtSW50ZWdlckRpZ2l0czogMSxcbiAgICAgICAgICAgIG1pbmltdW1GcmFjdGlvbkRpZ2l0czogMSxcbiAgICAgICAgICAgIG1heGltdW1GcmFjdGlvbkRpZ2l0czogMVxuICAgICAgICB9KSA9PT0gXCIzLjZcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmZWF0dXJlVGVzdFRvTG9jYWxlU3RyaW5nKCkge1xuICAgICAgICB2YXIgcGFzc2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBUZXN0IGxvY2FsZS5cbiAgICAgICAgcGFzc2VkID0gcGFzc2VkICYmIHRvTG9jYWxlU3RyaW5nU3VwcG9ydHNMb2NhbGVzKCk7XG4gICAgICAgIGlmICghcGFzc2VkKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgIC8vIFRlc3QgbWluaW11bUludGVnZXJEaWdpdHMuXG4gICAgICAgIHBhc3NlZCA9IHBhc3NlZCAmJiAoMSkudG9Mb2NhbGVTdHJpbmcoXCJlblwiLCB7IG1pbmltdW1JbnRlZ2VyRGlnaXRzOiAxIH0pID09PSBcIjFcIjtcbiAgICAgICAgcGFzc2VkID0gcGFzc2VkICYmICgxKS50b0xvY2FsZVN0cmluZyhcImVuXCIsIHsgbWluaW11bUludGVnZXJEaWdpdHM6IDIgfSkgPT09IFwiMDFcIjtcbiAgICAgICAgcGFzc2VkID0gcGFzc2VkICYmICgxKS50b0xvY2FsZVN0cmluZyhcImVuXCIsIHsgbWluaW11bUludGVnZXJEaWdpdHM6IDMgfSkgPT09IFwiMDAxXCI7XG4gICAgICAgIGlmICghcGFzc2VkKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgIC8vIFRlc3QgbWF4aW11bUZyYWN0aW9uRGlnaXRzIGFuZCBtaW5pbXVtRnJhY3Rpb25EaWdpdHMuXG4gICAgICAgIHBhc3NlZCA9IHBhc3NlZCAmJiAoOTkuOTkpLnRvTG9jYWxlU3RyaW5nKFwiZW5cIiwgeyBtYXhpbXVtRnJhY3Rpb25EaWdpdHM6IDAsIG1pbmltdW1GcmFjdGlvbkRpZ2l0czogMCB9KSA9PT0gXCIxMDBcIjtcbiAgICAgICAgcGFzc2VkID0gcGFzc2VkICYmICg5OS45OSkudG9Mb2NhbGVTdHJpbmcoXCJlblwiLCB7IG1heGltdW1GcmFjdGlvbkRpZ2l0czogMSwgbWluaW11bUZyYWN0aW9uRGlnaXRzOiAxIH0pID09PSBcIjEwMC4wXCI7XG4gICAgICAgIHBhc3NlZCA9IHBhc3NlZCAmJiAoOTkuOTkpLnRvTG9jYWxlU3RyaW5nKFwiZW5cIiwgeyBtYXhpbXVtRnJhY3Rpb25EaWdpdHM6IDIsIG1pbmltdW1GcmFjdGlvbkRpZ2l0czogMiB9KSA9PT0gXCI5OS45OVwiO1xuICAgICAgICBwYXNzZWQgPSBwYXNzZWQgJiYgKDk5Ljk5KS50b0xvY2FsZVN0cmluZyhcImVuXCIsIHsgbWF4aW11bUZyYWN0aW9uRGlnaXRzOiAzLCBtaW5pbXVtRnJhY3Rpb25EaWdpdHM6IDMgfSkgPT09IFwiOTkuOTkwXCI7XG4gICAgICAgIGlmICghcGFzc2VkKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgIC8vIFRlc3QgbWF4aW11bVNpZ25pZmljYW50RGlnaXRzLlxuICAgICAgICBwYXNzZWQgPSBwYXNzZWQgJiYgKDk5Ljk5KS50b0xvY2FsZVN0cmluZyhcImVuXCIsIHsgbWF4aW11bVNpZ25pZmljYW50RGlnaXRzOiAxIH0pID09PSBcIjEwMFwiO1xuICAgICAgICBwYXNzZWQgPSBwYXNzZWQgJiYgKDk5Ljk5KS50b0xvY2FsZVN0cmluZyhcImVuXCIsIHsgbWF4aW11bVNpZ25pZmljYW50RGlnaXRzOiAyIH0pID09PSBcIjEwMFwiO1xuICAgICAgICBwYXNzZWQgPSBwYXNzZWQgJiYgKDk5Ljk5KS50b0xvY2FsZVN0cmluZyhcImVuXCIsIHsgbWF4aW11bVNpZ25pZmljYW50RGlnaXRzOiAzIH0pID09PSBcIjEwMFwiO1xuICAgICAgICBwYXNzZWQgPSBwYXNzZWQgJiYgKDk5Ljk5KS50b0xvY2FsZVN0cmluZyhcImVuXCIsIHsgbWF4aW11bVNpZ25pZmljYW50RGlnaXRzOiA0IH0pID09PSBcIjk5Ljk5XCI7XG4gICAgICAgIHBhc3NlZCA9IHBhc3NlZCAmJiAoOTkuOTkpLnRvTG9jYWxlU3RyaW5nKFwiZW5cIiwgeyBtYXhpbXVtU2lnbmlmaWNhbnREaWdpdHM6IDUgfSkgPT09IFwiOTkuOTlcIjtcbiAgICAgICAgaWYgKCFwYXNzZWQpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICAgICAgLy8gVGVzdCBncm91cGluZy5cbiAgICAgICAgcGFzc2VkID0gcGFzc2VkICYmICgxMDAwKS50b0xvY2FsZVN0cmluZyhcImVuXCIsIHsgdXNlR3JvdXBpbmc6IHRydWUgfSkgPT09IFwiMSwwMDBcIjtcbiAgICAgICAgcGFzc2VkID0gcGFzc2VkICYmICgxMDAwKS50b0xvY2FsZVN0cmluZyhcImVuXCIsIHsgdXNlR3JvdXBpbmc6IGZhbHNlIH0pID09PSBcIjEwMDBcIjtcbiAgICAgICAgaWYgKCFwYXNzZWQpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gZHVyYXRpb25zRm9ybWF0KGR1cmF0aW9ucyBbLCB0ZW1wbGF0ZV0gWywgcHJlY2lzaW9uXSBbLCBzZXR0aW5nc10pXG4gICAgZnVuY3Rpb24gZHVyYXRpb25zRm9ybWF0KCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIHNldHRpbmdzID0ge307XG4gICAgICAgIHZhciBkdXJhdGlvbnM7XG5cbiAgICAgICAgLy8gUGFyc2UgYXJndW1lbnRzLlxuICAgICAgICBlYWNoKGFyZ3MsIGZ1bmN0aW9uIChhcmcsIGluZGV4KSB7XG4gICAgICAgICAgICBpZiAoIWluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0FycmF5KGFyZykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJFeHBlY3RlZCBhcnJheSBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gZHVyYXRpb25zRm9ybWF0LlwiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGR1cmF0aW9ucyA9IGFyZztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGUgPSBhcmc7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnByZWNpc2lvbiA9IGFyZztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc09iamVjdChhcmcpKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5kKHNldHRpbmdzLCBhcmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWR1cmF0aW9ucyB8fCAhZHVyYXRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgc2V0dGluZ3MucmV0dXJuTW9tZW50VHlwZXMgPSB0cnVlO1xuXG4gICAgICAgIHZhciBmb3JtYXR0ZWREdXJhdGlvbnMgPSBtYXAoZHVyYXRpb25zLCBmdW5jdGlvbiAoZHVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZHVyLmZvcm1hdChzZXR0aW5ncyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE1lcmdlIHRva2VuIHR5cGVzIGZyb20gYWxsIGR1cmF0aW9ucy5cbiAgICAgICAgdmFyIG91dHB1dFR5cGVzID0gaW50ZXJzZWN0aW9uKHR5cGVzLCB1bmlxdWUocGx1Y2soZmxhdHRlbihmb3JtYXR0ZWREdXJhdGlvbnMpLCBcInR5cGVcIikpKTtcblxuICAgICAgICB2YXIgbGFyZ2VzdCA9IHNldHRpbmdzLmxhcmdlc3Q7XG5cbiAgICAgICAgaWYgKGxhcmdlc3QpIHtcbiAgICAgICAgICAgIG91dHB1dFR5cGVzID0gb3V0cHV0VHlwZXMuc2xpY2UoMCwgbGFyZ2VzdCk7XG4gICAgICAgIH1cblxuICAgICAgICBzZXR0aW5ncy5yZXR1cm5Nb21lbnRUeXBlcyA9IGZhbHNlO1xuICAgICAgICBzZXR0aW5ncy5vdXRwdXRUeXBlcyA9IG91dHB1dFR5cGVzO1xuXG4gICAgICAgIHJldHVybiBtYXAoZHVyYXRpb25zLCBmdW5jdGlvbiAoZHVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZHVyLmZvcm1hdChzZXR0aW5ncyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGR1cmF0aW9uRm9ybWF0KFt0ZW1wbGF0ZV0gWywgcHJlY2lzaW9uXSBbLCBzZXR0aW5nc10pXG4gICAgZnVuY3Rpb24gZHVyYXRpb25Gb3JtYXQoKSB7XG5cbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBzZXR0aW5ncyA9IGV4dGVuZCh7fSwgdGhpcy5mb3JtYXQuZGVmYXVsdHMpO1xuXG4gICAgICAgIC8vIEtlZXAgYSBzaGFkb3cgY29weSBvZiB0aGlzIG1vbWVudCBmb3IgY2FsY3VsYXRpbmcgcmVtYWluZGVycy5cbiAgICAgICAgLy8gUGVyZm9ybSBhbGwgY2FsY3VsYXRpb25zIG9uIHBvc2l0aXZlIGR1cmF0aW9uIHZhbHVlLCBoYW5kbGUgbmVnYXRpdmVcbiAgICAgICAgLy8gc2lnbiBhdCB0aGUgdmVyeSBlbmQuXG4gICAgICAgIHZhciBhc01pbGxpc2Vjb25kcyA9IHRoaXMuYXNNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgdmFyIGFzTW9udGhzID0gdGhpcy5hc01vbnRocygpO1xuXG4gICAgICAgIC8vIFRyZWF0IGludmFsaWQgZHVyYXRpb25zIGFzIGhhdmluZyBhIHZhbHVlIG9mIDAgbWlsbGlzZWNvbmRzLlxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuaXNWYWxpZCA9PT0gXCJmdW5jdGlvblwiICYmIHRoaXMuaXNWYWxpZCgpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgYXNNaWxsaXNlY29uZHMgPSAwO1xuICAgICAgICAgICAgYXNNb250aHMgPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGlzTmVnYXRpdmUgPSBhc01pbGxpc2Vjb25kcyA8IDA7XG5cbiAgICAgICAgLy8gVHdvIHNoYWRvdyBjb3BpZXMgYXJlIG5lZWRlZCBiZWNhdXNlIG9mIHRoZSB3YXkgbW9tZW50LmpzIGhhbmRsZXNcbiAgICAgICAgLy8gZHVyYXRpb24gYXJpdGhtZXRpYyBmb3IgeWVhcnMvbW9udGhzIGFuZCBmb3Igd2Vla3MvZGF5cy9ob3Vycy9taW51dGVzL3NlY29uZHMuXG4gICAgICAgIHZhciByZW1haW5kZXIgPSBtb21lbnQuZHVyYXRpb24oTWF0aC5hYnMoYXNNaWxsaXNlY29uZHMpLCBcIm1pbGxpc2Vjb25kc1wiKTtcbiAgICAgICAgdmFyIHJlbWFpbmRlck1vbnRocyA9IG1vbWVudC5kdXJhdGlvbihNYXRoLmFicyhhc01vbnRocyksIFwibW9udGhzXCIpO1xuXG4gICAgICAgIC8vIFBhcnNlIGFyZ3VtZW50cy5cbiAgICAgICAgZWFjaChhcmdzLCBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgYXJnID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy50ZW1wbGF0ZSA9IGFyZztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MucHJlY2lzaW9uID0gYXJnO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KGFyZykpIHtcbiAgICAgICAgICAgICAgICBleHRlbmQoc2V0dGluZ3MsIGFyZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBtb21lbnRUb2tlbnMgPSB7XG4gICAgICAgICAgICB5ZWFyczogXCJ5XCIsXG4gICAgICAgICAgICBtb250aHM6IFwiTVwiLFxuICAgICAgICAgICAgd2Vla3M6IFwid1wiLFxuICAgICAgICAgICAgZGF5czogXCJkXCIsXG4gICAgICAgICAgICBob3VyczogXCJoXCIsXG4gICAgICAgICAgICBtaW51dGVzOiBcIm1cIixcbiAgICAgICAgICAgIHNlY29uZHM6IFwic1wiLFxuICAgICAgICAgICAgbWlsbGlzZWNvbmRzOiBcIlNcIlxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB0b2tlbkRlZnMgPSB7XG4gICAgICAgICAgICBlc2NhcGU6IC9cXFsoLis/KVxcXS8sXG4gICAgICAgICAgICB5ZWFyczogL1xcKj9bWXldKy8sXG4gICAgICAgICAgICBtb250aHM6IC9cXCo/TSsvLFxuICAgICAgICAgICAgd2Vla3M6IC9cXCo/W1d3XSsvLFxuICAgICAgICAgICAgZGF5czogL1xcKj9bRGRdKy8sXG4gICAgICAgICAgICBob3VyczogL1xcKj9bSGhdKy8sXG4gICAgICAgICAgICBtaW51dGVzOiAvXFwqP20rLyxcbiAgICAgICAgICAgIHNlY29uZHM6IC9cXCo/cysvLFxuICAgICAgICAgICAgbWlsbGlzZWNvbmRzOiAvXFwqP1MrLyxcbiAgICAgICAgICAgIGdlbmVyYWw6IC8uKz8vXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVHlwZXMgYXJyYXkgaXMgYXZhaWxhYmxlIGluIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvbi5cbiAgICAgICAgc2V0dGluZ3MudHlwZXMgPSB0eXBlcztcblxuICAgICAgICB2YXIgdHlwZU1hcCA9IGZ1bmN0aW9uICh0b2tlbikge1xuICAgICAgICAgICAgcmV0dXJuIGZpbmQodHlwZXMsIGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuRGVmc1t0eXBlXS50ZXN0KHRva2VuKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB0b2tlbml6ZXIgPSBuZXcgUmVnRXhwKG1hcCh0eXBlcywgZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbkRlZnNbdHlwZV0uc291cmNlO1xuICAgICAgICB9KS5qb2luKFwifFwiKSwgXCJnXCIpO1xuXG4gICAgICAgIC8vIEN1cnJlbnQgZHVyYXRpb24gb2JqZWN0IGlzIGF2YWlsYWJsZSBpbiB0aGUgdGVtcGxhdGUgZnVuY3Rpb24uXG4gICAgICAgIHNldHRpbmdzLmR1cmF0aW9uID0gdGhpcztcblxuICAgICAgICAvLyBFdmFsIHRlbXBsYXRlIGZ1bmN0aW9uIGFuZCBjYWNoZSB0ZW1wbGF0ZSBzdHJpbmcuXG4gICAgICAgIHZhciB0ZW1wbGF0ZSA9IHR5cGVvZiBzZXR0aW5ncy50ZW1wbGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gc2V0dGluZ3MudGVtcGxhdGUuYXBwbHkoc2V0dGluZ3MpIDogc2V0dGluZ3MudGVtcGxhdGU7XG5cbiAgICAgICAgLy8gb3V0cHV0VHlwZXMgYW5kIHJldHVybk1vbWVudFR5cGVzIGFyZSBzZXR0aW5ncyB0byBzdXBwb3J0IGR1cmF0aW9uc0Zvcm1hdCgpLlxuXG4gICAgICAgIC8vIG91dHB1dFR5cGVzIGlzIGFuIGFycmF5IG9mIG1vbWVudCB0b2tlbiB0eXBlcyB0aGF0IGRldGVybWluZXNcbiAgICAgICAgLy8gdGhlIHRva2VucyByZXR1cm5lZCBpbiBmb3JtYXR0ZWQgb3V0cHV0LiBUaGlzIG9wdGlvbiBvdmVycmlkZXNcbiAgICAgICAgLy8gdHJpbSwgbGFyZ2VzdCwgc3RvcFRyaW0sIGV0Yy5cbiAgICAgICAgdmFyIG91dHB1dFR5cGVzID0gc2V0dGluZ3Mub3V0cHV0VHlwZXM7XG5cbiAgICAgICAgLy8gcmV0dXJuTW9tZW50VHlwZXMgaXMgYSBib29sZWFuIHRoYXQgc2V0cyBkdXJhdGlvbkZvcm1hdCB0byByZXR1cm5cbiAgICAgICAgLy8gdGhlIHByb2Nlc3NlZCBtb21lbnRUeXBlcyBpbnN0ZWFkIG9mIGZvcm1hdHRlZCBvdXRwdXQuXG4gICAgICAgIHZhciByZXR1cm5Nb21lbnRUeXBlcyA9IHNldHRpbmdzLnJldHVybk1vbWVudFR5cGVzO1xuXG4gICAgICAgIHZhciBsYXJnZXN0ID0gc2V0dGluZ3MubGFyZ2VzdDtcblxuICAgICAgICAvLyBTZXR1cCBzdG9wVHJpbSBhcnJheSBvZiB0b2tlbiB0eXBlcy5cbiAgICAgICAgdmFyIHN0b3BUcmltID0gW107XG5cbiAgICAgICAgaWYgKCFvdXRwdXRUeXBlcykge1xuICAgICAgICAgICAgaWYgKGlzQXJyYXkoc2V0dGluZ3Muc3RvcFRyaW0pKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Muc3RvcFRyaW0gPSBzZXR0aW5ncy5zdG9wVHJpbS5qb2luKFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQYXJzZSBzdG9wVHJpbSBzdHJpbmcgdG8gY3JlYXRlIHRva2VuIHR5cGVzIGFycmF5LlxuICAgICAgICAgICAgaWYgKHNldHRpbmdzLnN0b3BUcmltKSB7XG4gICAgICAgICAgICAgICAgZWFjaChzZXR0aW5ncy5zdG9wVHJpbS5tYXRjaCh0b2tlbml6ZXIpLCBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSB0eXBlTWFwKHRva2VuKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gXCJlc2NhcGVcIiB8fCB0eXBlID09PSBcImdlbmVyYWxcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc3RvcFRyaW0ucHVzaCh0eXBlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhY2hlIG1vbWVudCdzIGxvY2FsZSBkYXRhLlxuICAgICAgICB2YXIgbG9jYWxlRGF0YSA9IG1vbWVudC5sb2NhbGVEYXRhKCk7XG5cbiAgICAgICAgaWYgKCFsb2NhbGVEYXRhKSB7XG4gICAgICAgICAgICBsb2NhbGVEYXRhID0ge307XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGYWxsIGJhY2sgdG8gdGhpcyBwbHVnaW4ncyBgZW5nYCBleHRlbnNpb24uXG4gICAgICAgIGVhY2goa2V5cyhlbmdMb2NhbGUpLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGVuZ0xvY2FsZVtrZXldID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWxvY2FsZURhdGFba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbGVEYXRhW2tleV0gPSBlbmdMb2NhbGVba2V5XTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbG9jYWxlRGF0YVtcIl9cIiArIGtleV0pIHtcbiAgICAgICAgICAgICAgICBsb2NhbGVEYXRhW1wiX1wiICsga2V5XSA9IGVuZ0xvY2FsZVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXBsYWNlIER1cmF0aW9uIFRpbWUgVGVtcGxhdGUgc3RyaW5ncy5cbiAgICAgICAgLy8gRm9yIGxvY2FsZSBgZW5nYDogYF9ITVNfYCwgYF9ITV9gLCBhbmQgYF9NU19gLlxuICAgICAgICBlYWNoKGtleXMobG9jYWxlRGF0YS5fZHVyYXRpb25UaW1lVGVtcGxhdGVzKSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZShcIl9cIiArIGl0ZW0gKyBcIl9cIiwgbG9jYWxlRGF0YS5fZHVyYXRpb25UaW1lVGVtcGxhdGVzW2l0ZW1dKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHVzZXIncyBsb2NhbGUuXG4gICAgICAgIHZhciB1c2VyTG9jYWxlID0gc2V0dGluZ3MudXNlckxvY2FsZSB8fCBtb21lbnQubG9jYWxlKCk7XG5cbiAgICAgICAgdmFyIHVzZUxlZnRVbml0cyA9IHNldHRpbmdzLnVzZUxlZnRVbml0cztcbiAgICAgICAgdmFyIHVzZVBsdXJhbCA9IHNldHRpbmdzLnVzZVBsdXJhbDtcbiAgICAgICAgdmFyIHByZWNpc2lvbiA9IHNldHRpbmdzLnByZWNpc2lvbjtcbiAgICAgICAgdmFyIGZvcmNlTGVuZ3RoID0gc2V0dGluZ3MuZm9yY2VMZW5ndGg7XG4gICAgICAgIHZhciB1c2VHcm91cGluZyA9IHNldHRpbmdzLnVzZUdyb3VwaW5nO1xuICAgICAgICB2YXIgdHJ1bmMgPSBzZXR0aW5ncy50cnVuYztcblxuICAgICAgICAvLyBVc2Ugc2lnbmlmaWNhbnQgZGlnaXRzIG9ubHkgd2hlbiBwcmVjaXNpb24gaXMgZ3JlYXRlciB0aGFuIDAuXG4gICAgICAgIHZhciB1c2VTaWduaWZpY2FudERpZ2l0cyA9IHNldHRpbmdzLnVzZVNpZ25pZmljYW50RGlnaXRzICYmIHByZWNpc2lvbiA+IDA7XG4gICAgICAgIHZhciBzaWduaWZpY2FudERpZ2l0cyA9IHVzZVNpZ25pZmljYW50RGlnaXRzID8gc2V0dGluZ3MucHJlY2lzaW9uIDogMDtcbiAgICAgICAgdmFyIHNpZ25pZmljYW50RGlnaXRzQ2FjaGUgPSBzaWduaWZpY2FudERpZ2l0cztcblxuICAgICAgICB2YXIgbWluVmFsdWUgPSBzZXR0aW5ncy5taW5WYWx1ZTtcbiAgICAgICAgdmFyIGlzTWluVmFsdWUgPSBmYWxzZTtcblxuICAgICAgICB2YXIgbWF4VmFsdWUgPSBzZXR0aW5ncy5tYXhWYWx1ZTtcbiAgICAgICAgdmFyIGlzTWF4VmFsdWUgPSBmYWxzZTtcblxuICAgICAgICAvLyBmb3JtYXROdW1iZXIgZmFsbGJhY2sgb3B0aW9ucy5cbiAgICAgICAgdmFyIHVzZVRvTG9jYWxlU3RyaW5nID0gc2V0dGluZ3MudXNlVG9Mb2NhbGVTdHJpbmc7XG4gICAgICAgIHZhciBncm91cGluZ1NlcGFyYXRvciA9IHNldHRpbmdzLmdyb3VwaW5nU2VwYXJhdG9yO1xuICAgICAgICB2YXIgZGVjaW1hbFNlcGFyYXRvciA9IHNldHRpbmdzLmRlY2ltYWxTZXBhcmF0b3I7XG4gICAgICAgIHZhciBncm91cGluZyA9IHNldHRpbmdzLmdyb3VwaW5nO1xuXG4gICAgICAgIHVzZVRvTG9jYWxlU3RyaW5nID0gdXNlVG9Mb2NhbGVTdHJpbmcgJiYgdG9Mb2NhbGVTdHJpbmdXb3JrcztcblxuICAgICAgICAvLyBUcmltIG9wdGlvbnMuXG4gICAgICAgIHZhciB0cmltID0gc2V0dGluZ3MudHJpbTtcblxuICAgICAgICBpZiAoaXNBcnJheSh0cmltKSkge1xuICAgICAgICAgICAgdHJpbSA9IHRyaW0uam9pbihcIiBcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHJpbSA9PT0gbnVsbCAmJiAobGFyZ2VzdCB8fCBtYXhWYWx1ZSB8fCB1c2VTaWduaWZpY2FudERpZ2l0cykpIHtcbiAgICAgICAgICAgIHRyaW0gPSBcImFsbFwiO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRyaW0gPT09IG51bGwgfHwgdHJpbSA9PT0gdHJ1ZSB8fCB0cmltID09PSBcImxlZnRcIiB8fCB0cmltID09PSBcInJpZ2h0XCIpIHtcbiAgICAgICAgICAgIHRyaW0gPSBcImxhcmdlXCI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHJpbSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRyaW0gPSBcIlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRyaW1JbmNsdWRlcyA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS50ZXN0KHRyaW0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByTGFyZ2UgPSAvbGFyZ2UvO1xuICAgICAgICB2YXIgclNtYWxsID0gL3NtYWxsLztcbiAgICAgICAgdmFyIHJCb3RoID0gL2JvdGgvO1xuICAgICAgICB2YXIgck1pZCA9IC9taWQvO1xuICAgICAgICB2YXIgckFsbCA9IC9eYWxsfFtec21dYWxsLztcbiAgICAgICAgdmFyIHJGaW5hbCA9IC9maW5hbC87XG5cbiAgICAgICAgdmFyIHRyaW1MYXJnZSA9IGxhcmdlc3QgPiAwIHx8IGFueShbckxhcmdlLCByQm90aCwgckFsbF0sIHRyaW1JbmNsdWRlcyk7XG4gICAgICAgIHZhciB0cmltU21hbGwgPSBhbnkoW3JTbWFsbCwgckJvdGgsIHJBbGxdLCB0cmltSW5jbHVkZXMpO1xuICAgICAgICB2YXIgdHJpbU1pZCA9IGFueShbck1pZCwgckFsbF0sIHRyaW1JbmNsdWRlcyk7XG4gICAgICAgIHZhciB0cmltRmluYWwgPSBhbnkoW3JGaW5hbCwgckFsbF0sIHRyaW1JbmNsdWRlcyk7XG5cbiAgICAgICAgLy8gUGFyc2UgZm9ybWF0IHN0cmluZyB0byBjcmVhdGUgcmF3IHRva2VucyBhcnJheS5cbiAgICAgICAgdmFyIHJhd1Rva2VucyA9IG1hcCh0ZW1wbGF0ZS5tYXRjaCh0b2tlbml6ZXIpLCBmdW5jdGlvbiAodG9rZW4sIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgdHlwZSA9IHR5cGVNYXAodG9rZW4pO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4uc2xpY2UoMCwgMSkgPT09IFwiKlwiKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSB0b2tlbi5zbGljZSgxKTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlICE9PSBcImVzY2FwZVwiICYmIHR5cGUgIT09IFwiZ2VuZXJhbFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3BUcmltLnB1c2godHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGluZGV4OiBpbmRleCxcbiAgICAgICAgICAgICAgICBsZW5ndGg6IHRva2VuLmxlbmd0aCxcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiLFxuXG4gICAgICAgICAgICAgICAgLy8gUmVwbGFjZSBlc2NhcGVkIHRva2VucyB3aXRoIHRoZSBub24tZXNjYXBlZCB0b2tlbiB0ZXh0LlxuICAgICAgICAgICAgICAgIHRva2VuOiAodHlwZSA9PT0gXCJlc2NhcGVcIiA/IHRva2VuLnJlcGxhY2UodG9rZW5EZWZzLmVzY2FwZSwgXCIkMVwiKSA6IHRva2VuKSxcblxuICAgICAgICAgICAgICAgIC8vIElnbm9yZSB0eXBlIG9uIG5vbi1tb21lbnQgdG9rZW5zLlxuICAgICAgICAgICAgICAgIHR5cGU6ICgodHlwZSA9PT0gXCJlc2NhcGVcIiB8fCB0eXBlID09PSBcImdlbmVyYWxcIikgPyBudWxsIDogdHlwZSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFzc29jaWF0ZSB0ZXh0IHRva2VucyB3aXRoIG1vbWVudCB0b2tlbnMuXG4gICAgICAgIHZhciBjdXJyZW50VG9rZW4gPSB7XG4gICAgICAgICAgICBpbmRleDogMCxcbiAgICAgICAgICAgIGxlbmd0aDogMCxcbiAgICAgICAgICAgIHRva2VuOiBcIlwiLFxuICAgICAgICAgICAgdGV4dDogXCJcIixcbiAgICAgICAgICAgIHR5cGU6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdG9rZW5zID0gW107XG5cbiAgICAgICAgaWYgKHVzZUxlZnRVbml0cykge1xuICAgICAgICAgICAgcmF3VG9rZW5zLnJldmVyc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVhY2gocmF3VG9rZW5zLCBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICAgICAgICAgIGlmICh0b2tlbi50eXBlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUb2tlbi50eXBlIHx8IGN1cnJlbnRUb2tlbi50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKGN1cnJlbnRUb2tlbik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY3VycmVudFRva2VuID0gdG9rZW47XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh1c2VMZWZ0VW5pdHMpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VG9rZW4udGV4dCA9IHRva2VuLnRva2VuICsgY3VycmVudFRva2VuLnRleHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUb2tlbi50ZXh0ICs9IHRva2VuLnRva2VuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoY3VycmVudFRva2VuLnR5cGUgfHwgY3VycmVudFRva2VuLnRleHQpIHtcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKGN1cnJlbnRUb2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXNlTGVmdFVuaXRzKSB7XG4gICAgICAgICAgICB0b2tlbnMucmV2ZXJzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmluZCB1bmlxdWUgbW9tZW50IHRva2VuIHR5cGVzIGluIHRoZSB0ZW1wbGF0ZSBpbiBvcmRlciBvZlxuICAgICAgICAvLyBkZXNjZW5kaW5nIG1hZ25pdHVkZS5cbiAgICAgICAgdmFyIG1vbWVudFR5cGVzID0gaW50ZXJzZWN0aW9uKHR5cGVzLCB1bmlxdWUoY29tcGFjdChwbHVjayh0b2tlbnMsIFwidHlwZVwiKSkpKTtcblxuICAgICAgICAvLyBFeGl0IGVhcmx5IGlmIHRoZXJlIGFyZSBubyBtb21lbnQgdG9rZW4gdHlwZXMuXG4gICAgICAgIGlmICghbW9tZW50VHlwZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gcGx1Y2sodG9rZW5zLCBcInRleHRcIikuam9pbihcIlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB2YWx1ZXMgZm9yIGVhY2ggbW9tZW50IHR5cGUgaW4gdGhlIHRlbXBsYXRlLlxuICAgICAgICAvLyBGb3IgcHJvY2Vzc2luZyB0aGUgc2V0dGluZ3MsIHZhbHVlcyBhcmUgYXNzb2NpYXRlZCB3aXRoIG1vbWVudCB0eXBlcy5cbiAgICAgICAgLy8gVmFsdWVzIHdpbGwgYmUgYXNzaWduZWQgdG8gdG9rZW5zIGF0IHRoZSBsYXN0IHN0ZXAgaW4gb3JkZXIgdG9cbiAgICAgICAgLy8gYXNzdW1lIG5vdGhpbmcgYWJvdXQgZnJlcXVlbmN5IG9yIG9yZGVyIG9mIHRva2VucyBpbiB0aGUgdGVtcGxhdGUuXG4gICAgICAgIG1vbWVudFR5cGVzID0gbWFwKG1vbWVudFR5cGVzLCBmdW5jdGlvbiAobW9tZW50VHlwZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIC8vIElzIHRoaXMgdGhlIGxlYXN0LW1hZ25pdHVkZSBtb21lbnQgdG9rZW4gZm91bmQ/XG4gICAgICAgICAgICB2YXIgaXNTbWFsbGVzdCA9ICgoaW5kZXggKyAxKSA9PT0gbW9tZW50VHlwZXMubGVuZ3RoKTtcblxuICAgICAgICAgICAgLy8gSXMgdGhpcyB0aGUgZ3JlYXRlc3QtbWFnbml0dWRlIG1vbWVudCB0b2tlbiBmb3VuZD9cbiAgICAgICAgICAgIHZhciBpc0xhcmdlc3QgPSAoIWluZGV4KTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSByYXcgdmFsdWUgaW4gdGhlIGN1cnJlbnQgdW5pdHMuXG4gICAgICAgICAgICB2YXIgcmF3VmFsdWU7XG5cbiAgICAgICAgICAgIGlmIChtb21lbnRUeXBlID09PSBcInllYXJzXCIgfHwgbW9tZW50VHlwZSA9PT0gXCJtb250aHNcIikge1xuICAgICAgICAgICAgICAgIHJhd1ZhbHVlID0gcmVtYWluZGVyTW9udGhzLmFzKG1vbWVudFR5cGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByYXdWYWx1ZSA9IHJlbWFpbmRlci5hcyhtb21lbnRUeXBlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHdob2xlVmFsdWUgPSBNYXRoLmZsb29yKHJhd1ZhbHVlKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFsVmFsdWUgPSByYXdWYWx1ZSAtIHdob2xlVmFsdWU7XG5cbiAgICAgICAgICAgIHZhciB0b2tlbiA9IGZpbmQodG9rZW5zLCBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9tZW50VHlwZSA9PT0gdG9rZW4udHlwZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoaXNMYXJnZXN0ICYmIG1heFZhbHVlICYmIHJhd1ZhbHVlID4gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpc01heFZhbHVlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzU21hbGxlc3QgJiYgbWluVmFsdWUgJiYgTWF0aC5hYnMoc2V0dGluZ3MuZHVyYXRpb24uYXMobW9tZW50VHlwZSkpIDwgbWluVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpc01pblZhbHVlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm90ZSB0aGUgbGVuZ3RoIG9mIHRoZSBsYXJnZXN0LW1hZ25pdHVkZSBtb21lbnQgdG9rZW46XG4gICAgICAgICAgICAvLyBpZiBpdCBpcyBncmVhdGVyIHRoYW4gb25lIGFuZCBmb3JjZUxlbmd0aCBpcyBub3Qgc2V0LFxuICAgICAgICAgICAgLy8gdGhlbiBkZWZhdWx0IGZvcmNlTGVuZ3RoIHRvIGB0cnVlYC5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBSYXRpb25hbGUgaXMgdGhpczogSWYgdGhlIHRlbXBsYXRlIGlzIFwiaDptbTpzc1wiIGFuZCB0aGVcbiAgICAgICAgICAgIC8vIG1vbWVudCB2YWx1ZSBpcyA1IG1pbnV0ZXMsIHRoZSB1c2VyLWZyaWVuZGx5IG91dHB1dCBpc1xuICAgICAgICAgICAgLy8gXCI1OjAwXCIsIG5vdCBcIjA1OjAwXCIuIFdlIHNob3VsZG4ndCBwYWQgdGhlIGBtaW51dGVzYCB0b2tlblxuICAgICAgICAgICAgLy8gZXZlbiB0aG91Z2ggaXQgaGFzIGxlbmd0aCBvZiB0d28gaWYgdGhlIHRlbXBsYXRlIGlzIFwiaDptbTpzc1wiO1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIElmIHRoZSBtaW51dGVzIG91dHB1dCBzaG91bGQgYWx3YXlzIGluY2x1ZGUgdGhlIGxlYWRpbmcgemVyb1xuICAgICAgICAgICAgLy8gZXZlbiB3aGVuIHRoZSBob3VyIGlzIHRyaW1tZWQgdGhlbiBzZXQgYHsgZm9yY2VMZW5ndGg6IHRydWUgfWBcbiAgICAgICAgICAgIC8vIHRvIG91dHB1dCBcIjA1OjAwXCIuIElmIHRoZSB0ZW1wbGF0ZSBpcyBcImhoOm1tOnNzXCIsIHRoZSB1c2VyXG4gICAgICAgICAgICAvLyBjbGVhcmx5IHdhbnRlZCBldmVyeXRoaW5nIHBhZGRlZCBzbyB3ZSBzaG91bGQgb3V0cHV0IFwiMDU6MDBcIjtcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBJZiB0aGUgdXNlciB3YW50cyB0aGUgZnVsbCBwYWRkZWQgb3V0cHV0LCB0aGV5IGNhbiB1c2VcbiAgICAgICAgICAgIC8vIHRlbXBsYXRlIFwiaGg6bW06c3NcIiBhbmQgc2V0IGB7IHRyaW06IGZhbHNlIH1gIHRvIG91dHB1dFxuICAgICAgICAgICAgLy8gXCIwMDowNTowMFwiLlxuICAgICAgICAgICAgaWYgKGlzTGFyZ2VzdCAmJiBmb3JjZUxlbmd0aCA9PT0gbnVsbCAmJiB0b2tlbi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9yY2VMZW5ndGggPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVtYWluZGVyLlxuICAgICAgICAgICAgcmVtYWluZGVyLnN1YnRyYWN0KHdob2xlVmFsdWUsIG1vbWVudFR5cGUpO1xuICAgICAgICAgICAgcmVtYWluZGVyTW9udGhzLnN1YnRyYWN0KHdob2xlVmFsdWUsIG1vbWVudFR5cGUpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJhd1ZhbHVlOiByYXdWYWx1ZSxcbiAgICAgICAgICAgICAgICB3aG9sZVZhbHVlOiB3aG9sZVZhbHVlLFxuICAgICAgICAgICAgICAgIC8vIERlY2ltYWwgdmFsdWUgaXMgb25seSByZXRhaW5lZCBmb3IgdGhlIGxlYXN0LW1hZ25pdHVkZVxuICAgICAgICAgICAgICAgIC8vIG1vbWVudCB0eXBlIGluIHRoZSBmb3JtYXQgdGVtcGxhdGUuXG4gICAgICAgICAgICAgICAgZGVjaW1hbFZhbHVlOiBpc1NtYWxsZXN0ID8gZGVjaW1hbFZhbHVlIDogMCxcbiAgICAgICAgICAgICAgICBpc1NtYWxsZXN0OiBpc1NtYWxsZXN0LFxuICAgICAgICAgICAgICAgIGlzTGFyZ2VzdDogaXNMYXJnZXN0LFxuICAgICAgICAgICAgICAgIHR5cGU6IG1vbWVudFR5cGUsXG4gICAgICAgICAgICAgICAgLy8gVG9rZW5zIGNhbiBhcHBlYXIgbXVsdGlwbGUgdGltZXMgaW4gYSB0ZW1wbGF0ZSBzdHJpbmcsXG4gICAgICAgICAgICAgICAgLy8gYnV0IGFsbCBpbnN0YW5jZXMgbXVzdCBzaGFyZSB0aGUgc2FtZSBsZW5ndGguXG4gICAgICAgICAgICAgICAgdG9rZW5MZW5ndGg6IHRva2VuLmxlbmd0aFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHRydW5jTWV0aG9kID0gdHJ1bmMgPyBNYXRoLmZsb29yIDogTWF0aC5yb3VuZDtcbiAgICAgICAgdmFyIHRydW5jYXRlID0gZnVuY3Rpb24gKHZhbHVlLCBwbGFjZXMpIHtcbiAgICAgICAgICAgIHZhciBmYWN0b3IgPSBNYXRoLnBvdygxMCwgcGxhY2VzKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVuY01ldGhvZCh2YWx1ZSAqIGZhY3RvcikgLyBmYWN0b3I7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGZvdW5kRmlyc3QgPSBmYWxzZTtcbiAgICAgICAgdmFyIGJ1YmJsZWQgPSBmYWxzZTtcblxuICAgICAgICB2YXIgZm9ybWF0VmFsdWUgPSBmdW5jdGlvbiAobW9tZW50VHlwZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBmb3JtYXRPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIHVzZUdyb3VwaW5nOiB1c2VHcm91cGluZyxcbiAgICAgICAgICAgICAgICBncm91cGluZ1NlcGFyYXRvcjogZ3JvdXBpbmdTZXBhcmF0b3IsXG4gICAgICAgICAgICAgICAgZGVjaW1hbFNlcGFyYXRvcjogZGVjaW1hbFNlcGFyYXRvcixcbiAgICAgICAgICAgICAgICBncm91cGluZzogZ3JvdXBpbmcsXG4gICAgICAgICAgICAgICAgdXNlVG9Mb2NhbGVTdHJpbmc6IHVzZVRvTG9jYWxlU3RyaW5nXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodXNlU2lnbmlmaWNhbnREaWdpdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2lnbmlmaWNhbnREaWdpdHMgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICBtb21lbnRUeXBlLnJhd1ZhbHVlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50VHlwZS53aG9sZVZhbHVlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50VHlwZS5kZWNpbWFsVmFsdWUgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdE9wdGlvbnMubWF4aW11bVNpZ25pZmljYW50RGlnaXRzID0gc2lnbmlmaWNhbnREaWdpdHM7XG4gICAgICAgICAgICAgICAgICAgIG1vbWVudFR5cGUuc2lnbmlmaWNhbnREaWdpdHMgPSBzaWduaWZpY2FudERpZ2l0cztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc01heFZhbHVlICYmICFidWJibGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1vbWVudFR5cGUuaXNMYXJnZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbWVudFR5cGUud2hvbGVWYWx1ZSA9IG1heFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBtb21lbnRUeXBlLmRlY2ltYWxWYWx1ZSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50VHlwZS53aG9sZVZhbHVlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50VHlwZS5kZWNpbWFsVmFsdWUgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzTWluVmFsdWUgJiYgIWJ1YmJsZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAobW9tZW50VHlwZS5pc1NtYWxsZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbWVudFR5cGUud2hvbGVWYWx1ZSA9IG1pblZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBtb21lbnRUeXBlLmRlY2ltYWxWYWx1ZSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50VHlwZS53aG9sZVZhbHVlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50VHlwZS5kZWNpbWFsVmFsdWUgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG1vbWVudFR5cGUuaXNTbWFsbGVzdCB8fCBtb21lbnRUeXBlLnNpZ25pZmljYW50RGlnaXRzICYmIG1vbWVudFR5cGUuc2lnbmlmaWNhbnREaWdpdHMgLSBtb21lbnRUeXBlLndob2xlVmFsdWUudG9TdHJpbmcoKS5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgICAgIC8vIEFwcGx5IHByZWNpc2lvbiB0byBsZWFzdCBzaWduaWZpY2FudCB0b2tlbiB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAocHJlY2lzaW9uIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBtb21lbnRUeXBlLnZhbHVlID0gdHJ1bmNhdGUobW9tZW50VHlwZS53aG9sZVZhbHVlLCBwcmVjaXNpb24pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJlY2lzaW9uID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbWVudFR5cGUudmFsdWUgPSB0cnVuY01ldGhvZChtb21lbnRUeXBlLndob2xlVmFsdWUgKyBtb21lbnRUeXBlLmRlY2ltYWxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gcHJlY2lzaW9uID4gMFxuICAgICAgICAgICAgICAgICAgICBpZiAodXNlU2lnbmlmaWNhbnREaWdpdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0cnVuYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vbWVudFR5cGUudmFsdWUgPSB0cnVuY2F0ZShtb21lbnRUeXBlLnJhd1ZhbHVlLCBzaWduaWZpY2FudERpZ2l0cyAtIG1vbWVudFR5cGUud2hvbGVWYWx1ZS50b1N0cmluZygpLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vbWVudFR5cGUudmFsdWUgPSBtb21lbnRUeXBlLnJhd1ZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9tZW50VHlwZS53aG9sZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2lnbmlmaWNhbnREaWdpdHMgLT0gbW9tZW50VHlwZS53aG9sZVZhbHVlLnRvU3RyaW5nKCkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0T3B0aW9ucy5mcmFjdGlvbkRpZ2l0cyA9IHByZWNpc2lvbjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRydW5jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9tZW50VHlwZS52YWx1ZSA9IG1vbWVudFR5cGUud2hvbGVWYWx1ZSArIHRydW5jYXRlKG1vbWVudFR5cGUuZGVjaW1hbFZhbHVlLCBwcmVjaXNpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb21lbnRUeXBlLnZhbHVlID0gbW9tZW50VHlwZS53aG9sZVZhbHVlICsgbW9tZW50VHlwZS5kZWNpbWFsVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh1c2VTaWduaWZpY2FudERpZ2l0cyAmJiBtb21lbnRUeXBlLndob2xlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT3V0ZXIgTWF0aC5yb3VuZCByZXF1aXJlZCBoZXJlIHRvIGhhbmRsZSBmbG9hdGluZyBwb2ludCBlcnJvcnMuXG4gICAgICAgICAgICAgICAgICAgIG1vbWVudFR5cGUudmFsdWUgPSBNYXRoLnJvdW5kKHRydW5jYXRlKG1vbWVudFR5cGUud2hvbGVWYWx1ZSwgbW9tZW50VHlwZS5zaWduaWZpY2FudERpZ2l0cyAtIG1vbWVudFR5cGUud2hvbGVWYWx1ZS50b1N0cmluZygpLmxlbmd0aCkpO1xuXG4gICAgICAgICAgICAgICAgICAgIHNpZ25pZmljYW50RGlnaXRzIC09IG1vbWVudFR5cGUud2hvbGVWYWx1ZS50b1N0cmluZygpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtb21lbnRUeXBlLnZhbHVlID0gbW9tZW50VHlwZS53aG9sZVZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG1vbWVudFR5cGUudG9rZW5MZW5ndGggPiAxICYmIChmb3JjZUxlbmd0aCB8fCBmb3VuZEZpcnN0KSkge1xuICAgICAgICAgICAgICAgIGZvcm1hdE9wdGlvbnMubWluaW11bUludGVnZXJEaWdpdHMgPSBtb21lbnRUeXBlLnRva2VuTGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgaWYgKGJ1YmJsZWQgJiYgZm9ybWF0T3B0aW9ucy5tYXhpbXVtU2lnbmlmaWNhbnREaWdpdHMgPCBtb21lbnRUeXBlLnRva2VuTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtYXRPcHRpb25zLm1heGltdW1TaWduaWZpY2FudERpZ2l0cztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZm91bmRGaXJzdCAmJiAobW9tZW50VHlwZS52YWx1ZSA+IDAgfHwgdHJpbSA9PT0gXCJcIiAvKiB0cmltOiBmYWxzZSAqLyB8fCBmaW5kKHN0b3BUcmltLCBtb21lbnRUeXBlLnR5cGUpIHx8IGZpbmQob3V0cHV0VHlwZXMsIG1vbWVudFR5cGUudHlwZSkpKSB7XG4gICAgICAgICAgICAgICAgZm91bmRGaXJzdCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vbWVudFR5cGUuZm9ybWF0dGVkVmFsdWUgPSBmb3JtYXROdW1iZXIobW9tZW50VHlwZS52YWx1ZSwgZm9ybWF0T3B0aW9ucywgdXNlckxvY2FsZSk7XG5cbiAgICAgICAgICAgIGZvcm1hdE9wdGlvbnMudXNlR3JvdXBpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvcm1hdE9wdGlvbnMuZGVjaW1hbFNlcGFyYXRvciA9IFwiLlwiO1xuICAgICAgICAgICAgbW9tZW50VHlwZS5mb3JtYXR0ZWRWYWx1ZUVuID0gZm9ybWF0TnVtYmVyKG1vbWVudFR5cGUudmFsdWUsIGZvcm1hdE9wdGlvbnMsIFwiZW5cIik7XG5cbiAgICAgICAgICAgIGlmIChtb21lbnRUeXBlLnRva2VuTGVuZ3RoID09PSAyICYmIG1vbWVudFR5cGUudHlwZSA9PT0gXCJtaWxsaXNlY29uZHNcIikge1xuICAgICAgICAgICAgICAgIG1vbWVudFR5cGUuZm9ybWF0dGVkVmFsdWVNUyA9IGZvcm1hdE51bWJlcihtb21lbnRUeXBlLnZhbHVlLCB7XG4gICAgICAgICAgICAgICAgICAgIG1pbmltdW1JbnRlZ2VyRGlnaXRzOiAzLFxuICAgICAgICAgICAgICAgICAgICB1c2VHcm91cGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICB9LCBcImVuXCIpLnNsaWNlKDAsIDIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbW9tZW50VHlwZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgZm9ybWF0dGVkIHZhbHVlcy5cbiAgICAgICAgbW9tZW50VHlwZXMgPSBtYXAobW9tZW50VHlwZXMsIGZvcm1hdFZhbHVlKTtcbiAgICAgICAgbW9tZW50VHlwZXMgPSBjb21wYWN0KG1vbWVudFR5cGVzKTtcblxuICAgICAgICAvLyBCdWJibGUgcm91bmRlZCB2YWx1ZXMuXG4gICAgICAgIGlmIChtb21lbnRUeXBlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB2YXIgZmluZFR5cGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaW5kKG1vbWVudFR5cGVzLCBmdW5jdGlvbiAobW9tZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbW9tZW50VHlwZS50eXBlID09PSB0eXBlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGJ1YmJsZVR5cGVzID0gZnVuY3Rpb24gKGJ1YmJsZSkge1xuICAgICAgICAgICAgICAgIHZhciBidWJibGVNb21lbnRUeXBlID0gZmluZFR5cGUoYnViYmxlLnR5cGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFidWJibGVNb21lbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBlYWNoKGJ1YmJsZS50YXJnZXRzLCBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YXJnZXRNb21lbnRUeXBlID0gZmluZFR5cGUodGFyZ2V0LnR5cGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0TW9tZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KGJ1YmJsZU1vbWVudFR5cGUuZm9ybWF0dGVkVmFsdWVFbiwgMTApID09PSB0YXJnZXQudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1YmJsZU1vbWVudFR5cGUucmF3VmFsdWUgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnViYmxlTW9tZW50VHlwZS53aG9sZVZhbHVlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1YmJsZU1vbWVudFR5cGUuZGVjaW1hbFZhbHVlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldE1vbWVudFR5cGUucmF3VmFsdWUgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldE1vbWVudFR5cGUud2hvbGVWYWx1ZSArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0TW9tZW50VHlwZS5kZWNpbWFsVmFsdWUgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0TW9tZW50VHlwZS5mb3JtYXR0ZWRWYWx1ZUVuID0gdGFyZ2V0TW9tZW50VHlwZS53aG9sZVZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWJibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZWFjaChidWJibGVzLCBidWJibGVUeXBlcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWNhbGN1bGF0ZSBmb3JtYXR0ZWQgdmFsdWVzLlxuICAgICAgICBpZiAoYnViYmxlZCkge1xuICAgICAgICAgICAgZm91bmRGaXJzdCA9IGZhbHNlO1xuICAgICAgICAgICAgc2lnbmlmaWNhbnREaWdpdHMgPSBzaWduaWZpY2FudERpZ2l0c0NhY2hlO1xuICAgICAgICAgICAgbW9tZW50VHlwZXMgPSBtYXAobW9tZW50VHlwZXMsIGZvcm1hdFZhbHVlKTtcbiAgICAgICAgICAgIG1vbWVudFR5cGVzID0gY29tcGFjdChtb21lbnRUeXBlcyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3V0cHV0VHlwZXMgJiYgIShpc01heFZhbHVlICYmICFzZXR0aW5ncy50cmltKSkge1xuICAgICAgICAgICAgbW9tZW50VHlwZXMgPSBtYXAobW9tZW50VHlwZXMsIGZ1bmN0aW9uIChtb21lbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbmQob3V0cHV0VHlwZXMsIGZ1bmN0aW9uIChvdXRwdXRUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnRUeXBlLnR5cGUgPT09IG91dHB1dFR5cGU7XG4gICAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1vbWVudFR5cGU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbW9tZW50VHlwZXMgPSBjb21wYWN0KG1vbWVudFR5cGVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRyaW0gTGFyZ2UuXG4gICAgICAgICAgICBpZiAodHJpbUxhcmdlKSB7XG4gICAgICAgICAgICAgICAgbW9tZW50VHlwZXMgPSByZXN0KG1vbWVudFR5cGVzLCBmdW5jdGlvbiAobW9tZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9wIHRyaW1taW5nIG9uOlxuICAgICAgICAgICAgICAgICAgICAvLyAtIHRoZSBzbWFsbGVzdCBtb21lbnQgdHlwZVxuICAgICAgICAgICAgICAgICAgICAvLyAtIGEgdHlwZSBtYXJrZWQgZm9yIHN0b3BUcmltXG4gICAgICAgICAgICAgICAgICAgIC8vIC0gYSB0eXBlIHRoYXQgaGFzIGEgd2hvbGUgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFtb21lbnRUeXBlLmlzU21hbGxlc3QgJiYgIW1vbWVudFR5cGUud2hvbGVWYWx1ZSAmJiAhZmluZChzdG9wVHJpbSwgbW9tZW50VHlwZS50eXBlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTGFyZ2VzdC5cbiAgICAgICAgICAgIGlmIChsYXJnZXN0ICYmIG1vbWVudFR5cGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG1vbWVudFR5cGVzID0gbW9tZW50VHlwZXMuc2xpY2UoMCwgbGFyZ2VzdCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRyaW0gU21hbGwuXG4gICAgICAgICAgICBpZiAodHJpbVNtYWxsICYmIG1vbWVudFR5cGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBtb21lbnRUeXBlcyA9IGluaXRpYWwobW9tZW50VHlwZXMsIGZ1bmN0aW9uIChtb21lbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3AgdHJpbW1pbmcgb246XG4gICAgICAgICAgICAgICAgICAgIC8vIC0gYSB0eXBlIG1hcmtlZCBmb3Igc3RvcFRyaW1cbiAgICAgICAgICAgICAgICAgICAgLy8gLSBhIHR5cGUgdGhhdCBoYXMgYSB3aG9sZSB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAvLyAtIHRoZSBsYXJnZXN0IG1vbWVudFR5cGVcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFtb21lbnRUeXBlLndob2xlVmFsdWUgJiYgIWZpbmQoc3RvcFRyaW0sIG1vbWVudFR5cGUudHlwZSkgJiYgIW1vbWVudFR5cGUuaXNMYXJnZXN0O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUcmltIE1pZC5cbiAgICAgICAgICAgIGlmICh0cmltTWlkKSB7XG4gICAgICAgICAgICAgICAgbW9tZW50VHlwZXMgPSBtYXAobW9tZW50VHlwZXMsIGZ1bmN0aW9uIChtb21lbnRUeXBlLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAwICYmIGluZGV4IDwgbW9tZW50VHlwZXMubGVuZ3RoIC0gMSAmJiAhbW9tZW50VHlwZS53aG9sZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnRUeXBlO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbW9tZW50VHlwZXMgPSBjb21wYWN0KG1vbWVudFR5cGVzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVHJpbSBGaW5hbC5cbiAgICAgICAgICAgIGlmICh0cmltRmluYWwgJiYgbW9tZW50VHlwZXMubGVuZ3RoID09PSAxICYmICFtb21lbnRUeXBlc1swXS53aG9sZVZhbHVlICYmICEoIXRydW5jICYmIG1vbWVudFR5cGVzWzBdLmlzU21hbGxlc3QgJiYgbW9tZW50VHlwZXNbMF0ucmF3VmFsdWUgPCBtaW5WYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBtb21lbnRUeXBlcyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJldHVybk1vbWVudFR5cGVzKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50VHlwZXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2NhbGl6ZSBhbmQgcGx1cmFsaXplIHVuaXQgbGFiZWxzLlxuICAgICAgICBlYWNoKHRva2VucywgZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gbW9tZW50VG9rZW5zW3Rva2VuLnR5cGVdO1xuXG4gICAgICAgICAgICB2YXIgbW9tZW50VHlwZSA9IGZpbmQobW9tZW50VHlwZXMsIGZ1bmN0aW9uIChtb21lbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vbWVudFR5cGUudHlwZSA9PT0gdG9rZW4udHlwZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIWtleSB8fCAhbW9tZW50VHlwZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IG1vbWVudFR5cGUuZm9ybWF0dGVkVmFsdWVFbi5zcGxpdChcIi5cIik7XG5cbiAgICAgICAgICAgIHZhbHVlc1swXSA9IHBhcnNlSW50KHZhbHVlc1swXSwgMTApO1xuXG4gICAgICAgICAgICBpZiAodmFsdWVzWzFdKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzWzFdID0gcGFyc2VGbG9hdChcIjAuXCIgKyB2YWx1ZXNbMV0sIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzWzFdID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHBsdXJhbEtleSA9IGxvY2FsZURhdGEuZHVyYXRpb25QbHVyYWxLZXkoa2V5LCB2YWx1ZXNbMF0sIHZhbHVlc1sxXSk7XG5cbiAgICAgICAgICAgIHZhciBsYWJlbHMgPSBkdXJhdGlvbkdldExhYmVscyhrZXksIGxvY2FsZURhdGEpO1xuXG4gICAgICAgICAgICB2YXIgYXV0b0xvY2FsaXplZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICB2YXIgcGx1cmFsaXplZExhYmVscyA9IHt9O1xuXG4gICAgICAgICAgICAvLyBBdXRvLUxvY2FsaXplZCB1bml0IGxhYmVscy5cbiAgICAgICAgICAgIGVhY2gobG9jYWxlRGF0YS5fZHVyYXRpb25MYWJlbFR5cGVzLCBmdW5jdGlvbiAobGFiZWxUeXBlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxhYmVsID0gZmluZChsYWJlbHMsIGZ1bmN0aW9uIChsYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWwudHlwZSA9PT0gbGFiZWxUeXBlLnR5cGUgJiYgbGFiZWwua2V5ID09PSBwbHVyYWxLZXk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcGx1cmFsaXplZExhYmVsc1tsYWJlbC50eXBlXSA9IGxhYmVsLmxhYmVsO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdHJpbmdJbmNsdWRlcyh0b2tlbi50ZXh0LCBsYWJlbFR5cGUuc3RyaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4udGV4dCA9IHRva2VuLnRleHQucmVwbGFjZShsYWJlbFR5cGUuc3RyaW5nLCBsYWJlbC5sYWJlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdXRvTG9jYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBBdXRvLXBsdXJhbGl6ZWQgdW5pdCBsYWJlbHMuXG4gICAgICAgICAgICBpZiAodXNlUGx1cmFsICYmICFhdXRvTG9jYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgbGFiZWxzLnNvcnQoZHVyYXRpb25MYWJlbENvbXBhcmUpO1xuXG4gICAgICAgICAgICAgICAgZWFjaChsYWJlbHMsIGZ1bmN0aW9uIChsYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGx1cmFsaXplZExhYmVsc1tsYWJlbC50eXBlXSA9PT0gbGFiZWwubGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdHJpbmdJbmNsdWRlcyh0b2tlbi50ZXh0LCBsYWJlbC5sYWJlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdG9wIGNoZWNraW5nIHRoaXMgdG9rZW4gaWYgaXRzIGxhYmVsIGlzIGFscmVhZHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb3JyZWN0bHkgcGx1cmFsaXplZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgdGhpcyBsYWJlbCBpZiBpdCBpcyBjb3JyZWN0LCBidXQgbm90IHByZXNlbnQgaW5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSB0b2tlbidzIHRleHQuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RyaW5nSW5jbHVkZXModG9rZW4udGV4dCwgbGFiZWwubGFiZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXBsZWNlIHRoaXMgdG9rZW4ncyBsYWJlbCBhbmQgc3RvcCBjaGVja2luZy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLnRleHQgPSB0b2tlbi50ZXh0LnJlcGxhY2UobGFiZWwubGFiZWwsIHBsdXJhbGl6ZWRMYWJlbHNbbGFiZWwudHlwZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkIG91cHR1dC5cbiAgICAgICAgdG9rZW5zID0gbWFwKHRva2VucywgZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgICAgICAgICBpZiAoIXRva2VuLnR5cGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9rZW4udGV4dDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG1vbWVudFR5cGUgPSBmaW5kKG1vbWVudFR5cGVzLCBmdW5jdGlvbiAobW9tZW50VHlwZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnRUeXBlLnR5cGUgPT09IHRva2VuLnR5cGU7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFtb21lbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvdXQgPSBcIlwiO1xuXG4gICAgICAgICAgICBpZiAodXNlTGVmdFVuaXRzKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IHRva2VuLnRleHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc05lZ2F0aXZlICYmIGlzTWF4VmFsdWUgfHwgIWlzTmVnYXRpdmUgJiYgaXNNaW5WYWx1ZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSBcIjwgXCI7XG4gICAgICAgICAgICAgICAgaXNNYXhWYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlzTWluVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzTmVnYXRpdmUgJiYgaXNNaW5WYWx1ZSB8fCAhaXNOZWdhdGl2ZSAmJiBpc01heFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IFwiPiBcIjtcbiAgICAgICAgICAgICAgICBpc01heFZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaXNNaW5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaXNOZWdhdGl2ZSAmJiAobW9tZW50VHlwZS52YWx1ZSA+IDAgfHwgdHJpbSA9PT0gXCJcIiB8fCBmaW5kKHN0b3BUcmltLCBtb21lbnRUeXBlLnR5cGUpIHx8IGZpbmQob3V0cHV0VHlwZXMsIG1vbWVudFR5cGUudHlwZSkpKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IFwiLVwiO1xuICAgICAgICAgICAgICAgIGlzTmVnYXRpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwibWlsbGlzZWNvbmRzXCIgJiYgbW9tZW50VHlwZS5mb3JtYXR0ZWRWYWx1ZU1TKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IG1vbWVudFR5cGUuZm9ybWF0dGVkVmFsdWVNUztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IG1vbWVudFR5cGUuZm9ybWF0dGVkVmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdXNlTGVmdFVuaXRzKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IHRva2VuLnRleHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyaW0gbGVhZGluZyBhbmQgdHJhaWxpbmcgY29tbWEsIHNwYWNlLCBjb2xvbiwgYW5kIGRvdC5cbiAgICAgICAgcmV0dXJuIHRva2Vucy5qb2luKFwiXCIpLnJlcGxhY2UoLygsfCB8OnxcXC4pKiQvLCBcIlwiKS5yZXBsYWNlKC9eKCx8IHw6fFxcLikqLywgXCJcIik7XG4gICAgfVxuXG4gICAgLy8gZGVmYXVsdEZvcm1hdFRlbXBsYXRlXG4gICAgZnVuY3Rpb24gZGVmYXVsdEZvcm1hdFRlbXBsYXRlKCkge1xuICAgICAgICB2YXIgZHVyID0gdGhpcy5kdXJhdGlvbjtcblxuICAgICAgICB2YXIgZmluZFR5cGUgPSBmdW5jdGlvbiBmaW5kVHlwZSh0eXBlKSB7XG4gICAgICAgICAgICByZXR1cm4gZHVyLl9kYXRhW3R5cGVdO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBmaXJzdFR5cGUgPSBmaW5kKHRoaXMudHlwZXMsIGZpbmRUeXBlKTtcblxuICAgICAgICB2YXIgbGFzdFR5cGUgPSBmaW5kTGFzdCh0aGlzLnR5cGVzLCBmaW5kVHlwZSk7XG5cbiAgICAgICAgLy8gRGVmYXVsdCB0ZW1wbGF0ZSBzdHJpbmdzIGZvciBlYWNoIGR1cmF0aW9uIGRpbWVuc2lvbiB0eXBlLlxuICAgICAgICBzd2l0Y2ggKGZpcnN0VHlwZSkge1xuICAgICAgICAgICAgY2FzZSBcIm1pbGxpc2Vjb25kc1wiOlxuICAgICAgICAgICAgICAgIHJldHVybiBcIlMgX19cIjtcbiAgICAgICAgICAgIGNhc2UgXCJzZWNvbmRzXCI6IC8vIEZhbGx0aHJvdWdoLlxuICAgICAgICAgICAgY2FzZSBcIm1pbnV0ZXNcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCIqX01TX1wiO1xuICAgICAgICAgICAgY2FzZSBcImhvdXJzXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiX0hNU19cIjtcbiAgICAgICAgICAgIGNhc2UgXCJkYXlzXCI6IC8vIFBvc3NpYmxlIEZhbGx0aHJvdWdoLlxuICAgICAgICAgICAgICAgIGlmIChmaXJzdFR5cGUgPT09IGxhc3RUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcImQgX19cIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFwid2Vla3NcIjpcbiAgICAgICAgICAgICAgICBpZiAoZmlyc3RUeXBlID09PSBsYXN0VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ3IF9fXCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJpbSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaW0gPSBcImJvdGhcIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ3IF9fLCBkIF9fLCBoIF9fXCI7XG4gICAgICAgICAgICBjYXNlIFwibW9udGhzXCI6IC8vIFBvc3NpYmxlIEZhbGx0aHJvdWdoLlxuICAgICAgICAgICAgICAgIGlmIChmaXJzdFR5cGUgPT09IGxhc3RUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIk0gX19cIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFwieWVhcnNcIjpcbiAgICAgICAgICAgICAgICBpZiAoZmlyc3RUeXBlID09PSBsYXN0VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ5IF9fXCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJpbSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaW0gPSBcImJvdGhcIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ5IF9fLCBNIF9fLCBkIF9fXCI7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyaW0gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmltID0gXCJib3RoXCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwieSBfXywgZCBfXywgaCBfXywgbSBfXywgcyBfX1wiO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaW5pdFxuICAgIGZ1bmN0aW9uIGluaXQoY29udGV4dCkge1xuICAgICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgICAgIHRocm93IFwiTW9tZW50IER1cmF0aW9uIEZvcm1hdCBpbml0IGNhbm5vdCBmaW5kIG1vbWVudCBpbnN0YW5jZS5cIjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQuZHVyYXRpb24uZm9ybWF0ID0gZHVyYXRpb25zRm9ybWF0O1xuICAgICAgICBjb250ZXh0LmR1cmF0aW9uLmZuLmZvcm1hdCA9IGR1cmF0aW9uRm9ybWF0O1xuXG4gICAgICAgIGNvbnRleHQuZHVyYXRpb24uZm4uZm9ybWF0LmRlZmF1bHRzID0ge1xuICAgICAgICAgICAgLy8gTWFueSBvcHRpb25zIGFyZSBkZWZhdWx0ZWQgdG8gYG51bGxgIHRvIGRpc3Rpbmd1aXNoIGJldHdlZW5cbiAgICAgICAgICAgIC8vICdub3Qgc2V0JyBhbmQgJ3NldCB0byBgZmFsc2VgJ1xuXG4gICAgICAgICAgICAvLyB0cmltXG4gICAgICAgICAgICAvLyBDYW4gYmUgYSBzdHJpbmcsIGEgZGVsaW1pdGVkIGxpc3Qgb2Ygc3RyaW5ncywgYW4gYXJyYXkgb2Ygc3RyaW5ncyxcbiAgICAgICAgICAgIC8vIG9yIGEgYm9vbGVhbi5cbiAgICAgICAgICAgIC8vIFwibGFyZ2VcIiAtIHdpbGwgdHJpbSBsYXJnZXN0LW1hZ25pdHVkZSB6ZXJvLXZhbHVlIHRva2VucyB1bnRpbFxuICAgICAgICAgICAgLy8gZmluZGluZyBhIHRva2VuIHdpdGggYSB2YWx1ZSwgYSB0b2tlbiBpZGVudGlmaWVkIGFzICdzdG9wVHJpbScsIG9yXG4gICAgICAgICAgICAvLyB0aGUgZmluYWwgdG9rZW4gb2YgdGhlIGZvcm1hdCBzdHJpbmcuXG4gICAgICAgICAgICAvLyBcInNtYWxsXCIgLSB3aWxsIHRyaW0gc21hbGxlc3QtbWFnbml0dWRlIHplcm8tdmFsdWUgdG9rZW5zIHVudGlsXG4gICAgICAgICAgICAvLyBmaW5kaW5nIGEgdG9rZW4gd2l0aCBhIHZhbHVlLCBhIHRva2VuIGlkZW50aWZpZWQgYXMgJ3N0b3BUcmltJywgb3JcbiAgICAgICAgICAgIC8vIHRoZSBmaW5hbCB0b2tlbiBvZiB0aGUgZm9ybWF0IHN0cmluZy5cbiAgICAgICAgICAgIC8vIFwiYm90aFwiIC0gd2lsbCBleGVjdXRlIFwibGFyZ2VcIiB0cmltIHRoZW4gXCJzbWFsbFwiIHRyaW0uXG4gICAgICAgICAgICAvLyBcIm1pZFwiIC0gd2lsbCB0cmltIGFueSB6ZXJvLXZhbHVlIHRva2VucyB0aGF0IGFyZSBub3QgdGhlIGZpcnN0IG9yXG4gICAgICAgICAgICAvLyBsYXN0IHRva2Vucy4gVXN1YWxseSB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGggXCJsYXJnZVwiIG9yIFwiYm90aFwiLlxuICAgICAgICAgICAgLy8gZS5nLiBcImxhcmdlIG1pZFwiIG9yIFwiYm90aCBtaWRcIi5cbiAgICAgICAgICAgIC8vIFwiZmluYWxcIiAtIHdpbGwgdHJpbSB0aGUgZmluYWwgdG9rZW4gaWYgaXQgaXMgemVyby12YWx1ZS4gVXNlIHRoaXNcbiAgICAgICAgICAgIC8vIG9wdGlvbiB3aXRoIFwibGFyZ2VcIiBvciBcImJvdGhcIiB0byBvdXRwdXQgYW4gZW1wdHkgc3RyaW5nIHdoZW5cbiAgICAgICAgICAgIC8vIGZvcm1hdHRpbmcgYSB6ZXJvLXZhbHVlIGR1cmF0aW9uLiBlLmcuIFwibGFyZ2UgZmluYWxcIiBvciBcImJvdGggZmluYWxcIi5cbiAgICAgICAgICAgIC8vIFwiYWxsXCIgLSBXaWxsIHRyaW0gYWxsIHplcm8tdmFsdWUgdG9rZW5zLiBTaG9ydGhhbmQgZm9yIFwiYm90aCBtaWQgZmluYWxcIi5cbiAgICAgICAgICAgIC8vIFwibGVmdFwiIC0gbWFwcyB0byBcImxhcmdlXCIgdG8gc3VwcG9ydCBwbHVnaW4ncyB2ZXJzaW9uIDEgQVBJLlxuICAgICAgICAgICAgLy8gXCJyaWdodFwiIC0gbWFwcyB0byBcImxhcmdlXCIgdG8gc3VwcG9ydCBwbHVnaW4ncyB2ZXJzaW9uIDEgQVBJLlxuICAgICAgICAgICAgLy8gYGZhbHNlYCAtIHRlbXBsYXRlIHRva2VucyBhcmUgbm90IHRyaW1tZWQuXG4gICAgICAgICAgICAvLyBgdHJ1ZWAgLSB0cmVhdGVkIGFzIFwibGFyZ2VcIi5cbiAgICAgICAgICAgIC8vIGBudWxsYCAtIHRyZWF0ZWQgYXMgXCJsYXJnZVwiLlxuICAgICAgICAgICAgdHJpbTogbnVsbCxcblxuICAgICAgICAgICAgLy8gc3RvcFRyaW1cbiAgICAgICAgICAgIC8vIEEgbW9tZW50IHRva2VuIHN0cmluZywgYSBkZWxpbWl0ZWQgc2V0IG9mIG1vbWVudCB0b2tlbiBzdHJpbmdzLFxuICAgICAgICAgICAgLy8gb3IgYW4gYXJyYXkgb2YgbW9tZW50IHRva2VuIHN0cmluZ3MuIFRyaW1taW5nIHdpbGwgc3RvcCB3aGVuIGEgdG9rZW5cbiAgICAgICAgICAgIC8vIGxpc3RlZCBpbiB0aGlzIG9wdGlvbiBpcyByZWFjaGVkLiBBIFwiKlwiIGNoYXJhY3RlciBpbiB0aGUgZm9ybWF0XG4gICAgICAgICAgICAvLyB0ZW1wbGF0ZSBzdHJpbmcgd2lsbCBhbHNvIG1hcmsgYSBtb21lbnQgdG9rZW4gYXMgc3RvcFRyaW0uXG4gICAgICAgICAgICAvLyBlLmcuIFwiZCBbZGF5c10gKmg6bW06c3NcIiB3aWxsIGFsd2F5cyBzdG9wIHRyaW1taW5nIGF0IHRoZSAnaG91cnMnIHRva2VuLlxuICAgICAgICAgICAgc3RvcFRyaW06IG51bGwsXG5cbiAgICAgICAgICAgIC8vIGxhcmdlc3RcbiAgICAgICAgICAgIC8vIFNldCB0byBhIHBvc2l0aXZlIGludGVnZXIgdG8gb3V0cHV0IG9ubHkgdGhlIFwiblwiIGxhcmdlc3QtbWFnbml0dWRlXG4gICAgICAgICAgICAvLyBtb21lbnQgdG9rZW5zIHRoYXQgaGF2ZSBhIHZhbHVlLiBBbGwgbGVzc2VyLW1hZ25pdHVkZSBtb21lbnQgdG9rZW5zXG4gICAgICAgICAgICAvLyB3aWxsIGJlIGlnbm9yZWQuIFRoaXMgb3B0aW9uIHRha2VzIGVmZmVjdCBldmVuIGlmIGB0cmltYCBpcyBzZXRcbiAgICAgICAgICAgIC8vIHRvIGBmYWxzZWAuXG4gICAgICAgICAgICBsYXJnZXN0OiBudWxsLFxuXG4gICAgICAgICAgICAvLyBtYXhWYWx1ZVxuICAgICAgICAgICAgLy8gVXNlIGBtYXhWYWx1ZWAgdG8gcmVuZGVyIGdlbmVyYWxpemVkIG91dHB1dCBmb3IgbGFyZ2UgZHVyYXRpb24gdmFsdWVzLFxuICAgICAgICAgICAgLy8gZS5nLiBgXCI+IDYwIGRheXNcImAuIGBtYXhWYWx1ZWAgbXVzdCBiZSBhIHBvc2l0aXZlIGludGVnZXIgYW5kIGlzXG4gICAgICAgICAgICAvLy8gYXBwbGllZCB0byB0aGUgZ3JlYXRlc3QtbWFnbml0dWRlIG1vbWVudCB0b2tlbiBpbiB0aGUgZm9ybWF0IHRlbXBsYXRlLlxuICAgICAgICAgICAgbWF4VmFsdWU6IG51bGwsXG5cbiAgICAgICAgICAgIC8vIG1pblZhbHVlXG4gICAgICAgICAgICAvLyBVc2UgYG1pblZhbHVlYCB0byByZW5kZXIgZ2VuZXJhbGl6ZWQgb3V0cHV0IGZvciBzbWFsbCBkdXJhdGlvbiB2YWx1ZXMsXG4gICAgICAgICAgICAvLyBlLmcuIGBcIjwgNSBtaW51dGVzXCJgLiBgbWluVmFsdWVgIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyIGFuZCBpc1xuICAgICAgICAgICAgLy8gYXBwbGllZCB0byB0aGUgbGVhc3QtbWFnbml0dWRlIG1vbWVudCB0b2tlbiBpbiB0aGUgZm9ybWF0IHRlbXBsYXRlLlxuICAgICAgICAgICAgbWluVmFsdWU6IG51bGwsXG5cbiAgICAgICAgICAgIC8vIHByZWNpc2lvblxuICAgICAgICAgICAgLy8gSWYgYSBwb3NpdGl2ZSBpbnRlZ2VyLCBudW1iZXIgb2YgZGVjaW1hbCBmcmFjdGlvbiBkaWdpdHMgdG8gcmVuZGVyLlxuICAgICAgICAgICAgLy8gSWYgYSBuZWdhdGl2ZSBpbnRlZ2VyLCBudW1iZXIgb2YgaW50ZWdlciBwbGFjZSBkaWdpdHMgdG8gdHJ1bmNhdGUgdG8gMC5cbiAgICAgICAgICAgIC8vIElmIGB1c2VTaWduaWZpY2FudERpZ2l0c2AgaXMgc2V0IHRvIGB0cnVlYCBhbmQgYHByZWNpc2lvbmAgaXMgYSBwb3NpdGl2ZVxuICAgICAgICAgICAgLy8gaW50ZWdlciwgc2V0cyB0aGUgbWF4aW11bSBudW1iZXIgb2Ygc2lnbmlmaWNhbnQgZGlnaXRzIHVzZWQgaW4gdGhlXG4gICAgICAgICAgICAvLyBmb3JtYXR0ZWQgb3V0cHV0LlxuICAgICAgICAgICAgcHJlY2lzaW9uOiAwLFxuXG4gICAgICAgICAgICAvLyB0cnVuY1xuICAgICAgICAgICAgLy8gRGVmYXVsdCBiZWhhdmlvciByb3VuZHMgZmluYWwgdG9rZW4gdmFsdWUuIFNldCB0byBgdHJ1ZWAgdG9cbiAgICAgICAgICAgIC8vIHRydW5jYXRlIGZpbmFsIHRva2VuIHZhbHVlLCB3aGljaCB3YXMgdGhlIGRlZmF1bHQgYmVoYXZpb3IgaW5cbiAgICAgICAgICAgIC8vIHZlcnNpb24gMSBvZiB0aGlzIHBsdWdpbi5cbiAgICAgICAgICAgIHRydW5jOiBmYWxzZSxcblxuICAgICAgICAgICAgLy8gZm9yY2VMZW5ndGhcbiAgICAgICAgICAgIC8vIEZvcmNlIGZpcnN0IG1vbWVudCB0b2tlbiB3aXRoIGEgdmFsdWUgdG8gcmVuZGVyIGF0IGZ1bGwgbGVuZ3RoXG4gICAgICAgICAgICAvLyBldmVuIHdoZW4gdGVtcGxhdGUgaXMgdHJpbW1lZCBhbmQgZmlyc3QgbW9tZW50IHRva2VuIGhhcyBsZW5ndGggb2YgMS5cbiAgICAgICAgICAgIGZvcmNlTGVuZ3RoOiBudWxsLFxuXG4gICAgICAgICAgICAvLyB1c2VyTG9jYWxlXG4gICAgICAgICAgICAvLyBGb3JtYXR0ZWQgbnVtZXJpY2FsIG91dHB1dCBpcyByZW5kZXJlZCB1c2luZyBgdG9Mb2NhbGVTdHJpbmdgXG4gICAgICAgICAgICAvLyBhbmQgdGhlIGxvY2FsZSBvZiB0aGUgdXNlcidzIGVudmlyb25tZW50LiBTZXQgdGhpcyBvcHRpb24gdG8gcmVuZGVyXG4gICAgICAgICAgICAvLyBudW1lcmljYWwgb3V0cHV0IHVzaW5nIGEgZGlmZmVyZW50IGxvY2FsZS4gVW5pdCBuYW1lcyBhcmUgcmVuZGVyZWRcbiAgICAgICAgICAgIC8vIGFuZCBkZXRlY3RlZCB1c2luZyB0aGUgbG9jYWxlIHNldCBpbiBtb21lbnQuanMsIHdoaWNoIGNhbiBiZSBkaWZmZXJlbnRcbiAgICAgICAgICAgIC8vIGZyb20gdGhlIGxvY2FsZSBvZiB1c2VyJ3MgZW52aXJvbm1lbnQuXG4gICAgICAgICAgICB1c2VyTG9jYWxlOiBudWxsLFxuXG4gICAgICAgICAgICAvLyB1c2VQbHVyYWxcbiAgICAgICAgICAgIC8vIFdpbGwgYXV0b21hdGljYWxseSBzaW5ndWxhcml6ZSBvciBwbHVyYWxpemUgdW5pdCBuYW1lcyB3aGVuIHRoZXlcbiAgICAgICAgICAgIC8vIGFwcGVhciBpbiB0aGUgdGV4dCBhc3NvY2lhdGVkIHdpdGggZWFjaCBtb21lbnQgdG9rZW4uIFN0YW5kYXJkIGFuZFxuICAgICAgICAgICAgLy8gc2hvcnQgdW5pdCBsYWJlbHMgYXJlIHNpbmd1bGFyaXplZCBhbmQgcGx1cmFsaXplZCwgYmFzZWQgb24gbG9jYWxlLlxuICAgICAgICAgICAgLy8gZS5nLiBpbiBlbmdsaXNoLCBcIjEgc2Vjb25kXCIgb3IgXCIxIHNlY1wiIHdvdWxkIGJlIHJlbmRlcmVkIGluc3RlYWRcbiAgICAgICAgICAgIC8vIG9mIFwiMSBzZWNvbmRzXCIgb3IgXCIxIHNlY3NcIi4gVGhlIGRlZmF1bHQgcGx1cmFsaXphdGlvbiBmdW5jdGlvblxuICAgICAgICAgICAgLy8gcmVuZGVycyBhIHBsdXJhbCBsYWJlbCBmb3IgYSB2YWx1ZSB3aXRoIGRlY2ltYWwgcHJlY2lzaW9uLlxuICAgICAgICAgICAgLy8gZS5nLiBcIjEuMCBzZWNvbmRzXCIgaXMgbmV2ZXIgcmVuZGVyZWQgYXMgXCIxLjAgc2Vjb25kXCIuXG4gICAgICAgICAgICAvLyBMYWJlbCB0eXBlcyBhbmQgcGx1cmFsaXphdGlvbiBmdW5jdGlvbiBhcmUgY29uZmlndXJhYmxlIGluIHRoZVxuICAgICAgICAgICAgLy8gbG9jYWxlRGF0YSBleHRlbnNpb25zLlxuICAgICAgICAgICAgdXNlUGx1cmFsOiB0cnVlLFxuXG4gICAgICAgICAgICAvLyB1c2VMZWZ0VW5pdHNcbiAgICAgICAgICAgIC8vIFRoZSB0ZXh0IHRvIHRoZSByaWdodCBvZiBlYWNoIG1vbWVudCB0b2tlbiBpbiBhIGZvcm1hdCBzdHJpbmdcbiAgICAgICAgICAgIC8vIGlzIHRyZWF0ZWQgYXMgdGhhdCB0b2tlbidzIHVuaXRzIGZvciB0aGUgcHVycG9zZXMgb2YgdHJpbW1pbmcsXG4gICAgICAgICAgICAvLyBzaW5ndWxhcml6aW5nLCBhbmQgYXV0by1sb2NhbGl6aW5nLlxuICAgICAgICAgICAgLy8gZS5nLiBcImggW2hvdXJzXSwgbSBbbWludXRlc10sIHMgW3NlY29uZHNdXCIuXG4gICAgICAgICAgICAvLyBUbyBwcm9wZXJseSBzaW5ndWxhcml6ZSBvciBsb2NhbGl6ZSBhIGZvcm1hdCBzdHJpbmcgc3VjaCBhc1xuICAgICAgICAgICAgLy8gXCJbaG91cnNdIGgsIFttaW51dGVzXSBtLCBbc2Vjb25kc10gc1wiLCB3aGVyZSB0aGUgdW5pdHMgYXBwZWFyXG4gICAgICAgICAgICAvLyB0byB0aGUgbGVmdCBvZiBlYWNoIG1vbWVudCB0b2tlbiwgc2V0IHVzZUxlZnRVbml0cyB0byBgdHJ1ZWAuXG4gICAgICAgICAgICAvLyBUaGlzIHBsdWdpbiBpcyBub3QgdGVzdGVkIGluIHRoZSBjb250ZXh0IG9mIHJ0bCB0ZXh0LlxuICAgICAgICAgICAgdXNlTGVmdFVuaXRzOiBmYWxzZSxcblxuICAgICAgICAgICAgLy8gdXNlR3JvdXBpbmdcbiAgICAgICAgICAgIC8vIEVuYWJsZXMgbG9jYWxlLWJhc2VkIGRpZ2l0IGdyb3VwaW5nIGluIHRoZSBmb3JtYXR0ZWQgb3V0cHV0LiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvTnVtYmVyL3RvTG9jYWxlU3RyaW5nXG4gICAgICAgICAgICB1c2VHcm91cGluZzogdHJ1ZSxcblxuICAgICAgICAgICAgLy8gdXNlU2lnbmlmaWNhbnREaWdpdHNcbiAgICAgICAgICAgIC8vIFRyZWF0IHRoZSBgcHJlY2lzaW9uYCBvcHRpb24gYXMgdGhlIG1heGltdW0gc2lnbmlmaWNhbnQgZGlnaXRzXG4gICAgICAgICAgICAvLyB0byBiZSByZW5kZXJlZC4gUHJlY2lzaW9uIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyLiBTaWduaWZpY2FudFxuICAgICAgICAgICAgLy8gZGlnaXRzIGV4dGVuZCBhY3Jvc3MgdW5pdCB0eXBlcyxcbiAgICAgICAgICAgIC8vIGUuZy4gXCI2IGhvdXJzIDM3LjUgbWludXRlc1wiIHJlcHJlc2VudHMgNCBzaWduaWZpY2FudCBkaWdpdHMuXG4gICAgICAgICAgICAvLyBFbmFibGluZyB0aGlzIG9wdGlvbiBjYXVzZXMgdG9rZW4gbGVuZ3RoIHRvIGJlIGlnbm9yZWQuIFNlZSAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvTnVtYmVyL3RvTG9jYWxlU3RyaW5nXG4gICAgICAgICAgICB1c2VTaWduaWZpY2FudERpZ2l0czogZmFsc2UsXG5cbiAgICAgICAgICAgIC8vIHRlbXBsYXRlXG4gICAgICAgICAgICAvLyBUaGUgdGVtcGxhdGUgc3RyaW5nIHVzZWQgdG8gZm9ybWF0IHRoZSBkdXJhdGlvbi4gTWF5IGJlIGEgZnVuY3Rpb25cbiAgICAgICAgICAgIC8vIG9yIGEgc3RyaW5nLiBUZW1wbGF0ZSBmdW5jdGlvbnMgYXJlIGV4ZWN1dGVkIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nXG4gICAgICAgICAgICAvLyBvZiB0aGUgc2V0dGluZ3Mgb2JqZWN0IHNvIHRoYXQgdGVtcGxhdGUgc3RyaW5ncyBtYXkgYmUgZHluYW1pY2FsbHlcbiAgICAgICAgICAgIC8vIGdlbmVyYXRlZCBiYXNlZCBvbiB0aGUgZHVyYXRpb24gb2JqZWN0IChhY2Nlc3NpYmxlIHZpYSBgdGhpcy5kdXJhdGlvbmApXG4gICAgICAgICAgICAvLyBvciBhbnkgb2YgdGhlIG90aGVyIHNldHRpbmdzLiBMZWFkaW5nIGFuZCB0cmFpbGluZyBzcGFjZSwgY29tbWEsXG4gICAgICAgICAgICAvLyBwZXJpb2QsIGFuZCBjb2xvbiBjaGFyYWN0ZXJzIGFyZSB0cmltbWVkIGZyb20gdGhlIHJlc3VsdGluZyBzdHJpbmcuXG4gICAgICAgICAgICB0ZW1wbGF0ZTogZGVmYXVsdEZvcm1hdFRlbXBsYXRlLFxuXG4gICAgICAgICAgICAvLyB1c2VUb0xvY2FsZVN0cmluZ1xuICAgICAgICAgICAgLy8gU2V0IHRoaXMgb3B0aW9uIHRvIGBmYWxzZWAgdG8gaWdub3JlIHRoZSBgdG9Mb2NhbGVTdHJpbmdgIGZlYXR1cmVcbiAgICAgICAgICAgIC8vIHRlc3QgYW5kIGZvcmNlIHRoZSB1c2Ugb2YgdGhlIGBmb3JtYXROdW1iZXJgIGZhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgICAgICAvLyBpbmNsdWRlZCBpbiB0aGlzIHBsdWdpbi5cbiAgICAgICAgICAgIHVzZVRvTG9jYWxlU3RyaW5nOiB0cnVlLFxuXG4gICAgICAgICAgICAvLyBmb3JtYXROdW1iZXIgZmFsbGJhY2sgb3B0aW9ucy5cbiAgICAgICAgICAgIC8vIFdoZW4gYHRvTG9jYWxlU3RyaW5nYCBpcyBkZXRlY3RlZCBhbmQgcGFzc2VzIHRoZSBmZWF0dXJlIHRlc3QsIHRoZVxuICAgICAgICAgICAgLy8gZm9sbG93aW5nIG9wdGlvbnMgd2lsbCBoYXZlIG5vIGVmZmVjdDogYHRvTG9jYWxlU3RyaW5nYCB3aWxsIGJlIHVzZWRcbiAgICAgICAgICAgIC8vIGZvciBmb3JtYXR0aW5nIGFuZCB0aGUgZ3JvdXBpbmcgc2VwYXJhdG9yLCBkZWNpbWFsIHNlcGFyYXRvciwgYW5kXG4gICAgICAgICAgICAvLyBpbnRlZ2VyIGRpZ2l0IGdyb3VwaW5nIHdpbGwgYmUgZGV0ZXJtaW5lZCBieSB0aGUgdXNlciBsb2NhbGUuXG5cbiAgICAgICAgICAgIC8vIGdyb3VwaW5nU2VwYXJhdG9yXG4gICAgICAgICAgICAvLyBUaGUgaW50ZWdlciBkaWdpdCBncm91cGluZyBzZXBhcmF0b3IgdXNlZCB3aGVuIHVzaW5nIHRoZSBmYWxsYmFja1xuICAgICAgICAgICAgLy8gZm9ybWF0TnVtYmVyIGZ1bmN0aW9uLlxuICAgICAgICAgICAgZ3JvdXBpbmdTZXBhcmF0b3I6IFwiLFwiLFxuXG4gICAgICAgICAgICAvLyBkZWNpbWFsU2VwYXJhdG9yXG4gICAgICAgICAgICAvLyBUaGUgZGVjaW1hbCBzZXBhcmF0b3IgdXNlZCB3aGVuIHVzaW5nIHRoZSBmYWxsYmFjayBmb3JtYXROdW1iZXJcbiAgICAgICAgICAgIC8vIGZ1bmN0aW9uLlxuICAgICAgICAgICAgZGVjaW1hbFNlcGFyYXRvcjogXCIuXCIsXG5cbiAgICAgICAgICAgIC8vIGdyb3VwaW5nXG4gICAgICAgICAgICAvLyBUaGUgaW50ZWdlciBkaWdpdCBncm91cGluZyB1c2VkIHdoZW4gdXNpbmcgdGhlIGZhbGxiYWNrIGZvcm1hdE51bWJlclxuICAgICAgICAgICAgLy8gZnVuY3Rpb24uIE11c3QgYmUgYW4gYXJyYXkuIFRoZSBkZWZhdWx0IHZhbHVlIG9mIGBbM11gIGdpdmVzIHRoZVxuICAgICAgICAgICAgLy8gc3RhbmRhcmQgMy1kaWdpdCB0aG91c2FuZC9taWxsaW9uL2JpbGxpb24gZGlnaXQgZ3JvdXBpbmdzIGZvciB0aGVcbiAgICAgICAgICAgIC8vIFwiZW5cIiBsb2NhbGUuIFNldHRpbmcgdGhpcyBvcHRpb24gdG8gYFszLCAyXWAgd291bGQgZ2VuZXJhdGUgdGhlXG4gICAgICAgICAgICAvLyB0aG91c2FuZC9sYWtoL2Nyb3JlIGRpZ2l0IGdyb3VwaW5ncyB1c2VkIGluIHRoZSBcImVuLUlOXCIgbG9jYWxlLlxuICAgICAgICAgICAgZ3JvdXBpbmc6IFszXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnRleHQudXBkYXRlTG9jYWxlKCdlbicsIGVuZ0xvY2FsZSk7XG4gICAgfVxuXG4gICAgLy8gUnVuIGZlYXR1cmUgdGVzdHMgZm9yIGBOdW1iZXIjdG9Mb2NhbGVTdHJpbmdgLlxuICAgIHRvTG9jYWxlU3RyaW5nV29ya3MgPSBmZWF0dXJlVGVzdFRvTG9jYWxlU3RyaW5nKCk7XG4gICAgdG9Mb2NhbGVTdHJpbmdSb3VuZGluZ1dvcmtzID0gdG9Mb2NhbGVTdHJpbmdXb3JrcyAmJiBmZWF0dXJlVGVzdFRvTG9jYWxlU3RyaW5nUm91bmRpbmcoKTtcblxuICAgIC8vIEluaXRpYWxpemUgZHVyYXRpb24gZm9ybWF0IG9uIHRoZSBnbG9iYWwgbW9tZW50IGluc3RhbmNlLlxuICAgIGluaXQobW9tZW50KTtcblxuICAgIC8vIFJldHVybiB0aGUgaW5pdCBmdW5jdGlvbiBzbyB0aGF0IGR1cmF0aW9uIGZvcm1hdCBjYW4gYmVcbiAgICAvLyBpbml0aWFsaXplZCBvbiBvdGhlciBtb21lbnQgaW5zdGFuY2VzLlxuICAgIHJldHVybiBpbml0O1xufSk7XG4iLCIvLyEgbW9tZW50LmpzXG5cbjsoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICAgIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcbiAgICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuICAgIGdsb2JhbC5tb21lbnQgPSBmYWN0b3J5KClcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG52YXIgaG9va0NhbGxiYWNrO1xuXG5mdW5jdGlvbiBob29rcyAoKSB7XG4gICAgcmV0dXJuIGhvb2tDYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufVxuXG4vLyBUaGlzIGlzIGRvbmUgdG8gcmVnaXN0ZXIgdGhlIG1ldGhvZCBjYWxsZWQgd2l0aCBtb21lbnQoKVxuLy8gd2l0aG91dCBjcmVhdGluZyBjaXJjdWxhciBkZXBlbmRlbmNpZXMuXG5mdW5jdGlvbiBzZXRIb29rQ2FsbGJhY2sgKGNhbGxiYWNrKSB7XG4gICAgaG9va0NhbGxiYWNrID0gY2FsbGJhY2s7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkoaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQgaW5zdGFuY2VvZiBBcnJheSB8fCBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaW5wdXQpID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChpbnB1dCkge1xuICAgIC8vIElFOCB3aWxsIHRyZWF0IHVuZGVmaW5lZCBhbmQgbnVsbCBhcyBvYmplY3QgaWYgaXQgd2Fzbid0IGZvclxuICAgIC8vIGlucHV0ICE9IG51bGxcbiAgICByZXR1cm4gaW5wdXQgIT0gbnVsbCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaW5wdXQpID09PSAnW29iamVjdCBPYmplY3RdJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3RFbXB0eShvYmopIHtcbiAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMpIHtcbiAgICAgICAgcmV0dXJuIChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopLmxlbmd0aCA9PT0gMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGs7XG4gICAgICAgIGZvciAoayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dCA9PT0gdm9pZCAwO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihpbnB1dCkge1xuICAgIHJldHVybiB0eXBlb2YgaW5wdXQgPT09ICdudW1iZXInIHx8IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IE51bWJlcl0nO1xufVxuXG5mdW5jdGlvbiBpc0RhdGUoaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQgaW5zdGFuY2VvZiBEYXRlIHx8IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuZnVuY3Rpb24gbWFwKGFyciwgZm4pIHtcbiAgICB2YXIgcmVzID0gW10sIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgICAgICByZXMucHVzaChmbihhcnJbaV0sIGkpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuZnVuY3Rpb24gaGFzT3duUHJvcChhLCBiKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhLCBiKTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKGEsIGIpIHtcbiAgICBmb3IgKHZhciBpIGluIGIpIHtcbiAgICAgICAgaWYgKGhhc093blByb3AoYiwgaSkpIHtcbiAgICAgICAgICAgIGFbaV0gPSBiW2ldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhc093blByb3AoYiwgJ3RvU3RyaW5nJykpIHtcbiAgICAgICAgYS50b1N0cmluZyA9IGIudG9TdHJpbmc7XG4gICAgfVxuXG4gICAgaWYgKGhhc093blByb3AoYiwgJ3ZhbHVlT2YnKSkge1xuICAgICAgICBhLnZhbHVlT2YgPSBiLnZhbHVlT2Y7XG4gICAgfVxuXG4gICAgcmV0dXJuIGE7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVVUQyAoaW5wdXQsIGZvcm1hdCwgbG9jYWxlLCBzdHJpY3QpIHtcbiAgICByZXR1cm4gY3JlYXRlTG9jYWxPclVUQyhpbnB1dCwgZm9ybWF0LCBsb2NhbGUsIHN0cmljdCwgdHJ1ZSkudXRjKCk7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRQYXJzaW5nRmxhZ3MoKSB7XG4gICAgLy8gV2UgbmVlZCB0byBkZWVwIGNsb25lIHRoaXMgb2JqZWN0LlxuICAgIHJldHVybiB7XG4gICAgICAgIGVtcHR5ICAgICAgICAgICA6IGZhbHNlLFxuICAgICAgICB1bnVzZWRUb2tlbnMgICAgOiBbXSxcbiAgICAgICAgdW51c2VkSW5wdXQgICAgIDogW10sXG4gICAgICAgIG92ZXJmbG93ICAgICAgICA6IC0yLFxuICAgICAgICBjaGFyc0xlZnRPdmVyICAgOiAwLFxuICAgICAgICBudWxsSW5wdXQgICAgICAgOiBmYWxzZSxcbiAgICAgICAgaW52YWxpZE1vbnRoICAgIDogbnVsbCxcbiAgICAgICAgaW52YWxpZEZvcm1hdCAgIDogZmFsc2UsXG4gICAgICAgIHVzZXJJbnZhbGlkYXRlZCA6IGZhbHNlLFxuICAgICAgICBpc28gICAgICAgICAgICAgOiBmYWxzZSxcbiAgICAgICAgcGFyc2VkRGF0ZVBhcnRzIDogW10sXG4gICAgICAgIG1lcmlkaWVtICAgICAgICA6IG51bGwsXG4gICAgICAgIHJmYzI4MjIgICAgICAgICA6IGZhbHNlLFxuICAgICAgICB3ZWVrZGF5TWlzbWF0Y2ggOiBmYWxzZVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGdldFBhcnNpbmdGbGFncyhtKSB7XG4gICAgaWYgKG0uX3BmID09IG51bGwpIHtcbiAgICAgICAgbS5fcGYgPSBkZWZhdWx0UGFyc2luZ0ZsYWdzKCk7XG4gICAgfVxuICAgIHJldHVybiBtLl9wZjtcbn1cblxudmFyIHNvbWU7XG5pZiAoQXJyYXkucHJvdG90eXBlLnNvbWUpIHtcbiAgICBzb21lID0gQXJyYXkucHJvdG90eXBlLnNvbWU7XG59IGVsc2Uge1xuICAgIHNvbWUgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgICAgIHZhciB0ID0gT2JqZWN0KHRoaXMpO1xuICAgICAgICB2YXIgbGVuID0gdC5sZW5ndGggPj4+IDA7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKGkgaW4gdCAmJiBmdW4uY2FsbCh0aGlzLCB0W2ldLCBpLCB0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWQobSkge1xuICAgIGlmIChtLl9pc1ZhbGlkID09IG51bGwpIHtcbiAgICAgICAgdmFyIGZsYWdzID0gZ2V0UGFyc2luZ0ZsYWdzKG0pO1xuICAgICAgICB2YXIgcGFyc2VkUGFydHMgPSBzb21lLmNhbGwoZmxhZ3MucGFyc2VkRGF0ZVBhcnRzLCBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgcmV0dXJuIGkgIT0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBpc05vd1ZhbGlkID0gIWlzTmFOKG0uX2QuZ2V0VGltZSgpKSAmJlxuICAgICAgICAgICAgZmxhZ3Mub3ZlcmZsb3cgPCAwICYmXG4gICAgICAgICAgICAhZmxhZ3MuZW1wdHkgJiZcbiAgICAgICAgICAgICFmbGFncy5pbnZhbGlkTW9udGggJiZcbiAgICAgICAgICAgICFmbGFncy5pbnZhbGlkV2Vla2RheSAmJlxuICAgICAgICAgICAgIWZsYWdzLndlZWtkYXlNaXNtYXRjaCAmJlxuICAgICAgICAgICAgIWZsYWdzLm51bGxJbnB1dCAmJlxuICAgICAgICAgICAgIWZsYWdzLmludmFsaWRGb3JtYXQgJiZcbiAgICAgICAgICAgICFmbGFncy51c2VySW52YWxpZGF0ZWQgJiZcbiAgICAgICAgICAgICghZmxhZ3MubWVyaWRpZW0gfHwgKGZsYWdzLm1lcmlkaWVtICYmIHBhcnNlZFBhcnRzKSk7XG5cbiAgICAgICAgaWYgKG0uX3N0cmljdCkge1xuICAgICAgICAgICAgaXNOb3dWYWxpZCA9IGlzTm93VmFsaWQgJiZcbiAgICAgICAgICAgICAgICBmbGFncy5jaGFyc0xlZnRPdmVyID09PSAwICYmXG4gICAgICAgICAgICAgICAgZmxhZ3MudW51c2VkVG9rZW5zLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICAgICAgIGZsYWdzLmJpZ0hvdXIgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChPYmplY3QuaXNGcm96ZW4gPT0gbnVsbCB8fCAhT2JqZWN0LmlzRnJvemVuKG0pKSB7XG4gICAgICAgICAgICBtLl9pc1ZhbGlkID0gaXNOb3dWYWxpZDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBpc05vd1ZhbGlkO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtLl9pc1ZhbGlkO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJbnZhbGlkIChmbGFncykge1xuICAgIHZhciBtID0gY3JlYXRlVVRDKE5hTik7XG4gICAgaWYgKGZsYWdzICE9IG51bGwpIHtcbiAgICAgICAgZXh0ZW5kKGdldFBhcnNpbmdGbGFncyhtKSwgZmxhZ3MpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKG0pLnVzZXJJbnZhbGlkYXRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG07XG59XG5cbi8vIFBsdWdpbnMgdGhhdCBhZGQgcHJvcGVydGllcyBzaG91bGQgYWxzbyBhZGQgdGhlIGtleSBoZXJlIChudWxsIHZhbHVlKSxcbi8vIHNvIHdlIGNhbiBwcm9wZXJseSBjbG9uZSBvdXJzZWx2ZXMuXG52YXIgbW9tZW50UHJvcGVydGllcyA9IGhvb2tzLm1vbWVudFByb3BlcnRpZXMgPSBbXTtcblxuZnVuY3Rpb24gY29weUNvbmZpZyh0bywgZnJvbSkge1xuICAgIHZhciBpLCBwcm9wLCB2YWw7XG5cbiAgICBpZiAoIWlzVW5kZWZpbmVkKGZyb20uX2lzQU1vbWVudE9iamVjdCkpIHtcbiAgICAgICAgdG8uX2lzQU1vbWVudE9iamVjdCA9IGZyb20uX2lzQU1vbWVudE9iamVjdDtcbiAgICB9XG4gICAgaWYgKCFpc1VuZGVmaW5lZChmcm9tLl9pKSkge1xuICAgICAgICB0by5faSA9IGZyb20uX2k7XG4gICAgfVxuICAgIGlmICghaXNVbmRlZmluZWQoZnJvbS5fZikpIHtcbiAgICAgICAgdG8uX2YgPSBmcm9tLl9mO1xuICAgIH1cbiAgICBpZiAoIWlzVW5kZWZpbmVkKGZyb20uX2wpKSB7XG4gICAgICAgIHRvLl9sID0gZnJvbS5fbDtcbiAgICB9XG4gICAgaWYgKCFpc1VuZGVmaW5lZChmcm9tLl9zdHJpY3QpKSB7XG4gICAgICAgIHRvLl9zdHJpY3QgPSBmcm9tLl9zdHJpY3Q7XG4gICAgfVxuICAgIGlmICghaXNVbmRlZmluZWQoZnJvbS5fdHptKSkge1xuICAgICAgICB0by5fdHptID0gZnJvbS5fdHptO1xuICAgIH1cbiAgICBpZiAoIWlzVW5kZWZpbmVkKGZyb20uX2lzVVRDKSkge1xuICAgICAgICB0by5faXNVVEMgPSBmcm9tLl9pc1VUQztcbiAgICB9XG4gICAgaWYgKCFpc1VuZGVmaW5lZChmcm9tLl9vZmZzZXQpKSB7XG4gICAgICAgIHRvLl9vZmZzZXQgPSBmcm9tLl9vZmZzZXQ7XG4gICAgfVxuICAgIGlmICghaXNVbmRlZmluZWQoZnJvbS5fcGYpKSB7XG4gICAgICAgIHRvLl9wZiA9IGdldFBhcnNpbmdGbGFncyhmcm9tKTtcbiAgICB9XG4gICAgaWYgKCFpc1VuZGVmaW5lZChmcm9tLl9sb2NhbGUpKSB7XG4gICAgICAgIHRvLl9sb2NhbGUgPSBmcm9tLl9sb2NhbGU7XG4gICAgfVxuXG4gICAgaWYgKG1vbWVudFByb3BlcnRpZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbW9tZW50UHJvcGVydGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcHJvcCA9IG1vbWVudFByb3BlcnRpZXNbaV07XG4gICAgICAgICAgICB2YWwgPSBmcm9tW3Byb3BdO1xuICAgICAgICAgICAgaWYgKCFpc1VuZGVmaW5lZCh2YWwpKSB7XG4gICAgICAgICAgICAgICAgdG9bcHJvcF0gPSB2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdG87XG59XG5cbnZhciB1cGRhdGVJblByb2dyZXNzID0gZmFsc2U7XG5cbi8vIE1vbWVudCBwcm90b3R5cGUgb2JqZWN0XG5mdW5jdGlvbiBNb21lbnQoY29uZmlnKSB7XG4gICAgY29weUNvbmZpZyh0aGlzLCBjb25maWcpO1xuICAgIHRoaXMuX2QgPSBuZXcgRGF0ZShjb25maWcuX2QgIT0gbnVsbCA/IGNvbmZpZy5fZC5nZXRUaW1lKCkgOiBOYU4pO1xuICAgIGlmICghdGhpcy5pc1ZhbGlkKCkpIHtcbiAgICAgICAgdGhpcy5fZCA9IG5ldyBEYXRlKE5hTik7XG4gICAgfVxuICAgIC8vIFByZXZlbnQgaW5maW5pdGUgbG9vcCBpbiBjYXNlIHVwZGF0ZU9mZnNldCBjcmVhdGVzIG5ldyBtb21lbnRcbiAgICAvLyBvYmplY3RzLlxuICAgIGlmICh1cGRhdGVJblByb2dyZXNzID09PSBmYWxzZSkge1xuICAgICAgICB1cGRhdGVJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgaG9va3MudXBkYXRlT2Zmc2V0KHRoaXMpO1xuICAgICAgICB1cGRhdGVJblByb2dyZXNzID0gZmFsc2U7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc01vbWVudCAob2JqKSB7XG4gICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIE1vbWVudCB8fCAob2JqICE9IG51bGwgJiYgb2JqLl9pc0FNb21lbnRPYmplY3QgIT0gbnVsbCk7XG59XG5cbmZ1bmN0aW9uIGFic0Zsb29yIChudW1iZXIpIHtcbiAgICBpZiAobnVtYmVyIDwgMCkge1xuICAgICAgICAvLyAtMCAtPiAwXG4gICAgICAgIHJldHVybiBNYXRoLmNlaWwobnVtYmVyKSB8fCAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKG51bWJlcik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b0ludChhcmd1bWVudEZvckNvZXJjaW9uKSB7XG4gICAgdmFyIGNvZXJjZWROdW1iZXIgPSArYXJndW1lbnRGb3JDb2VyY2lvbixcbiAgICAgICAgdmFsdWUgPSAwO1xuXG4gICAgaWYgKGNvZXJjZWROdW1iZXIgIT09IDAgJiYgaXNGaW5pdGUoY29lcmNlZE51bWJlcikpIHtcbiAgICAgICAgdmFsdWUgPSBhYnNGbG9vcihjb2VyY2VkTnVtYmVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG59XG5cbi8vIGNvbXBhcmUgdHdvIGFycmF5cywgcmV0dXJuIHRoZSBudW1iZXIgb2YgZGlmZmVyZW5jZXNcbmZ1bmN0aW9uIGNvbXBhcmVBcnJheXMoYXJyYXkxLCBhcnJheTIsIGRvbnRDb252ZXJ0KSB7XG4gICAgdmFyIGxlbiA9IE1hdGgubWluKGFycmF5MS5sZW5ndGgsIGFycmF5Mi5sZW5ndGgpLFxuICAgICAgICBsZW5ndGhEaWZmID0gTWF0aC5hYnMoYXJyYXkxLmxlbmd0aCAtIGFycmF5Mi5sZW5ndGgpLFxuICAgICAgICBkaWZmcyA9IDAsXG4gICAgICAgIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgoZG9udENvbnZlcnQgJiYgYXJyYXkxW2ldICE9PSBhcnJheTJbaV0pIHx8XG4gICAgICAgICAgICAoIWRvbnRDb252ZXJ0ICYmIHRvSW50KGFycmF5MVtpXSkgIT09IHRvSW50KGFycmF5MltpXSkpKSB7XG4gICAgICAgICAgICBkaWZmcysrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkaWZmcyArIGxlbmd0aERpZmY7XG59XG5cbmZ1bmN0aW9uIHdhcm4obXNnKSB7XG4gICAgaWYgKGhvb2tzLnN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncyA9PT0gZmFsc2UgJiZcbiAgICAgICAgICAgICh0eXBlb2YgY29uc29sZSAhPT0gICd1bmRlZmluZWQnKSAmJiBjb25zb2xlLndhcm4pIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdEZXByZWNhdGlvbiB3YXJuaW5nOiAnICsgbXNnKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRlcHJlY2F0ZShtc2csIGZuKSB7XG4gICAgdmFyIGZpcnN0VGltZSA9IHRydWU7XG5cbiAgICByZXR1cm4gZXh0ZW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGhvb2tzLmRlcHJlY2F0aW9uSGFuZGxlciAhPSBudWxsKSB7XG4gICAgICAgICAgICBob29rcy5kZXByZWNhdGlvbkhhbmRsZXIobnVsbCwgbXNnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmlyc3RUaW1lKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICAgICAgdmFyIGFyZztcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYXJnID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGFyZyArPSAnXFxuWycgKyBpICsgJ10gJztcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1swXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJnICs9IGtleSArICc6ICcgKyBhcmd1bWVudHNbMF1ba2V5XSArICcsICc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXJnID0gYXJnLnNsaWNlKDAsIC0yKTsgLy8gUmVtb3ZlIHRyYWlsaW5nIGNvbW1hIGFuZCBzcGFjZVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFyZyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKGFyZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3YXJuKG1zZyArICdcXG5Bcmd1bWVudHM6ICcgKyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzKS5qb2luKCcnKSArICdcXG4nICsgKG5ldyBFcnJvcigpKS5zdGFjayk7XG4gICAgICAgICAgICBmaXJzdFRpbWUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9LCBmbik7XG59XG5cbnZhciBkZXByZWNhdGlvbnMgPSB7fTtcblxuZnVuY3Rpb24gZGVwcmVjYXRlU2ltcGxlKG5hbWUsIG1zZykge1xuICAgIGlmIChob29rcy5kZXByZWNhdGlvbkhhbmRsZXIgIT0gbnVsbCkge1xuICAgICAgICBob29rcy5kZXByZWNhdGlvbkhhbmRsZXIobmFtZSwgbXNnKTtcbiAgICB9XG4gICAgaWYgKCFkZXByZWNhdGlvbnNbbmFtZV0pIHtcbiAgICAgICAgd2Fybihtc2cpO1xuICAgICAgICBkZXByZWNhdGlvbnNbbmFtZV0gPSB0cnVlO1xuICAgIH1cbn1cblxuaG9va3Muc3VwcHJlc3NEZXByZWNhdGlvbldhcm5pbmdzID0gZmFsc2U7XG5ob29rcy5kZXByZWNhdGlvbkhhbmRsZXIgPSBudWxsO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0IGluc3RhbmNlb2YgRnVuY3Rpb24gfHwgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGlucHV0KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn1cblxuZnVuY3Rpb24gc2V0IChjb25maWcpIHtcbiAgICB2YXIgcHJvcCwgaTtcbiAgICBmb3IgKGkgaW4gY29uZmlnKSB7XG4gICAgICAgIHByb3AgPSBjb25maWdbaV07XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHByb3ApKSB7XG4gICAgICAgICAgICB0aGlzW2ldID0gcHJvcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXNbJ18nICsgaV0gPSBwcm9wO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcbiAgICAvLyBMZW5pZW50IG9yZGluYWwgcGFyc2luZyBhY2NlcHRzIGp1c3QgYSBudW1iZXIgaW4gYWRkaXRpb24gdG9cbiAgICAvLyBudW1iZXIgKyAocG9zc2libHkpIHN0dWZmIGNvbWluZyBmcm9tIF9kYXlPZk1vbnRoT3JkaW5hbFBhcnNlLlxuICAgIC8vIFRPRE86IFJlbW92ZSBcIm9yZGluYWxQYXJzZVwiIGZhbGxiYWNrIGluIG5leHQgbWFqb3IgcmVsZWFzZS5cbiAgICB0aGlzLl9kYXlPZk1vbnRoT3JkaW5hbFBhcnNlTGVuaWVudCA9IG5ldyBSZWdFeHAoXG4gICAgICAgICh0aGlzLl9kYXlPZk1vbnRoT3JkaW5hbFBhcnNlLnNvdXJjZSB8fCB0aGlzLl9vcmRpbmFsUGFyc2Uuc291cmNlKSArXG4gICAgICAgICAgICAnfCcgKyAoL1xcZHsxLDJ9Lykuc291cmNlKTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VDb25maWdzKHBhcmVudENvbmZpZywgY2hpbGRDb25maWcpIHtcbiAgICB2YXIgcmVzID0gZXh0ZW5kKHt9LCBwYXJlbnRDb25maWcpLCBwcm9wO1xuICAgIGZvciAocHJvcCBpbiBjaGlsZENvbmZpZykge1xuICAgICAgICBpZiAoaGFzT3duUHJvcChjaGlsZENvbmZpZywgcHJvcCkpIHtcbiAgICAgICAgICAgIGlmIChpc09iamVjdChwYXJlbnRDb25maWdbcHJvcF0pICYmIGlzT2JqZWN0KGNoaWxkQ29uZmlnW3Byb3BdKSkge1xuICAgICAgICAgICAgICAgIHJlc1twcm9wXSA9IHt9O1xuICAgICAgICAgICAgICAgIGV4dGVuZChyZXNbcHJvcF0sIHBhcmVudENvbmZpZ1twcm9wXSk7XG4gICAgICAgICAgICAgICAgZXh0ZW5kKHJlc1twcm9wXSwgY2hpbGRDb25maWdbcHJvcF0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaGlsZENvbmZpZ1twcm9wXSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzW3Byb3BdID0gY2hpbGRDb25maWdbcHJvcF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXNbcHJvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChwcm9wIGluIHBhcmVudENvbmZpZykge1xuICAgICAgICBpZiAoaGFzT3duUHJvcChwYXJlbnRDb25maWcsIHByb3ApICYmXG4gICAgICAgICAgICAgICAgIWhhc093blByb3AoY2hpbGRDb25maWcsIHByb3ApICYmXG4gICAgICAgICAgICAgICAgaXNPYmplY3QocGFyZW50Q29uZmlnW3Byb3BdKSkge1xuICAgICAgICAgICAgLy8gbWFrZSBzdXJlIGNoYW5nZXMgdG8gcHJvcGVydGllcyBkb24ndCBtb2RpZnkgcGFyZW50IGNvbmZpZ1xuICAgICAgICAgICAgcmVzW3Byb3BdID0gZXh0ZW5kKHt9LCByZXNbcHJvcF0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIExvY2FsZShjb25maWcpIHtcbiAgICBpZiAoY29uZmlnICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5zZXQoY29uZmlnKTtcbiAgICB9XG59XG5cbnZhciBrZXlzO1xuXG5pZiAoT2JqZWN0LmtleXMpIHtcbiAgICBrZXlzID0gT2JqZWN0LmtleXM7XG59IGVsc2Uge1xuICAgIGtleXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciBpLCByZXMgPSBbXTtcbiAgICAgICAgZm9yIChpIGluIG9iaikge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3Aob2JqLCBpKSkge1xuICAgICAgICAgICAgICAgIHJlcy5wdXNoKGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbn1cblxudmFyIGRlZmF1bHRDYWxlbmRhciA9IHtcbiAgICBzYW1lRGF5IDogJ1tUb2RheSBhdF0gTFQnLFxuICAgIG5leHREYXkgOiAnW1RvbW9ycm93IGF0XSBMVCcsXG4gICAgbmV4dFdlZWsgOiAnZGRkZCBbYXRdIExUJyxcbiAgICBsYXN0RGF5IDogJ1tZZXN0ZXJkYXkgYXRdIExUJyxcbiAgICBsYXN0V2VlayA6ICdbTGFzdF0gZGRkZCBbYXRdIExUJyxcbiAgICBzYW1lRWxzZSA6ICdMJ1xufTtcblxuZnVuY3Rpb24gY2FsZW5kYXIgKGtleSwgbW9tLCBub3cpIHtcbiAgICB2YXIgb3V0cHV0ID0gdGhpcy5fY2FsZW5kYXJba2V5XSB8fCB0aGlzLl9jYWxlbmRhclsnc2FtZUVsc2UnXTtcbiAgICByZXR1cm4gaXNGdW5jdGlvbihvdXRwdXQpID8gb3V0cHV0LmNhbGwobW9tLCBub3cpIDogb3V0cHV0O1xufVxuXG52YXIgZGVmYXVsdExvbmdEYXRlRm9ybWF0ID0ge1xuICAgIExUUyAgOiAnaDptbTpzcyBBJyxcbiAgICBMVCAgIDogJ2g6bW0gQScsXG4gICAgTCAgICA6ICdNTS9ERC9ZWVlZJyxcbiAgICBMTCAgIDogJ01NTU0gRCwgWVlZWScsXG4gICAgTExMICA6ICdNTU1NIEQsIFlZWVkgaDptbSBBJyxcbiAgICBMTExMIDogJ2RkZGQsIE1NTU0gRCwgWVlZWSBoOm1tIEEnXG59O1xuXG5mdW5jdGlvbiBsb25nRGF0ZUZvcm1hdCAoa2V5KSB7XG4gICAgdmFyIGZvcm1hdCA9IHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleV0sXG4gICAgICAgIGZvcm1hdFVwcGVyID0gdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5LnRvVXBwZXJDYXNlKCldO1xuXG4gICAgaWYgKGZvcm1hdCB8fCAhZm9ybWF0VXBwZXIpIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9XG5cbiAgICB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXldID0gZm9ybWF0VXBwZXIucmVwbGFjZSgvTU1NTXxNTXxERHxkZGRkL2csIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuIHZhbC5zbGljZSgxKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXldO1xufVxuXG52YXIgZGVmYXVsdEludmFsaWREYXRlID0gJ0ludmFsaWQgZGF0ZSc7XG5cbmZ1bmN0aW9uIGludmFsaWREYXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy5faW52YWxpZERhdGU7XG59XG5cbnZhciBkZWZhdWx0T3JkaW5hbCA9ICclZCc7XG52YXIgZGVmYXVsdERheU9mTW9udGhPcmRpbmFsUGFyc2UgPSAvXFxkezEsMn0vO1xuXG5mdW5jdGlvbiBvcmRpbmFsIChudW1iZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb3JkaW5hbC5yZXBsYWNlKCclZCcsIG51bWJlcik7XG59XG5cbnZhciBkZWZhdWx0UmVsYXRpdmVUaW1lID0ge1xuICAgIGZ1dHVyZSA6ICdpbiAlcycsXG4gICAgcGFzdCAgIDogJyVzIGFnbycsXG4gICAgcyAgOiAnYSBmZXcgc2Vjb25kcycsXG4gICAgc3MgOiAnJWQgc2Vjb25kcycsXG4gICAgbSAgOiAnYSBtaW51dGUnLFxuICAgIG1tIDogJyVkIG1pbnV0ZXMnLFxuICAgIGggIDogJ2FuIGhvdXInLFxuICAgIGhoIDogJyVkIGhvdXJzJyxcbiAgICBkICA6ICdhIGRheScsXG4gICAgZGQgOiAnJWQgZGF5cycsXG4gICAgTSAgOiAnYSBtb250aCcsXG4gICAgTU0gOiAnJWQgbW9udGhzJyxcbiAgICB5ICA6ICdhIHllYXInLFxuICAgIHl5IDogJyVkIHllYXJzJ1xufTtcblxuZnVuY3Rpb24gcmVsYXRpdmVUaW1lIChudW1iZXIsIHdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpIHtcbiAgICB2YXIgb3V0cHV0ID0gdGhpcy5fcmVsYXRpdmVUaW1lW3N0cmluZ107XG4gICAgcmV0dXJuIChpc0Z1bmN0aW9uKG91dHB1dCkpID9cbiAgICAgICAgb3V0cHV0KG51bWJlciwgd2l0aG91dFN1ZmZpeCwgc3RyaW5nLCBpc0Z1dHVyZSkgOlxuICAgICAgICBvdXRwdXQucmVwbGFjZSgvJWQvaSwgbnVtYmVyKTtcbn1cblxuZnVuY3Rpb24gcGFzdEZ1dHVyZSAoZGlmZiwgb3V0cHV0KSB7XG4gICAgdmFyIGZvcm1hdCA9IHRoaXMuX3JlbGF0aXZlVGltZVtkaWZmID4gMCA/ICdmdXR1cmUnIDogJ3Bhc3QnXTtcbiAgICByZXR1cm4gaXNGdW5jdGlvbihmb3JtYXQpID8gZm9ybWF0KG91dHB1dCkgOiBmb3JtYXQucmVwbGFjZSgvJXMvaSwgb3V0cHV0KTtcbn1cblxudmFyIGFsaWFzZXMgPSB7fTtcblxuZnVuY3Rpb24gYWRkVW5pdEFsaWFzICh1bml0LCBzaG9ydGhhbmQpIHtcbiAgICB2YXIgbG93ZXJDYXNlID0gdW5pdC50b0xvd2VyQ2FzZSgpO1xuICAgIGFsaWFzZXNbbG93ZXJDYXNlXSA9IGFsaWFzZXNbbG93ZXJDYXNlICsgJ3MnXSA9IGFsaWFzZXNbc2hvcnRoYW5kXSA9IHVuaXQ7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVVuaXRzKHVuaXRzKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB1bml0cyA9PT0gJ3N0cmluZycgPyBhbGlhc2VzW3VuaXRzXSB8fCBhbGlhc2VzW3VuaXRzLnRvTG93ZXJDYXNlKCldIDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVPYmplY3RVbml0cyhpbnB1dE9iamVjdCkge1xuICAgIHZhciBub3JtYWxpemVkSW5wdXQgPSB7fSxcbiAgICAgICAgbm9ybWFsaXplZFByb3AsXG4gICAgICAgIHByb3A7XG5cbiAgICBmb3IgKHByb3AgaW4gaW5wdXRPYmplY3QpIHtcbiAgICAgICAgaWYgKGhhc093blByb3AoaW5wdXRPYmplY3QsIHByb3ApKSB7XG4gICAgICAgICAgICBub3JtYWxpemVkUHJvcCA9IG5vcm1hbGl6ZVVuaXRzKHByb3ApO1xuICAgICAgICAgICAgaWYgKG5vcm1hbGl6ZWRQcm9wKSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsaXplZElucHV0W25vcm1hbGl6ZWRQcm9wXSA9IGlucHV0T2JqZWN0W3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vcm1hbGl6ZWRJbnB1dDtcbn1cblxudmFyIHByaW9yaXRpZXMgPSB7fTtcblxuZnVuY3Rpb24gYWRkVW5pdFByaW9yaXR5KHVuaXQsIHByaW9yaXR5KSB7XG4gICAgcHJpb3JpdGllc1t1bml0XSA9IHByaW9yaXR5O1xufVxuXG5mdW5jdGlvbiBnZXRQcmlvcml0aXplZFVuaXRzKHVuaXRzT2JqKSB7XG4gICAgdmFyIHVuaXRzID0gW107XG4gICAgZm9yICh2YXIgdSBpbiB1bml0c09iaikge1xuICAgICAgICB1bml0cy5wdXNoKHt1bml0OiB1LCBwcmlvcml0eTogcHJpb3JpdGllc1t1XX0pO1xuICAgIH1cbiAgICB1bml0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eTtcbiAgICB9KTtcbiAgICByZXR1cm4gdW5pdHM7XG59XG5cbmZ1bmN0aW9uIHplcm9GaWxsKG51bWJlciwgdGFyZ2V0TGVuZ3RoLCBmb3JjZVNpZ24pIHtcbiAgICB2YXIgYWJzTnVtYmVyID0gJycgKyBNYXRoLmFicyhudW1iZXIpLFxuICAgICAgICB6ZXJvc1RvRmlsbCA9IHRhcmdldExlbmd0aCAtIGFic051bWJlci5sZW5ndGgsXG4gICAgICAgIHNpZ24gPSBudW1iZXIgPj0gMDtcbiAgICByZXR1cm4gKHNpZ24gPyAoZm9yY2VTaWduID8gJysnIDogJycpIDogJy0nKSArXG4gICAgICAgIE1hdGgucG93KDEwLCBNYXRoLm1heCgwLCB6ZXJvc1RvRmlsbCkpLnRvU3RyaW5nKCkuc3Vic3RyKDEpICsgYWJzTnVtYmVyO1xufVxuXG52YXIgZm9ybWF0dGluZ1Rva2VucyA9IC8oXFxbW15cXFtdKlxcXSl8KFxcXFwpPyhbSGhdbW0oc3MpP3xNb3xNTT9NP00/fERvfERERG98REQ/RD9EP3xkZGQ/ZD98ZG8/fHdbb3x3XT98V1tvfFddP3xRbz98WVlZWVlZfFlZWVlZfFlZWVl8WVl8Z2coZ2dnPyk/fEdHKEdHRz8pP3xlfEV8YXxBfGhoP3xISD98a2s/fG1tP3xzcz98U3sxLDl9fHh8WHx6ej98Wlo/fC4pL2c7XG5cbnZhciBsb2NhbEZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTFRTfExUfExMP0w/TD98bHsxLDR9KS9nO1xuXG52YXIgZm9ybWF0RnVuY3Rpb25zID0ge307XG5cbnZhciBmb3JtYXRUb2tlbkZ1bmN0aW9ucyA9IHt9O1xuXG4vLyB0b2tlbjogICAgJ00nXG4vLyBwYWRkZWQ6ICAgWydNTScsIDJdXG4vLyBvcmRpbmFsOiAgJ01vJ1xuLy8gY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHsgdGhpcy5tb250aCgpICsgMSB9XG5mdW5jdGlvbiBhZGRGb3JtYXRUb2tlbiAodG9rZW4sIHBhZGRlZCwgb3JkaW5hbCwgY2FsbGJhY2spIHtcbiAgICB2YXIgZnVuYyA9IGNhbGxiYWNrO1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZ1bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1tjYWxsYmFja10oKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKHRva2VuKSB7XG4gICAgICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zW3Rva2VuXSA9IGZ1bmM7XG4gICAgfVxuICAgIGlmIChwYWRkZWQpIHtcbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnNbcGFkZGVkWzBdXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB6ZXJvRmlsbChmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksIHBhZGRlZFsxXSwgcGFkZGVkWzJdKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKG9yZGluYWwpIHtcbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnNbb3JkaW5hbF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkub3JkaW5hbChmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksIHRva2VuKTtcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUZvcm1hdHRpbmdUb2tlbnMoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQubWF0Y2goL1xcW1tcXHNcXFNdLykpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJyk7XG4gICAgfVxuICAgIHJldHVybiBpbnB1dC5yZXBsYWNlKC9cXFxcL2csICcnKTtcbn1cblxuZnVuY3Rpb24gbWFrZUZvcm1hdEZ1bmN0aW9uKGZvcm1hdCkge1xuICAgIHZhciBhcnJheSA9IGZvcm1hdC5tYXRjaChmb3JtYXR0aW5nVG9rZW5zKSwgaSwgbGVuZ3RoO1xuXG4gICAgZm9yIChpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGZvcm1hdFRva2VuRnVuY3Rpb25zW2FycmF5W2ldXSkge1xuICAgICAgICAgICAgYXJyYXlbaV0gPSBmb3JtYXRUb2tlbkZ1bmN0aW9uc1thcnJheVtpXV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcnJheVtpXSA9IHJlbW92ZUZvcm1hdHRpbmdUb2tlbnMoYXJyYXlbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChtb20pIHtcbiAgICAgICAgdmFyIG91dHB1dCA9ICcnLCBpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG91dHB1dCArPSBpc0Z1bmN0aW9uKGFycmF5W2ldKSA/IGFycmF5W2ldLmNhbGwobW9tLCBmb3JtYXQpIDogYXJyYXlbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9O1xufVxuXG4vLyBmb3JtYXQgZGF0ZSB1c2luZyBuYXRpdmUgZGF0ZSBvYmplY3RcbmZ1bmN0aW9uIGZvcm1hdE1vbWVudChtLCBmb3JtYXQpIHtcbiAgICBpZiAoIW0uaXNWYWxpZCgpKSB7XG4gICAgICAgIHJldHVybiBtLmxvY2FsZURhdGEoKS5pbnZhbGlkRGF0ZSgpO1xuICAgIH1cblxuICAgIGZvcm1hdCA9IGV4cGFuZEZvcm1hdChmb3JtYXQsIG0ubG9jYWxlRGF0YSgpKTtcbiAgICBmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XSA9IGZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdIHx8IG1ha2VGb3JtYXRGdW5jdGlvbihmb3JtYXQpO1xuXG4gICAgcmV0dXJuIGZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdKG0pO1xufVxuXG5mdW5jdGlvbiBleHBhbmRGb3JtYXQoZm9ybWF0LCBsb2NhbGUpIHtcbiAgICB2YXIgaSA9IDU7XG5cbiAgICBmdW5jdGlvbiByZXBsYWNlTG9uZ0RhdGVGb3JtYXRUb2tlbnMoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsZS5sb25nRGF0ZUZvcm1hdChpbnB1dCkgfHwgaW5wdXQ7XG4gICAgfVxuXG4gICAgbG9jYWxGb3JtYXR0aW5nVG9rZW5zLmxhc3RJbmRleCA9IDA7XG4gICAgd2hpbGUgKGkgPj0gMCAmJiBsb2NhbEZvcm1hdHRpbmdUb2tlbnMudGVzdChmb3JtYXQpKSB7XG4gICAgICAgIGZvcm1hdCA9IGZvcm1hdC5yZXBsYWNlKGxvY2FsRm9ybWF0dGluZ1Rva2VucywgcmVwbGFjZUxvbmdEYXRlRm9ybWF0VG9rZW5zKTtcbiAgICAgICAgbG9jYWxGb3JtYXR0aW5nVG9rZW5zLmxhc3RJbmRleCA9IDA7XG4gICAgICAgIGkgLT0gMTtcbiAgICB9XG5cbiAgICByZXR1cm4gZm9ybWF0O1xufVxuXG52YXIgbWF0Y2gxICAgICAgICAgPSAvXFxkLzsgICAgICAgICAgICAvLyAgICAgICAwIC0gOVxudmFyIG1hdGNoMiAgICAgICAgID0gL1xcZFxcZC87ICAgICAgICAgIC8vICAgICAgMDAgLSA5OVxudmFyIG1hdGNoMyAgICAgICAgID0gL1xcZHszfS87ICAgICAgICAgLy8gICAgIDAwMCAtIDk5OVxudmFyIG1hdGNoNCAgICAgICAgID0gL1xcZHs0fS87ICAgICAgICAgLy8gICAgMDAwMCAtIDk5OTlcbnZhciBtYXRjaDYgICAgICAgICA9IC9bKy1dP1xcZHs2fS87ICAgIC8vIC05OTk5OTkgLSA5OTk5OTlcbnZhciBtYXRjaDF0bzIgICAgICA9IC9cXGRcXGQ/LzsgICAgICAgICAvLyAgICAgICAwIC0gOTlcbnZhciBtYXRjaDN0bzQgICAgICA9IC9cXGRcXGRcXGRcXGQ/LzsgICAgIC8vICAgICA5OTkgLSA5OTk5XG52YXIgbWF0Y2g1dG82ICAgICAgPSAvXFxkXFxkXFxkXFxkXFxkXFxkPy87IC8vICAgOTk5OTkgLSA5OTk5OTlcbnZhciBtYXRjaDF0bzMgICAgICA9IC9cXGR7MSwzfS87ICAgICAgIC8vICAgICAgIDAgLSA5OTlcbnZhciBtYXRjaDF0bzQgICAgICA9IC9cXGR7MSw0fS87ICAgICAgIC8vICAgICAgIDAgLSA5OTk5XG52YXIgbWF0Y2gxdG82ICAgICAgPSAvWystXT9cXGR7MSw2fS87ICAvLyAtOTk5OTk5IC0gOTk5OTk5XG5cbnZhciBtYXRjaFVuc2lnbmVkICA9IC9cXGQrLzsgICAgICAgICAgIC8vICAgICAgIDAgLSBpbmZcbnZhciBtYXRjaFNpZ25lZCAgICA9IC9bKy1dP1xcZCsvOyAgICAgIC8vICAgIC1pbmYgLSBpbmZcblxudmFyIG1hdGNoT2Zmc2V0ICAgID0gL1p8WystXVxcZFxcZDo/XFxkXFxkL2dpOyAvLyArMDA6MDAgLTAwOjAwICswMDAwIC0wMDAwIG9yIFpcbnZhciBtYXRjaFNob3J0T2Zmc2V0ID0gL1p8WystXVxcZFxcZCg/Ojo/XFxkXFxkKT8vZ2k7IC8vICswMCAtMDAgKzAwOjAwIC0wMDowMCArMDAwMCAtMDAwMCBvciBaXG5cbnZhciBtYXRjaFRpbWVzdGFtcCA9IC9bKy1dP1xcZCsoXFwuXFxkezEsM30pPy87IC8vIDEyMzQ1Njc4OSAxMjM0NTY3ODkuMTIzXG5cbi8vIGFueSB3b3JkIChvciB0d28pIGNoYXJhY3RlcnMgb3IgbnVtYmVycyBpbmNsdWRpbmcgdHdvL3RocmVlIHdvcmQgbW9udGggaW4gYXJhYmljLlxuLy8gaW5jbHVkZXMgc2NvdHRpc2ggZ2FlbGljIHR3byB3b3JkIGFuZCBoeXBoZW5hdGVkIG1vbnRoc1xudmFyIG1hdGNoV29yZCA9IC9bMC05XXswLDI1Nn1bJ2EtelxcdTAwQTAtXFx1MDVGRlxcdTA3MDAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkYwN1xcdUZGMTAtXFx1RkZFRl17MSwyNTZ9fFtcXHUwNjAwLVxcdTA2RkZcXC9dezEsMjU2fShcXHMqP1tcXHUwNjAwLVxcdTA2RkZdezEsMjU2fSl7MSwyfS9pO1xuXG52YXIgcmVnZXhlcyA9IHt9O1xuXG5mdW5jdGlvbiBhZGRSZWdleFRva2VuICh0b2tlbiwgcmVnZXgsIHN0cmljdFJlZ2V4KSB7XG4gICAgcmVnZXhlc1t0b2tlbl0gPSBpc0Z1bmN0aW9uKHJlZ2V4KSA/IHJlZ2V4IDogZnVuY3Rpb24gKGlzU3RyaWN0LCBsb2NhbGVEYXRhKSB7XG4gICAgICAgIHJldHVybiAoaXNTdHJpY3QgJiYgc3RyaWN0UmVnZXgpID8gc3RyaWN0UmVnZXggOiByZWdleDtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBnZXRQYXJzZVJlZ2V4Rm9yVG9rZW4gKHRva2VuLCBjb25maWcpIHtcbiAgICBpZiAoIWhhc093blByb3AocmVnZXhlcywgdG9rZW4pKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVnRXhwKHVuZXNjYXBlRm9ybWF0KHRva2VuKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlZ2V4ZXNbdG9rZW5dKGNvbmZpZy5fc3RyaWN0LCBjb25maWcuX2xvY2FsZSk7XG59XG5cbi8vIENvZGUgZnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM1NjE0OTMvaXMtdGhlcmUtYS1yZWdleHAtZXNjYXBlLWZ1bmN0aW9uLWluLWphdmFzY3JpcHRcbmZ1bmN0aW9uIHVuZXNjYXBlRm9ybWF0KHMpIHtcbiAgICByZXR1cm4gcmVnZXhFc2NhcGUocy5yZXBsYWNlKCdcXFxcJywgJycpLnJlcGxhY2UoL1xcXFwoXFxbKXxcXFxcKFxcXSl8XFxbKFteXFxdXFxbXSopXFxdfFxcXFwoLikvZywgZnVuY3Rpb24gKG1hdGNoZWQsIHAxLCBwMiwgcDMsIHA0KSB7XG4gICAgICAgIHJldHVybiBwMSB8fCBwMiB8fCBwMyB8fCBwNDtcbiAgICB9KSk7XG59XG5cbmZ1bmN0aW9uIHJlZ2V4RXNjYXBlKHMpIHtcbiAgICByZXR1cm4gcy5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTtcbn1cblxudmFyIHRva2VucyA9IHt9O1xuXG5mdW5jdGlvbiBhZGRQYXJzZVRva2VuICh0b2tlbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgaSwgZnVuYyA9IGNhbGxiYWNrO1xuICAgIGlmICh0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRva2VuID0gW3Rva2VuXTtcbiAgICB9XG4gICAgaWYgKGlzTnVtYmVyKGNhbGxiYWNrKSkge1xuICAgICAgICBmdW5jID0gZnVuY3Rpb24gKGlucHV0LCBhcnJheSkge1xuICAgICAgICAgICAgYXJyYXlbY2FsbGJhY2tdID0gdG9JbnQoaW5wdXQpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgdG9rZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdG9rZW5zW3Rva2VuW2ldXSA9IGZ1bmM7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhZGRXZWVrUGFyc2VUb2tlbiAodG9rZW4sIGNhbGxiYWNrKSB7XG4gICAgYWRkUGFyc2VUb2tlbih0b2tlbiwgZnVuY3Rpb24gKGlucHV0LCBhcnJheSwgY29uZmlnLCB0b2tlbikge1xuICAgICAgICBjb25maWcuX3cgPSBjb25maWcuX3cgfHwge307XG4gICAgICAgIGNhbGxiYWNrKGlucHV0LCBjb25maWcuX3csIGNvbmZpZywgdG9rZW4pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRUaW1lVG9BcnJheUZyb21Ub2tlbih0b2tlbiwgaW5wdXQsIGNvbmZpZykge1xuICAgIGlmIChpbnB1dCAhPSBudWxsICYmIGhhc093blByb3AodG9rZW5zLCB0b2tlbikpIHtcbiAgICAgICAgdG9rZW5zW3Rva2VuXShpbnB1dCwgY29uZmlnLl9hLCBjb25maWcsIHRva2VuKTtcbiAgICB9XG59XG5cbnZhciBZRUFSID0gMDtcbnZhciBNT05USCA9IDE7XG52YXIgREFURSA9IDI7XG52YXIgSE9VUiA9IDM7XG52YXIgTUlOVVRFID0gNDtcbnZhciBTRUNPTkQgPSA1O1xudmFyIE1JTExJU0VDT05EID0gNjtcbnZhciBXRUVLID0gNztcbnZhciBXRUVLREFZID0gODtcblxuLy8gRk9STUFUVElOR1xuXG5hZGRGb3JtYXRUb2tlbignWScsIDAsIDAsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgeSA9IHRoaXMueWVhcigpO1xuICAgIHJldHVybiB5IDw9IDk5OTkgPyAnJyArIHkgOiAnKycgKyB5O1xufSk7XG5cbmFkZEZvcm1hdFRva2VuKDAsIFsnWVknLCAyXSwgMCwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnllYXIoKSAlIDEwMDtcbn0pO1xuXG5hZGRGb3JtYXRUb2tlbigwLCBbJ1lZWVknLCAgIDRdLCAgICAgICAwLCAneWVhcicpO1xuYWRkRm9ybWF0VG9rZW4oMCwgWydZWVlZWScsICA1XSwgICAgICAgMCwgJ3llYXInKTtcbmFkZEZvcm1hdFRva2VuKDAsIFsnWVlZWVlZJywgNiwgdHJ1ZV0sIDAsICd5ZWFyJyk7XG5cbi8vIEFMSUFTRVNcblxuYWRkVW5pdEFsaWFzKCd5ZWFyJywgJ3knKTtcblxuLy8gUFJJT1JJVElFU1xuXG5hZGRVbml0UHJpb3JpdHkoJ3llYXInLCAxKTtcblxuLy8gUEFSU0lOR1xuXG5hZGRSZWdleFRva2VuKCdZJywgICAgICBtYXRjaFNpZ25lZCk7XG5hZGRSZWdleFRva2VuKCdZWScsICAgICBtYXRjaDF0bzIsIG1hdGNoMik7XG5hZGRSZWdleFRva2VuKCdZWVlZJywgICBtYXRjaDF0bzQsIG1hdGNoNCk7XG5hZGRSZWdleFRva2VuKCdZWVlZWScsICBtYXRjaDF0bzYsIG1hdGNoNik7XG5hZGRSZWdleFRva2VuKCdZWVlZWVknLCBtYXRjaDF0bzYsIG1hdGNoNik7XG5cbmFkZFBhcnNlVG9rZW4oWydZWVlZWScsICdZWVlZWVknXSwgWUVBUik7XG5hZGRQYXJzZVRva2VuKCdZWVlZJywgZnVuY3Rpb24gKGlucHV0LCBhcnJheSkge1xuICAgIGFycmF5W1lFQVJdID0gaW5wdXQubGVuZ3RoID09PSAyID8gaG9va3MucGFyc2VUd29EaWdpdFllYXIoaW5wdXQpIDogdG9JbnQoaW5wdXQpO1xufSk7XG5hZGRQYXJzZVRva2VuKCdZWScsIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXkpIHtcbiAgICBhcnJheVtZRUFSXSA9IGhvb2tzLnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbn0pO1xuYWRkUGFyc2VUb2tlbignWScsIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXkpIHtcbiAgICBhcnJheVtZRUFSXSA9IHBhcnNlSW50KGlucHV0LCAxMCk7XG59KTtcblxuLy8gSEVMUEVSU1xuXG5mdW5jdGlvbiBkYXlzSW5ZZWFyKHllYXIpIHtcbiAgICByZXR1cm4gaXNMZWFwWWVhcih5ZWFyKSA/IDM2NiA6IDM2NTtcbn1cblxuZnVuY3Rpb24gaXNMZWFwWWVhcih5ZWFyKSB7XG4gICAgcmV0dXJuICh5ZWFyICUgNCA9PT0gMCAmJiB5ZWFyICUgMTAwICE9PSAwKSB8fCB5ZWFyICUgNDAwID09PSAwO1xufVxuXG4vLyBIT09LU1xuXG5ob29rcy5wYXJzZVR3b0RpZ2l0WWVhciA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIHJldHVybiB0b0ludChpbnB1dCkgKyAodG9JbnQoaW5wdXQpID4gNjggPyAxOTAwIDogMjAwMCk7XG59O1xuXG4vLyBNT01FTlRTXG5cbnZhciBnZXRTZXRZZWFyID0gbWFrZUdldFNldCgnRnVsbFllYXInLCB0cnVlKTtcblxuZnVuY3Rpb24gZ2V0SXNMZWFwWWVhciAoKSB7XG4gICAgcmV0dXJuIGlzTGVhcFllYXIodGhpcy55ZWFyKCkpO1xufVxuXG5mdW5jdGlvbiBtYWtlR2V0U2V0ICh1bml0LCBrZWVwVGltZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgIHNldCQxKHRoaXMsIHVuaXQsIHZhbHVlKTtcbiAgICAgICAgICAgIGhvb2tzLnVwZGF0ZU9mZnNldCh0aGlzLCBrZWVwVGltZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBnZXQodGhpcywgdW5pdCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBnZXQgKG1vbSwgdW5pdCkge1xuICAgIHJldHVybiBtb20uaXNWYWxpZCgpID9cbiAgICAgICAgbW9tLl9kWydnZXQnICsgKG1vbS5faXNVVEMgPyAnVVRDJyA6ICcnKSArIHVuaXRdKCkgOiBOYU47XG59XG5cbmZ1bmN0aW9uIHNldCQxIChtb20sIHVuaXQsIHZhbHVlKSB7XG4gICAgaWYgKG1vbS5pc1ZhbGlkKCkgJiYgIWlzTmFOKHZhbHVlKSkge1xuICAgICAgICBpZiAodW5pdCA9PT0gJ0Z1bGxZZWFyJyAmJiBpc0xlYXBZZWFyKG1vbS55ZWFyKCkpICYmIG1vbS5tb250aCgpID09PSAxICYmIG1vbS5kYXRlKCkgPT09IDI5KSB7XG4gICAgICAgICAgICBtb20uX2RbJ3NldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgdW5pdF0odmFsdWUsIG1vbS5tb250aCgpLCBkYXlzSW5Nb250aCh2YWx1ZSwgbW9tLm1vbnRoKCkpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG1vbS5fZFsnc2V0JyArIChtb20uX2lzVVRDID8gJ1VUQycgOiAnJykgKyB1bml0XSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIE1PTUVOVFNcblxuZnVuY3Rpb24gc3RyaW5nR2V0ICh1bml0cykge1xuICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgIGlmIChpc0Z1bmN0aW9uKHRoaXNbdW5pdHNdKSkge1xuICAgICAgICByZXR1cm4gdGhpc1t1bml0c10oKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gc3RyaW5nU2V0ICh1bml0cywgdmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHVuaXRzID09PSAnb2JqZWN0Jykge1xuICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZU9iamVjdFVuaXRzKHVuaXRzKTtcbiAgICAgICAgdmFyIHByaW9yaXRpemVkID0gZ2V0UHJpb3JpdGl6ZWRVbml0cyh1bml0cyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJpb3JpdGl6ZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXNbcHJpb3JpdGl6ZWRbaV0udW5pdF0odW5pdHNbcHJpb3JpdGl6ZWRbaV0udW5pdF0pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHRoaXNbdW5pdHNdKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbdW5pdHNdKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn1cblxuZnVuY3Rpb24gbW9kKG4sIHgpIHtcbiAgICByZXR1cm4gKChuICUgeCkgKyB4KSAlIHg7XG59XG5cbnZhciBpbmRleE9mO1xuXG5pZiAoQXJyYXkucHJvdG90eXBlLmluZGV4T2YpIHtcbiAgICBpbmRleE9mID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2Y7XG59IGVsc2Uge1xuICAgIGluZGV4T2YgPSBmdW5jdGlvbiAobykge1xuICAgICAgICAvLyBJIGtub3dcbiAgICAgICAgdmFyIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAodGhpc1tpXSA9PT0gbykge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBkYXlzSW5Nb250aCh5ZWFyLCBtb250aCkge1xuICAgIGlmIChpc05hTih5ZWFyKSB8fCBpc05hTihtb250aCkpIHtcbiAgICAgICAgcmV0dXJuIE5hTjtcbiAgICB9XG4gICAgdmFyIG1vZE1vbnRoID0gbW9kKG1vbnRoLCAxMik7XG4gICAgeWVhciArPSAobW9udGggLSBtb2RNb250aCkgLyAxMjtcbiAgICByZXR1cm4gbW9kTW9udGggPT09IDEgPyAoaXNMZWFwWWVhcih5ZWFyKSA/IDI5IDogMjgpIDogKDMxIC0gbW9kTW9udGggJSA3ICUgMik7XG59XG5cbi8vIEZPUk1BVFRJTkdcblxuYWRkRm9ybWF0VG9rZW4oJ00nLCBbJ01NJywgMl0sICdNbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb250aCgpICsgMTtcbn0pO1xuXG5hZGRGb3JtYXRUb2tlbignTU1NJywgMCwgMCwgZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tb250aHNTaG9ydCh0aGlzLCBmb3JtYXQpO1xufSk7XG5cbmFkZEZvcm1hdFRva2VuKCdNTU1NJywgMCwgMCwgZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tb250aHModGhpcywgZm9ybWF0KTtcbn0pO1xuXG4vLyBBTElBU0VTXG5cbmFkZFVuaXRBbGlhcygnbW9udGgnLCAnTScpO1xuXG4vLyBQUklPUklUWVxuXG5hZGRVbml0UHJpb3JpdHkoJ21vbnRoJywgOCk7XG5cbi8vIFBBUlNJTkdcblxuYWRkUmVnZXhUb2tlbignTScsICAgIG1hdGNoMXRvMik7XG5hZGRSZWdleFRva2VuKCdNTScsICAgbWF0Y2gxdG8yLCBtYXRjaDIpO1xuYWRkUmVnZXhUb2tlbignTU1NJywgIGZ1bmN0aW9uIChpc1N0cmljdCwgbG9jYWxlKSB7XG4gICAgcmV0dXJuIGxvY2FsZS5tb250aHNTaG9ydFJlZ2V4KGlzU3RyaWN0KTtcbn0pO1xuYWRkUmVnZXhUb2tlbignTU1NTScsIGZ1bmN0aW9uIChpc1N0cmljdCwgbG9jYWxlKSB7XG4gICAgcmV0dXJuIGxvY2FsZS5tb250aHNSZWdleChpc1N0cmljdCk7XG59KTtcblxuYWRkUGFyc2VUb2tlbihbJ00nLCAnTU0nXSwgZnVuY3Rpb24gKGlucHV0LCBhcnJheSkge1xuICAgIGFycmF5W01PTlRIXSA9IHRvSW50KGlucHV0KSAtIDE7XG59KTtcblxuYWRkUGFyc2VUb2tlbihbJ01NTScsICdNTU1NJ10sIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXksIGNvbmZpZywgdG9rZW4pIHtcbiAgICB2YXIgbW9udGggPSBjb25maWcuX2xvY2FsZS5tb250aHNQYXJzZShpbnB1dCwgdG9rZW4sIGNvbmZpZy5fc3RyaWN0KTtcbiAgICAvLyBpZiB3ZSBkaWRuJ3QgZmluZCBhIG1vbnRoIG5hbWUsIG1hcmsgdGhlIGRhdGUgYXMgaW52YWxpZC5cbiAgICBpZiAobW9udGggIT0gbnVsbCkge1xuICAgICAgICBhcnJheVtNT05USF0gPSBtb250aDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5pbnZhbGlkTW9udGggPSBpbnB1dDtcbiAgICB9XG59KTtcblxuLy8gTE9DQUxFU1xuXG52YXIgTU9OVEhTX0lOX0ZPUk1BVCA9IC9EW29EXT8oXFxbW15cXFtcXF1dKlxcXXxcXHMpK01NTU0/LztcbnZhciBkZWZhdWx0TG9jYWxlTW9udGhzID0gJ0phbnVhcnlfRmVicnVhcnlfTWFyY2hfQXByaWxfTWF5X0p1bmVfSnVseV9BdWd1c3RfU2VwdGVtYmVyX09jdG9iZXJfTm92ZW1iZXJfRGVjZW1iZXInLnNwbGl0KCdfJyk7XG5mdW5jdGlvbiBsb2NhbGVNb250aHMgKG0sIGZvcm1hdCkge1xuICAgIGlmICghbSkge1xuICAgICAgICByZXR1cm4gaXNBcnJheSh0aGlzLl9tb250aHMpID8gdGhpcy5fbW9udGhzIDpcbiAgICAgICAgICAgIHRoaXMuX21vbnRoc1snc3RhbmRhbG9uZSddO1xuICAgIH1cbiAgICByZXR1cm4gaXNBcnJheSh0aGlzLl9tb250aHMpID8gdGhpcy5fbW9udGhzW20ubW9udGgoKV0gOlxuICAgICAgICB0aGlzLl9tb250aHNbKHRoaXMuX21vbnRocy5pc0Zvcm1hdCB8fCBNT05USFNfSU5fRk9STUFUKS50ZXN0KGZvcm1hdCkgPyAnZm9ybWF0JyA6ICdzdGFuZGFsb25lJ11bbS5tb250aCgpXTtcbn1cblxudmFyIGRlZmF1bHRMb2NhbGVNb250aHNTaG9ydCA9ICdKYW5fRmViX01hcl9BcHJfTWF5X0p1bl9KdWxfQXVnX1NlcF9PY3RfTm92X0RlYycuc3BsaXQoJ18nKTtcbmZ1bmN0aW9uIGxvY2FsZU1vbnRoc1Nob3J0IChtLCBmb3JtYXQpIHtcbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIGlzQXJyYXkodGhpcy5fbW9udGhzU2hvcnQpID8gdGhpcy5fbW9udGhzU2hvcnQgOlxuICAgICAgICAgICAgdGhpcy5fbW9udGhzU2hvcnRbJ3N0YW5kYWxvbmUnXTtcbiAgICB9XG4gICAgcmV0dXJuIGlzQXJyYXkodGhpcy5fbW9udGhzU2hvcnQpID8gdGhpcy5fbW9udGhzU2hvcnRbbS5tb250aCgpXSA6XG4gICAgICAgIHRoaXMuX21vbnRoc1Nob3J0W01PTlRIU19JTl9GT1JNQVQudGVzdChmb3JtYXQpID8gJ2Zvcm1hdCcgOiAnc3RhbmRhbG9uZSddW20ubW9udGgoKV07XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVN0cmljdFBhcnNlKG1vbnRoTmFtZSwgZm9ybWF0LCBzdHJpY3QpIHtcbiAgICB2YXIgaSwgaWksIG1vbSwgbGxjID0gbW9udGhOYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCk7XG4gICAgaWYgKCF0aGlzLl9tb250aHNQYXJzZSkge1xuICAgICAgICAvLyB0aGlzIGlzIG5vdCB1c2VkXG4gICAgICAgIHRoaXMuX21vbnRoc1BhcnNlID0gW107XG4gICAgICAgIHRoaXMuX2xvbmdNb250aHNQYXJzZSA9IFtdO1xuICAgICAgICB0aGlzLl9zaG9ydE1vbnRoc1BhcnNlID0gW107XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCAxMjsgKytpKSB7XG4gICAgICAgICAgICBtb20gPSBjcmVhdGVVVEMoWzIwMDAsIGldKTtcbiAgICAgICAgICAgIHRoaXMuX3Nob3J0TW9udGhzUGFyc2VbaV0gPSB0aGlzLm1vbnRoc1Nob3J0KG1vbSwgJycpLnRvTG9jYWxlTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB0aGlzLl9sb25nTW9udGhzUGFyc2VbaV0gPSB0aGlzLm1vbnRocyhtb20sICcnKS50b0xvY2FsZUxvd2VyQ2FzZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN0cmljdCkge1xuICAgICAgICBpZiAoZm9ybWF0ID09PSAnTU1NJykge1xuICAgICAgICAgICAgaWkgPSBpbmRleE9mLmNhbGwodGhpcy5fc2hvcnRNb250aHNQYXJzZSwgbGxjKTtcbiAgICAgICAgICAgIHJldHVybiBpaSAhPT0gLTEgPyBpaSA6IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpaSA9IGluZGV4T2YuY2FsbCh0aGlzLl9sb25nTW9udGhzUGFyc2UsIGxsYyk7XG4gICAgICAgICAgICByZXR1cm4gaWkgIT09IC0xID8gaWkgOiBudWxsO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZvcm1hdCA9PT0gJ01NTScpIHtcbiAgICAgICAgICAgIGlpID0gaW5kZXhPZi5jYWxsKHRoaXMuX3Nob3J0TW9udGhzUGFyc2UsIGxsYyk7XG4gICAgICAgICAgICBpZiAoaWkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWkgPSBpbmRleE9mLmNhbGwodGhpcy5fbG9uZ01vbnRoc1BhcnNlLCBsbGMpO1xuICAgICAgICAgICAgcmV0dXJuIGlpICE9PSAtMSA/IGlpIDogbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlpID0gaW5kZXhPZi5jYWxsKHRoaXMuX2xvbmdNb250aHNQYXJzZSwgbGxjKTtcbiAgICAgICAgICAgIGlmIChpaSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaWk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpaSA9IGluZGV4T2YuY2FsbCh0aGlzLl9zaG9ydE1vbnRoc1BhcnNlLCBsbGMpO1xuICAgICAgICAgICAgcmV0dXJuIGlpICE9PSAtMSA/IGlpIDogbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gbG9jYWxlTW9udGhzUGFyc2UgKG1vbnRoTmFtZSwgZm9ybWF0LCBzdHJpY3QpIHtcbiAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgIGlmICh0aGlzLl9tb250aHNQYXJzZUV4YWN0KSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVTdHJpY3RQYXJzZS5jYWxsKHRoaXMsIG1vbnRoTmFtZSwgZm9ybWF0LCBzdHJpY3QpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fbW9udGhzUGFyc2UpIHtcbiAgICAgICAgdGhpcy5fbW9udGhzUGFyc2UgPSBbXTtcbiAgICAgICAgdGhpcy5fbG9uZ01vbnRoc1BhcnNlID0gW107XG4gICAgICAgIHRoaXMuX3Nob3J0TW9udGhzUGFyc2UgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBhZGQgc29ydGluZ1xuICAgIC8vIFNvcnRpbmcgbWFrZXMgc3VyZSBpZiBvbmUgbW9udGggKG9yIGFiYnIpIGlzIGEgcHJlZml4IG9mIGFub3RoZXJcbiAgICAvLyBzZWUgc29ydGluZyBpbiBjb21wdXRlTW9udGhzUGFyc2VcbiAgICBmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuICAgICAgICAvLyBtYWtlIHRoZSByZWdleCBpZiB3ZSBkb24ndCBoYXZlIGl0IGFscmVhZHlcbiAgICAgICAgbW9tID0gY3JlYXRlVVRDKFsyMDAwLCBpXSk7XG4gICAgICAgIGlmIChzdHJpY3QgJiYgIXRoaXMuX2xvbmdNb250aHNQYXJzZVtpXSkge1xuICAgICAgICAgICAgdGhpcy5fbG9uZ01vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cCgnXicgKyB0aGlzLm1vbnRocyhtb20sICcnKS5yZXBsYWNlKCcuJywgJycpICsgJyQnLCAnaScpO1xuICAgICAgICAgICAgdGhpcy5fc2hvcnRNb250aHNQYXJzZVtpXSA9IG5ldyBSZWdFeHAoJ14nICsgdGhpcy5tb250aHNTaG9ydChtb20sICcnKS5yZXBsYWNlKCcuJywgJycpICsgJyQnLCAnaScpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc3RyaWN0ICYmICF0aGlzLl9tb250aHNQYXJzZVtpXSkge1xuICAgICAgICAgICAgcmVnZXggPSAnXicgKyB0aGlzLm1vbnRocyhtb20sICcnKSArICd8XicgKyB0aGlzLm1vbnRoc1Nob3J0KG1vbSwgJycpO1xuICAgICAgICAgICAgdGhpcy5fbW9udGhzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKHJlZ2V4LnJlcGxhY2UoJy4nLCAnJyksICdpJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdGVzdCB0aGUgcmVnZXhcbiAgICAgICAgaWYgKHN0cmljdCAmJiBmb3JtYXQgPT09ICdNTU1NJyAmJiB0aGlzLl9sb25nTW9udGhzUGFyc2VbaV0udGVzdChtb250aE5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIGlmIChzdHJpY3QgJiYgZm9ybWF0ID09PSAnTU1NJyAmJiB0aGlzLl9zaG9ydE1vbnRoc1BhcnNlW2ldLnRlc3QobW9udGhOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXN0cmljdCAmJiB0aGlzLl9tb250aHNQYXJzZVtpXS50ZXN0KG1vbnRoTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBNT01FTlRTXG5cbmZ1bmN0aW9uIHNldE1vbnRoIChtb20sIHZhbHVlKSB7XG4gICAgdmFyIGRheU9mTW9udGg7XG5cbiAgICBpZiAoIW1vbS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgLy8gTm8gb3BcbiAgICAgICAgcmV0dXJuIG1vbTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAoL15cXGQrJC8udGVzdCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdG9JbnQodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSBtb20ubG9jYWxlRGF0YSgpLm1vbnRoc1BhcnNlKHZhbHVlKTtcbiAgICAgICAgICAgIC8vIFRPRE86IEFub3RoZXIgc2lsZW50IGZhaWx1cmU/XG4gICAgICAgICAgICBpZiAoIWlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb207XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkYXlPZk1vbnRoID0gTWF0aC5taW4obW9tLmRhdGUoKSwgZGF5c0luTW9udGgobW9tLnllYXIoKSwgdmFsdWUpKTtcbiAgICBtb20uX2RbJ3NldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgJ01vbnRoJ10odmFsdWUsIGRheU9mTW9udGgpO1xuICAgIHJldHVybiBtb207XG59XG5cbmZ1bmN0aW9uIGdldFNldE1vbnRoICh2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgIHNldE1vbnRoKHRoaXMsIHZhbHVlKTtcbiAgICAgICAgaG9va3MudXBkYXRlT2Zmc2V0KHRoaXMsIHRydWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZ2V0KHRoaXMsICdNb250aCcpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0RGF5c0luTW9udGggKCkge1xuICAgIHJldHVybiBkYXlzSW5Nb250aCh0aGlzLnllYXIoKSwgdGhpcy5tb250aCgpKTtcbn1cblxudmFyIGRlZmF1bHRNb250aHNTaG9ydFJlZ2V4ID0gbWF0Y2hXb3JkO1xuZnVuY3Rpb24gbW9udGhzU2hvcnRSZWdleCAoaXNTdHJpY3QpIHtcbiAgICBpZiAodGhpcy5fbW9udGhzUGFyc2VFeGFjdCkge1xuICAgICAgICBpZiAoIWhhc093blByb3AodGhpcywgJ19tb250aHNSZWdleCcpKSB7XG4gICAgICAgICAgICBjb21wdXRlTW9udGhzUGFyc2UuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNTdHJpY3QpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tb250aHNTaG9ydFN0cmljdFJlZ2V4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21vbnRoc1Nob3J0UmVnZXg7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIWhhc093blByb3AodGhpcywgJ19tb250aHNTaG9ydFJlZ2V4JykpIHtcbiAgICAgICAgICAgIHRoaXMuX21vbnRoc1Nob3J0UmVnZXggPSBkZWZhdWx0TW9udGhzU2hvcnRSZWdleDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzU2hvcnRTdHJpY3RSZWdleCAmJiBpc1N0cmljdCA/XG4gICAgICAgICAgICB0aGlzLl9tb250aHNTaG9ydFN0cmljdFJlZ2V4IDogdGhpcy5fbW9udGhzU2hvcnRSZWdleDtcbiAgICB9XG59XG5cbnZhciBkZWZhdWx0TW9udGhzUmVnZXggPSBtYXRjaFdvcmQ7XG5mdW5jdGlvbiBtb250aHNSZWdleCAoaXNTdHJpY3QpIHtcbiAgICBpZiAodGhpcy5fbW9udGhzUGFyc2VFeGFjdCkge1xuICAgICAgICBpZiAoIWhhc093blByb3AodGhpcywgJ19tb250aHNSZWdleCcpKSB7XG4gICAgICAgICAgICBjb21wdXRlTW9udGhzUGFyc2UuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNTdHJpY3QpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tb250aHNTdHJpY3RSZWdleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tb250aHNSZWdleDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghaGFzT3duUHJvcCh0aGlzLCAnX21vbnRoc1JlZ2V4JykpIHtcbiAgICAgICAgICAgIHRoaXMuX21vbnRoc1JlZ2V4ID0gZGVmYXVsdE1vbnRoc1JlZ2V4O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9tb250aHNTdHJpY3RSZWdleCAmJiBpc1N0cmljdCA/XG4gICAgICAgICAgICB0aGlzLl9tb250aHNTdHJpY3RSZWdleCA6IHRoaXMuX21vbnRoc1JlZ2V4O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY29tcHV0ZU1vbnRoc1BhcnNlICgpIHtcbiAgICBmdW5jdGlvbiBjbXBMZW5SZXYoYSwgYikge1xuICAgICAgICByZXR1cm4gYi5sZW5ndGggLSBhLmxlbmd0aDtcbiAgICB9XG5cbiAgICB2YXIgc2hvcnRQaWVjZXMgPSBbXSwgbG9uZ1BpZWNlcyA9IFtdLCBtaXhlZFBpZWNlcyA9IFtdLFxuICAgICAgICBpLCBtb207XG4gICAgZm9yIChpID0gMDsgaSA8IDEyOyBpKyspIHtcbiAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG4gICAgICAgIG1vbSA9IGNyZWF0ZVVUQyhbMjAwMCwgaV0pO1xuICAgICAgICBzaG9ydFBpZWNlcy5wdXNoKHRoaXMubW9udGhzU2hvcnQobW9tLCAnJykpO1xuICAgICAgICBsb25nUGllY2VzLnB1c2godGhpcy5tb250aHMobW9tLCAnJykpO1xuICAgICAgICBtaXhlZFBpZWNlcy5wdXNoKHRoaXMubW9udGhzKG1vbSwgJycpKTtcbiAgICAgICAgbWl4ZWRQaWVjZXMucHVzaCh0aGlzLm1vbnRoc1Nob3J0KG1vbSwgJycpKTtcbiAgICB9XG4gICAgLy8gU29ydGluZyBtYWtlcyBzdXJlIGlmIG9uZSBtb250aCAob3IgYWJicikgaXMgYSBwcmVmaXggb2YgYW5vdGhlciBpdFxuICAgIC8vIHdpbGwgbWF0Y2ggdGhlIGxvbmdlciBwaWVjZS5cbiAgICBzaG9ydFBpZWNlcy5zb3J0KGNtcExlblJldik7XG4gICAgbG9uZ1BpZWNlcy5zb3J0KGNtcExlblJldik7XG4gICAgbWl4ZWRQaWVjZXMuc29ydChjbXBMZW5SZXYpO1xuICAgIGZvciAoaSA9IDA7IGkgPCAxMjsgaSsrKSB7XG4gICAgICAgIHNob3J0UGllY2VzW2ldID0gcmVnZXhFc2NhcGUoc2hvcnRQaWVjZXNbaV0pO1xuICAgICAgICBsb25nUGllY2VzW2ldID0gcmVnZXhFc2NhcGUobG9uZ1BpZWNlc1tpXSk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCAyNDsgaSsrKSB7XG4gICAgICAgIG1peGVkUGllY2VzW2ldID0gcmVnZXhFc2NhcGUobWl4ZWRQaWVjZXNbaV0pO1xuICAgIH1cblxuICAgIHRoaXMuX21vbnRoc1JlZ2V4ID0gbmV3IFJlZ0V4cCgnXignICsgbWl4ZWRQaWVjZXMuam9pbignfCcpICsgJyknLCAnaScpO1xuICAgIHRoaXMuX21vbnRoc1Nob3J0UmVnZXggPSB0aGlzLl9tb250aHNSZWdleDtcbiAgICB0aGlzLl9tb250aHNTdHJpY3RSZWdleCA9IG5ldyBSZWdFeHAoJ14oJyArIGxvbmdQaWVjZXMuam9pbignfCcpICsgJyknLCAnaScpO1xuICAgIHRoaXMuX21vbnRoc1Nob3J0U3RyaWN0UmVnZXggPSBuZXcgUmVnRXhwKCdeKCcgKyBzaG9ydFBpZWNlcy5qb2luKCd8JykgKyAnKScsICdpJyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZURhdGUgKHksIG0sIGQsIGgsIE0sIHMsIG1zKSB7XG4gICAgLy8gY2FuJ3QganVzdCBhcHBseSgpIHRvIGNyZWF0ZSBhIGRhdGU6XG4gICAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xLzE4MTM0OFxuICAgIHZhciBkYXRlID0gbmV3IERhdGUoeSwgbSwgZCwgaCwgTSwgcywgbXMpO1xuXG4gICAgLy8gdGhlIGRhdGUgY29uc3RydWN0b3IgcmVtYXBzIHllYXJzIDAtOTkgdG8gMTkwMC0xOTk5XG4gICAgaWYgKHkgPCAxMDAgJiYgeSA+PSAwICYmIGlzRmluaXRlKGRhdGUuZ2V0RnVsbFllYXIoKSkpIHtcbiAgICAgICAgZGF0ZS5zZXRGdWxsWWVhcih5KTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGU7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVVUQ0RhdGUgKHkpIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKERhdGUuVVRDLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xuXG4gICAgLy8gdGhlIERhdGUuVVRDIGZ1bmN0aW9uIHJlbWFwcyB5ZWFycyAwLTk5IHRvIDE5MDAtMTk5OVxuICAgIGlmICh5IDwgMTAwICYmIHkgPj0gMCAmJiBpc0Zpbml0ZShkYXRlLmdldFVUQ0Z1bGxZZWFyKCkpKSB7XG4gICAgICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoeSk7XG4gICAgfVxuICAgIHJldHVybiBkYXRlO1xufVxuXG4vLyBzdGFydC1vZi1maXJzdC13ZWVrIC0gc3RhcnQtb2YteWVhclxuZnVuY3Rpb24gZmlyc3RXZWVrT2Zmc2V0KHllYXIsIGRvdywgZG95KSB7XG4gICAgdmFyIC8vIGZpcnN0LXdlZWsgZGF5IC0tIHdoaWNoIGphbnVhcnkgaXMgYWx3YXlzIGluIHRoZSBmaXJzdCB3ZWVrICg0IGZvciBpc28sIDEgZm9yIG90aGVyKVxuICAgICAgICBmd2QgPSA3ICsgZG93IC0gZG95LFxuICAgICAgICAvLyBmaXJzdC13ZWVrIGRheSBsb2NhbCB3ZWVrZGF5IC0tIHdoaWNoIGxvY2FsIHdlZWtkYXkgaXMgZndkXG4gICAgICAgIGZ3ZGx3ID0gKDcgKyBjcmVhdGVVVENEYXRlKHllYXIsIDAsIGZ3ZCkuZ2V0VVRDRGF5KCkgLSBkb3cpICUgNztcblxuICAgIHJldHVybiAtZndkbHcgKyBmd2QgLSAxO1xufVxuXG4vLyBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9JU09fd2Vla19kYXRlI0NhbGN1bGF0aW5nX2FfZGF0ZV9naXZlbl90aGVfeWVhci4yQ193ZWVrX251bWJlcl9hbmRfd2Vla2RheVxuZnVuY3Rpb24gZGF5T2ZZZWFyRnJvbVdlZWtzKHllYXIsIHdlZWssIHdlZWtkYXksIGRvdywgZG95KSB7XG4gICAgdmFyIGxvY2FsV2Vla2RheSA9ICg3ICsgd2Vla2RheSAtIGRvdykgJSA3LFxuICAgICAgICB3ZWVrT2Zmc2V0ID0gZmlyc3RXZWVrT2Zmc2V0KHllYXIsIGRvdywgZG95KSxcbiAgICAgICAgZGF5T2ZZZWFyID0gMSArIDcgKiAod2VlayAtIDEpICsgbG9jYWxXZWVrZGF5ICsgd2Vla09mZnNldCxcbiAgICAgICAgcmVzWWVhciwgcmVzRGF5T2ZZZWFyO1xuXG4gICAgaWYgKGRheU9mWWVhciA8PSAwKSB7XG4gICAgICAgIHJlc1llYXIgPSB5ZWFyIC0gMTtcbiAgICAgICAgcmVzRGF5T2ZZZWFyID0gZGF5c0luWWVhcihyZXNZZWFyKSArIGRheU9mWWVhcjtcbiAgICB9IGVsc2UgaWYgKGRheU9mWWVhciA+IGRheXNJblllYXIoeWVhcikpIHtcbiAgICAgICAgcmVzWWVhciA9IHllYXIgKyAxO1xuICAgICAgICByZXNEYXlPZlllYXIgPSBkYXlPZlllYXIgLSBkYXlzSW5ZZWFyKHllYXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc1llYXIgPSB5ZWFyO1xuICAgICAgICByZXNEYXlPZlllYXIgPSBkYXlPZlllYXI7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgeWVhcjogcmVzWWVhcixcbiAgICAgICAgZGF5T2ZZZWFyOiByZXNEYXlPZlllYXJcbiAgICB9O1xufVxuXG5mdW5jdGlvbiB3ZWVrT2ZZZWFyKG1vbSwgZG93LCBkb3kpIHtcbiAgICB2YXIgd2Vla09mZnNldCA9IGZpcnN0V2Vla09mZnNldChtb20ueWVhcigpLCBkb3csIGRveSksXG4gICAgICAgIHdlZWsgPSBNYXRoLmZsb29yKChtb20uZGF5T2ZZZWFyKCkgLSB3ZWVrT2Zmc2V0IC0gMSkgLyA3KSArIDEsXG4gICAgICAgIHJlc1dlZWssIHJlc1llYXI7XG5cbiAgICBpZiAod2VlayA8IDEpIHtcbiAgICAgICAgcmVzWWVhciA9IG1vbS55ZWFyKCkgLSAxO1xuICAgICAgICByZXNXZWVrID0gd2VlayArIHdlZWtzSW5ZZWFyKHJlc1llYXIsIGRvdywgZG95KTtcbiAgICB9IGVsc2UgaWYgKHdlZWsgPiB3ZWVrc0luWWVhcihtb20ueWVhcigpLCBkb3csIGRveSkpIHtcbiAgICAgICAgcmVzV2VlayA9IHdlZWsgLSB3ZWVrc0luWWVhcihtb20ueWVhcigpLCBkb3csIGRveSk7XG4gICAgICAgIHJlc1llYXIgPSBtb20ueWVhcigpICsgMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXNZZWFyID0gbW9tLnllYXIoKTtcbiAgICAgICAgcmVzV2VlayA9IHdlZWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgd2VlazogcmVzV2VlayxcbiAgICAgICAgeWVhcjogcmVzWWVhclxuICAgIH07XG59XG5cbmZ1bmN0aW9uIHdlZWtzSW5ZZWFyKHllYXIsIGRvdywgZG95KSB7XG4gICAgdmFyIHdlZWtPZmZzZXQgPSBmaXJzdFdlZWtPZmZzZXQoeWVhciwgZG93LCBkb3kpLFxuICAgICAgICB3ZWVrT2Zmc2V0TmV4dCA9IGZpcnN0V2Vla09mZnNldCh5ZWFyICsgMSwgZG93LCBkb3kpO1xuICAgIHJldHVybiAoZGF5c0luWWVhcih5ZWFyKSAtIHdlZWtPZmZzZXQgKyB3ZWVrT2Zmc2V0TmV4dCkgLyA3O1xufVxuXG4vLyBGT1JNQVRUSU5HXG5cbmFkZEZvcm1hdFRva2VuKCd3JywgWyd3dycsIDJdLCAnd28nLCAnd2VlaycpO1xuYWRkRm9ybWF0VG9rZW4oJ1cnLCBbJ1dXJywgMl0sICdXbycsICdpc29XZWVrJyk7XG5cbi8vIEFMSUFTRVNcblxuYWRkVW5pdEFsaWFzKCd3ZWVrJywgJ3cnKTtcbmFkZFVuaXRBbGlhcygnaXNvV2VlaycsICdXJyk7XG5cbi8vIFBSSU9SSVRJRVNcblxuYWRkVW5pdFByaW9yaXR5KCd3ZWVrJywgNSk7XG5hZGRVbml0UHJpb3JpdHkoJ2lzb1dlZWsnLCA1KTtcblxuLy8gUEFSU0lOR1xuXG5hZGRSZWdleFRva2VuKCd3JywgIG1hdGNoMXRvMik7XG5hZGRSZWdleFRva2VuKCd3dycsIG1hdGNoMXRvMiwgbWF0Y2gyKTtcbmFkZFJlZ2V4VG9rZW4oJ1cnLCAgbWF0Y2gxdG8yKTtcbmFkZFJlZ2V4VG9rZW4oJ1dXJywgbWF0Y2gxdG8yLCBtYXRjaDIpO1xuXG5hZGRXZWVrUGFyc2VUb2tlbihbJ3cnLCAnd3cnLCAnVycsICdXVyddLCBmdW5jdGlvbiAoaW5wdXQsIHdlZWssIGNvbmZpZywgdG9rZW4pIHtcbiAgICB3ZWVrW3Rva2VuLnN1YnN0cigwLCAxKV0gPSB0b0ludChpbnB1dCk7XG59KTtcblxuLy8gSEVMUEVSU1xuXG4vLyBMT0NBTEVTXG5cbmZ1bmN0aW9uIGxvY2FsZVdlZWsgKG1vbSkge1xuICAgIHJldHVybiB3ZWVrT2ZZZWFyKG1vbSwgdGhpcy5fd2Vlay5kb3csIHRoaXMuX3dlZWsuZG95KS53ZWVrO1xufVxuXG52YXIgZGVmYXVsdExvY2FsZVdlZWsgPSB7XG4gICAgZG93IDogMCwgLy8gU3VuZGF5IGlzIHRoZSBmaXJzdCBkYXkgb2YgdGhlIHdlZWsuXG4gICAgZG95IDogNiAgLy8gVGhlIHdlZWsgdGhhdCBjb250YWlucyBKYW4gMXN0IGlzIHRoZSBmaXJzdCB3ZWVrIG9mIHRoZSB5ZWFyLlxufTtcblxuZnVuY3Rpb24gbG9jYWxlRmlyc3REYXlPZldlZWsgKCkge1xuICAgIHJldHVybiB0aGlzLl93ZWVrLmRvdztcbn1cblxuZnVuY3Rpb24gbG9jYWxlRmlyc3REYXlPZlllYXIgKCkge1xuICAgIHJldHVybiB0aGlzLl93ZWVrLmRveTtcbn1cblxuLy8gTU9NRU5UU1xuXG5mdW5jdGlvbiBnZXRTZXRXZWVrIChpbnB1dCkge1xuICAgIHZhciB3ZWVrID0gdGhpcy5sb2NhbGVEYXRhKCkud2Vlayh0aGlzKTtcbiAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWsgOiB0aGlzLmFkZCgoaW5wdXQgLSB3ZWVrKSAqIDcsICdkJyk7XG59XG5cbmZ1bmN0aW9uIGdldFNldElTT1dlZWsgKGlucHV0KSB7XG4gICAgdmFyIHdlZWsgPSB3ZWVrT2ZZZWFyKHRoaXMsIDEsIDQpLndlZWs7XG4gICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB3ZWVrIDogdGhpcy5hZGQoKGlucHV0IC0gd2VlaykgKiA3LCAnZCcpO1xufVxuXG4vLyBGT1JNQVRUSU5HXG5cbmFkZEZvcm1hdFRva2VuKCdkJywgMCwgJ2RvJywgJ2RheScpO1xuXG5hZGRGb3JtYXRUb2tlbignZGQnLCAwLCAwLCBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLndlZWtkYXlzTWluKHRoaXMsIGZvcm1hdCk7XG59KTtcblxuYWRkRm9ybWF0VG9rZW4oJ2RkZCcsIDAsIDAsIGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXNTaG9ydCh0aGlzLCBmb3JtYXQpO1xufSk7XG5cbmFkZEZvcm1hdFRva2VuKCdkZGRkJywgMCwgMCwgZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5cyh0aGlzLCBmb3JtYXQpO1xufSk7XG5cbmFkZEZvcm1hdFRva2VuKCdlJywgMCwgMCwgJ3dlZWtkYXknKTtcbmFkZEZvcm1hdFRva2VuKCdFJywgMCwgMCwgJ2lzb1dlZWtkYXknKTtcblxuLy8gQUxJQVNFU1xuXG5hZGRVbml0QWxpYXMoJ2RheScsICdkJyk7XG5hZGRVbml0QWxpYXMoJ3dlZWtkYXknLCAnZScpO1xuYWRkVW5pdEFsaWFzKCdpc29XZWVrZGF5JywgJ0UnKTtcblxuLy8gUFJJT1JJVFlcbmFkZFVuaXRQcmlvcml0eSgnZGF5JywgMTEpO1xuYWRkVW5pdFByaW9yaXR5KCd3ZWVrZGF5JywgMTEpO1xuYWRkVW5pdFByaW9yaXR5KCdpc29XZWVrZGF5JywgMTEpO1xuXG4vLyBQQVJTSU5HXG5cbmFkZFJlZ2V4VG9rZW4oJ2QnLCAgICBtYXRjaDF0bzIpO1xuYWRkUmVnZXhUb2tlbignZScsICAgIG1hdGNoMXRvMik7XG5hZGRSZWdleFRva2VuKCdFJywgICAgbWF0Y2gxdG8yKTtcbmFkZFJlZ2V4VG9rZW4oJ2RkJywgICBmdW5jdGlvbiAoaXNTdHJpY3QsIGxvY2FsZSkge1xuICAgIHJldHVybiBsb2NhbGUud2Vla2RheXNNaW5SZWdleChpc1N0cmljdCk7XG59KTtcbmFkZFJlZ2V4VG9rZW4oJ2RkZCcsICAgZnVuY3Rpb24gKGlzU3RyaWN0LCBsb2NhbGUpIHtcbiAgICByZXR1cm4gbG9jYWxlLndlZWtkYXlzU2hvcnRSZWdleChpc1N0cmljdCk7XG59KTtcbmFkZFJlZ2V4VG9rZW4oJ2RkZGQnLCAgIGZ1bmN0aW9uIChpc1N0cmljdCwgbG9jYWxlKSB7XG4gICAgcmV0dXJuIGxvY2FsZS53ZWVrZGF5c1JlZ2V4KGlzU3RyaWN0KTtcbn0pO1xuXG5hZGRXZWVrUGFyc2VUb2tlbihbJ2RkJywgJ2RkZCcsICdkZGRkJ10sIGZ1bmN0aW9uIChpbnB1dCwgd2VlaywgY29uZmlnLCB0b2tlbikge1xuICAgIHZhciB3ZWVrZGF5ID0gY29uZmlnLl9sb2NhbGUud2Vla2RheXNQYXJzZShpbnB1dCwgdG9rZW4sIGNvbmZpZy5fc3RyaWN0KTtcbiAgICAvLyBpZiB3ZSBkaWRuJ3QgZ2V0IGEgd2Vla2RheSBuYW1lLCBtYXJrIHRoZSBkYXRlIGFzIGludmFsaWRcbiAgICBpZiAod2Vla2RheSAhPSBudWxsKSB7XG4gICAgICAgIHdlZWsuZCA9IHdlZWtkYXk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykuaW52YWxpZFdlZWtkYXkgPSBpbnB1dDtcbiAgICB9XG59KTtcblxuYWRkV2Vla1BhcnNlVG9rZW4oWydkJywgJ2UnLCAnRSddLCBmdW5jdGlvbiAoaW5wdXQsIHdlZWssIGNvbmZpZywgdG9rZW4pIHtcbiAgICB3ZWVrW3Rva2VuXSA9IHRvSW50KGlucHV0KTtcbn0pO1xuXG4vLyBIRUxQRVJTXG5cbmZ1bmN0aW9uIHBhcnNlV2Vla2RheShpbnB1dCwgbG9jYWxlKSB7XG4gICAgaWYgKHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgIH1cblxuICAgIGlmICghaXNOYU4oaW5wdXQpKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludChpbnB1dCwgMTApO1xuICAgIH1cblxuICAgIGlucHV0ID0gbG9jYWxlLndlZWtkYXlzUGFyc2UoaW5wdXQpO1xuICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJldHVybiBpbnB1dDtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gcGFyc2VJc29XZWVrZGF5KGlucHV0LCBsb2NhbGUpIHtcbiAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gbG9jYWxlLndlZWtkYXlzUGFyc2UoaW5wdXQpICUgNyB8fCA3O1xuICAgIH1cbiAgICByZXR1cm4gaXNOYU4oaW5wdXQpID8gbnVsbCA6IGlucHV0O1xufVxuXG4vLyBMT0NBTEVTXG5cbnZhciBkZWZhdWx0TG9jYWxlV2Vla2RheXMgPSAnU3VuZGF5X01vbmRheV9UdWVzZGF5X1dlZG5lc2RheV9UaHVyc2RheV9GcmlkYXlfU2F0dXJkYXknLnNwbGl0KCdfJyk7XG5mdW5jdGlvbiBsb2NhbGVXZWVrZGF5cyAobSwgZm9ybWF0KSB7XG4gICAgaWYgKCFtKSB7XG4gICAgICAgIHJldHVybiBpc0FycmF5KHRoaXMuX3dlZWtkYXlzKSA/IHRoaXMuX3dlZWtkYXlzIDpcbiAgICAgICAgICAgIHRoaXMuX3dlZWtkYXlzWydzdGFuZGFsb25lJ107XG4gICAgfVxuICAgIHJldHVybiBpc0FycmF5KHRoaXMuX3dlZWtkYXlzKSA/IHRoaXMuX3dlZWtkYXlzW20uZGF5KCldIDpcbiAgICAgICAgdGhpcy5fd2Vla2RheXNbdGhpcy5fd2Vla2RheXMuaXNGb3JtYXQudGVzdChmb3JtYXQpID8gJ2Zvcm1hdCcgOiAnc3RhbmRhbG9uZSddW20uZGF5KCldO1xufVxuXG52YXIgZGVmYXVsdExvY2FsZVdlZWtkYXlzU2hvcnQgPSAnU3VuX01vbl9UdWVfV2VkX1RodV9GcmlfU2F0Jy5zcGxpdCgnXycpO1xuZnVuY3Rpb24gbG9jYWxlV2Vla2RheXNTaG9ydCAobSkge1xuICAgIHJldHVybiAobSkgPyB0aGlzLl93ZWVrZGF5c1Nob3J0W20uZGF5KCldIDogdGhpcy5fd2Vla2RheXNTaG9ydDtcbn1cblxudmFyIGRlZmF1bHRMb2NhbGVXZWVrZGF5c01pbiA9ICdTdV9Nb19UdV9XZV9UaF9Gcl9TYScuc3BsaXQoJ18nKTtcbmZ1bmN0aW9uIGxvY2FsZVdlZWtkYXlzTWluIChtKSB7XG4gICAgcmV0dXJuIChtKSA/IHRoaXMuX3dlZWtkYXlzTWluW20uZGF5KCldIDogdGhpcy5fd2Vla2RheXNNaW47XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVN0cmljdFBhcnNlJDEod2Vla2RheU5hbWUsIGZvcm1hdCwgc3RyaWN0KSB7XG4gICAgdmFyIGksIGlpLCBtb20sIGxsYyA9IHdlZWtkYXlOYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCk7XG4gICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlKSB7XG4gICAgICAgIHRoaXMuX3dlZWtkYXlzUGFyc2UgPSBbXTtcbiAgICAgICAgdGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlID0gW107XG4gICAgICAgIHRoaXMuX21pbldlZWtkYXlzUGFyc2UgPSBbXTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgNzsgKytpKSB7XG4gICAgICAgICAgICBtb20gPSBjcmVhdGVVVEMoWzIwMDAsIDFdKS5kYXkoaSk7XG4gICAgICAgICAgICB0aGlzLl9taW5XZWVrZGF5c1BhcnNlW2ldID0gdGhpcy53ZWVrZGF5c01pbihtb20sICcnKS50b0xvY2FsZUxvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlW2ldID0gdGhpcy53ZWVrZGF5c1Nob3J0KG1vbSwgJycpLnRvTG9jYWxlTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1BhcnNlW2ldID0gdGhpcy53ZWVrZGF5cyhtb20sICcnKS50b0xvY2FsZUxvd2VyQ2FzZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN0cmljdCkge1xuICAgICAgICBpZiAoZm9ybWF0ID09PSAnZGRkZCcpIHtcbiAgICAgICAgICAgIGlpID0gaW5kZXhPZi5jYWxsKHRoaXMuX3dlZWtkYXlzUGFyc2UsIGxsYyk7XG4gICAgICAgICAgICByZXR1cm4gaWkgIT09IC0xID8gaWkgOiBudWxsO1xuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdCA9PT0gJ2RkZCcpIHtcbiAgICAgICAgICAgIGlpID0gaW5kZXhPZi5jYWxsKHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZSwgbGxjKTtcbiAgICAgICAgICAgIHJldHVybiBpaSAhPT0gLTEgPyBpaSA6IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpaSA9IGluZGV4T2YuY2FsbCh0aGlzLl9taW5XZWVrZGF5c1BhcnNlLCBsbGMpO1xuICAgICAgICAgICAgcmV0dXJuIGlpICE9PSAtMSA/IGlpIDogbnVsbDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3JtYXQgPT09ICdkZGRkJykge1xuICAgICAgICAgICAgaWkgPSBpbmRleE9mLmNhbGwodGhpcy5fd2Vla2RheXNQYXJzZSwgbGxjKTtcbiAgICAgICAgICAgIGlmIChpaSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaWk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpaSA9IGluZGV4T2YuY2FsbCh0aGlzLl9zaG9ydFdlZWtkYXlzUGFyc2UsIGxsYyk7XG4gICAgICAgICAgICBpZiAoaWkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWkgPSBpbmRleE9mLmNhbGwodGhpcy5fbWluV2Vla2RheXNQYXJzZSwgbGxjKTtcbiAgICAgICAgICAgIHJldHVybiBpaSAhPT0gLTEgPyBpaSA6IG51bGw7XG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0ID09PSAnZGRkJykge1xuICAgICAgICAgICAgaWkgPSBpbmRleE9mLmNhbGwodGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlLCBsbGMpO1xuICAgICAgICAgICAgaWYgKGlpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlpID0gaW5kZXhPZi5jYWxsKHRoaXMuX3dlZWtkYXlzUGFyc2UsIGxsYyk7XG4gICAgICAgICAgICBpZiAoaWkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWkgPSBpbmRleE9mLmNhbGwodGhpcy5fbWluV2Vla2RheXNQYXJzZSwgbGxjKTtcbiAgICAgICAgICAgIHJldHVybiBpaSAhPT0gLTEgPyBpaSA6IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpaSA9IGluZGV4T2YuY2FsbCh0aGlzLl9taW5XZWVrZGF5c1BhcnNlLCBsbGMpO1xuICAgICAgICAgICAgaWYgKGlpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlpID0gaW5kZXhPZi5jYWxsKHRoaXMuX3dlZWtkYXlzUGFyc2UsIGxsYyk7XG4gICAgICAgICAgICBpZiAoaWkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWkgPSBpbmRleE9mLmNhbGwodGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlLCBsbGMpO1xuICAgICAgICAgICAgcmV0dXJuIGlpICE9PSAtMSA/IGlpIDogbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gbG9jYWxlV2Vla2RheXNQYXJzZSAod2Vla2RheU5hbWUsIGZvcm1hdCwgc3RyaWN0KSB7XG4gICAgdmFyIGksIG1vbSwgcmVnZXg7XG5cbiAgICBpZiAodGhpcy5fd2Vla2RheXNQYXJzZUV4YWN0KSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVTdHJpY3RQYXJzZSQxLmNhbGwodGhpcywgd2Vla2RheU5hbWUsIGZvcm1hdCwgc3RyaWN0KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX3dlZWtkYXlzUGFyc2UpIHtcbiAgICAgICAgdGhpcy5fd2Vla2RheXNQYXJzZSA9IFtdO1xuICAgICAgICB0aGlzLl9taW5XZWVrZGF5c1BhcnNlID0gW107XG4gICAgICAgIHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZSA9IFtdO1xuICAgICAgICB0aGlzLl9mdWxsV2Vla2RheXNQYXJzZSA9IFtdO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG5cbiAgICAgICAgbW9tID0gY3JlYXRlVVRDKFsyMDAwLCAxXSkuZGF5KGkpO1xuICAgICAgICBpZiAoc3RyaWN0ICYmICF0aGlzLl9mdWxsV2Vla2RheXNQYXJzZVtpXSkge1xuICAgICAgICAgICAgdGhpcy5fZnVsbFdlZWtkYXlzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKCdeJyArIHRoaXMud2Vla2RheXMobW9tLCAnJykucmVwbGFjZSgnLicsICdcXC4/JykgKyAnJCcsICdpJyk7XG4gICAgICAgICAgICB0aGlzLl9zaG9ydFdlZWtkYXlzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKCdeJyArIHRoaXMud2Vla2RheXNTaG9ydChtb20sICcnKS5yZXBsYWNlKCcuJywgJ1xcLj8nKSArICckJywgJ2knKTtcbiAgICAgICAgICAgIHRoaXMuX21pbldlZWtkYXlzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKCdeJyArIHRoaXMud2Vla2RheXNNaW4obW9tLCAnJykucmVwbGFjZSgnLicsICdcXC4/JykgKyAnJCcsICdpJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlW2ldKSB7XG4gICAgICAgICAgICByZWdleCA9ICdeJyArIHRoaXMud2Vla2RheXMobW9tLCAnJykgKyAnfF4nICsgdGhpcy53ZWVrZGF5c1Nob3J0KG1vbSwgJycpICsgJ3xeJyArIHRoaXMud2Vla2RheXNNaW4obW9tLCAnJyk7XG4gICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRlc3QgdGhlIHJlZ2V4XG4gICAgICAgIGlmIChzdHJpY3QgJiYgZm9ybWF0ID09PSAnZGRkZCcgJiYgdGhpcy5fZnVsbFdlZWtkYXlzUGFyc2VbaV0udGVzdCh3ZWVrZGF5TmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCAmJiBmb3JtYXQgPT09ICdkZGQnICYmIHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZVtpXS50ZXN0KHdlZWtkYXlOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0ICYmIGZvcm1hdCA9PT0gJ2RkJyAmJiB0aGlzLl9taW5XZWVrZGF5c1BhcnNlW2ldLnRlc3Qod2Vla2RheU5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIGlmICghc3RyaWN0ICYmIHRoaXMuX3dlZWtkYXlzUGFyc2VbaV0udGVzdCh3ZWVrZGF5TmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBNT01FTlRTXG5cbmZ1bmN0aW9uIGdldFNldERheU9mV2VlayAoaW5wdXQpIHtcbiAgICBpZiAoIXRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgIHJldHVybiBpbnB1dCAhPSBudWxsID8gdGhpcyA6IE5hTjtcbiAgICB9XG4gICAgdmFyIGRheSA9IHRoaXMuX2lzVVRDID8gdGhpcy5fZC5nZXRVVENEYXkoKSA6IHRoaXMuX2QuZ2V0RGF5KCk7XG4gICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgaW5wdXQgPSBwYXJzZVdlZWtkYXkoaW5wdXQsIHRoaXMubG9jYWxlRGF0YSgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkKGlucHV0IC0gZGF5LCAnZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBkYXk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRTZXRMb2NhbGVEYXlPZldlZWsgKGlucHV0KSB7XG4gICAgaWYgKCF0aGlzLmlzVmFsaWQoKSkge1xuICAgICAgICByZXR1cm4gaW5wdXQgIT0gbnVsbCA/IHRoaXMgOiBOYU47XG4gICAgfVxuICAgIHZhciB3ZWVrZGF5ID0gKHRoaXMuZGF5KCkgKyA3IC0gdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG93KSAlIDc7XG4gICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB3ZWVrZGF5IDogdGhpcy5hZGQoaW5wdXQgLSB3ZWVrZGF5LCAnZCcpO1xufVxuXG5mdW5jdGlvbiBnZXRTZXRJU09EYXlPZldlZWsgKGlucHV0KSB7XG4gICAgaWYgKCF0aGlzLmlzVmFsaWQoKSkge1xuICAgICAgICByZXR1cm4gaW5wdXQgIT0gbnVsbCA/IHRoaXMgOiBOYU47XG4gICAgfVxuXG4gICAgLy8gYmVoYXZlcyB0aGUgc2FtZSBhcyBtb21lbnQjZGF5IGV4Y2VwdFxuICAgIC8vIGFzIGEgZ2V0dGVyLCByZXR1cm5zIDcgaW5zdGVhZCBvZiAwICgxLTcgcmFuZ2UgaW5zdGVhZCBvZiAwLTYpXG4gICAgLy8gYXMgYSBzZXR0ZXIsIHN1bmRheSBzaG91bGQgYmVsb25nIHRvIHRoZSBwcmV2aW91cyB3ZWVrLlxuXG4gICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgdmFyIHdlZWtkYXkgPSBwYXJzZUlzb1dlZWtkYXkoaW5wdXQsIHRoaXMubG9jYWxlRGF0YSgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF5KHRoaXMuZGF5KCkgJSA3ID8gd2Vla2RheSA6IHdlZWtkYXkgLSA3KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXkoKSB8fCA3O1xuICAgIH1cbn1cblxudmFyIGRlZmF1bHRXZWVrZGF5c1JlZ2V4ID0gbWF0Y2hXb3JkO1xuZnVuY3Rpb24gd2Vla2RheXNSZWdleCAoaXNTdHJpY3QpIHtcbiAgICBpZiAodGhpcy5fd2Vla2RheXNQYXJzZUV4YWN0KSB7XG4gICAgICAgIGlmICghaGFzT3duUHJvcCh0aGlzLCAnX3dlZWtkYXlzUmVnZXgnKSkge1xuICAgICAgICAgICAgY29tcHV0ZVdlZWtkYXlzUGFyc2UuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNTdHJpY3QpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c1N0cmljdFJlZ2V4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzUmVnZXg7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIWhhc093blByb3AodGhpcywgJ193ZWVrZGF5c1JlZ2V4JykpIHtcbiAgICAgICAgICAgIHRoaXMuX3dlZWtkYXlzUmVnZXggPSBkZWZhdWx0V2Vla2RheXNSZWdleDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fd2Vla2RheXNTdHJpY3RSZWdleCAmJiBpc1N0cmljdCA/XG4gICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1N0cmljdFJlZ2V4IDogdGhpcy5fd2Vla2RheXNSZWdleDtcbiAgICB9XG59XG5cbnZhciBkZWZhdWx0V2Vla2RheXNTaG9ydFJlZ2V4ID0gbWF0Y2hXb3JkO1xuZnVuY3Rpb24gd2Vla2RheXNTaG9ydFJlZ2V4IChpc1N0cmljdCkge1xuICAgIGlmICh0aGlzLl93ZWVrZGF5c1BhcnNlRXhhY3QpIHtcbiAgICAgICAgaWYgKCFoYXNPd25Qcm9wKHRoaXMsICdfd2Vla2RheXNSZWdleCcpKSB7XG4gICAgICAgICAgICBjb21wdXRlV2Vla2RheXNQYXJzZS5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1N0cmljdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzU2hvcnRTdHJpY3RSZWdleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c1Nob3J0UmVnZXg7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIWhhc093blByb3AodGhpcywgJ193ZWVrZGF5c1Nob3J0UmVnZXgnKSkge1xuICAgICAgICAgICAgdGhpcy5fd2Vla2RheXNTaG9ydFJlZ2V4ID0gZGVmYXVsdFdlZWtkYXlzU2hvcnRSZWdleDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fd2Vla2RheXNTaG9ydFN0cmljdFJlZ2V4ICYmIGlzU3RyaWN0ID9cbiAgICAgICAgICAgIHRoaXMuX3dlZWtkYXlzU2hvcnRTdHJpY3RSZWdleCA6IHRoaXMuX3dlZWtkYXlzU2hvcnRSZWdleDtcbiAgICB9XG59XG5cbnZhciBkZWZhdWx0V2Vla2RheXNNaW5SZWdleCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIHdlZWtkYXlzTWluUmVnZXggKGlzU3RyaWN0KSB7XG4gICAgaWYgKHRoaXMuX3dlZWtkYXlzUGFyc2VFeGFjdCkge1xuICAgICAgICBpZiAoIWhhc093blByb3AodGhpcywgJ193ZWVrZGF5c1JlZ2V4JykpIHtcbiAgICAgICAgICAgIGNvbXB1dGVXZWVrZGF5c1BhcnNlLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzU3RyaWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd2Vla2RheXNNaW5TdHJpY3RSZWdleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c01pblJlZ2V4O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFoYXNPd25Qcm9wKHRoaXMsICdfd2Vla2RheXNNaW5SZWdleCcpKSB7XG4gICAgICAgICAgICB0aGlzLl93ZWVrZGF5c01pblJlZ2V4ID0gZGVmYXVsdFdlZWtkYXlzTWluUmVnZXg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzTWluU3RyaWN0UmVnZXggJiYgaXNTdHJpY3QgP1xuICAgICAgICAgICAgdGhpcy5fd2Vla2RheXNNaW5TdHJpY3RSZWdleCA6IHRoaXMuX3dlZWtkYXlzTWluUmVnZXg7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGNvbXB1dGVXZWVrZGF5c1BhcnNlICgpIHtcbiAgICBmdW5jdGlvbiBjbXBMZW5SZXYoYSwgYikge1xuICAgICAgICByZXR1cm4gYi5sZW5ndGggLSBhLmxlbmd0aDtcbiAgICB9XG5cbiAgICB2YXIgbWluUGllY2VzID0gW10sIHNob3J0UGllY2VzID0gW10sIGxvbmdQaWVjZXMgPSBbXSwgbWl4ZWRQaWVjZXMgPSBbXSxcbiAgICAgICAgaSwgbW9tLCBtaW5wLCBzaG9ydHAsIGxvbmdwO1xuICAgIGZvciAoaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG4gICAgICAgIG1vbSA9IGNyZWF0ZVVUQyhbMjAwMCwgMV0pLmRheShpKTtcbiAgICAgICAgbWlucCA9IHRoaXMud2Vla2RheXNNaW4obW9tLCAnJyk7XG4gICAgICAgIHNob3J0cCA9IHRoaXMud2Vla2RheXNTaG9ydChtb20sICcnKTtcbiAgICAgICAgbG9uZ3AgPSB0aGlzLndlZWtkYXlzKG1vbSwgJycpO1xuICAgICAgICBtaW5QaWVjZXMucHVzaChtaW5wKTtcbiAgICAgICAgc2hvcnRQaWVjZXMucHVzaChzaG9ydHApO1xuICAgICAgICBsb25nUGllY2VzLnB1c2gobG9uZ3ApO1xuICAgICAgICBtaXhlZFBpZWNlcy5wdXNoKG1pbnApO1xuICAgICAgICBtaXhlZFBpZWNlcy5wdXNoKHNob3J0cCk7XG4gICAgICAgIG1peGVkUGllY2VzLnB1c2gobG9uZ3ApO1xuICAgIH1cbiAgICAvLyBTb3J0aW5nIG1ha2VzIHN1cmUgaWYgb25lIHdlZWtkYXkgKG9yIGFiYnIpIGlzIGEgcHJlZml4IG9mIGFub3RoZXIgaXRcbiAgICAvLyB3aWxsIG1hdGNoIHRoZSBsb25nZXIgcGllY2UuXG4gICAgbWluUGllY2VzLnNvcnQoY21wTGVuUmV2KTtcbiAgICBzaG9ydFBpZWNlcy5zb3J0KGNtcExlblJldik7XG4gICAgbG9uZ1BpZWNlcy5zb3J0KGNtcExlblJldik7XG4gICAgbWl4ZWRQaWVjZXMuc29ydChjbXBMZW5SZXYpO1xuICAgIGZvciAoaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgc2hvcnRQaWVjZXNbaV0gPSByZWdleEVzY2FwZShzaG9ydFBpZWNlc1tpXSk7XG4gICAgICAgIGxvbmdQaWVjZXNbaV0gPSByZWdleEVzY2FwZShsb25nUGllY2VzW2ldKTtcbiAgICAgICAgbWl4ZWRQaWVjZXNbaV0gPSByZWdleEVzY2FwZShtaXhlZFBpZWNlc1tpXSk7XG4gICAgfVxuXG4gICAgdGhpcy5fd2Vla2RheXNSZWdleCA9IG5ldyBSZWdFeHAoJ14oJyArIG1peGVkUGllY2VzLmpvaW4oJ3wnKSArICcpJywgJ2knKTtcbiAgICB0aGlzLl93ZWVrZGF5c1Nob3J0UmVnZXggPSB0aGlzLl93ZWVrZGF5c1JlZ2V4O1xuICAgIHRoaXMuX3dlZWtkYXlzTWluUmVnZXggPSB0aGlzLl93ZWVrZGF5c1JlZ2V4O1xuXG4gICAgdGhpcy5fd2Vla2RheXNTdHJpY3RSZWdleCA9IG5ldyBSZWdFeHAoJ14oJyArIGxvbmdQaWVjZXMuam9pbignfCcpICsgJyknLCAnaScpO1xuICAgIHRoaXMuX3dlZWtkYXlzU2hvcnRTdHJpY3RSZWdleCA9IG5ldyBSZWdFeHAoJ14oJyArIHNob3J0UGllY2VzLmpvaW4oJ3wnKSArICcpJywgJ2knKTtcbiAgICB0aGlzLl93ZWVrZGF5c01pblN0cmljdFJlZ2V4ID0gbmV3IFJlZ0V4cCgnXignICsgbWluUGllY2VzLmpvaW4oJ3wnKSArICcpJywgJ2knKTtcbn1cblxuLy8gRk9STUFUVElOR1xuXG5mdW5jdGlvbiBoRm9ybWF0KCkge1xuICAgIHJldHVybiB0aGlzLmhvdXJzKCkgJSAxMiB8fCAxMjtcbn1cblxuZnVuY3Rpb24ga0Zvcm1hdCgpIHtcbiAgICByZXR1cm4gdGhpcy5ob3VycygpIHx8IDI0O1xufVxuXG5hZGRGb3JtYXRUb2tlbignSCcsIFsnSEgnLCAyXSwgMCwgJ2hvdXInKTtcbmFkZEZvcm1hdFRva2VuKCdoJywgWydoaCcsIDJdLCAwLCBoRm9ybWF0KTtcbmFkZEZvcm1hdFRva2VuKCdrJywgWydraycsIDJdLCAwLCBrRm9ybWF0KTtcblxuYWRkRm9ybWF0VG9rZW4oJ2htbScsIDAsIDAsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJycgKyBoRm9ybWF0LmFwcGx5KHRoaXMpICsgemVyb0ZpbGwodGhpcy5taW51dGVzKCksIDIpO1xufSk7XG5cbmFkZEZvcm1hdFRva2VuKCdobW1zcycsIDAsIDAsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJycgKyBoRm9ybWF0LmFwcGx5KHRoaXMpICsgemVyb0ZpbGwodGhpcy5taW51dGVzKCksIDIpICtcbiAgICAgICAgemVyb0ZpbGwodGhpcy5zZWNvbmRzKCksIDIpO1xufSk7XG5cbmFkZEZvcm1hdFRva2VuKCdIbW0nLCAwLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcnICsgdGhpcy5ob3VycygpICsgemVyb0ZpbGwodGhpcy5taW51dGVzKCksIDIpO1xufSk7XG5cbmFkZEZvcm1hdFRva2VuKCdIbW1zcycsIDAsIDAsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJycgKyB0aGlzLmhvdXJzKCkgKyB6ZXJvRmlsbCh0aGlzLm1pbnV0ZXMoKSwgMikgK1xuICAgICAgICB6ZXJvRmlsbCh0aGlzLnNlY29uZHMoKSwgMik7XG59KTtcblxuZnVuY3Rpb24gbWVyaWRpZW0gKHRva2VuLCBsb3dlcmNhc2UpIHtcbiAgICBhZGRGb3JtYXRUb2tlbih0b2tlbiwgMCwgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgbG93ZXJjYXNlKTtcbiAgICB9KTtcbn1cblxubWVyaWRpZW0oJ2EnLCB0cnVlKTtcbm1lcmlkaWVtKCdBJywgZmFsc2UpO1xuXG4vLyBBTElBU0VTXG5cbmFkZFVuaXRBbGlhcygnaG91cicsICdoJyk7XG5cbi8vIFBSSU9SSVRZXG5hZGRVbml0UHJpb3JpdHkoJ2hvdXInLCAxMyk7XG5cbi8vIFBBUlNJTkdcblxuZnVuY3Rpb24gbWF0Y2hNZXJpZGllbSAoaXNTdHJpY3QsIGxvY2FsZSkge1xuICAgIHJldHVybiBsb2NhbGUuX21lcmlkaWVtUGFyc2U7XG59XG5cbmFkZFJlZ2V4VG9rZW4oJ2EnLCAgbWF0Y2hNZXJpZGllbSk7XG5hZGRSZWdleFRva2VuKCdBJywgIG1hdGNoTWVyaWRpZW0pO1xuYWRkUmVnZXhUb2tlbignSCcsICBtYXRjaDF0bzIpO1xuYWRkUmVnZXhUb2tlbignaCcsICBtYXRjaDF0bzIpO1xuYWRkUmVnZXhUb2tlbignaycsICBtYXRjaDF0bzIpO1xuYWRkUmVnZXhUb2tlbignSEgnLCBtYXRjaDF0bzIsIG1hdGNoMik7XG5hZGRSZWdleFRva2VuKCdoaCcsIG1hdGNoMXRvMiwgbWF0Y2gyKTtcbmFkZFJlZ2V4VG9rZW4oJ2trJywgbWF0Y2gxdG8yLCBtYXRjaDIpO1xuXG5hZGRSZWdleFRva2VuKCdobW0nLCBtYXRjaDN0bzQpO1xuYWRkUmVnZXhUb2tlbignaG1tc3MnLCBtYXRjaDV0bzYpO1xuYWRkUmVnZXhUb2tlbignSG1tJywgbWF0Y2gzdG80KTtcbmFkZFJlZ2V4VG9rZW4oJ0htbXNzJywgbWF0Y2g1dG82KTtcblxuYWRkUGFyc2VUb2tlbihbJ0gnLCAnSEgnXSwgSE9VUik7XG5hZGRQYXJzZVRva2VuKFsnaycsICdrayddLCBmdW5jdGlvbiAoaW5wdXQsIGFycmF5LCBjb25maWcpIHtcbiAgICB2YXIga0lucHV0ID0gdG9JbnQoaW5wdXQpO1xuICAgIGFycmF5W0hPVVJdID0ga0lucHV0ID09PSAyNCA/IDAgOiBrSW5wdXQ7XG59KTtcbmFkZFBhcnNlVG9rZW4oWydhJywgJ0EnXSwgZnVuY3Rpb24gKGlucHV0LCBhcnJheSwgY29uZmlnKSB7XG4gICAgY29uZmlnLl9pc1BtID0gY29uZmlnLl9sb2NhbGUuaXNQTShpbnB1dCk7XG4gICAgY29uZmlnLl9tZXJpZGllbSA9IGlucHV0O1xufSk7XG5hZGRQYXJzZVRva2VuKFsnaCcsICdoaCddLCBmdW5jdGlvbiAoaW5wdXQsIGFycmF5LCBjb25maWcpIHtcbiAgICBhcnJheVtIT1VSXSA9IHRvSW50KGlucHV0KTtcbiAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5iaWdIb3VyID0gdHJ1ZTtcbn0pO1xuYWRkUGFyc2VUb2tlbignaG1tJywgZnVuY3Rpb24gKGlucHV0LCBhcnJheSwgY29uZmlnKSB7XG4gICAgdmFyIHBvcyA9IGlucHV0Lmxlbmd0aCAtIDI7XG4gICAgYXJyYXlbSE9VUl0gPSB0b0ludChpbnB1dC5zdWJzdHIoMCwgcG9zKSk7XG4gICAgYXJyYXlbTUlOVVRFXSA9IHRvSW50KGlucHV0LnN1YnN0cihwb3MpKTtcbiAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5iaWdIb3VyID0gdHJ1ZTtcbn0pO1xuYWRkUGFyc2VUb2tlbignaG1tc3MnLCBmdW5jdGlvbiAoaW5wdXQsIGFycmF5LCBjb25maWcpIHtcbiAgICB2YXIgcG9zMSA9IGlucHV0Lmxlbmd0aCAtIDQ7XG4gICAgdmFyIHBvczIgPSBpbnB1dC5sZW5ndGggLSAyO1xuICAgIGFycmF5W0hPVVJdID0gdG9JbnQoaW5wdXQuc3Vic3RyKDAsIHBvczEpKTtcbiAgICBhcnJheVtNSU5VVEVdID0gdG9JbnQoaW5wdXQuc3Vic3RyKHBvczEsIDIpKTtcbiAgICBhcnJheVtTRUNPTkRdID0gdG9JbnQoaW5wdXQuc3Vic3RyKHBvczIpKTtcbiAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5iaWdIb3VyID0gdHJ1ZTtcbn0pO1xuYWRkUGFyc2VUb2tlbignSG1tJywgZnVuY3Rpb24gKGlucHV0LCBhcnJheSwgY29uZmlnKSB7XG4gICAgdmFyIHBvcyA9IGlucHV0Lmxlbmd0aCAtIDI7XG4gICAgYXJyYXlbSE9VUl0gPSB0b0ludChpbnB1dC5zdWJzdHIoMCwgcG9zKSk7XG4gICAgYXJyYXlbTUlOVVRFXSA9IHRvSW50KGlucHV0LnN1YnN0cihwb3MpKTtcbn0pO1xuYWRkUGFyc2VUb2tlbignSG1tc3MnLCBmdW5jdGlvbiAoaW5wdXQsIGFycmF5LCBjb25maWcpIHtcbiAgICB2YXIgcG9zMSA9IGlucHV0Lmxlbmd0aCAtIDQ7XG4gICAgdmFyIHBvczIgPSBpbnB1dC5sZW5ndGggLSAyO1xuICAgIGFycmF5W0hPVVJdID0gdG9JbnQoaW5wdXQuc3Vic3RyKDAsIHBvczEpKTtcbiAgICBhcnJheVtNSU5VVEVdID0gdG9JbnQoaW5wdXQuc3Vic3RyKHBvczEsIDIpKTtcbiAgICBhcnJheVtTRUNPTkRdID0gdG9JbnQoaW5wdXQuc3Vic3RyKHBvczIpKTtcbn0pO1xuXG4vLyBMT0NBTEVTXG5cbmZ1bmN0aW9uIGxvY2FsZUlzUE0gKGlucHV0KSB7XG4gICAgLy8gSUU4IFF1aXJrcyBNb2RlICYgSUU3IFN0YW5kYXJkcyBNb2RlIGRvIG5vdCBhbGxvdyBhY2Nlc3Npbmcgc3RyaW5ncyBsaWtlIGFycmF5c1xuICAgIC8vIFVzaW5nIGNoYXJBdCBzaG91bGQgYmUgbW9yZSBjb21wYXRpYmxlLlxuICAgIHJldHVybiAoKGlucHV0ICsgJycpLnRvTG93ZXJDYXNlKCkuY2hhckF0KDApID09PSAncCcpO1xufVxuXG52YXIgZGVmYXVsdExvY2FsZU1lcmlkaWVtUGFyc2UgPSAvW2FwXVxcLj9tP1xcLj8vaTtcbmZ1bmN0aW9uIGxvY2FsZU1lcmlkaWVtIChob3VycywgbWludXRlcywgaXNMb3dlcikge1xuICAgIGlmIChob3VycyA+IDExKSB7XG4gICAgICAgIHJldHVybiBpc0xvd2VyID8gJ3BtJyA6ICdQTSc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGlzTG93ZXIgPyAnYW0nIDogJ0FNJztcbiAgICB9XG59XG5cblxuLy8gTU9NRU5UU1xuXG4vLyBTZXR0aW5nIHRoZSBob3VyIHNob3VsZCBrZWVwIHRoZSB0aW1lLCBiZWNhdXNlIHRoZSB1c2VyIGV4cGxpY2l0bHlcbi8vIHNwZWNpZmllZCB3aGljaCBob3VyIGhlIHdhbnRzLiBTbyB0cnlpbmcgdG8gbWFpbnRhaW4gdGhlIHNhbWUgaG91ciAoaW5cbi8vIGEgbmV3IHRpbWV6b25lKSBtYWtlcyBzZW5zZS4gQWRkaW5nL3N1YnRyYWN0aW5nIGhvdXJzIGRvZXMgbm90IGZvbGxvd1xuLy8gdGhpcyBydWxlLlxudmFyIGdldFNldEhvdXIgPSBtYWtlR2V0U2V0KCdIb3VycycsIHRydWUpO1xuXG52YXIgYmFzZUNvbmZpZyA9IHtcbiAgICBjYWxlbmRhcjogZGVmYXVsdENhbGVuZGFyLFxuICAgIGxvbmdEYXRlRm9ybWF0OiBkZWZhdWx0TG9uZ0RhdGVGb3JtYXQsXG4gICAgaW52YWxpZERhdGU6IGRlZmF1bHRJbnZhbGlkRGF0ZSxcbiAgICBvcmRpbmFsOiBkZWZhdWx0T3JkaW5hbCxcbiAgICBkYXlPZk1vbnRoT3JkaW5hbFBhcnNlOiBkZWZhdWx0RGF5T2ZNb250aE9yZGluYWxQYXJzZSxcbiAgICByZWxhdGl2ZVRpbWU6IGRlZmF1bHRSZWxhdGl2ZVRpbWUsXG5cbiAgICBtb250aHM6IGRlZmF1bHRMb2NhbGVNb250aHMsXG4gICAgbW9udGhzU2hvcnQ6IGRlZmF1bHRMb2NhbGVNb250aHNTaG9ydCxcblxuICAgIHdlZWs6IGRlZmF1bHRMb2NhbGVXZWVrLFxuXG4gICAgd2Vla2RheXM6IGRlZmF1bHRMb2NhbGVXZWVrZGF5cyxcbiAgICB3ZWVrZGF5c01pbjogZGVmYXVsdExvY2FsZVdlZWtkYXlzTWluLFxuICAgIHdlZWtkYXlzU2hvcnQ6IGRlZmF1bHRMb2NhbGVXZWVrZGF5c1Nob3J0LFxuXG4gICAgbWVyaWRpZW1QYXJzZTogZGVmYXVsdExvY2FsZU1lcmlkaWVtUGFyc2Vcbn07XG5cbi8vIGludGVybmFsIHN0b3JhZ2UgZm9yIGxvY2FsZSBjb25maWcgZmlsZXNcbnZhciBsb2NhbGVzID0ge307XG52YXIgbG9jYWxlRmFtaWxpZXMgPSB7fTtcbnZhciBnbG9iYWxMb2NhbGU7XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUxvY2FsZShrZXkpIHtcbiAgICByZXR1cm4ga2V5ID8ga2V5LnRvTG93ZXJDYXNlKCkucmVwbGFjZSgnXycsICctJykgOiBrZXk7XG59XG5cbi8vIHBpY2sgdGhlIGxvY2FsZSBmcm9tIHRoZSBhcnJheVxuLy8gdHJ5IFsnZW4tYXUnLCAnZW4tZ2InXSBhcyAnZW4tYXUnLCAnZW4tZ2InLCAnZW4nLCBhcyBpbiBtb3ZlIHRocm91Z2ggdGhlIGxpc3QgdHJ5aW5nIGVhY2hcbi8vIHN1YnN0cmluZyBmcm9tIG1vc3Qgc3BlY2lmaWMgdG8gbGVhc3QsIGJ1dCBtb3ZlIHRvIHRoZSBuZXh0IGFycmF5IGl0ZW0gaWYgaXQncyBhIG1vcmUgc3BlY2lmaWMgdmFyaWFudCB0aGFuIHRoZSBjdXJyZW50IHJvb3RcbmZ1bmN0aW9uIGNob29zZUxvY2FsZShuYW1lcykge1xuICAgIHZhciBpID0gMCwgaiwgbmV4dCwgbG9jYWxlLCBzcGxpdDtcblxuICAgIHdoaWxlIChpIDwgbmFtZXMubGVuZ3RoKSB7XG4gICAgICAgIHNwbGl0ID0gbm9ybWFsaXplTG9jYWxlKG5hbWVzW2ldKS5zcGxpdCgnLScpO1xuICAgICAgICBqID0gc3BsaXQubGVuZ3RoO1xuICAgICAgICBuZXh0ID0gbm9ybWFsaXplTG9jYWxlKG5hbWVzW2kgKyAxXSk7XG4gICAgICAgIG5leHQgPSBuZXh0ID8gbmV4dC5zcGxpdCgnLScpIDogbnVsbDtcbiAgICAgICAgd2hpbGUgKGogPiAwKSB7XG4gICAgICAgICAgICBsb2NhbGUgPSBsb2FkTG9jYWxlKHNwbGl0LnNsaWNlKDAsIGopLmpvaW4oJy0nKSk7XG4gICAgICAgICAgICBpZiAobG9jYWxlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXh0ICYmIG5leHQubGVuZ3RoID49IGogJiYgY29tcGFyZUFycmF5cyhzcGxpdCwgbmV4dCwgdHJ1ZSkgPj0gaiAtIDEpIHtcbiAgICAgICAgICAgICAgICAvL3RoZSBuZXh0IGFycmF5IGl0ZW0gaXMgYmV0dGVyIHRoYW4gYSBzaGFsbG93ZXIgc3Vic3RyaW5nIG9mIHRoaXMgb25lXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqLS07XG4gICAgICAgIH1cbiAgICAgICAgaSsrO1xuICAgIH1cbiAgICByZXR1cm4gZ2xvYmFsTG9jYWxlO1xufVxuXG5mdW5jdGlvbiBsb2FkTG9jYWxlKG5hbWUpIHtcbiAgICB2YXIgb2xkTG9jYWxlID0gbnVsbDtcbiAgICAvLyBUT0RPOiBGaW5kIGEgYmV0dGVyIHdheSB0byByZWdpc3RlciBhbmQgbG9hZCBhbGwgdGhlIGxvY2FsZXMgaW4gTm9kZVxuICAgIGlmICghbG9jYWxlc1tuYW1lXSAmJiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpICYmXG4gICAgICAgICAgICBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG9sZExvY2FsZSA9IGdsb2JhbExvY2FsZS5fYWJicjtcbiAgICAgICAgICAgIHZhciBhbGlhc2VkUmVxdWlyZSA9IHJlcXVpcmU7XG4gICAgICAgICAgICBhbGlhc2VkUmVxdWlyZSgnLi9sb2NhbGUvJyArIG5hbWUpO1xuICAgICAgICAgICAgZ2V0U2V0R2xvYmFsTG9jYWxlKG9sZExvY2FsZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICAgIHJldHVybiBsb2NhbGVzW25hbWVdO1xufVxuXG4vLyBUaGlzIGZ1bmN0aW9uIHdpbGwgbG9hZCBsb2NhbGUgYW5kIHRoZW4gc2V0IHRoZSBnbG9iYWwgbG9jYWxlLiAgSWZcbi8vIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluLCBpdCB3aWxsIHNpbXBseSByZXR1cm4gdGhlIGN1cnJlbnQgZ2xvYmFsXG4vLyBsb2NhbGUga2V5LlxuZnVuY3Rpb24gZ2V0U2V0R2xvYmFsTG9jYWxlIChrZXksIHZhbHVlcykge1xuICAgIHZhciBkYXRhO1xuICAgIGlmIChrZXkpIHtcbiAgICAgICAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlcykpIHtcbiAgICAgICAgICAgIGRhdGEgPSBnZXRMb2NhbGUoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBkZWZpbmVMb2NhbGUoa2V5LCB2YWx1ZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIC8vIG1vbWVudC5kdXJhdGlvbi5fbG9jYWxlID0gbW9tZW50Ll9sb2NhbGUgPSBkYXRhO1xuICAgICAgICAgICAgZ2xvYmFsTG9jYWxlID0gZGF0YTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICgodHlwZW9mIGNvbnNvbGUgIT09ICAndW5kZWZpbmVkJykgJiYgY29uc29sZS53YXJuKSB7XG4gICAgICAgICAgICAgICAgLy93YXJuIHVzZXIgaWYgYXJndW1lbnRzIGFyZSBwYXNzZWQgYnV0IHRoZSBsb2NhbGUgY291bGQgbm90IGJlIHNldFxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignTG9jYWxlICcgKyBrZXkgKyAgJyBub3QgZm91bmQuIERpZCB5b3UgZm9yZ2V0IHRvIGxvYWQgaXQ/Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZ2xvYmFsTG9jYWxlLl9hYmJyO1xufVxuXG5mdW5jdGlvbiBkZWZpbmVMb2NhbGUgKG5hbWUsIGNvbmZpZykge1xuICAgIGlmIChjb25maWcgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIGxvY2FsZSwgcGFyZW50Q29uZmlnID0gYmFzZUNvbmZpZztcbiAgICAgICAgY29uZmlnLmFiYnIgPSBuYW1lO1xuICAgICAgICBpZiAobG9jYWxlc1tuYW1lXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBkZXByZWNhdGVTaW1wbGUoJ2RlZmluZUxvY2FsZU92ZXJyaWRlJyxcbiAgICAgICAgICAgICAgICAgICAgJ3VzZSBtb21lbnQudXBkYXRlTG9jYWxlKGxvY2FsZU5hbWUsIGNvbmZpZykgdG8gY2hhbmdlICcgK1xuICAgICAgICAgICAgICAgICAgICAnYW4gZXhpc3RpbmcgbG9jYWxlLiBtb21lbnQuZGVmaW5lTG9jYWxlKGxvY2FsZU5hbWUsICcgK1xuICAgICAgICAgICAgICAgICAgICAnY29uZmlnKSBzaG91bGQgb25seSBiZSB1c2VkIGZvciBjcmVhdGluZyBhIG5ldyBsb2NhbGUgJyArXG4gICAgICAgICAgICAgICAgICAgICdTZWUgaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9kZWZpbmUtbG9jYWxlLyBmb3IgbW9yZSBpbmZvLicpO1xuICAgICAgICAgICAgcGFyZW50Q29uZmlnID0gbG9jYWxlc1tuYW1lXS5fY29uZmlnO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbmZpZy5wYXJlbnRMb2NhbGUgIT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGxvY2FsZXNbY29uZmlnLnBhcmVudExvY2FsZV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHBhcmVudENvbmZpZyA9IGxvY2FsZXNbY29uZmlnLnBhcmVudExvY2FsZV0uX2NvbmZpZztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9jYWxlID0gbG9hZExvY2FsZShjb25maWcucGFyZW50TG9jYWxlKTtcbiAgICAgICAgICAgICAgICBpZiAobG9jYWxlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50Q29uZmlnID0gbG9jYWxlLl9jb25maWc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFsb2NhbGVGYW1pbGllc1tjb25maWcucGFyZW50TG9jYWxlXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxlRmFtaWxpZXNbY29uZmlnLnBhcmVudExvY2FsZV0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsb2NhbGVGYW1pbGllc1tjb25maWcucGFyZW50TG9jYWxlXS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWc6IGNvbmZpZ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxvY2FsZXNbbmFtZV0gPSBuZXcgTG9jYWxlKG1lcmdlQ29uZmlncyhwYXJlbnRDb25maWcsIGNvbmZpZykpO1xuXG4gICAgICAgIGlmIChsb2NhbGVGYW1pbGllc1tuYW1lXSkge1xuICAgICAgICAgICAgbG9jYWxlRmFtaWxpZXNbbmFtZV0uZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIGRlZmluZUxvY2FsZSh4Lm5hbWUsIHguY29uZmlnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYmFja3dhcmRzIGNvbXBhdCBmb3Igbm93OiBhbHNvIHNldCB0aGUgbG9jYWxlXG4gICAgICAgIC8vIG1ha2Ugc3VyZSB3ZSBzZXQgdGhlIGxvY2FsZSBBRlRFUiBhbGwgY2hpbGQgbG9jYWxlcyBoYXZlIGJlZW5cbiAgICAgICAgLy8gY3JlYXRlZCwgc28gd2Ugd29uJ3QgZW5kIHVwIHdpdGggdGhlIGNoaWxkIGxvY2FsZSBzZXQuXG4gICAgICAgIGdldFNldEdsb2JhbExvY2FsZShuYW1lKTtcblxuXG4gICAgICAgIHJldHVybiBsb2NhbGVzW25hbWVdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHVzZWZ1bCBmb3IgdGVzdGluZ1xuICAgICAgICBkZWxldGUgbG9jYWxlc1tuYW1lXTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVMb2NhbGUobmFtZSwgY29uZmlnKSB7XG4gICAgaWYgKGNvbmZpZyAhPSBudWxsKSB7XG4gICAgICAgIHZhciBsb2NhbGUsIHRtcExvY2FsZSwgcGFyZW50Q29uZmlnID0gYmFzZUNvbmZpZztcbiAgICAgICAgLy8gTUVSR0VcbiAgICAgICAgdG1wTG9jYWxlID0gbG9hZExvY2FsZShuYW1lKTtcbiAgICAgICAgaWYgKHRtcExvY2FsZSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwYXJlbnRDb25maWcgPSB0bXBMb2NhbGUuX2NvbmZpZztcbiAgICAgICAgfVxuICAgICAgICBjb25maWcgPSBtZXJnZUNvbmZpZ3MocGFyZW50Q29uZmlnLCBjb25maWcpO1xuICAgICAgICBsb2NhbGUgPSBuZXcgTG9jYWxlKGNvbmZpZyk7XG4gICAgICAgIGxvY2FsZS5wYXJlbnRMb2NhbGUgPSBsb2NhbGVzW25hbWVdO1xuICAgICAgICBsb2NhbGVzW25hbWVdID0gbG9jYWxlO1xuXG4gICAgICAgIC8vIGJhY2t3YXJkcyBjb21wYXQgZm9yIG5vdzogYWxzbyBzZXQgdGhlIGxvY2FsZVxuICAgICAgICBnZXRTZXRHbG9iYWxMb2NhbGUobmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcGFzcyBudWxsIGZvciBjb25maWcgdG8gdW51cGRhdGUsIHVzZWZ1bCBmb3IgdGVzdHNcbiAgICAgICAgaWYgKGxvY2FsZXNbbmFtZV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGxvY2FsZXNbbmFtZV0ucGFyZW50TG9jYWxlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBsb2NhbGVzW25hbWVdID0gbG9jYWxlc1tuYW1lXS5wYXJlbnRMb2NhbGU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxvY2FsZXNbbmFtZV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBsb2NhbGVzW25hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsb2NhbGVzW25hbWVdO1xufVxuXG4vLyByZXR1cm5zIGxvY2FsZSBkYXRhXG5mdW5jdGlvbiBnZXRMb2NhbGUgKGtleSkge1xuICAgIHZhciBsb2NhbGU7XG5cbiAgICBpZiAoa2V5ICYmIGtleS5fbG9jYWxlICYmIGtleS5fbG9jYWxlLl9hYmJyKSB7XG4gICAgICAgIGtleSA9IGtleS5fbG9jYWxlLl9hYmJyO1xuICAgIH1cblxuICAgIGlmICgha2V5KSB7XG4gICAgICAgIHJldHVybiBnbG9iYWxMb2NhbGU7XG4gICAgfVxuXG4gICAgaWYgKCFpc0FycmF5KGtleSkpIHtcbiAgICAgICAgLy9zaG9ydC1jaXJjdWl0IGV2ZXJ5dGhpbmcgZWxzZVxuICAgICAgICBsb2NhbGUgPSBsb2FkTG9jYWxlKGtleSk7XG4gICAgICAgIGlmIChsb2NhbGUpIHtcbiAgICAgICAgICAgIHJldHVybiBsb2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAga2V5ID0gW2tleV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGNob29zZUxvY2FsZShrZXkpO1xufVxuXG5mdW5jdGlvbiBsaXN0TG9jYWxlcygpIHtcbiAgICByZXR1cm4ga2V5cyhsb2NhbGVzKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tPdmVyZmxvdyAobSkge1xuICAgIHZhciBvdmVyZmxvdztcbiAgICB2YXIgYSA9IG0uX2E7XG5cbiAgICBpZiAoYSAmJiBnZXRQYXJzaW5nRmxhZ3MobSkub3ZlcmZsb3cgPT09IC0yKSB7XG4gICAgICAgIG92ZXJmbG93ID1cbiAgICAgICAgICAgIGFbTU9OVEhdICAgICAgIDwgMCB8fCBhW01PTlRIXSAgICAgICA+IDExICA/IE1PTlRIIDpcbiAgICAgICAgICAgIGFbREFURV0gICAgICAgIDwgMSB8fCBhW0RBVEVdICAgICAgICA+IGRheXNJbk1vbnRoKGFbWUVBUl0sIGFbTU9OVEhdKSA/IERBVEUgOlxuICAgICAgICAgICAgYVtIT1VSXSAgICAgICAgPCAwIHx8IGFbSE9VUl0gICAgICAgID4gMjQgfHwgKGFbSE9VUl0gPT09IDI0ICYmIChhW01JTlVURV0gIT09IDAgfHwgYVtTRUNPTkRdICE9PSAwIHx8IGFbTUlMTElTRUNPTkRdICE9PSAwKSkgPyBIT1VSIDpcbiAgICAgICAgICAgIGFbTUlOVVRFXSAgICAgIDwgMCB8fCBhW01JTlVURV0gICAgICA+IDU5ICA/IE1JTlVURSA6XG4gICAgICAgICAgICBhW1NFQ09ORF0gICAgICA8IDAgfHwgYVtTRUNPTkRdICAgICAgPiA1OSAgPyBTRUNPTkQgOlxuICAgICAgICAgICAgYVtNSUxMSVNFQ09ORF0gPCAwIHx8IGFbTUlMTElTRUNPTkRdID4gOTk5ID8gTUlMTElTRUNPTkQgOlxuICAgICAgICAgICAgLTE7XG5cbiAgICAgICAgaWYgKGdldFBhcnNpbmdGbGFncyhtKS5fb3ZlcmZsb3dEYXlPZlllYXIgJiYgKG92ZXJmbG93IDwgWUVBUiB8fCBvdmVyZmxvdyA+IERBVEUpKSB7XG4gICAgICAgICAgICBvdmVyZmxvdyA9IERBVEU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGdldFBhcnNpbmdGbGFncyhtKS5fb3ZlcmZsb3dXZWVrcyAmJiBvdmVyZmxvdyA9PT0gLTEpIHtcbiAgICAgICAgICAgIG92ZXJmbG93ID0gV0VFSztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZ2V0UGFyc2luZ0ZsYWdzKG0pLl9vdmVyZmxvd1dlZWtkYXkgJiYgb3ZlcmZsb3cgPT09IC0xKSB7XG4gICAgICAgICAgICBvdmVyZmxvdyA9IFdFRUtEQVk7XG4gICAgICAgIH1cblxuICAgICAgICBnZXRQYXJzaW5nRmxhZ3MobSkub3ZlcmZsb3cgPSBvdmVyZmxvdztcbiAgICB9XG5cbiAgICByZXR1cm4gbTtcbn1cblxuLy8gUGljayB0aGUgZmlyc3QgZGVmaW5lZCBvZiB0d28gb3IgdGhyZWUgYXJndW1lbnRzLlxuZnVuY3Rpb24gZGVmYXVsdHMoYSwgYiwgYykge1xuICAgIGlmIChhICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICAgIGlmIChiICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGI7XG4gICAgfVxuICAgIHJldHVybiBjO1xufVxuXG5mdW5jdGlvbiBjdXJyZW50RGF0ZUFycmF5KGNvbmZpZykge1xuICAgIC8vIGhvb2tzIGlzIGFjdHVhbGx5IHRoZSBleHBvcnRlZCBtb21lbnQgb2JqZWN0XG4gICAgdmFyIG5vd1ZhbHVlID0gbmV3IERhdGUoaG9va3Mubm93KCkpO1xuICAgIGlmIChjb25maWcuX3VzZVVUQykge1xuICAgICAgICByZXR1cm4gW25vd1ZhbHVlLmdldFVUQ0Z1bGxZZWFyKCksIG5vd1ZhbHVlLmdldFVUQ01vbnRoKCksIG5vd1ZhbHVlLmdldFVUQ0RhdGUoKV07XG4gICAgfVxuICAgIHJldHVybiBbbm93VmFsdWUuZ2V0RnVsbFllYXIoKSwgbm93VmFsdWUuZ2V0TW9udGgoKSwgbm93VmFsdWUuZ2V0RGF0ZSgpXTtcbn1cblxuLy8gY29udmVydCBhbiBhcnJheSB0byBhIGRhdGUuXG4vLyB0aGUgYXJyYXkgc2hvdWxkIG1pcnJvciB0aGUgcGFyYW1ldGVycyBiZWxvd1xuLy8gbm90ZTogYWxsIHZhbHVlcyBwYXN0IHRoZSB5ZWFyIGFyZSBvcHRpb25hbCBhbmQgd2lsbCBkZWZhdWx0IHRvIHRoZSBsb3dlc3QgcG9zc2libGUgdmFsdWUuXG4vLyBbeWVhciwgbW9udGgsIGRheSAsIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtaWxsaXNlY29uZF1cbmZ1bmN0aW9uIGNvbmZpZ0Zyb21BcnJheSAoY29uZmlnKSB7XG4gICAgdmFyIGksIGRhdGUsIGlucHV0ID0gW10sIGN1cnJlbnREYXRlLCBleHBlY3RlZFdlZWtkYXksIHllYXJUb1VzZTtcblxuICAgIGlmIChjb25maWcuX2QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGN1cnJlbnREYXRlID0gY3VycmVudERhdGVBcnJheShjb25maWcpO1xuXG4gICAgLy9jb21wdXRlIGRheSBvZiB0aGUgeWVhciBmcm9tIHdlZWtzIGFuZCB3ZWVrZGF5c1xuICAgIGlmIChjb25maWcuX3cgJiYgY29uZmlnLl9hW0RBVEVdID09IG51bGwgJiYgY29uZmlnLl9hW01PTlRIXSA9PSBudWxsKSB7XG4gICAgICAgIGRheU9mWWVhckZyb21XZWVrSW5mbyhjb25maWcpO1xuICAgIH1cblxuICAgIC8vaWYgdGhlIGRheSBvZiB0aGUgeWVhciBpcyBzZXQsIGZpZ3VyZSBvdXQgd2hhdCBpdCBpc1xuICAgIGlmIChjb25maWcuX2RheU9mWWVhciAhPSBudWxsKSB7XG4gICAgICAgIHllYXJUb1VzZSA9IGRlZmF1bHRzKGNvbmZpZy5fYVtZRUFSXSwgY3VycmVudERhdGVbWUVBUl0pO1xuXG4gICAgICAgIGlmIChjb25maWcuX2RheU9mWWVhciA+IGRheXNJblllYXIoeWVhclRvVXNlKSB8fCBjb25maWcuX2RheU9mWWVhciA9PT0gMCkge1xuICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykuX292ZXJmbG93RGF5T2ZZZWFyID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRhdGUgPSBjcmVhdGVVVENEYXRlKHllYXJUb1VzZSwgMCwgY29uZmlnLl9kYXlPZlllYXIpO1xuICAgICAgICBjb25maWcuX2FbTU9OVEhdID0gZGF0ZS5nZXRVVENNb250aCgpO1xuICAgICAgICBjb25maWcuX2FbREFURV0gPSBkYXRlLmdldFVUQ0RhdGUoKTtcbiAgICB9XG5cbiAgICAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgZGF0ZS5cbiAgICAvLyAqIGlmIG5vIHllYXIsIG1vbnRoLCBkYXkgb2YgbW9udGggYXJlIGdpdmVuLCBkZWZhdWx0IHRvIHRvZGF5XG4gICAgLy8gKiBpZiBkYXkgb2YgbW9udGggaXMgZ2l2ZW4sIGRlZmF1bHQgbW9udGggYW5kIHllYXJcbiAgICAvLyAqIGlmIG1vbnRoIGlzIGdpdmVuLCBkZWZhdWx0IG9ubHkgeWVhclxuICAgIC8vICogaWYgeWVhciBpcyBnaXZlbiwgZG9uJ3QgZGVmYXVsdCBhbnl0aGluZ1xuICAgIGZvciAoaSA9IDA7IGkgPCAzICYmIGNvbmZpZy5fYVtpXSA9PSBudWxsOyArK2kpIHtcbiAgICAgICAgY29uZmlnLl9hW2ldID0gaW5wdXRbaV0gPSBjdXJyZW50RGF0ZVtpXTtcbiAgICB9XG5cbiAgICAvLyBaZXJvIG91dCB3aGF0ZXZlciB3YXMgbm90IGRlZmF1bHRlZCwgaW5jbHVkaW5nIHRpbWVcbiAgICBmb3IgKDsgaSA8IDc7IGkrKykge1xuICAgICAgICBjb25maWcuX2FbaV0gPSBpbnB1dFtpXSA9IChjb25maWcuX2FbaV0gPT0gbnVsbCkgPyAoaSA9PT0gMiA/IDEgOiAwKSA6IGNvbmZpZy5fYVtpXTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgMjQ6MDA6MDAuMDAwXG4gICAgaWYgKGNvbmZpZy5fYVtIT1VSXSA9PT0gMjQgJiZcbiAgICAgICAgICAgIGNvbmZpZy5fYVtNSU5VVEVdID09PSAwICYmXG4gICAgICAgICAgICBjb25maWcuX2FbU0VDT05EXSA9PT0gMCAmJlxuICAgICAgICAgICAgY29uZmlnLl9hW01JTExJU0VDT05EXSA9PT0gMCkge1xuICAgICAgICBjb25maWcuX25leHREYXkgPSB0cnVlO1xuICAgICAgICBjb25maWcuX2FbSE9VUl0gPSAwO1xuICAgIH1cblxuICAgIGNvbmZpZy5fZCA9IChjb25maWcuX3VzZVVUQyA/IGNyZWF0ZVVUQ0RhdGUgOiBjcmVhdGVEYXRlKS5hcHBseShudWxsLCBpbnB1dCk7XG4gICAgZXhwZWN0ZWRXZWVrZGF5ID0gY29uZmlnLl91c2VVVEMgPyBjb25maWcuX2QuZ2V0VVRDRGF5KCkgOiBjb25maWcuX2QuZ2V0RGF5KCk7XG5cbiAgICAvLyBBcHBseSB0aW1lem9uZSBvZmZzZXQgZnJvbSBpbnB1dC4gVGhlIGFjdHVhbCB1dGNPZmZzZXQgY2FuIGJlIGNoYW5nZWRcbiAgICAvLyB3aXRoIHBhcnNlWm9uZS5cbiAgICBpZiAoY29uZmlnLl90em0gIT0gbnVsbCkge1xuICAgICAgICBjb25maWcuX2Quc2V0VVRDTWludXRlcyhjb25maWcuX2QuZ2V0VVRDTWludXRlcygpIC0gY29uZmlnLl90em0pO1xuICAgIH1cblxuICAgIGlmIChjb25maWcuX25leHREYXkpIHtcbiAgICAgICAgY29uZmlnLl9hW0hPVVJdID0gMjQ7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgZm9yIG1pc21hdGNoaW5nIGRheSBvZiB3ZWVrXG4gICAgaWYgKGNvbmZpZy5fdyAmJiB0eXBlb2YgY29uZmlnLl93LmQgIT09ICd1bmRlZmluZWQnICYmIGNvbmZpZy5fdy5kICE9PSBleHBlY3RlZFdlZWtkYXkpIHtcbiAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykud2Vla2RheU1pc21hdGNoID0gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRheU9mWWVhckZyb21XZWVrSW5mbyhjb25maWcpIHtcbiAgICB2YXIgdywgd2Vla1llYXIsIHdlZWssIHdlZWtkYXksIGRvdywgZG95LCB0ZW1wLCB3ZWVrZGF5T3ZlcmZsb3c7XG5cbiAgICB3ID0gY29uZmlnLl93O1xuICAgIGlmICh3LkdHICE9IG51bGwgfHwgdy5XICE9IG51bGwgfHwgdy5FICE9IG51bGwpIHtcbiAgICAgICAgZG93ID0gMTtcbiAgICAgICAgZG95ID0gNDtcblxuICAgICAgICAvLyBUT0RPOiBXZSBuZWVkIHRvIHRha2UgdGhlIGN1cnJlbnQgaXNvV2Vla1llYXIsIGJ1dCB0aGF0IGRlcGVuZHMgb25cbiAgICAgICAgLy8gaG93IHdlIGludGVycHJldCBub3cgKGxvY2FsLCB1dGMsIGZpeGVkIG9mZnNldCkuIFNvIGNyZWF0ZVxuICAgICAgICAvLyBhIG5vdyB2ZXJzaW9uIG9mIGN1cnJlbnQgY29uZmlnICh0YWtlIGxvY2FsL3V0Yy9vZmZzZXQgZmxhZ3MsIGFuZFxuICAgICAgICAvLyBjcmVhdGUgbm93KS5cbiAgICAgICAgd2Vla1llYXIgPSBkZWZhdWx0cyh3LkdHLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIoY3JlYXRlTG9jYWwoKSwgMSwgNCkueWVhcik7XG4gICAgICAgIHdlZWsgPSBkZWZhdWx0cyh3LlcsIDEpO1xuICAgICAgICB3ZWVrZGF5ID0gZGVmYXVsdHMody5FLCAxKTtcbiAgICAgICAgaWYgKHdlZWtkYXkgPCAxIHx8IHdlZWtkYXkgPiA3KSB7XG4gICAgICAgICAgICB3ZWVrZGF5T3ZlcmZsb3cgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZG93ID0gY29uZmlnLl9sb2NhbGUuX3dlZWsuZG93O1xuICAgICAgICBkb3kgPSBjb25maWcuX2xvY2FsZS5fd2Vlay5kb3k7XG5cbiAgICAgICAgdmFyIGN1cldlZWsgPSB3ZWVrT2ZZZWFyKGNyZWF0ZUxvY2FsKCksIGRvdywgZG95KTtcblxuICAgICAgICB3ZWVrWWVhciA9IGRlZmF1bHRzKHcuZ2csIGNvbmZpZy5fYVtZRUFSXSwgY3VyV2Vlay55ZWFyKTtcblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgd2Vlay5cbiAgICAgICAgd2VlayA9IGRlZmF1bHRzKHcudywgY3VyV2Vlay53ZWVrKTtcblxuICAgICAgICBpZiAody5kICE9IG51bGwpIHtcbiAgICAgICAgICAgIC8vIHdlZWtkYXkgLS0gbG93IGRheSBudW1iZXJzIGFyZSBjb25zaWRlcmVkIG5leHQgd2Vla1xuICAgICAgICAgICAgd2Vla2RheSA9IHcuZDtcbiAgICAgICAgICAgIGlmICh3ZWVrZGF5IDwgMCB8fCB3ZWVrZGF5ID4gNikge1xuICAgICAgICAgICAgICAgIHdlZWtkYXlPdmVyZmxvdyA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAody5lICE9IG51bGwpIHtcbiAgICAgICAgICAgIC8vIGxvY2FsIHdlZWtkYXkgLS0gY291bnRpbmcgc3RhcnRzIGZyb20gYmVnaW5pbmcgb2Ygd2Vla1xuICAgICAgICAgICAgd2Vla2RheSA9IHcuZSArIGRvdztcbiAgICAgICAgICAgIGlmICh3LmUgPCAwIHx8IHcuZSA+IDYpIHtcbiAgICAgICAgICAgICAgICB3ZWVrZGF5T3ZlcmZsb3cgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZGVmYXVsdCB0byBiZWdpbmluZyBvZiB3ZWVrXG4gICAgICAgICAgICB3ZWVrZGF5ID0gZG93O1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh3ZWVrIDwgMSB8fCB3ZWVrID4gd2Vla3NJblllYXIod2Vla1llYXIsIGRvdywgZG95KSkge1xuICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5fb3ZlcmZsb3dXZWVrcyA9IHRydWU7XG4gICAgfSBlbHNlIGlmICh3ZWVrZGF5T3ZlcmZsb3cgIT0gbnVsbCkge1xuICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5fb3ZlcmZsb3dXZWVrZGF5ID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0ZW1wID0gZGF5T2ZZZWFyRnJvbVdlZWtzKHdlZWtZZWFyLCB3ZWVrLCB3ZWVrZGF5LCBkb3csIGRveSk7XG4gICAgICAgIGNvbmZpZy5fYVtZRUFSXSA9IHRlbXAueWVhcjtcbiAgICAgICAgY29uZmlnLl9kYXlPZlllYXIgPSB0ZW1wLmRheU9mWWVhcjtcbiAgICB9XG59XG5cbi8vIGlzbyA4NjAxIHJlZ2V4XG4vLyAwMDAwLTAwLTAwIDAwMDAtVzAwIG9yIDAwMDAtVzAwLTAgKyBUICsgMDAgb3IgMDA6MDAgb3IgMDA6MDA6MDAgb3IgMDA6MDA6MDAuMDAwICsgKzAwOjAwIG9yICswMDAwIG9yICswMClcbnZhciBleHRlbmRlZElzb1JlZ2V4ID0gL15cXHMqKCg/OlsrLV1cXGR7Nn18XFxkezR9KS0oPzpcXGRcXGQtXFxkXFxkfFdcXGRcXGQtXFxkfFdcXGRcXGR8XFxkXFxkXFxkfFxcZFxcZCkpKD86KFR8ICkoXFxkXFxkKD86OlxcZFxcZCg/OjpcXGRcXGQoPzpbLixdXFxkKyk/KT8pPykoW1xcK1xcLV1cXGRcXGQoPzo6P1xcZFxcZCk/fFxccypaKT8pPyQvO1xudmFyIGJhc2ljSXNvUmVnZXggPSAvXlxccyooKD86WystXVxcZHs2fXxcXGR7NH0pKD86XFxkXFxkXFxkXFxkfFdcXGRcXGRcXGR8V1xcZFxcZHxcXGRcXGRcXGR8XFxkXFxkKSkoPzooVHwgKShcXGRcXGQoPzpcXGRcXGQoPzpcXGRcXGQoPzpbLixdXFxkKyk/KT8pPykoW1xcK1xcLV1cXGRcXGQoPzo6P1xcZFxcZCk/fFxccypaKT8pPyQvO1xuXG52YXIgdHpSZWdleCA9IC9afFsrLV1cXGRcXGQoPzo6P1xcZFxcZCk/LztcblxudmFyIGlzb0RhdGVzID0gW1xuICAgIFsnWVlZWVlZLU1NLUREJywgL1srLV1cXGR7Nn0tXFxkXFxkLVxcZFxcZC9dLFxuICAgIFsnWVlZWS1NTS1ERCcsIC9cXGR7NH0tXFxkXFxkLVxcZFxcZC9dLFxuICAgIFsnR0dHRy1bV11XVy1FJywgL1xcZHs0fS1XXFxkXFxkLVxcZC9dLFxuICAgIFsnR0dHRy1bV11XVycsIC9cXGR7NH0tV1xcZFxcZC8sIGZhbHNlXSxcbiAgICBbJ1lZWVktREREJywgL1xcZHs0fS1cXGR7M30vXSxcbiAgICBbJ1lZWVktTU0nLCAvXFxkezR9LVxcZFxcZC8sIGZhbHNlXSxcbiAgICBbJ1lZWVlZWU1NREQnLCAvWystXVxcZHsxMH0vXSxcbiAgICBbJ1lZWVlNTUREJywgL1xcZHs4fS9dLFxuICAgIC8vIFlZWVlNTSBpcyBOT1QgYWxsb3dlZCBieSB0aGUgc3RhbmRhcmRcbiAgICBbJ0dHR0dbV11XV0UnLCAvXFxkezR9V1xcZHszfS9dLFxuICAgIFsnR0dHR1tXXVdXJywgL1xcZHs0fVdcXGR7Mn0vLCBmYWxzZV0sXG4gICAgWydZWVlZREREJywgL1xcZHs3fS9dXG5dO1xuXG4vLyBpc28gdGltZSBmb3JtYXRzIGFuZCByZWdleGVzXG52YXIgaXNvVGltZXMgPSBbXG4gICAgWydISDptbTpzcy5TU1NTJywgL1xcZFxcZDpcXGRcXGQ6XFxkXFxkXFwuXFxkKy9dLFxuICAgIFsnSEg6bW06c3MsU1NTUycsIC9cXGRcXGQ6XFxkXFxkOlxcZFxcZCxcXGQrL10sXG4gICAgWydISDptbTpzcycsIC9cXGRcXGQ6XFxkXFxkOlxcZFxcZC9dLFxuICAgIFsnSEg6bW0nLCAvXFxkXFxkOlxcZFxcZC9dLFxuICAgIFsnSEhtbXNzLlNTU1MnLCAvXFxkXFxkXFxkXFxkXFxkXFxkXFwuXFxkKy9dLFxuICAgIFsnSEhtbXNzLFNTU1MnLCAvXFxkXFxkXFxkXFxkXFxkXFxkLFxcZCsvXSxcbiAgICBbJ0hIbW1zcycsIC9cXGRcXGRcXGRcXGRcXGRcXGQvXSxcbiAgICBbJ0hIbW0nLCAvXFxkXFxkXFxkXFxkL10sXG4gICAgWydISCcsIC9cXGRcXGQvXVxuXTtcblxudmFyIGFzcE5ldEpzb25SZWdleCA9IC9eXFwvP0RhdGVcXCgoXFwtP1xcZCspL2k7XG5cbi8vIGRhdGUgZnJvbSBpc28gZm9ybWF0XG5mdW5jdGlvbiBjb25maWdGcm9tSVNPKGNvbmZpZykge1xuICAgIHZhciBpLCBsLFxuICAgICAgICBzdHJpbmcgPSBjb25maWcuX2ksXG4gICAgICAgIG1hdGNoID0gZXh0ZW5kZWRJc29SZWdleC5leGVjKHN0cmluZykgfHwgYmFzaWNJc29SZWdleC5leGVjKHN0cmluZyksXG4gICAgICAgIGFsbG93VGltZSwgZGF0ZUZvcm1hdCwgdGltZUZvcm1hdCwgdHpGb3JtYXQ7XG5cbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykuaXNvID0gdHJ1ZTtcblxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXNvRGF0ZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaXNvRGF0ZXNbaV1bMV0uZXhlYyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICAgICAgICBkYXRlRm9ybWF0ID0gaXNvRGF0ZXNbaV1bMF07XG4gICAgICAgICAgICAgICAgYWxsb3dUaW1lID0gaXNvRGF0ZXNbaV1bMl0gIT09IGZhbHNlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRlRm9ybWF0ID09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbmZpZy5faXNWYWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaFszXSkge1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGlzb1RpbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpc29UaW1lc1tpXVsxXS5leGVjKG1hdGNoWzNdKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYXRjaFsyXSBzaG91bGQgYmUgJ1QnIG9yIHNwYWNlXG4gICAgICAgICAgICAgICAgICAgIHRpbWVGb3JtYXQgPSAobWF0Y2hbMl0gfHwgJyAnKSArIGlzb1RpbWVzW2ldWzBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGltZUZvcm1hdCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9pc1ZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghYWxsb3dUaW1lICYmIHRpbWVGb3JtYXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgY29uZmlnLl9pc1ZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoWzRdKSB7XG4gICAgICAgICAgICBpZiAodHpSZWdleC5leGVjKG1hdGNoWzRdKSkge1xuICAgICAgICAgICAgICAgIHR6Rm9ybWF0ID0gJ1onO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX2lzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLl9mID0gZGF0ZUZvcm1hdCArICh0aW1lRm9ybWF0IHx8ICcnKSArICh0ekZvcm1hdCB8fCAnJyk7XG4gICAgICAgIGNvbmZpZ0Zyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25maWcuX2lzVmFsaWQgPSBmYWxzZTtcbiAgICB9XG59XG5cbi8vIFJGQyAyODIyIHJlZ2V4OiBGb3IgZGV0YWlscyBzZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzI4MjIjc2VjdGlvbi0zLjNcbnZhciByZmMyODIyID0gL14oPzooTW9ufFR1ZXxXZWR8VGh1fEZyaXxTYXR8U3VuKSw/XFxzKT8oXFxkezEsMn0pXFxzKEphbnxGZWJ8TWFyfEFwcnxNYXl8SnVufEp1bHxBdWd8U2VwfE9jdHxOb3Z8RGVjKVxccyhcXGR7Miw0fSlcXHMoXFxkXFxkKTooXFxkXFxkKSg/OjooXFxkXFxkKSk/XFxzKD86KFVUfEdNVHxbRUNNUF1bU0RdVCl8KFtael0pfChbKy1dXFxkezR9KSkkLztcblxuZnVuY3Rpb24gZXh0cmFjdEZyb21SRkMyODIyU3RyaW5ncyh5ZWFyU3RyLCBtb250aFN0ciwgZGF5U3RyLCBob3VyU3RyLCBtaW51dGVTdHIsIHNlY29uZFN0cikge1xuICAgIHZhciByZXN1bHQgPSBbXG4gICAgICAgIHVudHJ1bmNhdGVZZWFyKHllYXJTdHIpLFxuICAgICAgICBkZWZhdWx0TG9jYWxlTW9udGhzU2hvcnQuaW5kZXhPZihtb250aFN0ciksXG4gICAgICAgIHBhcnNlSW50KGRheVN0ciwgMTApLFxuICAgICAgICBwYXJzZUludChob3VyU3RyLCAxMCksXG4gICAgICAgIHBhcnNlSW50KG1pbnV0ZVN0ciwgMTApXG4gICAgXTtcblxuICAgIGlmIChzZWNvbmRTdHIpIHtcbiAgICAgICAgcmVzdWx0LnB1c2gocGFyc2VJbnQoc2Vjb25kU3RyLCAxMCkpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHVudHJ1bmNhdGVZZWFyKHllYXJTdHIpIHtcbiAgICB2YXIgeWVhciA9IHBhcnNlSW50KHllYXJTdHIsIDEwKTtcbiAgICBpZiAoeWVhciA8PSA0OSkge1xuICAgICAgICByZXR1cm4gMjAwMCArIHllYXI7XG4gICAgfSBlbHNlIGlmICh5ZWFyIDw9IDk5OSkge1xuICAgICAgICByZXR1cm4gMTkwMCArIHllYXI7XG4gICAgfVxuICAgIHJldHVybiB5ZWFyO1xufVxuXG5mdW5jdGlvbiBwcmVwcm9jZXNzUkZDMjgyMihzKSB7XG4gICAgLy8gUmVtb3ZlIGNvbW1lbnRzIGFuZCBmb2xkaW5nIHdoaXRlc3BhY2UgYW5kIHJlcGxhY2UgbXVsdGlwbGUtc3BhY2VzIHdpdGggYSBzaW5nbGUgc3BhY2VcbiAgICByZXR1cm4gcy5yZXBsYWNlKC9cXChbXildKlxcKXxbXFxuXFx0XS9nLCAnICcpLnJlcGxhY2UoLyhcXHNcXHMrKS9nLCAnICcpLnRyaW0oKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tXZWVrZGF5KHdlZWtkYXlTdHIsIHBhcnNlZElucHV0LCBjb25maWcpIHtcbiAgICBpZiAod2Vla2RheVN0cikge1xuICAgICAgICAvLyBUT0RPOiBSZXBsYWNlIHRoZSB2YW5pbGxhIEpTIERhdGUgb2JqZWN0IHdpdGggYW4gaW5kZXBlbnRlbnQgZGF5LW9mLXdlZWsgY2hlY2suXG4gICAgICAgIHZhciB3ZWVrZGF5UHJvdmlkZWQgPSBkZWZhdWx0TG9jYWxlV2Vla2RheXNTaG9ydC5pbmRleE9mKHdlZWtkYXlTdHIpLFxuICAgICAgICAgICAgd2Vla2RheUFjdHVhbCA9IG5ldyBEYXRlKHBhcnNlZElucHV0WzBdLCBwYXJzZWRJbnB1dFsxXSwgcGFyc2VkSW5wdXRbMl0pLmdldERheSgpO1xuICAgICAgICBpZiAod2Vla2RheVByb3ZpZGVkICE9PSB3ZWVrZGF5QWN0dWFsKSB7XG4gICAgICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS53ZWVrZGF5TWlzbWF0Y2ggPSB0cnVlO1xuICAgICAgICAgICAgY29uZmlnLl9pc1ZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBvYnNPZmZzZXRzID0ge1xuICAgIFVUOiAwLFxuICAgIEdNVDogMCxcbiAgICBFRFQ6IC00ICogNjAsXG4gICAgRVNUOiAtNSAqIDYwLFxuICAgIENEVDogLTUgKiA2MCxcbiAgICBDU1Q6IC02ICogNjAsXG4gICAgTURUOiAtNiAqIDYwLFxuICAgIE1TVDogLTcgKiA2MCxcbiAgICBQRFQ6IC03ICogNjAsXG4gICAgUFNUOiAtOCAqIDYwXG59O1xuXG5mdW5jdGlvbiBjYWxjdWxhdGVPZmZzZXQob2JzT2Zmc2V0LCBtaWxpdGFyeU9mZnNldCwgbnVtT2Zmc2V0KSB7XG4gICAgaWYgKG9ic09mZnNldCkge1xuICAgICAgICByZXR1cm4gb2JzT2Zmc2V0c1tvYnNPZmZzZXRdO1xuICAgIH0gZWxzZSBpZiAobWlsaXRhcnlPZmZzZXQpIHtcbiAgICAgICAgLy8gdGhlIG9ubHkgYWxsb3dlZCBtaWxpdGFyeSB0eiBpcyBaXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBobSA9IHBhcnNlSW50KG51bU9mZnNldCwgMTApO1xuICAgICAgICB2YXIgbSA9IGhtICUgMTAwLCBoID0gKGhtIC0gbSkgLyAxMDA7XG4gICAgICAgIHJldHVybiBoICogNjAgKyBtO1xuICAgIH1cbn1cblxuLy8gZGF0ZSBhbmQgdGltZSBmcm9tIHJlZiAyODIyIGZvcm1hdFxuZnVuY3Rpb24gY29uZmlnRnJvbVJGQzI4MjIoY29uZmlnKSB7XG4gICAgdmFyIG1hdGNoID0gcmZjMjgyMi5leGVjKHByZXByb2Nlc3NSRkMyODIyKGNvbmZpZy5faSkpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgICB2YXIgcGFyc2VkQXJyYXkgPSBleHRyYWN0RnJvbVJGQzI4MjJTdHJpbmdzKG1hdGNoWzRdLCBtYXRjaFszXSwgbWF0Y2hbMl0sIG1hdGNoWzVdLCBtYXRjaFs2XSwgbWF0Y2hbN10pO1xuICAgICAgICBpZiAoIWNoZWNrV2Vla2RheShtYXRjaFsxXSwgcGFyc2VkQXJyYXksIGNvbmZpZykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbmZpZy5fYSA9IHBhcnNlZEFycmF5O1xuICAgICAgICBjb25maWcuX3R6bSA9IGNhbGN1bGF0ZU9mZnNldChtYXRjaFs4XSwgbWF0Y2hbOV0sIG1hdGNoWzEwXSk7XG5cbiAgICAgICAgY29uZmlnLl9kID0gY3JlYXRlVVRDRGF0ZS5hcHBseShudWxsLCBjb25maWcuX2EpO1xuICAgICAgICBjb25maWcuX2Quc2V0VVRDTWludXRlcyhjb25maWcuX2QuZ2V0VVRDTWludXRlcygpIC0gY29uZmlnLl90em0pO1xuXG4gICAgICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLnJmYzI4MjIgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbmZpZy5faXNWYWxpZCA9IGZhbHNlO1xuICAgIH1cbn1cblxuLy8gZGF0ZSBmcm9tIGlzbyBmb3JtYXQgb3IgZmFsbGJhY2tcbmZ1bmN0aW9uIGNvbmZpZ0Zyb21TdHJpbmcoY29uZmlnKSB7XG4gICAgdmFyIG1hdGNoZWQgPSBhc3BOZXRKc29uUmVnZXguZXhlYyhjb25maWcuX2kpO1xuXG4gICAgaWYgKG1hdGNoZWQgIT09IG51bGwpIHtcbiAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoK21hdGNoZWRbMV0pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uZmlnRnJvbUlTTyhjb25maWcpO1xuICAgIGlmIChjb25maWcuX2lzVmFsaWQgPT09IGZhbHNlKSB7XG4gICAgICAgIGRlbGV0ZSBjb25maWcuX2lzVmFsaWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbmZpZ0Zyb21SRkMyODIyKGNvbmZpZyk7XG4gICAgaWYgKGNvbmZpZy5faXNWYWxpZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgZGVsZXRlIGNvbmZpZy5faXNWYWxpZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRmluYWwgYXR0ZW1wdCwgdXNlIElucHV0IEZhbGxiYWNrXG4gICAgaG9va3MuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2soY29uZmlnKTtcbn1cblxuaG9va3MuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2sgPSBkZXByZWNhdGUoXG4gICAgJ3ZhbHVlIHByb3ZpZGVkIGlzIG5vdCBpbiBhIHJlY29nbml6ZWQgUkZDMjgyMiBvciBJU08gZm9ybWF0LiBtb21lbnQgY29uc3RydWN0aW9uIGZhbGxzIGJhY2sgdG8ganMgRGF0ZSgpLCAnICtcbiAgICAnd2hpY2ggaXMgbm90IHJlbGlhYmxlIGFjcm9zcyBhbGwgYnJvd3NlcnMgYW5kIHZlcnNpb25zLiBOb24gUkZDMjgyMi9JU08gZGF0ZSBmb3JtYXRzIGFyZSAnICtcbiAgICAnZGlzY291cmFnZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhbiB1cGNvbWluZyBtYWpvciByZWxlYXNlLiBQbGVhc2UgcmVmZXIgdG8gJyArXG4gICAgJ2h0dHA6Ly9tb21lbnRqcy5jb20vZ3VpZGVzLyMvd2FybmluZ3MvanMtZGF0ZS8gZm9yIG1vcmUgaW5mby4nLFxuICAgIGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoY29uZmlnLl9pICsgKGNvbmZpZy5fdXNlVVRDID8gJyBVVEMnIDogJycpKTtcbiAgICB9XG4pO1xuXG4vLyBjb25zdGFudCB0aGF0IHJlZmVycyB0byB0aGUgSVNPIHN0YW5kYXJkXG5ob29rcy5JU09fODYwMSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vLyBjb25zdGFudCB0aGF0IHJlZmVycyB0byB0aGUgUkZDIDI4MjIgZm9ybVxuaG9va3MuUkZDXzI4MjIgPSBmdW5jdGlvbiAoKSB7fTtcblxuLy8gZGF0ZSBmcm9tIHN0cmluZyBhbmQgZm9ybWF0IHN0cmluZ1xuZnVuY3Rpb24gY29uZmlnRnJvbVN0cmluZ0FuZEZvcm1hdChjb25maWcpIHtcbiAgICAvLyBUT0RPOiBNb3ZlIHRoaXMgdG8gYW5vdGhlciBwYXJ0IG9mIHRoZSBjcmVhdGlvbiBmbG93IHRvIHByZXZlbnQgY2lyY3VsYXIgZGVwc1xuICAgIGlmIChjb25maWcuX2YgPT09IGhvb2tzLklTT184NjAxKSB7XG4gICAgICAgIGNvbmZpZ0Zyb21JU08oY29uZmlnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29uZmlnLl9mID09PSBob29rcy5SRkNfMjgyMikge1xuICAgICAgICBjb25maWdGcm9tUkZDMjgyMihjb25maWcpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbmZpZy5fYSA9IFtdO1xuICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLmVtcHR5ID0gdHJ1ZTtcblxuICAgIC8vIFRoaXMgYXJyYXkgaXMgdXNlZCB0byBtYWtlIGEgRGF0ZSwgZWl0aGVyIHdpdGggYG5ldyBEYXRlYCBvciBgRGF0ZS5VVENgXG4gICAgdmFyIHN0cmluZyA9ICcnICsgY29uZmlnLl9pLFxuICAgICAgICBpLCBwYXJzZWRJbnB1dCwgdG9rZW5zLCB0b2tlbiwgc2tpcHBlZCxcbiAgICAgICAgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aCxcbiAgICAgICAgdG90YWxQYXJzZWRJbnB1dExlbmd0aCA9IDA7XG5cbiAgICB0b2tlbnMgPSBleHBhbmRGb3JtYXQoY29uZmlnLl9mLCBjb25maWcuX2xvY2FsZSkubWF0Y2goZm9ybWF0dGluZ1Rva2VucykgfHwgW107XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRva2VuID0gdG9rZW5zW2ldO1xuICAgICAgICBwYXJzZWRJbnB1dCA9IChzdHJpbmcubWF0Y2goZ2V0UGFyc2VSZWdleEZvclRva2VuKHRva2VuLCBjb25maWcpKSB8fCBbXSlbMF07XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCd0b2tlbicsIHRva2VuLCAncGFyc2VkSW5wdXQnLCBwYXJzZWRJbnB1dCxcbiAgICAgICAgLy8gICAgICAgICAncmVnZXgnLCBnZXRQYXJzZVJlZ2V4Rm9yVG9rZW4odG9rZW4sIGNvbmZpZykpO1xuICAgICAgICBpZiAocGFyc2VkSW5wdXQpIHtcbiAgICAgICAgICAgIHNraXBwZWQgPSBzdHJpbmcuc3Vic3RyKDAsIHN0cmluZy5pbmRleE9mKHBhcnNlZElucHV0KSk7XG4gICAgICAgICAgICBpZiAoc2tpcHBlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykudW51c2VkSW5wdXQucHVzaChza2lwcGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0cmluZyA9IHN0cmluZy5zbGljZShzdHJpbmcuaW5kZXhPZihwYXJzZWRJbnB1dCkgKyBwYXJzZWRJbnB1dC5sZW5ndGgpO1xuICAgICAgICAgICAgdG90YWxQYXJzZWRJbnB1dExlbmd0aCArPSBwYXJzZWRJbnB1dC5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZG9uJ3QgcGFyc2UgaWYgaXQncyBub3QgYSBrbm93biB0b2tlblxuICAgICAgICBpZiAoZm9ybWF0VG9rZW5GdW5jdGlvbnNbdG9rZW5dKSB7XG4gICAgICAgICAgICBpZiAocGFyc2VkSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5lbXB0eSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykudW51c2VkVG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkVGltZVRvQXJyYXlGcm9tVG9rZW4odG9rZW4sIHBhcnNlZElucHV0LCBjb25maWcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNvbmZpZy5fc3RyaWN0ICYmICFwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykudW51c2VkVG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gYWRkIHJlbWFpbmluZyB1bnBhcnNlZCBpbnB1dCBsZW5ndGggdG8gdGhlIHN0cmluZ1xuICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLmNoYXJzTGVmdE92ZXIgPSBzdHJpbmdMZW5ndGggLSB0b3RhbFBhcnNlZElucHV0TGVuZ3RoO1xuICAgIGlmIChzdHJpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS51bnVzZWRJbnB1dC5wdXNoKHN0cmluZyk7XG4gICAgfVxuXG4gICAgLy8gY2xlYXIgXzEyaCBmbGFnIGlmIGhvdXIgaXMgPD0gMTJcbiAgICBpZiAoY29uZmlnLl9hW0hPVVJdIDw9IDEyICYmXG4gICAgICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLmJpZ0hvdXIgPT09IHRydWUgJiZcbiAgICAgICAgY29uZmlnLl9hW0hPVVJdID4gMCkge1xuICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5iaWdIb3VyID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLnBhcnNlZERhdGVQYXJ0cyA9IGNvbmZpZy5fYS5zbGljZSgwKTtcbiAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5tZXJpZGllbSA9IGNvbmZpZy5fbWVyaWRpZW07XG4gICAgLy8gaGFuZGxlIG1lcmlkaWVtXG4gICAgY29uZmlnLl9hW0hPVVJdID0gbWVyaWRpZW1GaXhXcmFwKGNvbmZpZy5fbG9jYWxlLCBjb25maWcuX2FbSE9VUl0sIGNvbmZpZy5fbWVyaWRpZW0pO1xuXG4gICAgY29uZmlnRnJvbUFycmF5KGNvbmZpZyk7XG4gICAgY2hlY2tPdmVyZmxvdyhjb25maWcpO1xufVxuXG5cbmZ1bmN0aW9uIG1lcmlkaWVtRml4V3JhcCAobG9jYWxlLCBob3VyLCBtZXJpZGllbSkge1xuICAgIHZhciBpc1BtO1xuXG4gICAgaWYgKG1lcmlkaWVtID09IG51bGwpIHtcbiAgICAgICAgLy8gbm90aGluZyB0byBkb1xuICAgICAgICByZXR1cm4gaG91cjtcbiAgICB9XG4gICAgaWYgKGxvY2FsZS5tZXJpZGllbUhvdXIgIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbG9jYWxlLm1lcmlkaWVtSG91cihob3VyLCBtZXJpZGllbSk7XG4gICAgfSBlbHNlIGlmIChsb2NhbGUuaXNQTSAhPSBudWxsKSB7XG4gICAgICAgIC8vIEZhbGxiYWNrXG4gICAgICAgIGlzUG0gPSBsb2NhbGUuaXNQTShtZXJpZGllbSk7XG4gICAgICAgIGlmIChpc1BtICYmIGhvdXIgPCAxMikge1xuICAgICAgICAgICAgaG91ciArPSAxMjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzUG0gJiYgaG91ciA9PT0gMTIpIHtcbiAgICAgICAgICAgIGhvdXIgPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBob3VyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHRoaXMgaXMgbm90IHN1cHBvc2VkIHRvIGhhcHBlblxuICAgICAgICByZXR1cm4gaG91cjtcbiAgICB9XG59XG5cbi8vIGRhdGUgZnJvbSBzdHJpbmcgYW5kIGFycmF5IG9mIGZvcm1hdCBzdHJpbmdzXG5mdW5jdGlvbiBjb25maWdGcm9tU3RyaW5nQW5kQXJyYXkoY29uZmlnKSB7XG4gICAgdmFyIHRlbXBDb25maWcsXG4gICAgICAgIGJlc3RNb21lbnQsXG5cbiAgICAgICAgc2NvcmVUb0JlYXQsXG4gICAgICAgIGksXG4gICAgICAgIGN1cnJlbnRTY29yZTtcblxuICAgIGlmIChjb25maWcuX2YubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLmludmFsaWRGb3JtYXQgPSB0cnVlO1xuICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShOYU4pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGNvbmZpZy5fZi5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJyZW50U2NvcmUgPSAwO1xuICAgICAgICB0ZW1wQ29uZmlnID0gY29weUNvbmZpZyh7fSwgY29uZmlnKTtcbiAgICAgICAgaWYgKGNvbmZpZy5fdXNlVVRDICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRlbXBDb25maWcuX3VzZVVUQyA9IGNvbmZpZy5fdXNlVVRDO1xuICAgICAgICB9XG4gICAgICAgIHRlbXBDb25maWcuX2YgPSBjb25maWcuX2ZbaV07XG4gICAgICAgIGNvbmZpZ0Zyb21TdHJpbmdBbmRGb3JtYXQodGVtcENvbmZpZyk7XG5cbiAgICAgICAgaWYgKCFpc1ZhbGlkKHRlbXBDb25maWcpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHRoZXJlIGlzIGFueSBpbnB1dCB0aGF0IHdhcyBub3QgcGFyc2VkIGFkZCBhIHBlbmFsdHkgZm9yIHRoYXQgZm9ybWF0XG4gICAgICAgIGN1cnJlbnRTY29yZSArPSBnZXRQYXJzaW5nRmxhZ3ModGVtcENvbmZpZykuY2hhcnNMZWZ0T3ZlcjtcblxuICAgICAgICAvL29yIHRva2Vuc1xuICAgICAgICBjdXJyZW50U2NvcmUgKz0gZ2V0UGFyc2luZ0ZsYWdzKHRlbXBDb25maWcpLnVudXNlZFRva2Vucy5sZW5ndGggKiAxMDtcblxuICAgICAgICBnZXRQYXJzaW5nRmxhZ3ModGVtcENvbmZpZykuc2NvcmUgPSBjdXJyZW50U2NvcmU7XG5cbiAgICAgICAgaWYgKHNjb3JlVG9CZWF0ID09IG51bGwgfHwgY3VycmVudFNjb3JlIDwgc2NvcmVUb0JlYXQpIHtcbiAgICAgICAgICAgIHNjb3JlVG9CZWF0ID0gY3VycmVudFNjb3JlO1xuICAgICAgICAgICAgYmVzdE1vbWVudCA9IHRlbXBDb25maWc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBleHRlbmQoY29uZmlnLCBiZXN0TW9tZW50IHx8IHRlbXBDb25maWcpO1xufVxuXG5mdW5jdGlvbiBjb25maWdGcm9tT2JqZWN0KGNvbmZpZykge1xuICAgIGlmIChjb25maWcuX2QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpID0gbm9ybWFsaXplT2JqZWN0VW5pdHMoY29uZmlnLl9pKTtcbiAgICBjb25maWcuX2EgPSBtYXAoW2kueWVhciwgaS5tb250aCwgaS5kYXkgfHwgaS5kYXRlLCBpLmhvdXIsIGkubWludXRlLCBpLnNlY29uZCwgaS5taWxsaXNlY29uZF0sIGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iaiAmJiBwYXJzZUludChvYmosIDEwKTtcbiAgICB9KTtcblxuICAgIGNvbmZpZ0Zyb21BcnJheShjb25maWcpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVGcm9tQ29uZmlnIChjb25maWcpIHtcbiAgICB2YXIgcmVzID0gbmV3IE1vbWVudChjaGVja092ZXJmbG93KHByZXBhcmVDb25maWcoY29uZmlnKSkpO1xuICAgIGlmIChyZXMuX25leHREYXkpIHtcbiAgICAgICAgLy8gQWRkaW5nIGlzIHNtYXJ0IGVub3VnaCBhcm91bmQgRFNUXG4gICAgICAgIHJlcy5hZGQoMSwgJ2QnKTtcbiAgICAgICAgcmVzLl9uZXh0RGF5ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIHByZXBhcmVDb25maWcgKGNvbmZpZykge1xuICAgIHZhciBpbnB1dCA9IGNvbmZpZy5faSxcbiAgICAgICAgZm9ybWF0ID0gY29uZmlnLl9mO1xuXG4gICAgY29uZmlnLl9sb2NhbGUgPSBjb25maWcuX2xvY2FsZSB8fCBnZXRMb2NhbGUoY29uZmlnLl9sKTtcblxuICAgIGlmIChpbnB1dCA9PT0gbnVsbCB8fCAoZm9ybWF0ID09PSB1bmRlZmluZWQgJiYgaW5wdXQgPT09ICcnKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlSW52YWxpZCh7bnVsbElucHV0OiB0cnVlfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uZmlnLl9pID0gaW5wdXQgPSBjb25maWcuX2xvY2FsZS5wcmVwYXJzZShpbnB1dCk7XG4gICAgfVxuXG4gICAgaWYgKGlzTW9tZW50KGlucHV0KSkge1xuICAgICAgICByZXR1cm4gbmV3IE1vbWVudChjaGVja092ZXJmbG93KGlucHV0KSk7XG4gICAgfSBlbHNlIGlmIChpc0RhdGUoaW5wdXQpKSB7XG4gICAgICAgIGNvbmZpZy5fZCA9IGlucHV0O1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShmb3JtYXQpKSB7XG4gICAgICAgIGNvbmZpZ0Zyb21TdHJpbmdBbmRBcnJheShjb25maWcpO1xuICAgIH0gZWxzZSBpZiAoZm9ybWF0KSB7XG4gICAgICAgIGNvbmZpZ0Zyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKTtcbiAgICB9ICBlbHNlIHtcbiAgICAgICAgY29uZmlnRnJvbUlucHV0KGNvbmZpZyk7XG4gICAgfVxuXG4gICAgaWYgKCFpc1ZhbGlkKGNvbmZpZykpIHtcbiAgICAgICAgY29uZmlnLl9kID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gY29uZmlnO1xufVxuXG5mdW5jdGlvbiBjb25maWdGcm9tSW5wdXQoY29uZmlnKSB7XG4gICAgdmFyIGlucHV0ID0gY29uZmlnLl9pO1xuICAgIGlmIChpc1VuZGVmaW5lZChpbnB1dCkpIHtcbiAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoaG9va3Mubm93KCkpO1xuICAgIH0gZWxzZSBpZiAoaXNEYXRlKGlucHV0KSkge1xuICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShpbnB1dC52YWx1ZU9mKCkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb25maWdGcm9tU3RyaW5nKGNvbmZpZyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGlucHV0KSkge1xuICAgICAgICBjb25maWcuX2EgPSBtYXAoaW5wdXQuc2xpY2UoMCksIGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludChvYmosIDEwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbmZpZ0Zyb21BcnJheShjb25maWcpO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoaW5wdXQpKSB7XG4gICAgICAgIGNvbmZpZ0Zyb21PYmplY3QoY29uZmlnKTtcbiAgICB9IGVsc2UgaWYgKGlzTnVtYmVyKGlucHV0KSkge1xuICAgICAgICAvLyBmcm9tIG1pbGxpc2Vjb25kc1xuICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShpbnB1dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaG9va3MuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2soY29uZmlnKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUxvY2FsT3JVVEMgKGlucHV0LCBmb3JtYXQsIGxvY2FsZSwgc3RyaWN0LCBpc1VUQykge1xuICAgIHZhciBjID0ge307XG5cbiAgICBpZiAobG9jYWxlID09PSB0cnVlIHx8IGxvY2FsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgc3RyaWN0ID0gbG9jYWxlO1xuICAgICAgICBsb2NhbGUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKChpc09iamVjdChpbnB1dCkgJiYgaXNPYmplY3RFbXB0eShpbnB1dCkpIHx8XG4gICAgICAgICAgICAoaXNBcnJheShpbnB1dCkgJiYgaW5wdXQubGVuZ3RoID09PSAwKSkge1xuICAgICAgICBpbnB1dCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy8gb2JqZWN0IGNvbnN0cnVjdGlvbiBtdXN0IGJlIGRvbmUgdGhpcyB3YXkuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE0MjNcbiAgICBjLl9pc0FNb21lbnRPYmplY3QgPSB0cnVlO1xuICAgIGMuX3VzZVVUQyA9IGMuX2lzVVRDID0gaXNVVEM7XG4gICAgYy5fbCA9IGxvY2FsZTtcbiAgICBjLl9pID0gaW5wdXQ7XG4gICAgYy5fZiA9IGZvcm1hdDtcbiAgICBjLl9zdHJpY3QgPSBzdHJpY3Q7XG5cbiAgICByZXR1cm4gY3JlYXRlRnJvbUNvbmZpZyhjKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTG9jYWwgKGlucHV0LCBmb3JtYXQsIGxvY2FsZSwgc3RyaWN0KSB7XG4gICAgcmV0dXJuIGNyZWF0ZUxvY2FsT3JVVEMoaW5wdXQsIGZvcm1hdCwgbG9jYWxlLCBzdHJpY3QsIGZhbHNlKTtcbn1cblxudmFyIHByb3RvdHlwZU1pbiA9IGRlcHJlY2F0ZShcbiAgICAnbW9tZW50KCkubWluIGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWF4IGluc3RlYWQuIGh0dHA6Ly9tb21lbnRqcy5jb20vZ3VpZGVzLyMvd2FybmluZ3MvbWluLW1heC8nLFxuICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG90aGVyID0gY3JlYXRlTG9jYWwuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKHRoaXMuaXNWYWxpZCgpICYmIG90aGVyLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG90aGVyIDwgdGhpcyA/IHRoaXMgOiBvdGhlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVJbnZhbGlkKCk7XG4gICAgICAgIH1cbiAgICB9XG4pO1xuXG52YXIgcHJvdG90eXBlTWF4ID0gZGVwcmVjYXRlKFxuICAgICdtb21lbnQoKS5tYXggaXMgZGVwcmVjYXRlZCwgdXNlIG1vbWVudC5taW4gaW5zdGVhZC4gaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9taW4tbWF4LycsXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb3RoZXIgPSBjcmVhdGVMb2NhbC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICBpZiAodGhpcy5pc1ZhbGlkKCkgJiYgb3RoZXIuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gb3RoZXIgPiB0aGlzID8gdGhpcyA6IG90aGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUludmFsaWQoKTtcbiAgICAgICAgfVxuICAgIH1cbik7XG5cbi8vIFBpY2sgYSBtb21lbnQgbSBmcm9tIG1vbWVudHMgc28gdGhhdCBtW2ZuXShvdGhlcikgaXMgdHJ1ZSBmb3IgYWxsXG4vLyBvdGhlci4gVGhpcyByZWxpZXMgb24gdGhlIGZ1bmN0aW9uIGZuIHRvIGJlIHRyYW5zaXRpdmUuXG4vL1xuLy8gbW9tZW50cyBzaG91bGQgZWl0aGVyIGJlIGFuIGFycmF5IG9mIG1vbWVudCBvYmplY3RzIG9yIGFuIGFycmF5LCB3aG9zZVxuLy8gZmlyc3QgZWxlbWVudCBpcyBhbiBhcnJheSBvZiBtb21lbnQgb2JqZWN0cy5cbmZ1bmN0aW9uIHBpY2tCeShmbiwgbW9tZW50cykge1xuICAgIHZhciByZXMsIGk7XG4gICAgaWYgKG1vbWVudHMubGVuZ3RoID09PSAxICYmIGlzQXJyYXkobW9tZW50c1swXSkpIHtcbiAgICAgICAgbW9tZW50cyA9IG1vbWVudHNbMF07XG4gICAgfVxuICAgIGlmICghbW9tZW50cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUxvY2FsKCk7XG4gICAgfVxuICAgIHJlcyA9IG1vbWVudHNbMF07XG4gICAgZm9yIChpID0gMTsgaSA8IG1vbWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaWYgKCFtb21lbnRzW2ldLmlzVmFsaWQoKSB8fCBtb21lbnRzW2ldW2ZuXShyZXMpKSB7XG4gICAgICAgICAgICByZXMgPSBtb21lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFRPRE86IFVzZSBbXS5zb3J0IGluc3RlYWQ/XG5mdW5jdGlvbiBtaW4gKCkge1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgcmV0dXJuIHBpY2tCeSgnaXNCZWZvcmUnLCBhcmdzKTtcbn1cblxuZnVuY3Rpb24gbWF4ICgpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcblxuICAgIHJldHVybiBwaWNrQnkoJ2lzQWZ0ZXInLCBhcmdzKTtcbn1cblxudmFyIG5vdyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gRGF0ZS5ub3cgPyBEYXRlLm5vdygpIDogKyhuZXcgRGF0ZSgpKTtcbn07XG5cbnZhciBvcmRlcmluZyA9IFsneWVhcicsICdxdWFydGVyJywgJ21vbnRoJywgJ3dlZWsnLCAnZGF5JywgJ2hvdXInLCAnbWludXRlJywgJ3NlY29uZCcsICdtaWxsaXNlY29uZCddO1xuXG5mdW5jdGlvbiBpc0R1cmF0aW9uVmFsaWQobSkge1xuICAgIGZvciAodmFyIGtleSBpbiBtKSB7XG4gICAgICAgIGlmICghKGluZGV4T2YuY2FsbChvcmRlcmluZywga2V5KSAhPT0gLTEgJiYgKG1ba2V5XSA9PSBudWxsIHx8ICFpc05hTihtW2tleV0pKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB1bml0SGFzRGVjaW1hbCA9IGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JkZXJpbmcubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaWYgKG1bb3JkZXJpbmdbaV1dKSB7XG4gICAgICAgICAgICBpZiAodW5pdEhhc0RlY2ltYWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIG9ubHkgYWxsb3cgbm9uLWludGVnZXJzIGZvciBzbWFsbGVzdCB1bml0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFyc2VGbG9hdChtW29yZGVyaW5nW2ldXSkgIT09IHRvSW50KG1bb3JkZXJpbmdbaV1dKSkge1xuICAgICAgICAgICAgICAgIHVuaXRIYXNEZWNpbWFsID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkJDEoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzVmFsaWQ7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUludmFsaWQkMSgpIHtcbiAgICByZXR1cm4gY3JlYXRlRHVyYXRpb24oTmFOKTtcbn1cblxuZnVuY3Rpb24gRHVyYXRpb24gKGR1cmF0aW9uKSB7XG4gICAgdmFyIG5vcm1hbGl6ZWRJbnB1dCA9IG5vcm1hbGl6ZU9iamVjdFVuaXRzKGR1cmF0aW9uKSxcbiAgICAgICAgeWVhcnMgPSBub3JtYWxpemVkSW5wdXQueWVhciB8fCAwLFxuICAgICAgICBxdWFydGVycyA9IG5vcm1hbGl6ZWRJbnB1dC5xdWFydGVyIHx8IDAsXG4gICAgICAgIG1vbnRocyA9IG5vcm1hbGl6ZWRJbnB1dC5tb250aCB8fCAwLFxuICAgICAgICB3ZWVrcyA9IG5vcm1hbGl6ZWRJbnB1dC53ZWVrIHx8IDAsXG4gICAgICAgIGRheXMgPSBub3JtYWxpemVkSW5wdXQuZGF5IHx8IDAsXG4gICAgICAgIGhvdXJzID0gbm9ybWFsaXplZElucHV0LmhvdXIgfHwgMCxcbiAgICAgICAgbWludXRlcyA9IG5vcm1hbGl6ZWRJbnB1dC5taW51dGUgfHwgMCxcbiAgICAgICAgc2Vjb25kcyA9IG5vcm1hbGl6ZWRJbnB1dC5zZWNvbmQgfHwgMCxcbiAgICAgICAgbWlsbGlzZWNvbmRzID0gbm9ybWFsaXplZElucHV0Lm1pbGxpc2Vjb25kIHx8IDA7XG5cbiAgICB0aGlzLl9pc1ZhbGlkID0gaXNEdXJhdGlvblZhbGlkKG5vcm1hbGl6ZWRJbnB1dCk7XG5cbiAgICAvLyByZXByZXNlbnRhdGlvbiBmb3IgZGF0ZUFkZFJlbW92ZVxuICAgIHRoaXMuX21pbGxpc2Vjb25kcyA9ICttaWxsaXNlY29uZHMgK1xuICAgICAgICBzZWNvbmRzICogMWUzICsgLy8gMTAwMFxuICAgICAgICBtaW51dGVzICogNmU0ICsgLy8gMTAwMCAqIDYwXG4gICAgICAgIGhvdXJzICogMTAwMCAqIDYwICogNjA7IC8vdXNpbmcgMTAwMCAqIDYwICogNjAgaW5zdGVhZCBvZiAzNmU1IHRvIGF2b2lkIGZsb2F0aW5nIHBvaW50IHJvdW5kaW5nIGVycm9ycyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMjk3OFxuICAgIC8vIEJlY2F1c2Ugb2YgZGF0ZUFkZFJlbW92ZSB0cmVhdHMgMjQgaG91cnMgYXMgZGlmZmVyZW50IGZyb20gYVxuICAgIC8vIGRheSB3aGVuIHdvcmtpbmcgYXJvdW5kIERTVCwgd2UgbmVlZCB0byBzdG9yZSB0aGVtIHNlcGFyYXRlbHlcbiAgICB0aGlzLl9kYXlzID0gK2RheXMgK1xuICAgICAgICB3ZWVrcyAqIDc7XG4gICAgLy8gSXQgaXMgaW1wb3NzaWJsZSB0byB0cmFuc2xhdGUgbW9udGhzIGludG8gZGF5cyB3aXRob3V0IGtub3dpbmdcbiAgICAvLyB3aGljaCBtb250aHMgeW91IGFyZSBhcmUgdGFsa2luZyBhYm91dCwgc28gd2UgaGF2ZSB0byBzdG9yZVxuICAgIC8vIGl0IHNlcGFyYXRlbHkuXG4gICAgdGhpcy5fbW9udGhzID0gK21vbnRocyArXG4gICAgICAgIHF1YXJ0ZXJzICogMyArXG4gICAgICAgIHllYXJzICogMTI7XG5cbiAgICB0aGlzLl9kYXRhID0ge307XG5cbiAgICB0aGlzLl9sb2NhbGUgPSBnZXRMb2NhbGUoKTtcblxuICAgIHRoaXMuX2J1YmJsZSgpO1xufVxuXG5mdW5jdGlvbiBpc0R1cmF0aW9uIChvYmopIHtcbiAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgRHVyYXRpb247XG59XG5cbmZ1bmN0aW9uIGFic1JvdW5kIChudW1iZXIpIHtcbiAgICBpZiAobnVtYmVyIDwgMCkge1xuICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCgtMSAqIG51bWJlcikgKiAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gTWF0aC5yb3VuZChudW1iZXIpO1xuICAgIH1cbn1cblxuLy8gRk9STUFUVElOR1xuXG5mdW5jdGlvbiBvZmZzZXQgKHRva2VuLCBzZXBhcmF0b3IpIHtcbiAgICBhZGRGb3JtYXRUb2tlbih0b2tlbiwgMCwgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy51dGNPZmZzZXQoKTtcbiAgICAgICAgdmFyIHNpZ24gPSAnKyc7XG4gICAgICAgIGlmIChvZmZzZXQgPCAwKSB7XG4gICAgICAgICAgICBvZmZzZXQgPSAtb2Zmc2V0O1xuICAgICAgICAgICAgc2lnbiA9ICctJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2lnbiArIHplcm9GaWxsKH5+KG9mZnNldCAvIDYwKSwgMikgKyBzZXBhcmF0b3IgKyB6ZXJvRmlsbCh+fihvZmZzZXQpICUgNjAsIDIpO1xuICAgIH0pO1xufVxuXG5vZmZzZXQoJ1onLCAnOicpO1xub2Zmc2V0KCdaWicsICcnKTtcblxuLy8gUEFSU0lOR1xuXG5hZGRSZWdleFRva2VuKCdaJywgIG1hdGNoU2hvcnRPZmZzZXQpO1xuYWRkUmVnZXhUb2tlbignWlonLCBtYXRjaFNob3J0T2Zmc2V0KTtcbmFkZFBhcnNlVG9rZW4oWydaJywgJ1paJ10sIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXksIGNvbmZpZykge1xuICAgIGNvbmZpZy5fdXNlVVRDID0gdHJ1ZTtcbiAgICBjb25maWcuX3R6bSA9IG9mZnNldEZyb21TdHJpbmcobWF0Y2hTaG9ydE9mZnNldCwgaW5wdXQpO1xufSk7XG5cbi8vIEhFTFBFUlNcblxuLy8gdGltZXpvbmUgY2h1bmtlclxuLy8gJysxMDowMCcgPiBbJzEwJywgICcwMCddXG4vLyAnLTE1MzAnICA+IFsnLTE1JywgJzMwJ11cbnZhciBjaHVua09mZnNldCA9IC8oW1xcK1xcLV18XFxkXFxkKS9naTtcblxuZnVuY3Rpb24gb2Zmc2V0RnJvbVN0cmluZyhtYXRjaGVyLCBzdHJpbmcpIHtcbiAgICB2YXIgbWF0Y2hlcyA9IChzdHJpbmcgfHwgJycpLm1hdGNoKG1hdGNoZXIpO1xuXG4gICAgaWYgKG1hdGNoZXMgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGNodW5rICAgPSBtYXRjaGVzW21hdGNoZXMubGVuZ3RoIC0gMV0gfHwgW107XG4gICAgdmFyIHBhcnRzICAgPSAoY2h1bmsgKyAnJykubWF0Y2goY2h1bmtPZmZzZXQpIHx8IFsnLScsIDAsIDBdO1xuICAgIHZhciBtaW51dGVzID0gKyhwYXJ0c1sxXSAqIDYwKSArIHRvSW50KHBhcnRzWzJdKTtcblxuICAgIHJldHVybiBtaW51dGVzID09PSAwID9cbiAgICAgIDAgOlxuICAgICAgcGFydHNbMF0gPT09ICcrJyA/IG1pbnV0ZXMgOiAtbWludXRlcztcbn1cblxuLy8gUmV0dXJuIGEgbW9tZW50IGZyb20gaW5wdXQsIHRoYXQgaXMgbG9jYWwvdXRjL3pvbmUgZXF1aXZhbGVudCB0byBtb2RlbC5cbmZ1bmN0aW9uIGNsb25lV2l0aE9mZnNldChpbnB1dCwgbW9kZWwpIHtcbiAgICB2YXIgcmVzLCBkaWZmO1xuICAgIGlmIChtb2RlbC5faXNVVEMpIHtcbiAgICAgICAgcmVzID0gbW9kZWwuY2xvbmUoKTtcbiAgICAgICAgZGlmZiA9IChpc01vbWVudChpbnB1dCkgfHwgaXNEYXRlKGlucHV0KSA/IGlucHV0LnZhbHVlT2YoKSA6IGNyZWF0ZUxvY2FsKGlucHV0KS52YWx1ZU9mKCkpIC0gcmVzLnZhbHVlT2YoKTtcbiAgICAgICAgLy8gVXNlIGxvdy1sZXZlbCBhcGksIGJlY2F1c2UgdGhpcyBmbiBpcyBsb3ctbGV2ZWwgYXBpLlxuICAgICAgICByZXMuX2Quc2V0VGltZShyZXMuX2QudmFsdWVPZigpICsgZGlmZik7XG4gICAgICAgIGhvb2tzLnVwZGF0ZU9mZnNldChyZXMsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY3JlYXRlTG9jYWwoaW5wdXQpLmxvY2FsKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXREYXRlT2Zmc2V0IChtKSB7XG4gICAgLy8gT24gRmlyZWZveC4yNCBEYXRlI2dldFRpbWV6b25lT2Zmc2V0IHJldHVybnMgYSBmbG9hdGluZyBwb2ludC5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9wdWxsLzE4NzFcbiAgICByZXR1cm4gLU1hdGgucm91bmQobS5fZC5nZXRUaW1lem9uZU9mZnNldCgpIC8gMTUpICogMTU7XG59XG5cbi8vIEhPT0tTXG5cbi8vIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbmV2ZXIgYSBtb21lbnQgaXMgbXV0YXRlZC5cbi8vIEl0IGlzIGludGVuZGVkIHRvIGtlZXAgdGhlIG9mZnNldCBpbiBzeW5jIHdpdGggdGhlIHRpbWV6b25lLlxuaG9va3MudXBkYXRlT2Zmc2V0ID0gZnVuY3Rpb24gKCkge307XG5cbi8vIE1PTUVOVFNcblxuLy8ga2VlcExvY2FsVGltZSA9IHRydWUgbWVhbnMgb25seSBjaGFuZ2UgdGhlIHRpbWV6b25lLCB3aXRob3V0XG4vLyBhZmZlY3RpbmcgdGhlIGxvY2FsIGhvdXIuIFNvIDU6MzE6MjYgKzAzMDAgLS1bdXRjT2Zmc2V0KDIsIHRydWUpXS0tPlxuLy8gNTozMToyNiArMDIwMCBJdCBpcyBwb3NzaWJsZSB0aGF0IDU6MzE6MjYgZG9lc24ndCBleGlzdCB3aXRoIG9mZnNldFxuLy8gKzAyMDAsIHNvIHdlIGFkanVzdCB0aGUgdGltZSBhcyBuZWVkZWQsIHRvIGJlIHZhbGlkLlxuLy9cbi8vIEtlZXBpbmcgdGhlIHRpbWUgYWN0dWFsbHkgYWRkcy9zdWJ0cmFjdHMgKG9uZSBob3VyKVxuLy8gZnJvbSB0aGUgYWN0dWFsIHJlcHJlc2VudGVkIHRpbWUuIFRoYXQgaXMgd2h5IHdlIGNhbGwgdXBkYXRlT2Zmc2V0XG4vLyBhIHNlY29uZCB0aW1lLiBJbiBjYXNlIGl0IHdhbnRzIHVzIHRvIGNoYW5nZSB0aGUgb2Zmc2V0IGFnYWluXG4vLyBfY2hhbmdlSW5Qcm9ncmVzcyA9PSB0cnVlIGNhc2UsIHRoZW4gd2UgaGF2ZSB0byBhZGp1c3QsIGJlY2F1c2Vcbi8vIHRoZXJlIGlzIG5vIHN1Y2ggdGltZSBpbiB0aGUgZ2l2ZW4gdGltZXpvbmUuXG5mdW5jdGlvbiBnZXRTZXRPZmZzZXQgKGlucHV0LCBrZWVwTG9jYWxUaW1lLCBrZWVwTWludXRlcykge1xuICAgIHZhciBvZmZzZXQgPSB0aGlzLl9vZmZzZXQgfHwgMCxcbiAgICAgICAgbG9jYWxBZGp1c3Q7XG4gICAgaWYgKCF0aGlzLmlzVmFsaWQoKSkge1xuICAgICAgICByZXR1cm4gaW5wdXQgIT0gbnVsbCA/IHRoaXMgOiBOYU47XG4gICAgfVxuICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpbnB1dCA9IG9mZnNldEZyb21TdHJpbmcobWF0Y2hTaG9ydE9mZnNldCwgaW5wdXQpO1xuICAgICAgICAgICAgaWYgKGlucHV0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoTWF0aC5hYnMoaW5wdXQpIDwgMTYgJiYgIWtlZXBNaW51dGVzKSB7XG4gICAgICAgICAgICBpbnB1dCA9IGlucHV0ICogNjA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl9pc1VUQyAmJiBrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgICAgICBsb2NhbEFkanVzdCA9IGdldERhdGVPZmZzZXQodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fb2Zmc2V0ID0gaW5wdXQ7XG4gICAgICAgIHRoaXMuX2lzVVRDID0gdHJ1ZTtcbiAgICAgICAgaWYgKGxvY2FsQWRqdXN0ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkKGxvY2FsQWRqdXN0LCAnbScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvZmZzZXQgIT09IGlucHV0KSB7XG4gICAgICAgICAgICBpZiAoIWtlZXBMb2NhbFRpbWUgfHwgdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcykge1xuICAgICAgICAgICAgICAgIGFkZFN1YnRyYWN0KHRoaXMsIGNyZWF0ZUR1cmF0aW9uKGlucHV0IC0gb2Zmc2V0LCAnbScpLCAxLCBmYWxzZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLl9jaGFuZ2VJblByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgaG9va3MudXBkYXRlT2Zmc2V0KHRoaXMsIHRydWUpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc1VUQyA/IG9mZnNldCA6IGdldERhdGVPZmZzZXQodGhpcyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRTZXRab25lIChpbnB1dCwga2VlcExvY2FsVGltZSkge1xuICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpbnB1dCA9IC1pbnB1dDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudXRjT2Zmc2V0KGlucHV0LCBrZWVwTG9jYWxUaW1lKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gLXRoaXMudXRjT2Zmc2V0KCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRPZmZzZXRUb1VUQyAoa2VlcExvY2FsVGltZSkge1xuICAgIHJldHVybiB0aGlzLnV0Y09mZnNldCgwLCBrZWVwTG9jYWxUaW1lKTtcbn1cblxuZnVuY3Rpb24gc2V0T2Zmc2V0VG9Mb2NhbCAoa2VlcExvY2FsVGltZSkge1xuICAgIGlmICh0aGlzLl9pc1VUQykge1xuICAgICAgICB0aGlzLnV0Y09mZnNldCgwLCBrZWVwTG9jYWxUaW1lKTtcbiAgICAgICAgdGhpcy5faXNVVEMgPSBmYWxzZTtcblxuICAgICAgICBpZiAoa2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgdGhpcy5zdWJ0cmFjdChnZXREYXRlT2Zmc2V0KHRoaXMpLCAnbScpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufVxuXG5mdW5jdGlvbiBzZXRPZmZzZXRUb1BhcnNlZE9mZnNldCAoKSB7XG4gICAgaWYgKHRoaXMuX3R6bSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMudXRjT2Zmc2V0KHRoaXMuX3R6bSwgZmFsc2UsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuX2kgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciB0Wm9uZSA9IG9mZnNldEZyb21TdHJpbmcobWF0Y2hPZmZzZXQsIHRoaXMuX2kpO1xuICAgICAgICBpZiAodFpvbmUgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy51dGNPZmZzZXQodFpvbmUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy51dGNPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbmZ1bmN0aW9uIGhhc0FsaWduZWRIb3VyT2Zmc2V0IChpbnB1dCkge1xuICAgIGlmICghdGhpcy5pc1ZhbGlkKCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpbnB1dCA9IGlucHV0ID8gY3JlYXRlTG9jYWwoaW5wdXQpLnV0Y09mZnNldCgpIDogMDtcblxuICAgIHJldHVybiAodGhpcy51dGNPZmZzZXQoKSAtIGlucHV0KSAlIDYwID09PSAwO1xufVxuXG5mdW5jdGlvbiBpc0RheWxpZ2h0U2F2aW5nVGltZSAoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgdGhpcy51dGNPZmZzZXQoKSA+IHRoaXMuY2xvbmUoKS5tb250aCgwKS51dGNPZmZzZXQoKSB8fFxuICAgICAgICB0aGlzLnV0Y09mZnNldCgpID4gdGhpcy5jbG9uZSgpLm1vbnRoKDUpLnV0Y09mZnNldCgpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gaXNEYXlsaWdodFNhdmluZ1RpbWVTaGlmdGVkICgpIHtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX2lzRFNUU2hpZnRlZCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzRFNUU2hpZnRlZDtcbiAgICB9XG5cbiAgICB2YXIgYyA9IHt9O1xuXG4gICAgY29weUNvbmZpZyhjLCB0aGlzKTtcbiAgICBjID0gcHJlcGFyZUNvbmZpZyhjKTtcblxuICAgIGlmIChjLl9hKSB7XG4gICAgICAgIHZhciBvdGhlciA9IGMuX2lzVVRDID8gY3JlYXRlVVRDKGMuX2EpIDogY3JlYXRlTG9jYWwoYy5fYSk7XG4gICAgICAgIHRoaXMuX2lzRFNUU2hpZnRlZCA9IHRoaXMuaXNWYWxpZCgpICYmXG4gICAgICAgICAgICBjb21wYXJlQXJyYXlzKGMuX2EsIG90aGVyLnRvQXJyYXkoKSkgPiAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2lzRFNUU2hpZnRlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9pc0RTVFNoaWZ0ZWQ7XG59XG5cbmZ1bmN0aW9uIGlzTG9jYWwgKCkge1xuICAgIHJldHVybiB0aGlzLmlzVmFsaWQoKSA/ICF0aGlzLl9pc1VUQyA6IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1V0Y09mZnNldCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNWYWxpZCgpID8gdGhpcy5faXNVVEMgOiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNVdGMgKCkge1xuICAgIHJldHVybiB0aGlzLmlzVmFsaWQoKSA/IHRoaXMuX2lzVVRDICYmIHRoaXMuX29mZnNldCA9PT0gMCA6IGZhbHNlO1xufVxuXG4vLyBBU1AuTkVUIGpzb24gZGF0ZSBmb3JtYXQgcmVnZXhcbnZhciBhc3BOZXRSZWdleCA9IC9eKFxcLXxcXCspPyg/OihcXGQqKVsuIF0pPyhcXGQrKVxcOihcXGQrKSg/OlxcOihcXGQrKShcXC5cXGQqKT8pPyQvO1xuXG4vLyBmcm9tIGh0dHA6Ly9kb2NzLmNsb3N1cmUtbGlicmFyeS5nb29nbGVjb2RlLmNvbS9naXQvY2xvc3VyZV9nb29nX2RhdGVfZGF0ZS5qcy5zb3VyY2UuaHRtbFxuLy8gc29tZXdoYXQgbW9yZSBpbiBsaW5lIHdpdGggNC40LjMuMiAyMDA0IHNwZWMsIGJ1dCBhbGxvd3MgZGVjaW1hbCBhbnl3aGVyZVxuLy8gYW5kIGZ1cnRoZXIgbW9kaWZpZWQgdG8gYWxsb3cgZm9yIHN0cmluZ3MgY29udGFpbmluZyBib3RoIHdlZWsgYW5kIGRheVxudmFyIGlzb1JlZ2V4ID0gL14oLXxcXCspP1AoPzooWy0rXT9bMC05LC5dKilZKT8oPzooWy0rXT9bMC05LC5dKilNKT8oPzooWy0rXT9bMC05LC5dKilXKT8oPzooWy0rXT9bMC05LC5dKilEKT8oPzpUKD86KFstK10/WzAtOSwuXSopSCk/KD86KFstK10/WzAtOSwuXSopTSk/KD86KFstK10/WzAtOSwuXSopUyk/KT8kLztcblxuZnVuY3Rpb24gY3JlYXRlRHVyYXRpb24gKGlucHV0LCBrZXkpIHtcbiAgICB2YXIgZHVyYXRpb24gPSBpbnB1dCxcbiAgICAgICAgLy8gbWF0Y2hpbmcgYWdhaW5zdCByZWdleHAgaXMgZXhwZW5zaXZlLCBkbyBpdCBvbiBkZW1hbmRcbiAgICAgICAgbWF0Y2ggPSBudWxsLFxuICAgICAgICBzaWduLFxuICAgICAgICByZXQsXG4gICAgICAgIGRpZmZSZXM7XG5cbiAgICBpZiAoaXNEdXJhdGlvbihpbnB1dCkpIHtcbiAgICAgICAgZHVyYXRpb24gPSB7XG4gICAgICAgICAgICBtcyA6IGlucHV0Ll9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICBkICA6IGlucHV0Ll9kYXlzLFxuICAgICAgICAgICAgTSAgOiBpbnB1dC5fbW9udGhzXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChpc051bWJlcihpbnB1dCkpIHtcbiAgICAgICAgZHVyYXRpb24gPSB7fTtcbiAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgZHVyYXRpb25ba2V5XSA9IGlucHV0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHVyYXRpb24ubWlsbGlzZWNvbmRzID0gaW5wdXQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCEhKG1hdGNoID0gYXNwTmV0UmVnZXguZXhlYyhpbnB1dCkpKSB7XG4gICAgICAgIHNpZ24gPSAobWF0Y2hbMV0gPT09ICctJykgPyAtMSA6IDE7XG4gICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgeSAgOiAwLFxuICAgICAgICAgICAgZCAgOiB0b0ludChtYXRjaFtEQVRFXSkgICAgICAgICAgICAgICAgICAgICAgICAgKiBzaWduLFxuICAgICAgICAgICAgaCAgOiB0b0ludChtYXRjaFtIT1VSXSkgICAgICAgICAgICAgICAgICAgICAgICAgKiBzaWduLFxuICAgICAgICAgICAgbSAgOiB0b0ludChtYXRjaFtNSU5VVEVdKSAgICAgICAgICAgICAgICAgICAgICAgKiBzaWduLFxuICAgICAgICAgICAgcyAgOiB0b0ludChtYXRjaFtTRUNPTkRdKSAgICAgICAgICAgICAgICAgICAgICAgKiBzaWduLFxuICAgICAgICAgICAgbXMgOiB0b0ludChhYnNSb3VuZChtYXRjaFtNSUxMSVNFQ09ORF0gKiAxMDAwKSkgKiBzaWduIC8vIHRoZSBtaWxsaXNlY29uZCBkZWNpbWFsIHBvaW50IGlzIGluY2x1ZGVkIGluIHRoZSBtYXRjaFxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoISEobWF0Y2ggPSBpc29SZWdleC5leGVjKGlucHV0KSkpIHtcbiAgICAgICAgc2lnbiA9IChtYXRjaFsxXSA9PT0gJy0nKSA/IC0xIDogKG1hdGNoWzFdID09PSAnKycpID8gMSA6IDE7XG4gICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgeSA6IHBhcnNlSXNvKG1hdGNoWzJdLCBzaWduKSxcbiAgICAgICAgICAgIE0gOiBwYXJzZUlzbyhtYXRjaFszXSwgc2lnbiksXG4gICAgICAgICAgICB3IDogcGFyc2VJc28obWF0Y2hbNF0sIHNpZ24pLFxuICAgICAgICAgICAgZCA6IHBhcnNlSXNvKG1hdGNoWzVdLCBzaWduKSxcbiAgICAgICAgICAgIGggOiBwYXJzZUlzbyhtYXRjaFs2XSwgc2lnbiksXG4gICAgICAgICAgICBtIDogcGFyc2VJc28obWF0Y2hbN10sIHNpZ24pLFxuICAgICAgICAgICAgcyA6IHBhcnNlSXNvKG1hdGNoWzhdLCBzaWduKVxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZHVyYXRpb24gPT0gbnVsbCkgey8vIGNoZWNrcyBmb3IgbnVsbCBvciB1bmRlZmluZWRcbiAgICAgICAgZHVyYXRpb24gPSB7fTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkdXJhdGlvbiA9PT0gJ29iamVjdCcgJiYgKCdmcm9tJyBpbiBkdXJhdGlvbiB8fCAndG8nIGluIGR1cmF0aW9uKSkge1xuICAgICAgICBkaWZmUmVzID0gbW9tZW50c0RpZmZlcmVuY2UoY3JlYXRlTG9jYWwoZHVyYXRpb24uZnJvbSksIGNyZWF0ZUxvY2FsKGR1cmF0aW9uLnRvKSk7XG5cbiAgICAgICAgZHVyYXRpb24gPSB7fTtcbiAgICAgICAgZHVyYXRpb24ubXMgPSBkaWZmUmVzLm1pbGxpc2Vjb25kcztcbiAgICAgICAgZHVyYXRpb24uTSA9IGRpZmZSZXMubW9udGhzO1xuICAgIH1cblxuICAgIHJldCA9IG5ldyBEdXJhdGlvbihkdXJhdGlvbik7XG5cbiAgICBpZiAoaXNEdXJhdGlvbihpbnB1dCkgJiYgaGFzT3duUHJvcChpbnB1dCwgJ19sb2NhbGUnKSkge1xuICAgICAgICByZXQuX2xvY2FsZSA9IGlucHV0Ll9sb2NhbGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbn1cblxuY3JlYXRlRHVyYXRpb24uZm4gPSBEdXJhdGlvbi5wcm90b3R5cGU7XG5jcmVhdGVEdXJhdGlvbi5pbnZhbGlkID0gY3JlYXRlSW52YWxpZCQxO1xuXG5mdW5jdGlvbiBwYXJzZUlzbyAoaW5wLCBzaWduKSB7XG4gICAgLy8gV2UnZCBub3JtYWxseSB1c2Ugfn5pbnAgZm9yIHRoaXMsIGJ1dCB1bmZvcnR1bmF0ZWx5IGl0IGFsc29cbiAgICAvLyBjb252ZXJ0cyBmbG9hdHMgdG8gaW50cy5cbiAgICAvLyBpbnAgbWF5IGJlIHVuZGVmaW5lZCwgc28gY2FyZWZ1bCBjYWxsaW5nIHJlcGxhY2Ugb24gaXQuXG4gICAgdmFyIHJlcyA9IGlucCAmJiBwYXJzZUZsb2F0KGlucC5yZXBsYWNlKCcsJywgJy4nKSk7XG4gICAgLy8gYXBwbHkgc2lnbiB3aGlsZSB3ZSdyZSBhdCBpdFxuICAgIHJldHVybiAoaXNOYU4ocmVzKSA/IDAgOiByZXMpICogc2lnbjtcbn1cblxuZnVuY3Rpb24gcG9zaXRpdmVNb21lbnRzRGlmZmVyZW5jZShiYXNlLCBvdGhlcikge1xuICAgIHZhciByZXMgPSB7bWlsbGlzZWNvbmRzOiAwLCBtb250aHM6IDB9O1xuXG4gICAgcmVzLm1vbnRocyA9IG90aGVyLm1vbnRoKCkgLSBiYXNlLm1vbnRoKCkgK1xuICAgICAgICAob3RoZXIueWVhcigpIC0gYmFzZS55ZWFyKCkpICogMTI7XG4gICAgaWYgKGJhc2UuY2xvbmUoKS5hZGQocmVzLm1vbnRocywgJ00nKS5pc0FmdGVyKG90aGVyKSkge1xuICAgICAgICAtLXJlcy5tb250aHM7XG4gICAgfVxuXG4gICAgcmVzLm1pbGxpc2Vjb25kcyA9ICtvdGhlciAtICsoYmFzZS5jbG9uZSgpLmFkZChyZXMubW9udGhzLCAnTScpKTtcblxuICAgIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIG1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKSB7XG4gICAgdmFyIHJlcztcbiAgICBpZiAoIShiYXNlLmlzVmFsaWQoKSAmJiBvdGhlci5pc1ZhbGlkKCkpKSB7XG4gICAgICAgIHJldHVybiB7bWlsbGlzZWNvbmRzOiAwLCBtb250aHM6IDB9O1xuICAgIH1cblxuICAgIG90aGVyID0gY2xvbmVXaXRoT2Zmc2V0KG90aGVyLCBiYXNlKTtcbiAgICBpZiAoYmFzZS5pc0JlZm9yZShvdGhlcikpIHtcbiAgICAgICAgcmVzID0gcG9zaXRpdmVNb21lbnRzRGlmZmVyZW5jZShiYXNlLCBvdGhlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmVzID0gcG9zaXRpdmVNb21lbnRzRGlmZmVyZW5jZShvdGhlciwgYmFzZSk7XG4gICAgICAgIHJlcy5taWxsaXNlY29uZHMgPSAtcmVzLm1pbGxpc2Vjb25kcztcbiAgICAgICAgcmVzLm1vbnRocyA9IC1yZXMubW9udGhzO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFRPRE86IHJlbW92ZSAnbmFtZScgYXJnIGFmdGVyIGRlcHJlY2F0aW9uIGlzIHJlbW92ZWRcbmZ1bmN0aW9uIGNyZWF0ZUFkZGVyKGRpcmVjdGlvbiwgbmFtZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAodmFsLCBwZXJpb2QpIHtcbiAgICAgICAgdmFyIGR1ciwgdG1wO1xuICAgICAgICAvL2ludmVydCB0aGUgYXJndW1lbnRzLCBidXQgY29tcGxhaW4gYWJvdXQgaXRcbiAgICAgICAgaWYgKHBlcmlvZCAhPT0gbnVsbCAmJiAhaXNOYU4oK3BlcmlvZCkpIHtcbiAgICAgICAgICAgIGRlcHJlY2F0ZVNpbXBsZShuYW1lLCAnbW9tZW50KCkuJyArIG5hbWUgICsgJyhwZXJpb2QsIG51bWJlcikgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSBtb21lbnQoKS4nICsgbmFtZSArICcobnVtYmVyLCBwZXJpb2QpLiAnICtcbiAgICAgICAgICAgICdTZWUgaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9hZGQtaW52ZXJ0ZWQtcGFyYW0vIGZvciBtb3JlIGluZm8uJyk7XG4gICAgICAgICAgICB0bXAgPSB2YWw7IHZhbCA9IHBlcmlvZDsgcGVyaW9kID0gdG1wO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFsID0gdHlwZW9mIHZhbCA9PT0gJ3N0cmluZycgPyArdmFsIDogdmFsO1xuICAgICAgICBkdXIgPSBjcmVhdGVEdXJhdGlvbih2YWwsIHBlcmlvZCk7XG4gICAgICAgIGFkZFN1YnRyYWN0KHRoaXMsIGR1ciwgZGlyZWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gYWRkU3VidHJhY3QgKG1vbSwgZHVyYXRpb24sIGlzQWRkaW5nLCB1cGRhdGVPZmZzZXQpIHtcbiAgICB2YXIgbWlsbGlzZWNvbmRzID0gZHVyYXRpb24uX21pbGxpc2Vjb25kcyxcbiAgICAgICAgZGF5cyA9IGFic1JvdW5kKGR1cmF0aW9uLl9kYXlzKSxcbiAgICAgICAgbW9udGhzID0gYWJzUm91bmQoZHVyYXRpb24uX21vbnRocyk7XG5cbiAgICBpZiAoIW1vbS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgLy8gTm8gb3BcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHVwZGF0ZU9mZnNldCA9IHVwZGF0ZU9mZnNldCA9PSBudWxsID8gdHJ1ZSA6IHVwZGF0ZU9mZnNldDtcblxuICAgIGlmIChtb250aHMpIHtcbiAgICAgICAgc2V0TW9udGgobW9tLCBnZXQobW9tLCAnTW9udGgnKSArIG1vbnRocyAqIGlzQWRkaW5nKTtcbiAgICB9XG4gICAgaWYgKGRheXMpIHtcbiAgICAgICAgc2V0JDEobW9tLCAnRGF0ZScsIGdldChtb20sICdEYXRlJykgKyBkYXlzICogaXNBZGRpbmcpO1xuICAgIH1cbiAgICBpZiAobWlsbGlzZWNvbmRzKSB7XG4gICAgICAgIG1vbS5fZC5zZXRUaW1lKG1vbS5fZC52YWx1ZU9mKCkgKyBtaWxsaXNlY29uZHMgKiBpc0FkZGluZyk7XG4gICAgfVxuICAgIGlmICh1cGRhdGVPZmZzZXQpIHtcbiAgICAgICAgaG9va3MudXBkYXRlT2Zmc2V0KG1vbSwgZGF5cyB8fCBtb250aHMpO1xuICAgIH1cbn1cblxudmFyIGFkZCAgICAgID0gY3JlYXRlQWRkZXIoMSwgJ2FkZCcpO1xudmFyIHN1YnRyYWN0ID0gY3JlYXRlQWRkZXIoLTEsICdzdWJ0cmFjdCcpO1xuXG5mdW5jdGlvbiBnZXRDYWxlbmRhckZvcm1hdChteU1vbWVudCwgbm93KSB7XG4gICAgdmFyIGRpZmYgPSBteU1vbWVudC5kaWZmKG5vdywgJ2RheXMnLCB0cnVlKTtcbiAgICByZXR1cm4gZGlmZiA8IC02ID8gJ3NhbWVFbHNlJyA6XG4gICAgICAgICAgICBkaWZmIDwgLTEgPyAnbGFzdFdlZWsnIDpcbiAgICAgICAgICAgIGRpZmYgPCAwID8gJ2xhc3REYXknIDpcbiAgICAgICAgICAgIGRpZmYgPCAxID8gJ3NhbWVEYXknIDpcbiAgICAgICAgICAgIGRpZmYgPCAyID8gJ25leHREYXknIDpcbiAgICAgICAgICAgIGRpZmYgPCA3ID8gJ25leHRXZWVrJyA6ICdzYW1lRWxzZSc7XG59XG5cbmZ1bmN0aW9uIGNhbGVuZGFyJDEgKHRpbWUsIGZvcm1hdHMpIHtcbiAgICAvLyBXZSB3YW50IHRvIGNvbXBhcmUgdGhlIHN0YXJ0IG9mIHRvZGF5LCB2cyB0aGlzLlxuICAgIC8vIEdldHRpbmcgc3RhcnQtb2YtdG9kYXkgZGVwZW5kcyBvbiB3aGV0aGVyIHdlJ3JlIGxvY2FsL3V0Yy9vZmZzZXQgb3Igbm90LlxuICAgIHZhciBub3cgPSB0aW1lIHx8IGNyZWF0ZUxvY2FsKCksXG4gICAgICAgIHNvZCA9IGNsb25lV2l0aE9mZnNldChub3csIHRoaXMpLnN0YXJ0T2YoJ2RheScpLFxuICAgICAgICBmb3JtYXQgPSBob29rcy5jYWxlbmRhckZvcm1hdCh0aGlzLCBzb2QpIHx8ICdzYW1lRWxzZSc7XG5cbiAgICB2YXIgb3V0cHV0ID0gZm9ybWF0cyAmJiAoaXNGdW5jdGlvbihmb3JtYXRzW2Zvcm1hdF0pID8gZm9ybWF0c1tmb3JtYXRdLmNhbGwodGhpcywgbm93KSA6IGZvcm1hdHNbZm9ybWF0XSk7XG5cbiAgICByZXR1cm4gdGhpcy5mb3JtYXQob3V0cHV0IHx8IHRoaXMubG9jYWxlRGF0YSgpLmNhbGVuZGFyKGZvcm1hdCwgdGhpcywgY3JlYXRlTG9jYWwobm93KSkpO1xufVxuXG5mdW5jdGlvbiBjbG9uZSAoKSB7XG4gICAgcmV0dXJuIG5ldyBNb21lbnQodGhpcyk7XG59XG5cbmZ1bmN0aW9uIGlzQWZ0ZXIgKGlucHV0LCB1bml0cykge1xuICAgIHZhciBsb2NhbElucHV0ID0gaXNNb21lbnQoaW5wdXQpID8gaW5wdXQgOiBjcmVhdGVMb2NhbChpbnB1dCk7XG4gICAgaWYgKCEodGhpcy5pc1ZhbGlkKCkgJiYgbG9jYWxJbnB1dC5pc1ZhbGlkKCkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyghaXNVbmRlZmluZWQodW5pdHMpID8gdW5pdHMgOiAnbWlsbGlzZWNvbmQnKTtcbiAgICBpZiAodW5pdHMgPT09ICdtaWxsaXNlY29uZCcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVPZigpID4gbG9jYWxJbnB1dC52YWx1ZU9mKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsSW5wdXQudmFsdWVPZigpIDwgdGhpcy5jbG9uZSgpLnN0YXJ0T2YodW5pdHMpLnZhbHVlT2YoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGlzQmVmb3JlIChpbnB1dCwgdW5pdHMpIHtcbiAgICB2YXIgbG9jYWxJbnB1dCA9IGlzTW9tZW50KGlucHV0KSA/IGlucHV0IDogY3JlYXRlTG9jYWwoaW5wdXQpO1xuICAgIGlmICghKHRoaXMuaXNWYWxpZCgpICYmIGxvY2FsSW5wdXQuaXNWYWxpZCgpKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHMoIWlzVW5kZWZpbmVkKHVuaXRzKSA/IHVuaXRzIDogJ21pbGxpc2Vjb25kJyk7XG4gICAgaWYgKHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlT2YoKSA8IGxvY2FsSW5wdXQudmFsdWVPZigpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNsb25lKCkuZW5kT2YodW5pdHMpLnZhbHVlT2YoKSA8IGxvY2FsSW5wdXQudmFsdWVPZigpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaXNCZXR3ZWVuIChmcm9tLCB0bywgdW5pdHMsIGluY2x1c2l2aXR5KSB7XG4gICAgaW5jbHVzaXZpdHkgPSBpbmNsdXNpdml0eSB8fCAnKCknO1xuICAgIHJldHVybiAoaW5jbHVzaXZpdHlbMF0gPT09ICcoJyA/IHRoaXMuaXNBZnRlcihmcm9tLCB1bml0cykgOiAhdGhpcy5pc0JlZm9yZShmcm9tLCB1bml0cykpICYmXG4gICAgICAgIChpbmNsdXNpdml0eVsxXSA9PT0gJyknID8gdGhpcy5pc0JlZm9yZSh0bywgdW5pdHMpIDogIXRoaXMuaXNBZnRlcih0bywgdW5pdHMpKTtcbn1cblxuZnVuY3Rpb24gaXNTYW1lIChpbnB1dCwgdW5pdHMpIHtcbiAgICB2YXIgbG9jYWxJbnB1dCA9IGlzTW9tZW50KGlucHV0KSA/IGlucHV0IDogY3JlYXRlTG9jYWwoaW5wdXQpLFxuICAgICAgICBpbnB1dE1zO1xuICAgIGlmICghKHRoaXMuaXNWYWxpZCgpICYmIGxvY2FsSW5wdXQuaXNWYWxpZCgpKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMgfHwgJ21pbGxpc2Vjb25kJyk7XG4gICAgaWYgKHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlT2YoKSA9PT0gbG9jYWxJbnB1dC52YWx1ZU9mKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXRNcyA9IGxvY2FsSW5wdXQudmFsdWVPZigpO1xuICAgICAgICByZXR1cm4gdGhpcy5jbG9uZSgpLnN0YXJ0T2YodW5pdHMpLnZhbHVlT2YoKSA8PSBpbnB1dE1zICYmIGlucHV0TXMgPD0gdGhpcy5jbG9uZSgpLmVuZE9mKHVuaXRzKS52YWx1ZU9mKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc1NhbWVPckFmdGVyIChpbnB1dCwgdW5pdHMpIHtcbiAgICByZXR1cm4gdGhpcy5pc1NhbWUoaW5wdXQsIHVuaXRzKSB8fCB0aGlzLmlzQWZ0ZXIoaW5wdXQsdW5pdHMpO1xufVxuXG5mdW5jdGlvbiBpc1NhbWVPckJlZm9yZSAoaW5wdXQsIHVuaXRzKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNTYW1lKGlucHV0LCB1bml0cykgfHwgdGhpcy5pc0JlZm9yZShpbnB1dCx1bml0cyk7XG59XG5cbmZ1bmN0aW9uIGRpZmYgKGlucHV0LCB1bml0cywgYXNGbG9hdCkge1xuICAgIHZhciB0aGF0LFxuICAgICAgICB6b25lRGVsdGEsXG4gICAgICAgIG91dHB1dDtcblxuICAgIGlmICghdGhpcy5pc1ZhbGlkKCkpIHtcbiAgICAgICAgcmV0dXJuIE5hTjtcbiAgICB9XG5cbiAgICB0aGF0ID0gY2xvbmVXaXRoT2Zmc2V0KGlucHV0LCB0aGlzKTtcblxuICAgIGlmICghdGhhdC5pc1ZhbGlkKCkpIHtcbiAgICAgICAgcmV0dXJuIE5hTjtcbiAgICB9XG5cbiAgICB6b25lRGVsdGEgPSAodGhhdC51dGNPZmZzZXQoKSAtIHRoaXMudXRjT2Zmc2V0KCkpICogNmU0O1xuXG4gICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG5cbiAgICBzd2l0Y2ggKHVuaXRzKSB7XG4gICAgICAgIGNhc2UgJ3llYXInOiBvdXRwdXQgPSBtb250aERpZmYodGhpcywgdGhhdCkgLyAxMjsgYnJlYWs7XG4gICAgICAgIGNhc2UgJ21vbnRoJzogb3V0cHV0ID0gbW9udGhEaWZmKHRoaXMsIHRoYXQpOyBicmVhaztcbiAgICAgICAgY2FzZSAncXVhcnRlcic6IG91dHB1dCA9IG1vbnRoRGlmZih0aGlzLCB0aGF0KSAvIDM7IGJyZWFrO1xuICAgICAgICBjYXNlICdzZWNvbmQnOiBvdXRwdXQgPSAodGhpcyAtIHRoYXQpIC8gMWUzOyBicmVhazsgLy8gMTAwMFxuICAgICAgICBjYXNlICdtaW51dGUnOiBvdXRwdXQgPSAodGhpcyAtIHRoYXQpIC8gNmU0OyBicmVhazsgLy8gMTAwMCAqIDYwXG4gICAgICAgIGNhc2UgJ2hvdXInOiBvdXRwdXQgPSAodGhpcyAtIHRoYXQpIC8gMzZlNTsgYnJlYWs7IC8vIDEwMDAgKiA2MCAqIDYwXG4gICAgICAgIGNhc2UgJ2RheSc6IG91dHB1dCA9ICh0aGlzIC0gdGhhdCAtIHpvbmVEZWx0YSkgLyA4NjRlNTsgYnJlYWs7IC8vIDEwMDAgKiA2MCAqIDYwICogMjQsIG5lZ2F0ZSBkc3RcbiAgICAgICAgY2FzZSAnd2Vlayc6IG91dHB1dCA9ICh0aGlzIC0gdGhhdCAtIHpvbmVEZWx0YSkgLyA2MDQ4ZTU7IGJyZWFrOyAvLyAxMDAwICogNjAgKiA2MCAqIDI0ICogNywgbmVnYXRlIGRzdFxuICAgICAgICBkZWZhdWx0OiBvdXRwdXQgPSB0aGlzIC0gdGhhdDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXNGbG9hdCA/IG91dHB1dCA6IGFic0Zsb29yKG91dHB1dCk7XG59XG5cbmZ1bmN0aW9uIG1vbnRoRGlmZiAoYSwgYikge1xuICAgIC8vIGRpZmZlcmVuY2UgaW4gbW9udGhzXG4gICAgdmFyIHdob2xlTW9udGhEaWZmID0gKChiLnllYXIoKSAtIGEueWVhcigpKSAqIDEyKSArIChiLm1vbnRoKCkgLSBhLm1vbnRoKCkpLFxuICAgICAgICAvLyBiIGlzIGluIChhbmNob3IgLSAxIG1vbnRoLCBhbmNob3IgKyAxIG1vbnRoKVxuICAgICAgICBhbmNob3IgPSBhLmNsb25lKCkuYWRkKHdob2xlTW9udGhEaWZmLCAnbW9udGhzJyksXG4gICAgICAgIGFuY2hvcjIsIGFkanVzdDtcblxuICAgIGlmIChiIC0gYW5jaG9yIDwgMCkge1xuICAgICAgICBhbmNob3IyID0gYS5jbG9uZSgpLmFkZCh3aG9sZU1vbnRoRGlmZiAtIDEsICdtb250aHMnKTtcbiAgICAgICAgLy8gbGluZWFyIGFjcm9zcyB0aGUgbW9udGhcbiAgICAgICAgYWRqdXN0ID0gKGIgLSBhbmNob3IpIC8gKGFuY2hvciAtIGFuY2hvcjIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFuY2hvcjIgPSBhLmNsb25lKCkuYWRkKHdob2xlTW9udGhEaWZmICsgMSwgJ21vbnRocycpO1xuICAgICAgICAvLyBsaW5lYXIgYWNyb3NzIHRoZSBtb250aFxuICAgICAgICBhZGp1c3QgPSAoYiAtIGFuY2hvcikgLyAoYW5jaG9yMiAtIGFuY2hvcik7XG4gICAgfVxuXG4gICAgLy9jaGVjayBmb3IgbmVnYXRpdmUgemVybywgcmV0dXJuIHplcm8gaWYgbmVnYXRpdmUgemVyb1xuICAgIHJldHVybiAtKHdob2xlTW9udGhEaWZmICsgYWRqdXN0KSB8fCAwO1xufVxuXG5ob29rcy5kZWZhdWx0Rm9ybWF0ID0gJ1lZWVktTU0tRERUSEg6bW06c3NaJztcbmhvb2tzLmRlZmF1bHRGb3JtYXRVdGMgPSAnWVlZWS1NTS1ERFRISDptbTpzc1taXSc7XG5cbmZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gdGhpcy5jbG9uZSgpLmxvY2FsZSgnZW4nKS5mb3JtYXQoJ2RkZCBNTU0gREQgWVlZWSBISDptbTpzcyBbR01UXVpaJyk7XG59XG5cbmZ1bmN0aW9uIHRvSVNPU3RyaW5nKGtlZXBPZmZzZXQpIHtcbiAgICBpZiAoIXRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB2YXIgdXRjID0ga2VlcE9mZnNldCAhPT0gdHJ1ZTtcbiAgICB2YXIgbSA9IHV0YyA/IHRoaXMuY2xvbmUoKS51dGMoKSA6IHRoaXM7XG4gICAgaWYgKG0ueWVhcigpIDwgMCB8fCBtLnllYXIoKSA+IDk5OTkpIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdE1vbWVudChtLCB1dGMgPyAnWVlZWVlZLU1NLUREW1RdSEg6bW06c3MuU1NTW1pdJyA6ICdZWVlZWVktTU0tRERbVF1ISDptbTpzcy5TU1NaJyk7XG4gICAgfVxuICAgIGlmIChpc0Z1bmN0aW9uKERhdGUucHJvdG90eXBlLnRvSVNPU3RyaW5nKSkge1xuICAgICAgICAvLyBuYXRpdmUgaW1wbGVtZW50YXRpb24gaXMgfjUweCBmYXN0ZXIsIHVzZSBpdCB3aGVuIHdlIGNhblxuICAgICAgICBpZiAodXRjKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0RhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKHRoaXMudmFsdWVPZigpICsgdGhpcy51dGNPZmZzZXQoKSAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKS5yZXBsYWNlKCdaJywgZm9ybWF0TW9tZW50KG0sICdaJykpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmb3JtYXRNb21lbnQobSwgdXRjID8gJ1lZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl0nIDogJ1lZWVktTU0tRERbVF1ISDptbTpzcy5TU1NaJyk7XG59XG5cbi8qKlxuICogUmV0dXJuIGEgaHVtYW4gcmVhZGFibGUgcmVwcmVzZW50YXRpb24gb2YgYSBtb21lbnQgdGhhdCBjYW5cbiAqIGFsc28gYmUgZXZhbHVhdGVkIHRvIGdldCBhIG5ldyBtb21lbnQgd2hpY2ggaXMgdGhlIHNhbWVcbiAqXG4gKiBAbGluayBodHRwczovL25vZGVqcy5vcmcvZGlzdC9sYXRlc3QvZG9jcy9hcGkvdXRpbC5odG1sI3V0aWxfY3VzdG9tX2luc3BlY3RfZnVuY3Rpb25fb25fb2JqZWN0c1xuICovXG5mdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgICBpZiAoIXRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgIHJldHVybiAnbW9tZW50LmludmFsaWQoLyogJyArIHRoaXMuX2kgKyAnICovKSc7XG4gICAgfVxuICAgIHZhciBmdW5jID0gJ21vbWVudCc7XG4gICAgdmFyIHpvbmUgPSAnJztcbiAgICBpZiAoIXRoaXMuaXNMb2NhbCgpKSB7XG4gICAgICAgIGZ1bmMgPSB0aGlzLnV0Y09mZnNldCgpID09PSAwID8gJ21vbWVudC51dGMnIDogJ21vbWVudC5wYXJzZVpvbmUnO1xuICAgICAgICB6b25lID0gJ1onO1xuICAgIH1cbiAgICB2YXIgcHJlZml4ID0gJ1snICsgZnVuYyArICcoXCJdJztcbiAgICB2YXIgeWVhciA9ICgwIDw9IHRoaXMueWVhcigpICYmIHRoaXMueWVhcigpIDw9IDk5OTkpID8gJ1lZWVknIDogJ1lZWVlZWSc7XG4gICAgdmFyIGRhdGV0aW1lID0gJy1NTS1ERFtUXUhIOm1tOnNzLlNTUyc7XG4gICAgdmFyIHN1ZmZpeCA9IHpvbmUgKyAnW1wiKV0nO1xuXG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0KHByZWZpeCArIHllYXIgKyBkYXRldGltZSArIHN1ZmZpeCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdCAoaW5wdXRTdHJpbmcpIHtcbiAgICBpZiAoIWlucHV0U3RyaW5nKSB7XG4gICAgICAgIGlucHV0U3RyaW5nID0gdGhpcy5pc1V0YygpID8gaG9va3MuZGVmYXVsdEZvcm1hdFV0YyA6IGhvb2tzLmRlZmF1bHRGb3JtYXQ7XG4gICAgfVxuICAgIHZhciBvdXRwdXQgPSBmb3JtYXRNb21lbnQodGhpcywgaW5wdXRTdHJpbmcpO1xuICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5wb3N0Zm9ybWF0KG91dHB1dCk7XG59XG5cbmZ1bmN0aW9uIGZyb20gKHRpbWUsIHdpdGhvdXRTdWZmaXgpIHtcbiAgICBpZiAodGhpcy5pc1ZhbGlkKCkgJiZcbiAgICAgICAgICAgICgoaXNNb21lbnQodGltZSkgJiYgdGltZS5pc1ZhbGlkKCkpIHx8XG4gICAgICAgICAgICAgY3JlYXRlTG9jYWwodGltZSkuaXNWYWxpZCgpKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRHVyYXRpb24oe3RvOiB0aGlzLCBmcm9tOiB0aW1lfSkubG9jYWxlKHRoaXMubG9jYWxlKCkpLmh1bWFuaXplKCF3aXRob3V0U3VmZml4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkuaW52YWxpZERhdGUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZyb21Ob3cgKHdpdGhvdXRTdWZmaXgpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tKGNyZWF0ZUxvY2FsKCksIHdpdGhvdXRTdWZmaXgpO1xufVxuXG5mdW5jdGlvbiB0byAodGltZSwgd2l0aG91dFN1ZmZpeCkge1xuICAgIGlmICh0aGlzLmlzVmFsaWQoKSAmJlxuICAgICAgICAgICAgKChpc01vbWVudCh0aW1lKSAmJiB0aW1lLmlzVmFsaWQoKSkgfHxcbiAgICAgICAgICAgICBjcmVhdGVMb2NhbCh0aW1lKS5pc1ZhbGlkKCkpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVEdXJhdGlvbih7ZnJvbTogdGhpcywgdG86IHRpbWV9KS5sb2NhbGUodGhpcy5sb2NhbGUoKSkuaHVtYW5pemUoIXdpdGhvdXRTdWZmaXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5pbnZhbGlkRGF0ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdG9Ob3cgKHdpdGhvdXRTdWZmaXgpIHtcbiAgICByZXR1cm4gdGhpcy50byhjcmVhdGVMb2NhbCgpLCB3aXRob3V0U3VmZml4KTtcbn1cblxuLy8gSWYgcGFzc2VkIGEgbG9jYWxlIGtleSwgaXQgd2lsbCBzZXQgdGhlIGxvY2FsZSBmb3IgdGhpc1xuLy8gaW5zdGFuY2UuICBPdGhlcndpc2UsIGl0IHdpbGwgcmV0dXJuIHRoZSBsb2NhbGUgY29uZmlndXJhdGlvblxuLy8gdmFyaWFibGVzIGZvciB0aGlzIGluc3RhbmNlLlxuZnVuY3Rpb24gbG9jYWxlIChrZXkpIHtcbiAgICB2YXIgbmV3TG9jYWxlRGF0YTtcblxuICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9jYWxlLl9hYmJyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld0xvY2FsZURhdGEgPSBnZXRMb2NhbGUoa2V5KTtcbiAgICAgICAgaWYgKG5ld0xvY2FsZURhdGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5fbG9jYWxlID0gbmV3TG9jYWxlRGF0YTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnZhciBsYW5nID0gZGVwcmVjYXRlKFxuICAgICdtb21lbnQoKS5sYW5nKCkgaXMgZGVwcmVjYXRlZC4gSW5zdGVhZCwgdXNlIG1vbWVudCgpLmxvY2FsZURhdGEoKSB0byBnZXQgdGhlIGxhbmd1YWdlIGNvbmZpZ3VyYXRpb24uIFVzZSBtb21lbnQoKS5sb2NhbGUoKSB0byBjaGFuZ2UgbGFuZ3VhZ2VzLicsXG4gICAgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZShrZXkpO1xuICAgICAgICB9XG4gICAgfVxuKTtcblxuZnVuY3Rpb24gbG9jYWxlRGF0YSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xvY2FsZTtcbn1cblxuZnVuY3Rpb24gc3RhcnRPZiAodW5pdHMpIHtcbiAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAvLyB0aGUgZm9sbG93aW5nIHN3aXRjaCBpbnRlbnRpb25hbGx5IG9taXRzIGJyZWFrIGtleXdvcmRzXG4gICAgLy8gdG8gdXRpbGl6ZSBmYWxsaW5nIHRocm91Z2ggdGhlIGNhc2VzLlxuICAgIHN3aXRjaCAodW5pdHMpIHtcbiAgICAgICAgY2FzZSAneWVhcic6XG4gICAgICAgICAgICB0aGlzLm1vbnRoKDApO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdxdWFydGVyJzpcbiAgICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICAgICAgdGhpcy5kYXRlKDEpO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICd3ZWVrJzpcbiAgICAgICAgY2FzZSAnaXNvV2Vlayc6XG4gICAgICAgIGNhc2UgJ2RheSc6XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgdGhpcy5ob3VycygwKTtcbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnaG91cic6XG4gICAgICAgICAgICB0aGlzLm1pbnV0ZXMoMCk7XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgICAgICAgICB0aGlzLnNlY29uZHMoMCk7XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ3NlY29uZCc6XG4gICAgICAgICAgICB0aGlzLm1pbGxpc2Vjb25kcygwKTtcbiAgICB9XG5cbiAgICAvLyB3ZWVrcyBhcmUgYSBzcGVjaWFsIGNhc2VcbiAgICBpZiAodW5pdHMgPT09ICd3ZWVrJykge1xuICAgICAgICB0aGlzLndlZWtkYXkoMCk7XG4gICAgfVxuICAgIGlmICh1bml0cyA9PT0gJ2lzb1dlZWsnKSB7XG4gICAgICAgIHRoaXMuaXNvV2Vla2RheSgxKTtcbiAgICB9XG5cbiAgICAvLyBxdWFydGVycyBhcmUgYWxzbyBzcGVjaWFsXG4gICAgaWYgKHVuaXRzID09PSAncXVhcnRlcicpIHtcbiAgICAgICAgdGhpcy5tb250aChNYXRoLmZsb29yKHRoaXMubW9udGgoKSAvIDMpICogMyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbmZ1bmN0aW9uIGVuZE9mICh1bml0cykge1xuICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgIGlmICh1bml0cyA9PT0gdW5kZWZpbmVkIHx8IHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vICdkYXRlJyBpcyBhbiBhbGlhcyBmb3IgJ2RheScsIHNvIGl0IHNob3VsZCBiZSBjb25zaWRlcmVkIGFzIHN1Y2guXG4gICAgaWYgKHVuaXRzID09PSAnZGF0ZScpIHtcbiAgICAgICAgdW5pdHMgPSAnZGF5JztcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5zdGFydE9mKHVuaXRzKS5hZGQoMSwgKHVuaXRzID09PSAnaXNvV2VlaycgPyAnd2VlaycgOiB1bml0cykpLnN1YnRyYWN0KDEsICdtcycpO1xufVxuXG5mdW5jdGlvbiB2YWx1ZU9mICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZC52YWx1ZU9mKCkgLSAoKHRoaXMuX29mZnNldCB8fCAwKSAqIDYwMDAwKTtcbn1cblxuZnVuY3Rpb24gdW5peCAoKSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IodGhpcy52YWx1ZU9mKCkgLyAxMDAwKTtcbn1cblxuZnVuY3Rpb24gdG9EYXRlICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUodGhpcy52YWx1ZU9mKCkpO1xufVxuXG5mdW5jdGlvbiB0b0FycmF5ICgpIHtcbiAgICB2YXIgbSA9IHRoaXM7XG4gICAgcmV0dXJuIFttLnllYXIoKSwgbS5tb250aCgpLCBtLmRhdGUoKSwgbS5ob3VyKCksIG0ubWludXRlKCksIG0uc2Vjb25kKCksIG0ubWlsbGlzZWNvbmQoKV07XG59XG5cbmZ1bmN0aW9uIHRvT2JqZWN0ICgpIHtcbiAgICB2YXIgbSA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgeWVhcnM6IG0ueWVhcigpLFxuICAgICAgICBtb250aHM6IG0ubW9udGgoKSxcbiAgICAgICAgZGF0ZTogbS5kYXRlKCksXG4gICAgICAgIGhvdXJzOiBtLmhvdXJzKCksXG4gICAgICAgIG1pbnV0ZXM6IG0ubWludXRlcygpLFxuICAgICAgICBzZWNvbmRzOiBtLnNlY29uZHMoKSxcbiAgICAgICAgbWlsbGlzZWNvbmRzOiBtLm1pbGxpc2Vjb25kcygpXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgICAvLyBuZXcgRGF0ZShOYU4pLnRvSlNPTigpID09PSBudWxsXG4gICAgcmV0dXJuIHRoaXMuaXNWYWxpZCgpID8gdGhpcy50b0lTT1N0cmluZygpIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZCQyICgpIHtcbiAgICByZXR1cm4gaXNWYWxpZCh0aGlzKTtcbn1cblxuZnVuY3Rpb24gcGFyc2luZ0ZsYWdzICgpIHtcbiAgICByZXR1cm4gZXh0ZW5kKHt9LCBnZXRQYXJzaW5nRmxhZ3ModGhpcykpO1xufVxuXG5mdW5jdGlvbiBpbnZhbGlkQXQgKCkge1xuICAgIHJldHVybiBnZXRQYXJzaW5nRmxhZ3ModGhpcykub3ZlcmZsb3c7XG59XG5cbmZ1bmN0aW9uIGNyZWF0aW9uRGF0YSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBpbnB1dDogdGhpcy5faSxcbiAgICAgICAgZm9ybWF0OiB0aGlzLl9mLFxuICAgICAgICBsb2NhbGU6IHRoaXMuX2xvY2FsZSxcbiAgICAgICAgaXNVVEM6IHRoaXMuX2lzVVRDLFxuICAgICAgICBzdHJpY3Q6IHRoaXMuX3N0cmljdFxuICAgIH07XG59XG5cbi8vIEZPUk1BVFRJTkdcblxuYWRkRm9ybWF0VG9rZW4oMCwgWydnZycsIDJdLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMud2Vla1llYXIoKSAlIDEwMDtcbn0pO1xuXG5hZGRGb3JtYXRUb2tlbigwLCBbJ0dHJywgMl0sIDAsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5pc29XZWVrWWVhcigpICUgMTAwO1xufSk7XG5cbmZ1bmN0aW9uIGFkZFdlZWtZZWFyRm9ybWF0VG9rZW4gKHRva2VuLCBnZXR0ZXIpIHtcbiAgICBhZGRGb3JtYXRUb2tlbigwLCBbdG9rZW4sIHRva2VuLmxlbmd0aF0sIDAsIGdldHRlcik7XG59XG5cbmFkZFdlZWtZZWFyRm9ybWF0VG9rZW4oJ2dnZ2cnLCAgICAgJ3dlZWtZZWFyJyk7XG5hZGRXZWVrWWVhckZvcm1hdFRva2VuKCdnZ2dnZycsICAgICd3ZWVrWWVhcicpO1xuYWRkV2Vla1llYXJGb3JtYXRUb2tlbignR0dHRycsICAnaXNvV2Vla1llYXInKTtcbmFkZFdlZWtZZWFyRm9ybWF0VG9rZW4oJ0dHR0dHJywgJ2lzb1dlZWtZZWFyJyk7XG5cbi8vIEFMSUFTRVNcblxuYWRkVW5pdEFsaWFzKCd3ZWVrWWVhcicsICdnZycpO1xuYWRkVW5pdEFsaWFzKCdpc29XZWVrWWVhcicsICdHRycpO1xuXG4vLyBQUklPUklUWVxuXG5hZGRVbml0UHJpb3JpdHkoJ3dlZWtZZWFyJywgMSk7XG5hZGRVbml0UHJpb3JpdHkoJ2lzb1dlZWtZZWFyJywgMSk7XG5cblxuLy8gUEFSU0lOR1xuXG5hZGRSZWdleFRva2VuKCdHJywgICAgICBtYXRjaFNpZ25lZCk7XG5hZGRSZWdleFRva2VuKCdnJywgICAgICBtYXRjaFNpZ25lZCk7XG5hZGRSZWdleFRva2VuKCdHRycsICAgICBtYXRjaDF0bzIsIG1hdGNoMik7XG5hZGRSZWdleFRva2VuKCdnZycsICAgICBtYXRjaDF0bzIsIG1hdGNoMik7XG5hZGRSZWdleFRva2VuKCdHR0dHJywgICBtYXRjaDF0bzQsIG1hdGNoNCk7XG5hZGRSZWdleFRva2VuKCdnZ2dnJywgICBtYXRjaDF0bzQsIG1hdGNoNCk7XG5hZGRSZWdleFRva2VuKCdHR0dHRycsICBtYXRjaDF0bzYsIG1hdGNoNik7XG5hZGRSZWdleFRva2VuKCdnZ2dnZycsICBtYXRjaDF0bzYsIG1hdGNoNik7XG5cbmFkZFdlZWtQYXJzZVRva2VuKFsnZ2dnZycsICdnZ2dnZycsICdHR0dHJywgJ0dHR0dHJ10sIGZ1bmN0aW9uIChpbnB1dCwgd2VlaywgY29uZmlnLCB0b2tlbikge1xuICAgIHdlZWtbdG9rZW4uc3Vic3RyKDAsIDIpXSA9IHRvSW50KGlucHV0KTtcbn0pO1xuXG5hZGRXZWVrUGFyc2VUb2tlbihbJ2dnJywgJ0dHJ10sIGZ1bmN0aW9uIChpbnB1dCwgd2VlaywgY29uZmlnLCB0b2tlbikge1xuICAgIHdlZWtbdG9rZW5dID0gaG9va3MucGFyc2VUd29EaWdpdFllYXIoaW5wdXQpO1xufSk7XG5cbi8vIE1PTUVOVFNcblxuZnVuY3Rpb24gZ2V0U2V0V2Vla1llYXIgKGlucHV0KSB7XG4gICAgcmV0dXJuIGdldFNldFdlZWtZZWFySGVscGVyLmNhbGwodGhpcyxcbiAgICAgICAgICAgIGlucHV0LFxuICAgICAgICAgICAgdGhpcy53ZWVrKCksXG4gICAgICAgICAgICB0aGlzLndlZWtkYXkoKSxcbiAgICAgICAgICAgIHRoaXMubG9jYWxlRGF0YSgpLl93ZWVrLmRvdyxcbiAgICAgICAgICAgIHRoaXMubG9jYWxlRGF0YSgpLl93ZWVrLmRveSk7XG59XG5cbmZ1bmN0aW9uIGdldFNldElTT1dlZWtZZWFyIChpbnB1dCkge1xuICAgIHJldHVybiBnZXRTZXRXZWVrWWVhckhlbHBlci5jYWxsKHRoaXMsXG4gICAgICAgICAgICBpbnB1dCwgdGhpcy5pc29XZWVrKCksIHRoaXMuaXNvV2Vla2RheSgpLCAxLCA0KTtcbn1cblxuZnVuY3Rpb24gZ2V0SVNPV2Vla3NJblllYXIgKCkge1xuICAgIHJldHVybiB3ZWVrc0luWWVhcih0aGlzLnllYXIoKSwgMSwgNCk7XG59XG5cbmZ1bmN0aW9uIGdldFdlZWtzSW5ZZWFyICgpIHtcbiAgICB2YXIgd2Vla0luZm8gPSB0aGlzLmxvY2FsZURhdGEoKS5fd2VlaztcbiAgICByZXR1cm4gd2Vla3NJblllYXIodGhpcy55ZWFyKCksIHdlZWtJbmZvLmRvdywgd2Vla0luZm8uZG95KTtcbn1cblxuZnVuY3Rpb24gZ2V0U2V0V2Vla1llYXJIZWxwZXIoaW5wdXQsIHdlZWssIHdlZWtkYXksIGRvdywgZG95KSB7XG4gICAgdmFyIHdlZWtzVGFyZ2V0O1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB3ZWVrT2ZZZWFyKHRoaXMsIGRvdywgZG95KS55ZWFyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHdlZWtzVGFyZ2V0ID0gd2Vla3NJblllYXIoaW5wdXQsIGRvdywgZG95KTtcbiAgICAgICAgaWYgKHdlZWsgPiB3ZWVrc1RhcmdldCkge1xuICAgICAgICAgICAgd2VlayA9IHdlZWtzVGFyZ2V0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZXRXZWVrQWxsLmNhbGwodGhpcywgaW5wdXQsIHdlZWssIHdlZWtkYXksIGRvdywgZG95KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFdlZWtBbGwod2Vla1llYXIsIHdlZWssIHdlZWtkYXksIGRvdywgZG95KSB7XG4gICAgdmFyIGRheU9mWWVhckRhdGEgPSBkYXlPZlllYXJGcm9tV2Vla3Mod2Vla1llYXIsIHdlZWssIHdlZWtkYXksIGRvdywgZG95KSxcbiAgICAgICAgZGF0ZSA9IGNyZWF0ZVVUQ0RhdGUoZGF5T2ZZZWFyRGF0YS55ZWFyLCAwLCBkYXlPZlllYXJEYXRhLmRheU9mWWVhcik7XG5cbiAgICB0aGlzLnllYXIoZGF0ZS5nZXRVVENGdWxsWWVhcigpKTtcbiAgICB0aGlzLm1vbnRoKGRhdGUuZ2V0VVRDTW9udGgoKSk7XG4gICAgdGhpcy5kYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpKTtcbiAgICByZXR1cm4gdGhpcztcbn1cblxuLy8gRk9STUFUVElOR1xuXG5hZGRGb3JtYXRUb2tlbignUScsIDAsICdRbycsICdxdWFydGVyJyk7XG5cbi8vIEFMSUFTRVNcblxuYWRkVW5pdEFsaWFzKCdxdWFydGVyJywgJ1EnKTtcblxuLy8gUFJJT1JJVFlcblxuYWRkVW5pdFByaW9yaXR5KCdxdWFydGVyJywgNyk7XG5cbi8vIFBBUlNJTkdcblxuYWRkUmVnZXhUb2tlbignUScsIG1hdGNoMSk7XG5hZGRQYXJzZVRva2VuKCdRJywgZnVuY3Rpb24gKGlucHV0LCBhcnJheSkge1xuICAgIGFycmF5W01PTlRIXSA9ICh0b0ludChpbnB1dCkgLSAxKSAqIDM7XG59KTtcblxuLy8gTU9NRU5UU1xuXG5mdW5jdGlvbiBnZXRTZXRRdWFydGVyIChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gTWF0aC5jZWlsKCh0aGlzLm1vbnRoKCkgKyAxKSAvIDMpIDogdGhpcy5tb250aCgoaW5wdXQgLSAxKSAqIDMgKyB0aGlzLm1vbnRoKCkgJSAzKTtcbn1cblxuLy8gRk9STUFUVElOR1xuXG5hZGRGb3JtYXRUb2tlbignRCcsIFsnREQnLCAyXSwgJ0RvJywgJ2RhdGUnKTtcblxuLy8gQUxJQVNFU1xuXG5hZGRVbml0QWxpYXMoJ2RhdGUnLCAnRCcpO1xuXG4vLyBQUklPUk9JVFlcbmFkZFVuaXRQcmlvcml0eSgnZGF0ZScsIDkpO1xuXG4vLyBQQVJTSU5HXG5cbmFkZFJlZ2V4VG9rZW4oJ0QnLCAgbWF0Y2gxdG8yKTtcbmFkZFJlZ2V4VG9rZW4oJ0REJywgbWF0Y2gxdG8yLCBtYXRjaDIpO1xuYWRkUmVnZXhUb2tlbignRG8nLCBmdW5jdGlvbiAoaXNTdHJpY3QsIGxvY2FsZSkge1xuICAgIC8vIFRPRE86IFJlbW92ZSBcIm9yZGluYWxQYXJzZVwiIGZhbGxiYWNrIGluIG5leHQgbWFqb3IgcmVsZWFzZS5cbiAgICByZXR1cm4gaXNTdHJpY3QgP1xuICAgICAgKGxvY2FsZS5fZGF5T2ZNb250aE9yZGluYWxQYXJzZSB8fCBsb2NhbGUuX29yZGluYWxQYXJzZSkgOlxuICAgICAgbG9jYWxlLl9kYXlPZk1vbnRoT3JkaW5hbFBhcnNlTGVuaWVudDtcbn0pO1xuXG5hZGRQYXJzZVRva2VuKFsnRCcsICdERCddLCBEQVRFKTtcbmFkZFBhcnNlVG9rZW4oJ0RvJywgZnVuY3Rpb24gKGlucHV0LCBhcnJheSkge1xuICAgIGFycmF5W0RBVEVdID0gdG9JbnQoaW5wdXQubWF0Y2gobWF0Y2gxdG8yKVswXSk7XG59KTtcblxuLy8gTU9NRU5UU1xuXG52YXIgZ2V0U2V0RGF5T2ZNb250aCA9IG1ha2VHZXRTZXQoJ0RhdGUnLCB0cnVlKTtcblxuLy8gRk9STUFUVElOR1xuXG5hZGRGb3JtYXRUb2tlbignREREJywgWydEREREJywgM10sICdERERvJywgJ2RheU9mWWVhcicpO1xuXG4vLyBBTElBU0VTXG5cbmFkZFVuaXRBbGlhcygnZGF5T2ZZZWFyJywgJ0RERCcpO1xuXG4vLyBQUklPUklUWVxuYWRkVW5pdFByaW9yaXR5KCdkYXlPZlllYXInLCA0KTtcblxuLy8gUEFSU0lOR1xuXG5hZGRSZWdleFRva2VuKCdEREQnLCAgbWF0Y2gxdG8zKTtcbmFkZFJlZ2V4VG9rZW4oJ0REREQnLCBtYXRjaDMpO1xuYWRkUGFyc2VUb2tlbihbJ0RERCcsICdEREREJ10sIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXksIGNvbmZpZykge1xuICAgIGNvbmZpZy5fZGF5T2ZZZWFyID0gdG9JbnQoaW5wdXQpO1xufSk7XG5cbi8vIEhFTFBFUlNcblxuLy8gTU9NRU5UU1xuXG5mdW5jdGlvbiBnZXRTZXREYXlPZlllYXIgKGlucHV0KSB7XG4gICAgdmFyIGRheU9mWWVhciA9IE1hdGgucm91bmQoKHRoaXMuY2xvbmUoKS5zdGFydE9mKCdkYXknKSAtIHRoaXMuY2xvbmUoKS5zdGFydE9mKCd5ZWFyJykpIC8gODY0ZTUpICsgMTtcbiAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IGRheU9mWWVhciA6IHRoaXMuYWRkKChpbnB1dCAtIGRheU9mWWVhciksICdkJyk7XG59XG5cbi8vIEZPUk1BVFRJTkdcblxuYWRkRm9ybWF0VG9rZW4oJ20nLCBbJ21tJywgMl0sIDAsICdtaW51dGUnKTtcblxuLy8gQUxJQVNFU1xuXG5hZGRVbml0QWxpYXMoJ21pbnV0ZScsICdtJyk7XG5cbi8vIFBSSU9SSVRZXG5cbmFkZFVuaXRQcmlvcml0eSgnbWludXRlJywgMTQpO1xuXG4vLyBQQVJTSU5HXG5cbmFkZFJlZ2V4VG9rZW4oJ20nLCAgbWF0Y2gxdG8yKTtcbmFkZFJlZ2V4VG9rZW4oJ21tJywgbWF0Y2gxdG8yLCBtYXRjaDIpO1xuYWRkUGFyc2VUb2tlbihbJ20nLCAnbW0nXSwgTUlOVVRFKTtcblxuLy8gTU9NRU5UU1xuXG52YXIgZ2V0U2V0TWludXRlID0gbWFrZUdldFNldCgnTWludXRlcycsIGZhbHNlKTtcblxuLy8gRk9STUFUVElOR1xuXG5hZGRGb3JtYXRUb2tlbigncycsIFsnc3MnLCAyXSwgMCwgJ3NlY29uZCcpO1xuXG4vLyBBTElBU0VTXG5cbmFkZFVuaXRBbGlhcygnc2Vjb25kJywgJ3MnKTtcblxuLy8gUFJJT1JJVFlcblxuYWRkVW5pdFByaW9yaXR5KCdzZWNvbmQnLCAxNSk7XG5cbi8vIFBBUlNJTkdcblxuYWRkUmVnZXhUb2tlbigncycsICBtYXRjaDF0bzIpO1xuYWRkUmVnZXhUb2tlbignc3MnLCBtYXRjaDF0bzIsIG1hdGNoMik7XG5hZGRQYXJzZVRva2VuKFsncycsICdzcyddLCBTRUNPTkQpO1xuXG4vLyBNT01FTlRTXG5cbnZhciBnZXRTZXRTZWNvbmQgPSBtYWtlR2V0U2V0KCdTZWNvbmRzJywgZmFsc2UpO1xuXG4vLyBGT1JNQVRUSU5HXG5cbmFkZEZvcm1hdFRva2VuKCdTJywgMCwgMCwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB+fih0aGlzLm1pbGxpc2Vjb25kKCkgLyAxMDApO1xufSk7XG5cbmFkZEZvcm1hdFRva2VuKDAsIFsnU1MnLCAyXSwgMCwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB+fih0aGlzLm1pbGxpc2Vjb25kKCkgLyAxMCk7XG59KTtcblxuYWRkRm9ybWF0VG9rZW4oMCwgWydTU1MnLCAzXSwgMCwgJ21pbGxpc2Vjb25kJyk7XG5hZGRGb3JtYXRUb2tlbigwLCBbJ1NTU1MnLCA0XSwgMCwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1pbGxpc2Vjb25kKCkgKiAxMDtcbn0pO1xuYWRkRm9ybWF0VG9rZW4oMCwgWydTU1NTUycsIDVdLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubWlsbGlzZWNvbmQoKSAqIDEwMDtcbn0pO1xuYWRkRm9ybWF0VG9rZW4oMCwgWydTU1NTU1MnLCA2XSwgMCwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1pbGxpc2Vjb25kKCkgKiAxMDAwO1xufSk7XG5hZGRGb3JtYXRUb2tlbigwLCBbJ1NTU1NTU1MnLCA3XSwgMCwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1pbGxpc2Vjb25kKCkgKiAxMDAwMDtcbn0pO1xuYWRkRm9ybWF0VG9rZW4oMCwgWydTU1NTU1NTUycsIDhdLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubWlsbGlzZWNvbmQoKSAqIDEwMDAwMDtcbn0pO1xuYWRkRm9ybWF0VG9rZW4oMCwgWydTU1NTU1NTU1MnLCA5XSwgMCwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1pbGxpc2Vjb25kKCkgKiAxMDAwMDAwO1xufSk7XG5cblxuLy8gQUxJQVNFU1xuXG5hZGRVbml0QWxpYXMoJ21pbGxpc2Vjb25kJywgJ21zJyk7XG5cbi8vIFBSSU9SSVRZXG5cbmFkZFVuaXRQcmlvcml0eSgnbWlsbGlzZWNvbmQnLCAxNik7XG5cbi8vIFBBUlNJTkdcblxuYWRkUmVnZXhUb2tlbignUycsICAgIG1hdGNoMXRvMywgbWF0Y2gxKTtcbmFkZFJlZ2V4VG9rZW4oJ1NTJywgICBtYXRjaDF0bzMsIG1hdGNoMik7XG5hZGRSZWdleFRva2VuKCdTU1MnLCAgbWF0Y2gxdG8zLCBtYXRjaDMpO1xuXG52YXIgdG9rZW47XG5mb3IgKHRva2VuID0gJ1NTU1MnOyB0b2tlbi5sZW5ndGggPD0gOTsgdG9rZW4gKz0gJ1MnKSB7XG4gICAgYWRkUmVnZXhUb2tlbih0b2tlbiwgbWF0Y2hVbnNpZ25lZCk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTXMoaW5wdXQsIGFycmF5KSB7XG4gICAgYXJyYXlbTUlMTElTRUNPTkRdID0gdG9JbnQoKCcwLicgKyBpbnB1dCkgKiAxMDAwKTtcbn1cblxuZm9yICh0b2tlbiA9ICdTJzsgdG9rZW4ubGVuZ3RoIDw9IDk7IHRva2VuICs9ICdTJykge1xuICAgIGFkZFBhcnNlVG9rZW4odG9rZW4sIHBhcnNlTXMpO1xufVxuLy8gTU9NRU5UU1xuXG52YXIgZ2V0U2V0TWlsbGlzZWNvbmQgPSBtYWtlR2V0U2V0KCdNaWxsaXNlY29uZHMnLCBmYWxzZSk7XG5cbi8vIEZPUk1BVFRJTkdcblxuYWRkRm9ybWF0VG9rZW4oJ3onLCAgMCwgMCwgJ3pvbmVBYmJyJyk7XG5hZGRGb3JtYXRUb2tlbignenonLCAwLCAwLCAnem9uZU5hbWUnKTtcblxuLy8gTU9NRU5UU1xuXG5mdW5jdGlvbiBnZXRab25lQWJiciAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzVVRDID8gJ1VUQycgOiAnJztcbn1cblxuZnVuY3Rpb24gZ2V0Wm9uZU5hbWUgKCkge1xuICAgIHJldHVybiB0aGlzLl9pc1VUQyA/ICdDb29yZGluYXRlZCBVbml2ZXJzYWwgVGltZScgOiAnJztcbn1cblxudmFyIHByb3RvID0gTW9tZW50LnByb3RvdHlwZTtcblxucHJvdG8uYWRkICAgICAgICAgICAgICAgPSBhZGQ7XG5wcm90by5jYWxlbmRhciAgICAgICAgICA9IGNhbGVuZGFyJDE7XG5wcm90by5jbG9uZSAgICAgICAgICAgICA9IGNsb25lO1xucHJvdG8uZGlmZiAgICAgICAgICAgICAgPSBkaWZmO1xucHJvdG8uZW5kT2YgICAgICAgICAgICAgPSBlbmRPZjtcbnByb3RvLmZvcm1hdCAgICAgICAgICAgID0gZm9ybWF0O1xucHJvdG8uZnJvbSAgICAgICAgICAgICAgPSBmcm9tO1xucHJvdG8uZnJvbU5vdyAgICAgICAgICAgPSBmcm9tTm93O1xucHJvdG8udG8gICAgICAgICAgICAgICAgPSB0bztcbnByb3RvLnRvTm93ICAgICAgICAgICAgID0gdG9Ob3c7XG5wcm90by5nZXQgICAgICAgICAgICAgICA9IHN0cmluZ0dldDtcbnByb3RvLmludmFsaWRBdCAgICAgICAgID0gaW52YWxpZEF0O1xucHJvdG8uaXNBZnRlciAgICAgICAgICAgPSBpc0FmdGVyO1xucHJvdG8uaXNCZWZvcmUgICAgICAgICAgPSBpc0JlZm9yZTtcbnByb3RvLmlzQmV0d2VlbiAgICAgICAgID0gaXNCZXR3ZWVuO1xucHJvdG8uaXNTYW1lICAgICAgICAgICAgPSBpc1NhbWU7XG5wcm90by5pc1NhbWVPckFmdGVyICAgICA9IGlzU2FtZU9yQWZ0ZXI7XG5wcm90by5pc1NhbWVPckJlZm9yZSAgICA9IGlzU2FtZU9yQmVmb3JlO1xucHJvdG8uaXNWYWxpZCAgICAgICAgICAgPSBpc1ZhbGlkJDI7XG5wcm90by5sYW5nICAgICAgICAgICAgICA9IGxhbmc7XG5wcm90by5sb2NhbGUgICAgICAgICAgICA9IGxvY2FsZTtcbnByb3RvLmxvY2FsZURhdGEgICAgICAgID0gbG9jYWxlRGF0YTtcbnByb3RvLm1heCAgICAgICAgICAgICAgID0gcHJvdG90eXBlTWF4O1xucHJvdG8ubWluICAgICAgICAgICAgICAgPSBwcm90b3R5cGVNaW47XG5wcm90by5wYXJzaW5nRmxhZ3MgICAgICA9IHBhcnNpbmdGbGFncztcbnByb3RvLnNldCAgICAgICAgICAgICAgID0gc3RyaW5nU2V0O1xucHJvdG8uc3RhcnRPZiAgICAgICAgICAgPSBzdGFydE9mO1xucHJvdG8uc3VidHJhY3QgICAgICAgICAgPSBzdWJ0cmFjdDtcbnByb3RvLnRvQXJyYXkgICAgICAgICAgID0gdG9BcnJheTtcbnByb3RvLnRvT2JqZWN0ICAgICAgICAgID0gdG9PYmplY3Q7XG5wcm90by50b0RhdGUgICAgICAgICAgICA9IHRvRGF0ZTtcbnByb3RvLnRvSVNPU3RyaW5nICAgICAgID0gdG9JU09TdHJpbmc7XG5wcm90by5pbnNwZWN0ICAgICAgICAgICA9IGluc3BlY3Q7XG5wcm90by50b0pTT04gICAgICAgICAgICA9IHRvSlNPTjtcbnByb3RvLnRvU3RyaW5nICAgICAgICAgID0gdG9TdHJpbmc7XG5wcm90by51bml4ICAgICAgICAgICAgICA9IHVuaXg7XG5wcm90by52YWx1ZU9mICAgICAgICAgICA9IHZhbHVlT2Y7XG5wcm90by5jcmVhdGlvbkRhdGEgICAgICA9IGNyZWF0aW9uRGF0YTtcbnByb3RvLnllYXIgICAgICAgPSBnZXRTZXRZZWFyO1xucHJvdG8uaXNMZWFwWWVhciA9IGdldElzTGVhcFllYXI7XG5wcm90by53ZWVrWWVhciAgICA9IGdldFNldFdlZWtZZWFyO1xucHJvdG8uaXNvV2Vla1llYXIgPSBnZXRTZXRJU09XZWVrWWVhcjtcbnByb3RvLnF1YXJ0ZXIgPSBwcm90by5xdWFydGVycyA9IGdldFNldFF1YXJ0ZXI7XG5wcm90by5tb250aCAgICAgICA9IGdldFNldE1vbnRoO1xucHJvdG8uZGF5c0luTW9udGggPSBnZXREYXlzSW5Nb250aDtcbnByb3RvLndlZWsgICAgICAgICAgID0gcHJvdG8ud2Vla3MgICAgICAgID0gZ2V0U2V0V2VlaztcbnByb3RvLmlzb1dlZWsgICAgICAgID0gcHJvdG8uaXNvV2Vla3MgICAgID0gZ2V0U2V0SVNPV2VlaztcbnByb3RvLndlZWtzSW5ZZWFyICAgID0gZ2V0V2Vla3NJblllYXI7XG5wcm90by5pc29XZWVrc0luWWVhciA9IGdldElTT1dlZWtzSW5ZZWFyO1xucHJvdG8uZGF0ZSAgICAgICA9IGdldFNldERheU9mTW9udGg7XG5wcm90by5kYXkgICAgICAgID0gcHJvdG8uZGF5cyAgICAgICAgICAgICA9IGdldFNldERheU9mV2VlaztcbnByb3RvLndlZWtkYXkgICAgPSBnZXRTZXRMb2NhbGVEYXlPZldlZWs7XG5wcm90by5pc29XZWVrZGF5ID0gZ2V0U2V0SVNPRGF5T2ZXZWVrO1xucHJvdG8uZGF5T2ZZZWFyICA9IGdldFNldERheU9mWWVhcjtcbnByb3RvLmhvdXIgPSBwcm90by5ob3VycyA9IGdldFNldEhvdXI7XG5wcm90by5taW51dGUgPSBwcm90by5taW51dGVzID0gZ2V0U2V0TWludXRlO1xucHJvdG8uc2Vjb25kID0gcHJvdG8uc2Vjb25kcyA9IGdldFNldFNlY29uZDtcbnByb3RvLm1pbGxpc2Vjb25kID0gcHJvdG8ubWlsbGlzZWNvbmRzID0gZ2V0U2V0TWlsbGlzZWNvbmQ7XG5wcm90by51dGNPZmZzZXQgICAgICAgICAgICA9IGdldFNldE9mZnNldDtcbnByb3RvLnV0YyAgICAgICAgICAgICAgICAgID0gc2V0T2Zmc2V0VG9VVEM7XG5wcm90by5sb2NhbCAgICAgICAgICAgICAgICA9IHNldE9mZnNldFRvTG9jYWw7XG5wcm90by5wYXJzZVpvbmUgICAgICAgICAgICA9IHNldE9mZnNldFRvUGFyc2VkT2Zmc2V0O1xucHJvdG8uaGFzQWxpZ25lZEhvdXJPZmZzZXQgPSBoYXNBbGlnbmVkSG91ck9mZnNldDtcbnByb3RvLmlzRFNUICAgICAgICAgICAgICAgID0gaXNEYXlsaWdodFNhdmluZ1RpbWU7XG5wcm90by5pc0xvY2FsICAgICAgICAgICAgICA9IGlzTG9jYWw7XG5wcm90by5pc1V0Y09mZnNldCAgICAgICAgICA9IGlzVXRjT2Zmc2V0O1xucHJvdG8uaXNVdGMgICAgICAgICAgICAgICAgPSBpc1V0YztcbnByb3RvLmlzVVRDICAgICAgICAgICAgICAgID0gaXNVdGM7XG5wcm90by56b25lQWJiciA9IGdldFpvbmVBYmJyO1xucHJvdG8uem9uZU5hbWUgPSBnZXRab25lTmFtZTtcbnByb3RvLmRhdGVzICA9IGRlcHJlY2F0ZSgnZGF0ZXMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIGRhdGUgaW5zdGVhZC4nLCBnZXRTZXREYXlPZk1vbnRoKTtcbnByb3RvLm1vbnRocyA9IGRlcHJlY2F0ZSgnbW9udGhzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb250aCBpbnN0ZWFkJywgZ2V0U2V0TW9udGgpO1xucHJvdG8ueWVhcnMgID0gZGVwcmVjYXRlKCd5ZWFycyBhY2Nlc3NvciBpcyBkZXByZWNhdGVkLiBVc2UgeWVhciBpbnN0ZWFkJywgZ2V0U2V0WWVhcik7XG5wcm90by56b25lICAgPSBkZXByZWNhdGUoJ21vbWVudCgpLnpvbmUgaXMgZGVwcmVjYXRlZCwgdXNlIG1vbWVudCgpLnV0Y09mZnNldCBpbnN0ZWFkLiBodHRwOi8vbW9tZW50anMuY29tL2d1aWRlcy8jL3dhcm5pbmdzL3pvbmUvJywgZ2V0U2V0Wm9uZSk7XG5wcm90by5pc0RTVFNoaWZ0ZWQgPSBkZXByZWNhdGUoJ2lzRFNUU2hpZnRlZCBpcyBkZXByZWNhdGVkLiBTZWUgaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9kc3Qtc2hpZnRlZC8gZm9yIG1vcmUgaW5mb3JtYXRpb24nLCBpc0RheWxpZ2h0U2F2aW5nVGltZVNoaWZ0ZWQpO1xuXG5mdW5jdGlvbiBjcmVhdGVVbml4IChpbnB1dCkge1xuICAgIHJldHVybiBjcmVhdGVMb2NhbChpbnB1dCAqIDEwMDApO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJblpvbmUgKCkge1xuICAgIHJldHVybiBjcmVhdGVMb2NhbC5hcHBseShudWxsLCBhcmd1bWVudHMpLnBhcnNlWm9uZSgpO1xufVxuXG5mdW5jdGlvbiBwcmVQYXJzZVBvc3RGb3JtYXQgKHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmc7XG59XG5cbnZhciBwcm90byQxID0gTG9jYWxlLnByb3RvdHlwZTtcblxucHJvdG8kMS5jYWxlbmRhciAgICAgICAgPSBjYWxlbmRhcjtcbnByb3RvJDEubG9uZ0RhdGVGb3JtYXQgID0gbG9uZ0RhdGVGb3JtYXQ7XG5wcm90byQxLmludmFsaWREYXRlICAgICA9IGludmFsaWREYXRlO1xucHJvdG8kMS5vcmRpbmFsICAgICAgICAgPSBvcmRpbmFsO1xucHJvdG8kMS5wcmVwYXJzZSAgICAgICAgPSBwcmVQYXJzZVBvc3RGb3JtYXQ7XG5wcm90byQxLnBvc3Rmb3JtYXQgICAgICA9IHByZVBhcnNlUG9zdEZvcm1hdDtcbnByb3RvJDEucmVsYXRpdmVUaW1lICAgID0gcmVsYXRpdmVUaW1lO1xucHJvdG8kMS5wYXN0RnV0dXJlICAgICAgPSBwYXN0RnV0dXJlO1xucHJvdG8kMS5zZXQgICAgICAgICAgICAgPSBzZXQ7XG5cbnByb3RvJDEubW9udGhzICAgICAgICAgICAgPSAgICAgICAgbG9jYWxlTW9udGhzO1xucHJvdG8kMS5tb250aHNTaG9ydCAgICAgICA9ICAgICAgICBsb2NhbGVNb250aHNTaG9ydDtcbnByb3RvJDEubW9udGhzUGFyc2UgICAgICAgPSAgICAgICAgbG9jYWxlTW9udGhzUGFyc2U7XG5wcm90byQxLm1vbnRoc1JlZ2V4ICAgICAgID0gbW9udGhzUmVnZXg7XG5wcm90byQxLm1vbnRoc1Nob3J0UmVnZXggID0gbW9udGhzU2hvcnRSZWdleDtcbnByb3RvJDEud2VlayA9IGxvY2FsZVdlZWs7XG5wcm90byQxLmZpcnN0RGF5T2ZZZWFyID0gbG9jYWxlRmlyc3REYXlPZlllYXI7XG5wcm90byQxLmZpcnN0RGF5T2ZXZWVrID0gbG9jYWxlRmlyc3REYXlPZldlZWs7XG5cbnByb3RvJDEud2Vla2RheXMgICAgICAgPSAgICAgICAgbG9jYWxlV2Vla2RheXM7XG5wcm90byQxLndlZWtkYXlzTWluICAgID0gICAgICAgIGxvY2FsZVdlZWtkYXlzTWluO1xucHJvdG8kMS53ZWVrZGF5c1Nob3J0ICA9ICAgICAgICBsb2NhbGVXZWVrZGF5c1Nob3J0O1xucHJvdG8kMS53ZWVrZGF5c1BhcnNlICA9ICAgICAgICBsb2NhbGVXZWVrZGF5c1BhcnNlO1xuXG5wcm90byQxLndlZWtkYXlzUmVnZXggICAgICAgPSAgICAgICAgd2Vla2RheXNSZWdleDtcbnByb3RvJDEud2Vla2RheXNTaG9ydFJlZ2V4ICA9ICAgICAgICB3ZWVrZGF5c1Nob3J0UmVnZXg7XG5wcm90byQxLndlZWtkYXlzTWluUmVnZXggICAgPSAgICAgICAgd2Vla2RheXNNaW5SZWdleDtcblxucHJvdG8kMS5pc1BNID0gbG9jYWxlSXNQTTtcbnByb3RvJDEubWVyaWRpZW0gPSBsb2NhbGVNZXJpZGllbTtcblxuZnVuY3Rpb24gZ2V0JDEgKGZvcm1hdCwgaW5kZXgsIGZpZWxkLCBzZXR0ZXIpIHtcbiAgICB2YXIgbG9jYWxlID0gZ2V0TG9jYWxlKCk7XG4gICAgdmFyIHV0YyA9IGNyZWF0ZVVUQygpLnNldChzZXR0ZXIsIGluZGV4KTtcbiAgICByZXR1cm4gbG9jYWxlW2ZpZWxkXSh1dGMsIGZvcm1hdCk7XG59XG5cbmZ1bmN0aW9uIGxpc3RNb250aHNJbXBsIChmb3JtYXQsIGluZGV4LCBmaWVsZCkge1xuICAgIGlmIChpc051bWJlcihmb3JtYXQpKSB7XG4gICAgICAgIGluZGV4ID0gZm9ybWF0O1xuICAgICAgICBmb3JtYXQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZm9ybWF0ID0gZm9ybWF0IHx8ICcnO1xuXG4gICAgaWYgKGluZGV4ICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGdldCQxKGZvcm1hdCwgaW5kZXgsIGZpZWxkLCAnbW9udGgnKTtcbiAgICB9XG5cbiAgICB2YXIgaTtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgZm9yIChpID0gMDsgaSA8IDEyOyBpKyspIHtcbiAgICAgICAgb3V0W2ldID0gZ2V0JDEoZm9ybWF0LCBpLCBmaWVsZCwgJ21vbnRoJyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG59XG5cbi8vICgpXG4vLyAoNSlcbi8vIChmbXQsIDUpXG4vLyAoZm10KVxuLy8gKHRydWUpXG4vLyAodHJ1ZSwgNSlcbi8vICh0cnVlLCBmbXQsIDUpXG4vLyAodHJ1ZSwgZm10KVxuZnVuY3Rpb24gbGlzdFdlZWtkYXlzSW1wbCAobG9jYWxlU29ydGVkLCBmb3JtYXQsIGluZGV4LCBmaWVsZCkge1xuICAgIGlmICh0eXBlb2YgbG9jYWxlU29ydGVkID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgaWYgKGlzTnVtYmVyKGZvcm1hdCkpIHtcbiAgICAgICAgICAgIGluZGV4ID0gZm9ybWF0O1xuICAgICAgICAgICAgZm9ybWF0ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9ybWF0ID0gZm9ybWF0IHx8ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcm1hdCA9IGxvY2FsZVNvcnRlZDtcbiAgICAgICAgaW5kZXggPSBmb3JtYXQ7XG4gICAgICAgIGxvY2FsZVNvcnRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChpc051bWJlcihmb3JtYXQpKSB7XG4gICAgICAgICAgICBpbmRleCA9IGZvcm1hdDtcbiAgICAgICAgICAgIGZvcm1hdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvcm1hdCA9IGZvcm1hdCB8fCAnJztcbiAgICB9XG5cbiAgICB2YXIgbG9jYWxlID0gZ2V0TG9jYWxlKCksXG4gICAgICAgIHNoaWZ0ID0gbG9jYWxlU29ydGVkID8gbG9jYWxlLl93ZWVrLmRvdyA6IDA7XG5cbiAgICBpZiAoaW5kZXggIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZ2V0JDEoZm9ybWF0LCAoaW5kZXggKyBzaGlmdCkgJSA3LCBmaWVsZCwgJ2RheScpO1xuICAgIH1cblxuICAgIHZhciBpO1xuICAgIHZhciBvdXQgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgIG91dFtpXSA9IGdldCQxKGZvcm1hdCwgKGkgKyBzaGlmdCkgJSA3LCBmaWVsZCwgJ2RheScpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBsaXN0TW9udGhzIChmb3JtYXQsIGluZGV4KSB7XG4gICAgcmV0dXJuIGxpc3RNb250aHNJbXBsKGZvcm1hdCwgaW5kZXgsICdtb250aHMnKTtcbn1cblxuZnVuY3Rpb24gbGlzdE1vbnRoc1Nob3J0IChmb3JtYXQsIGluZGV4KSB7XG4gICAgcmV0dXJuIGxpc3RNb250aHNJbXBsKGZvcm1hdCwgaW5kZXgsICdtb250aHNTaG9ydCcpO1xufVxuXG5mdW5jdGlvbiBsaXN0V2Vla2RheXMgKGxvY2FsZVNvcnRlZCwgZm9ybWF0LCBpbmRleCkge1xuICAgIHJldHVybiBsaXN0V2Vla2RheXNJbXBsKGxvY2FsZVNvcnRlZCwgZm9ybWF0LCBpbmRleCwgJ3dlZWtkYXlzJyk7XG59XG5cbmZ1bmN0aW9uIGxpc3RXZWVrZGF5c1Nob3J0IChsb2NhbGVTb3J0ZWQsIGZvcm1hdCwgaW5kZXgpIHtcbiAgICByZXR1cm4gbGlzdFdlZWtkYXlzSW1wbChsb2NhbGVTb3J0ZWQsIGZvcm1hdCwgaW5kZXgsICd3ZWVrZGF5c1Nob3J0Jyk7XG59XG5cbmZ1bmN0aW9uIGxpc3RXZWVrZGF5c01pbiAobG9jYWxlU29ydGVkLCBmb3JtYXQsIGluZGV4KSB7XG4gICAgcmV0dXJuIGxpc3RXZWVrZGF5c0ltcGwobG9jYWxlU29ydGVkLCBmb3JtYXQsIGluZGV4LCAnd2Vla2RheXNNaW4nKTtcbn1cblxuZ2V0U2V0R2xvYmFsTG9jYWxlKCdlbicsIHtcbiAgICBkYXlPZk1vbnRoT3JkaW5hbFBhcnNlOiAvXFxkezEsMn0odGh8c3R8bmR8cmQpLyxcbiAgICBvcmRpbmFsIDogZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICB2YXIgYiA9IG51bWJlciAlIDEwLFxuICAgICAgICAgICAgb3V0cHV0ID0gKHRvSW50KG51bWJlciAlIDEwMCAvIDEwKSA9PT0gMSkgPyAndGgnIDpcbiAgICAgICAgICAgIChiID09PSAxKSA/ICdzdCcgOlxuICAgICAgICAgICAgKGIgPT09IDIpID8gJ25kJyA6XG4gICAgICAgICAgICAoYiA9PT0gMykgPyAncmQnIDogJ3RoJztcbiAgICAgICAgcmV0dXJuIG51bWJlciArIG91dHB1dDtcbiAgICB9XG59KTtcblxuLy8gU2lkZSBlZmZlY3QgaW1wb3J0c1xuXG5ob29rcy5sYW5nID0gZGVwcmVjYXRlKCdtb21lbnQubGFuZyBpcyBkZXByZWNhdGVkLiBVc2UgbW9tZW50LmxvY2FsZSBpbnN0ZWFkLicsIGdldFNldEdsb2JhbExvY2FsZSk7XG5ob29rcy5sYW5nRGF0YSA9IGRlcHJlY2F0ZSgnbW9tZW50LmxhbmdEYXRhIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb21lbnQubG9jYWxlRGF0YSBpbnN0ZWFkLicsIGdldExvY2FsZSk7XG5cbnZhciBtYXRoQWJzID0gTWF0aC5hYnM7XG5cbmZ1bmN0aW9uIGFicyAoKSB7XG4gICAgdmFyIGRhdGEgICAgICAgICAgID0gdGhpcy5fZGF0YTtcblxuICAgIHRoaXMuX21pbGxpc2Vjb25kcyA9IG1hdGhBYnModGhpcy5fbWlsbGlzZWNvbmRzKTtcbiAgICB0aGlzLl9kYXlzICAgICAgICAgPSBtYXRoQWJzKHRoaXMuX2RheXMpO1xuICAgIHRoaXMuX21vbnRocyAgICAgICA9IG1hdGhBYnModGhpcy5fbW9udGhzKTtcblxuICAgIGRhdGEubWlsbGlzZWNvbmRzICA9IG1hdGhBYnMoZGF0YS5taWxsaXNlY29uZHMpO1xuICAgIGRhdGEuc2Vjb25kcyAgICAgICA9IG1hdGhBYnMoZGF0YS5zZWNvbmRzKTtcbiAgICBkYXRhLm1pbnV0ZXMgICAgICAgPSBtYXRoQWJzKGRhdGEubWludXRlcyk7XG4gICAgZGF0YS5ob3VycyAgICAgICAgID0gbWF0aEFicyhkYXRhLmhvdXJzKTtcbiAgICBkYXRhLm1vbnRocyAgICAgICAgPSBtYXRoQWJzKGRhdGEubW9udGhzKTtcbiAgICBkYXRhLnllYXJzICAgICAgICAgPSBtYXRoQWJzKGRhdGEueWVhcnMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbmZ1bmN0aW9uIGFkZFN1YnRyYWN0JDEgKGR1cmF0aW9uLCBpbnB1dCwgdmFsdWUsIGRpcmVjdGlvbikge1xuICAgIHZhciBvdGhlciA9IGNyZWF0ZUR1cmF0aW9uKGlucHV0LCB2YWx1ZSk7XG5cbiAgICBkdXJhdGlvbi5fbWlsbGlzZWNvbmRzICs9IGRpcmVjdGlvbiAqIG90aGVyLl9taWxsaXNlY29uZHM7XG4gICAgZHVyYXRpb24uX2RheXMgICAgICAgICArPSBkaXJlY3Rpb24gKiBvdGhlci5fZGF5cztcbiAgICBkdXJhdGlvbi5fbW9udGhzICAgICAgICs9IGRpcmVjdGlvbiAqIG90aGVyLl9tb250aHM7XG5cbiAgICByZXR1cm4gZHVyYXRpb24uX2J1YmJsZSgpO1xufVxuXG4vLyBzdXBwb3J0cyBvbmx5IDIuMC1zdHlsZSBhZGQoMSwgJ3MnKSBvciBhZGQoZHVyYXRpb24pXG5mdW5jdGlvbiBhZGQkMSAoaW5wdXQsIHZhbHVlKSB7XG4gICAgcmV0dXJuIGFkZFN1YnRyYWN0JDEodGhpcywgaW5wdXQsIHZhbHVlLCAxKTtcbn1cblxuLy8gc3VwcG9ydHMgb25seSAyLjAtc3R5bGUgc3VidHJhY3QoMSwgJ3MnKSBvciBzdWJ0cmFjdChkdXJhdGlvbilcbmZ1bmN0aW9uIHN1YnRyYWN0JDEgKGlucHV0LCB2YWx1ZSkge1xuICAgIHJldHVybiBhZGRTdWJ0cmFjdCQxKHRoaXMsIGlucHV0LCB2YWx1ZSwgLTEpO1xufVxuXG5mdW5jdGlvbiBhYnNDZWlsIChudW1iZXIpIHtcbiAgICBpZiAobnVtYmVyIDwgMCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihudW1iZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBNYXRoLmNlaWwobnVtYmVyKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJ1YmJsZSAoKSB7XG4gICAgdmFyIG1pbGxpc2Vjb25kcyA9IHRoaXMuX21pbGxpc2Vjb25kcztcbiAgICB2YXIgZGF5cyAgICAgICAgID0gdGhpcy5fZGF5cztcbiAgICB2YXIgbW9udGhzICAgICAgID0gdGhpcy5fbW9udGhzO1xuICAgIHZhciBkYXRhICAgICAgICAgPSB0aGlzLl9kYXRhO1xuICAgIHZhciBzZWNvbmRzLCBtaW51dGVzLCBob3VycywgeWVhcnMsIG1vbnRoc0Zyb21EYXlzO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBhIG1peCBvZiBwb3NpdGl2ZSBhbmQgbmVnYXRpdmUgdmFsdWVzLCBidWJibGUgZG93biBmaXJzdFxuICAgIC8vIGNoZWNrOiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMjE2NlxuICAgIGlmICghKChtaWxsaXNlY29uZHMgPj0gMCAmJiBkYXlzID49IDAgJiYgbW9udGhzID49IDApIHx8XG4gICAgICAgICAgICAobWlsbGlzZWNvbmRzIDw9IDAgJiYgZGF5cyA8PSAwICYmIG1vbnRocyA8PSAwKSkpIHtcbiAgICAgICAgbWlsbGlzZWNvbmRzICs9IGFic0NlaWwobW9udGhzVG9EYXlzKG1vbnRocykgKyBkYXlzKSAqIDg2NGU1O1xuICAgICAgICBkYXlzID0gMDtcbiAgICAgICAgbW9udGhzID0gMDtcbiAgICB9XG5cbiAgICAvLyBUaGUgZm9sbG93aW5nIGNvZGUgYnViYmxlcyB1cCB2YWx1ZXMsIHNlZSB0aGUgdGVzdHMgZm9yXG4gICAgLy8gZXhhbXBsZXMgb2Ygd2hhdCB0aGF0IG1lYW5zLlxuICAgIGRhdGEubWlsbGlzZWNvbmRzID0gbWlsbGlzZWNvbmRzICUgMTAwMDtcblxuICAgIHNlY29uZHMgICAgICAgICAgID0gYWJzRmxvb3IobWlsbGlzZWNvbmRzIC8gMTAwMCk7XG4gICAgZGF0YS5zZWNvbmRzICAgICAgPSBzZWNvbmRzICUgNjA7XG5cbiAgICBtaW51dGVzICAgICAgICAgICA9IGFic0Zsb29yKHNlY29uZHMgLyA2MCk7XG4gICAgZGF0YS5taW51dGVzICAgICAgPSBtaW51dGVzICUgNjA7XG5cbiAgICBob3VycyAgICAgICAgICAgICA9IGFic0Zsb29yKG1pbnV0ZXMgLyA2MCk7XG4gICAgZGF0YS5ob3VycyAgICAgICAgPSBob3VycyAlIDI0O1xuXG4gICAgZGF5cyArPSBhYnNGbG9vcihob3VycyAvIDI0KTtcblxuICAgIC8vIGNvbnZlcnQgZGF5cyB0byBtb250aHNcbiAgICBtb250aHNGcm9tRGF5cyA9IGFic0Zsb29yKGRheXNUb01vbnRocyhkYXlzKSk7XG4gICAgbW9udGhzICs9IG1vbnRoc0Zyb21EYXlzO1xuICAgIGRheXMgLT0gYWJzQ2VpbChtb250aHNUb0RheXMobW9udGhzRnJvbURheXMpKTtcblxuICAgIC8vIDEyIG1vbnRocyAtPiAxIHllYXJcbiAgICB5ZWFycyA9IGFic0Zsb29yKG1vbnRocyAvIDEyKTtcbiAgICBtb250aHMgJT0gMTI7XG5cbiAgICBkYXRhLmRheXMgICA9IGRheXM7XG4gICAgZGF0YS5tb250aHMgPSBtb250aHM7XG4gICAgZGF0YS55ZWFycyAgPSB5ZWFycztcblxuICAgIHJldHVybiB0aGlzO1xufVxuXG5mdW5jdGlvbiBkYXlzVG9Nb250aHMgKGRheXMpIHtcbiAgICAvLyA0MDAgeWVhcnMgaGF2ZSAxNDYwOTcgZGF5cyAodGFraW5nIGludG8gYWNjb3VudCBsZWFwIHllYXIgcnVsZXMpXG4gICAgLy8gNDAwIHllYXJzIGhhdmUgMTIgbW9udGhzID09PSA0ODAwXG4gICAgcmV0dXJuIGRheXMgKiA0ODAwIC8gMTQ2MDk3O1xufVxuXG5mdW5jdGlvbiBtb250aHNUb0RheXMgKG1vbnRocykge1xuICAgIC8vIHRoZSByZXZlcnNlIG9mIGRheXNUb01vbnRoc1xuICAgIHJldHVybiBtb250aHMgKiAxNDYwOTcgLyA0ODAwO1xufVxuXG5mdW5jdGlvbiBhcyAodW5pdHMpIHtcbiAgICBpZiAoIXRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgIHJldHVybiBOYU47XG4gICAgfVxuICAgIHZhciBkYXlzO1xuICAgIHZhciBtb250aHM7XG4gICAgdmFyIG1pbGxpc2Vjb25kcyA9IHRoaXMuX21pbGxpc2Vjb25kcztcblxuICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuXG4gICAgaWYgKHVuaXRzID09PSAnbW9udGgnIHx8IHVuaXRzID09PSAneWVhcicpIHtcbiAgICAgICAgZGF5cyAgID0gdGhpcy5fZGF5cyAgICsgbWlsbGlzZWNvbmRzIC8gODY0ZTU7XG4gICAgICAgIG1vbnRocyA9IHRoaXMuX21vbnRocyArIGRheXNUb01vbnRocyhkYXlzKTtcbiAgICAgICAgcmV0dXJuIHVuaXRzID09PSAnbW9udGgnID8gbW9udGhzIDogbW9udGhzIC8gMTI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaGFuZGxlIG1pbGxpc2Vjb25kcyBzZXBhcmF0ZWx5IGJlY2F1c2Ugb2YgZmxvYXRpbmcgcG9pbnQgbWF0aCBlcnJvcnMgKGlzc3VlICMxODY3KVxuICAgICAgICBkYXlzID0gdGhpcy5fZGF5cyArIE1hdGgucm91bmQobW9udGhzVG9EYXlzKHRoaXMuX21vbnRocykpO1xuICAgICAgICBzd2l0Y2ggKHVuaXRzKSB7XG4gICAgICAgICAgICBjYXNlICd3ZWVrJyAgIDogcmV0dXJuIGRheXMgLyA3ICAgICArIG1pbGxpc2Vjb25kcyAvIDYwNDhlNTtcbiAgICAgICAgICAgIGNhc2UgJ2RheScgICAgOiByZXR1cm4gZGF5cyAgICAgICAgICsgbWlsbGlzZWNvbmRzIC8gODY0ZTU7XG4gICAgICAgICAgICBjYXNlICdob3VyJyAgIDogcmV0dXJuIGRheXMgKiAyNCAgICArIG1pbGxpc2Vjb25kcyAvIDM2ZTU7XG4gICAgICAgICAgICBjYXNlICdtaW51dGUnIDogcmV0dXJuIGRheXMgKiAxNDQwICArIG1pbGxpc2Vjb25kcyAvIDZlNDtcbiAgICAgICAgICAgIGNhc2UgJ3NlY29uZCcgOiByZXR1cm4gZGF5cyAqIDg2NDAwICsgbWlsbGlzZWNvbmRzIC8gMTAwMDtcbiAgICAgICAgICAgIC8vIE1hdGguZmxvb3IgcHJldmVudHMgZmxvYXRpbmcgcG9pbnQgbWF0aCBlcnJvcnMgaGVyZVxuICAgICAgICAgICAgY2FzZSAnbWlsbGlzZWNvbmQnOiByZXR1cm4gTWF0aC5mbG9vcihkYXlzICogODY0ZTUpICsgbWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHVuaXQgJyArIHVuaXRzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gVE9ETzogVXNlIHRoaXMuYXMoJ21zJyk/XG5mdW5jdGlvbiB2YWx1ZU9mJDEgKCkge1xuICAgIGlmICghdGhpcy5pc1ZhbGlkKCkpIHtcbiAgICAgICAgcmV0dXJuIE5hTjtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzICtcbiAgICAgICAgdGhpcy5fZGF5cyAqIDg2NGU1ICtcbiAgICAgICAgKHRoaXMuX21vbnRocyAlIDEyKSAqIDI1OTJlNiArXG4gICAgICAgIHRvSW50KHRoaXMuX21vbnRocyAvIDEyKSAqIDMxNTM2ZTZcbiAgICApO1xufVxuXG5mdW5jdGlvbiBtYWtlQXMgKGFsaWFzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoYWxpYXMpO1xuICAgIH07XG59XG5cbnZhciBhc01pbGxpc2Vjb25kcyA9IG1ha2VBcygnbXMnKTtcbnZhciBhc1NlY29uZHMgICAgICA9IG1ha2VBcygncycpO1xudmFyIGFzTWludXRlcyAgICAgID0gbWFrZUFzKCdtJyk7XG52YXIgYXNIb3VycyAgICAgICAgPSBtYWtlQXMoJ2gnKTtcbnZhciBhc0RheXMgICAgICAgICA9IG1ha2VBcygnZCcpO1xudmFyIGFzV2Vla3MgICAgICAgID0gbWFrZUFzKCd3Jyk7XG52YXIgYXNNb250aHMgICAgICAgPSBtYWtlQXMoJ00nKTtcbnZhciBhc1llYXJzICAgICAgICA9IG1ha2VBcygneScpO1xuXG5mdW5jdGlvbiBjbG9uZSQxICgpIHtcbiAgICByZXR1cm4gY3JlYXRlRHVyYXRpb24odGhpcyk7XG59XG5cbmZ1bmN0aW9uIGdldCQyICh1bml0cykge1xuICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgIHJldHVybiB0aGlzLmlzVmFsaWQoKSA/IHRoaXNbdW5pdHMgKyAncyddKCkgOiBOYU47XG59XG5cbmZ1bmN0aW9uIG1ha2VHZXR0ZXIobmFtZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzVmFsaWQoKSA/IHRoaXMuX2RhdGFbbmFtZV0gOiBOYU47XG4gICAgfTtcbn1cblxudmFyIG1pbGxpc2Vjb25kcyA9IG1ha2VHZXR0ZXIoJ21pbGxpc2Vjb25kcycpO1xudmFyIHNlY29uZHMgICAgICA9IG1ha2VHZXR0ZXIoJ3NlY29uZHMnKTtcbnZhciBtaW51dGVzICAgICAgPSBtYWtlR2V0dGVyKCdtaW51dGVzJyk7XG52YXIgaG91cnMgICAgICAgID0gbWFrZUdldHRlcignaG91cnMnKTtcbnZhciBkYXlzICAgICAgICAgPSBtYWtlR2V0dGVyKCdkYXlzJyk7XG52YXIgbW9udGhzICAgICAgID0gbWFrZUdldHRlcignbW9udGhzJyk7XG52YXIgeWVhcnMgICAgICAgID0gbWFrZUdldHRlcigneWVhcnMnKTtcblxuZnVuY3Rpb24gd2Vla3MgKCkge1xuICAgIHJldHVybiBhYnNGbG9vcih0aGlzLmRheXMoKSAvIDcpO1xufVxuXG52YXIgcm91bmQgPSBNYXRoLnJvdW5kO1xudmFyIHRocmVzaG9sZHMgPSB7XG4gICAgc3M6IDQ0LCAgICAgICAgIC8vIGEgZmV3IHNlY29uZHMgdG8gc2Vjb25kc1xuICAgIHMgOiA0NSwgICAgICAgICAvLyBzZWNvbmRzIHRvIG1pbnV0ZVxuICAgIG0gOiA0NSwgICAgICAgICAvLyBtaW51dGVzIHRvIGhvdXJcbiAgICBoIDogMjIsICAgICAgICAgLy8gaG91cnMgdG8gZGF5XG4gICAgZCA6IDI2LCAgICAgICAgIC8vIGRheXMgdG8gbW9udGhcbiAgICBNIDogMTEgICAgICAgICAgLy8gbW9udGhzIHRvIHllYXJcbn07XG5cbi8vIGhlbHBlciBmdW5jdGlvbiBmb3IgbW9tZW50LmZuLmZyb20sIG1vbWVudC5mbi5mcm9tTm93LCBhbmQgbW9tZW50LmR1cmF0aW9uLmZuLmh1bWFuaXplXG5mdW5jdGlvbiBzdWJzdGl0dXRlVGltZUFnbyhzdHJpbmcsIG51bWJlciwgd2l0aG91dFN1ZmZpeCwgaXNGdXR1cmUsIGxvY2FsZSkge1xuICAgIHJldHVybiBsb2NhbGUucmVsYXRpdmVUaW1lKG51bWJlciB8fCAxLCAhIXdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpO1xufVxuXG5mdW5jdGlvbiByZWxhdGl2ZVRpbWUkMSAocG9zTmVnRHVyYXRpb24sIHdpdGhvdXRTdWZmaXgsIGxvY2FsZSkge1xuICAgIHZhciBkdXJhdGlvbiA9IGNyZWF0ZUR1cmF0aW9uKHBvc05lZ0R1cmF0aW9uKS5hYnMoKTtcbiAgICB2YXIgc2Vjb25kcyAgPSByb3VuZChkdXJhdGlvbi5hcygncycpKTtcbiAgICB2YXIgbWludXRlcyAgPSByb3VuZChkdXJhdGlvbi5hcygnbScpKTtcbiAgICB2YXIgaG91cnMgICAgPSByb3VuZChkdXJhdGlvbi5hcygnaCcpKTtcbiAgICB2YXIgZGF5cyAgICAgPSByb3VuZChkdXJhdGlvbi5hcygnZCcpKTtcbiAgICB2YXIgbW9udGhzICAgPSByb3VuZChkdXJhdGlvbi5hcygnTScpKTtcbiAgICB2YXIgeWVhcnMgICAgPSByb3VuZChkdXJhdGlvbi5hcygneScpKTtcblxuICAgIHZhciBhID0gc2Vjb25kcyA8PSB0aHJlc2hvbGRzLnNzICYmIFsncycsIHNlY29uZHNdICB8fFxuICAgICAgICAgICAgc2Vjb25kcyA8IHRocmVzaG9sZHMucyAgICYmIFsnc3MnLCBzZWNvbmRzXSB8fFxuICAgICAgICAgICAgbWludXRlcyA8PSAxICAgICAgICAgICAgICYmIFsnbSddICAgICAgICAgICB8fFxuICAgICAgICAgICAgbWludXRlcyA8IHRocmVzaG9sZHMubSAgICYmIFsnbW0nLCBtaW51dGVzXSB8fFxuICAgICAgICAgICAgaG91cnMgICA8PSAxICAgICAgICAgICAgICYmIFsnaCddICAgICAgICAgICB8fFxuICAgICAgICAgICAgaG91cnMgICA8IHRocmVzaG9sZHMuaCAgICYmIFsnaGgnLCBob3Vyc10gICB8fFxuICAgICAgICAgICAgZGF5cyAgICA8PSAxICAgICAgICAgICAgICYmIFsnZCddICAgICAgICAgICB8fFxuICAgICAgICAgICAgZGF5cyAgICA8IHRocmVzaG9sZHMuZCAgICYmIFsnZGQnLCBkYXlzXSAgICB8fFxuICAgICAgICAgICAgbW9udGhzICA8PSAxICAgICAgICAgICAgICYmIFsnTSddICAgICAgICAgICB8fFxuICAgICAgICAgICAgbW9udGhzICA8IHRocmVzaG9sZHMuTSAgICYmIFsnTU0nLCBtb250aHNdICB8fFxuICAgICAgICAgICAgeWVhcnMgICA8PSAxICAgICAgICAgICAgICYmIFsneSddICAgICAgICAgICB8fCBbJ3l5JywgeWVhcnNdO1xuXG4gICAgYVsyXSA9IHdpdGhvdXRTdWZmaXg7XG4gICAgYVszXSA9ICtwb3NOZWdEdXJhdGlvbiA+IDA7XG4gICAgYVs0XSA9IGxvY2FsZTtcbiAgICByZXR1cm4gc3Vic3RpdHV0ZVRpbWVBZ28uYXBwbHkobnVsbCwgYSk7XG59XG5cbi8vIFRoaXMgZnVuY3Rpb24gYWxsb3dzIHlvdSB0byBzZXQgdGhlIHJvdW5kaW5nIGZ1bmN0aW9uIGZvciByZWxhdGl2ZSB0aW1lIHN0cmluZ3NcbmZ1bmN0aW9uIGdldFNldFJlbGF0aXZlVGltZVJvdW5kaW5nIChyb3VuZGluZ0Z1bmN0aW9uKSB7XG4gICAgaWYgKHJvdW5kaW5nRnVuY3Rpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcm91bmQ7XG4gICAgfVxuICAgIGlmICh0eXBlb2Yocm91bmRpbmdGdW5jdGlvbikgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcm91bmQgPSByb3VuZGluZ0Z1bmN0aW9uO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBUaGlzIGZ1bmN0aW9uIGFsbG93cyB5b3UgdG8gc2V0IGEgdGhyZXNob2xkIGZvciByZWxhdGl2ZSB0aW1lIHN0cmluZ3NcbmZ1bmN0aW9uIGdldFNldFJlbGF0aXZlVGltZVRocmVzaG9sZCAodGhyZXNob2xkLCBsaW1pdCkge1xuICAgIGlmICh0aHJlc2hvbGRzW3RocmVzaG9sZF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChsaW1pdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0aHJlc2hvbGRzW3RocmVzaG9sZF07XG4gICAgfVxuICAgIHRocmVzaG9sZHNbdGhyZXNob2xkXSA9IGxpbWl0O1xuICAgIGlmICh0aHJlc2hvbGQgPT09ICdzJykge1xuICAgICAgICB0aHJlc2hvbGRzLnNzID0gbGltaXQgLSAxO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gaHVtYW5pemUgKHdpdGhTdWZmaXgpIHtcbiAgICBpZiAoIXRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5pbnZhbGlkRGF0ZSgpO1xuICAgIH1cblxuICAgIHZhciBsb2NhbGUgPSB0aGlzLmxvY2FsZURhdGEoKTtcbiAgICB2YXIgb3V0cHV0ID0gcmVsYXRpdmVUaW1lJDEodGhpcywgIXdpdGhTdWZmaXgsIGxvY2FsZSk7XG5cbiAgICBpZiAod2l0aFN1ZmZpeCkge1xuICAgICAgICBvdXRwdXQgPSBsb2NhbGUucGFzdEZ1dHVyZSgrdGhpcywgb3V0cHV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxlLnBvc3Rmb3JtYXQob3V0cHV0KTtcbn1cblxudmFyIGFicyQxID0gTWF0aC5hYnM7XG5cbmZ1bmN0aW9uIHNpZ24oeCkge1xuICAgIHJldHVybiAoKHggPiAwKSAtICh4IDwgMCkpIHx8ICt4O1xufVxuXG5mdW5jdGlvbiB0b0lTT1N0cmluZyQxKCkge1xuICAgIC8vIGZvciBJU08gc3RyaW5ncyB3ZSBkbyBub3QgdXNlIHRoZSBub3JtYWwgYnViYmxpbmcgcnVsZXM6XG4gICAgLy8gICogbWlsbGlzZWNvbmRzIGJ1YmJsZSB1cCB1bnRpbCB0aGV5IGJlY29tZSBob3Vyc1xuICAgIC8vICAqIGRheXMgZG8gbm90IGJ1YmJsZSBhdCBhbGxcbiAgICAvLyAgKiBtb250aHMgYnViYmxlIHVwIHVudGlsIHRoZXkgYmVjb21lIHllYXJzXG4gICAgLy8gVGhpcyBpcyBiZWNhdXNlIHRoZXJlIGlzIG5vIGNvbnRleHQtZnJlZSBjb252ZXJzaW9uIGJldHdlZW4gaG91cnMgYW5kIGRheXNcbiAgICAvLyAodGhpbmsgb2YgY2xvY2sgY2hhbmdlcylcbiAgICAvLyBhbmQgYWxzbyBub3QgYmV0d2VlbiBkYXlzIGFuZCBtb250aHMgKDI4LTMxIGRheXMgcGVyIG1vbnRoKVxuICAgIGlmICghdGhpcy5pc1ZhbGlkKCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCk7XG4gICAgfVxuXG4gICAgdmFyIHNlY29uZHMgPSBhYnMkMSh0aGlzLl9taWxsaXNlY29uZHMpIC8gMTAwMDtcbiAgICB2YXIgZGF5cyAgICAgICAgID0gYWJzJDEodGhpcy5fZGF5cyk7XG4gICAgdmFyIG1vbnRocyAgICAgICA9IGFicyQxKHRoaXMuX21vbnRocyk7XG4gICAgdmFyIG1pbnV0ZXMsIGhvdXJzLCB5ZWFycztcblxuICAgIC8vIDM2MDAgc2Vjb25kcyAtPiA2MCBtaW51dGVzIC0+IDEgaG91clxuICAgIG1pbnV0ZXMgICAgICAgICAgID0gYWJzRmxvb3Ioc2Vjb25kcyAvIDYwKTtcbiAgICBob3VycyAgICAgICAgICAgICA9IGFic0Zsb29yKG1pbnV0ZXMgLyA2MCk7XG4gICAgc2Vjb25kcyAlPSA2MDtcbiAgICBtaW51dGVzICU9IDYwO1xuXG4gICAgLy8gMTIgbW9udGhzIC0+IDEgeWVhclxuICAgIHllYXJzICA9IGFic0Zsb29yKG1vbnRocyAvIDEyKTtcbiAgICBtb250aHMgJT0gMTI7XG5cblxuICAgIC8vIGluc3BpcmVkIGJ5IGh0dHBzOi8vZ2l0aHViLmNvbS9kb3JkaWxsZS9tb21lbnQtaXNvZHVyYXRpb24vYmxvYi9tYXN0ZXIvbW9tZW50Lmlzb2R1cmF0aW9uLmpzXG4gICAgdmFyIFkgPSB5ZWFycztcbiAgICB2YXIgTSA9IG1vbnRocztcbiAgICB2YXIgRCA9IGRheXM7XG4gICAgdmFyIGggPSBob3VycztcbiAgICB2YXIgbSA9IG1pbnV0ZXM7XG4gICAgdmFyIHMgPSBzZWNvbmRzID8gc2Vjb25kcy50b0ZpeGVkKDMpLnJlcGxhY2UoL1xcLj8wKyQvLCAnJykgOiAnJztcbiAgICB2YXIgdG90YWwgPSB0aGlzLmFzU2Vjb25kcygpO1xuXG4gICAgaWYgKCF0b3RhbCkge1xuICAgICAgICAvLyB0aGlzIGlzIHRoZSBzYW1lIGFzIEMjJ3MgKE5vZGEpIGFuZCBweXRob24gKGlzb2RhdGUpLi4uXG4gICAgICAgIC8vIGJ1dCBub3Qgb3RoZXIgSlMgKGdvb2cuZGF0ZSlcbiAgICAgICAgcmV0dXJuICdQMEQnO1xuICAgIH1cblxuICAgIHZhciB0b3RhbFNpZ24gPSB0b3RhbCA8IDAgPyAnLScgOiAnJztcbiAgICB2YXIgeW1TaWduID0gc2lnbih0aGlzLl9tb250aHMpICE9PSBzaWduKHRvdGFsKSA/ICctJyA6ICcnO1xuICAgIHZhciBkYXlzU2lnbiA9IHNpZ24odGhpcy5fZGF5cykgIT09IHNpZ24odG90YWwpID8gJy0nIDogJyc7XG4gICAgdmFyIGhtc1NpZ24gPSBzaWduKHRoaXMuX21pbGxpc2Vjb25kcykgIT09IHNpZ24odG90YWwpID8gJy0nIDogJyc7XG5cbiAgICByZXR1cm4gdG90YWxTaWduICsgJ1AnICtcbiAgICAgICAgKFkgPyB5bVNpZ24gKyBZICsgJ1knIDogJycpICtcbiAgICAgICAgKE0gPyB5bVNpZ24gKyBNICsgJ00nIDogJycpICtcbiAgICAgICAgKEQgPyBkYXlzU2lnbiArIEQgKyAnRCcgOiAnJykgK1xuICAgICAgICAoKGggfHwgbSB8fCBzKSA/ICdUJyA6ICcnKSArXG4gICAgICAgIChoID8gaG1zU2lnbiArIGggKyAnSCcgOiAnJykgK1xuICAgICAgICAobSA/IGhtc1NpZ24gKyBtICsgJ00nIDogJycpICtcbiAgICAgICAgKHMgPyBobXNTaWduICsgcyArICdTJyA6ICcnKTtcbn1cblxudmFyIHByb3RvJDIgPSBEdXJhdGlvbi5wcm90b3R5cGU7XG5cbnByb3RvJDIuaXNWYWxpZCAgICAgICAgPSBpc1ZhbGlkJDE7XG5wcm90byQyLmFicyAgICAgICAgICAgID0gYWJzO1xucHJvdG8kMi5hZGQgICAgICAgICAgICA9IGFkZCQxO1xucHJvdG8kMi5zdWJ0cmFjdCAgICAgICA9IHN1YnRyYWN0JDE7XG5wcm90byQyLmFzICAgICAgICAgICAgID0gYXM7XG5wcm90byQyLmFzTWlsbGlzZWNvbmRzID0gYXNNaWxsaXNlY29uZHM7XG5wcm90byQyLmFzU2Vjb25kcyAgICAgID0gYXNTZWNvbmRzO1xucHJvdG8kMi5hc01pbnV0ZXMgICAgICA9IGFzTWludXRlcztcbnByb3RvJDIuYXNIb3VycyAgICAgICAgPSBhc0hvdXJzO1xucHJvdG8kMi5hc0RheXMgICAgICAgICA9IGFzRGF5cztcbnByb3RvJDIuYXNXZWVrcyAgICAgICAgPSBhc1dlZWtzO1xucHJvdG8kMi5hc01vbnRocyAgICAgICA9IGFzTW9udGhzO1xucHJvdG8kMi5hc1llYXJzICAgICAgICA9IGFzWWVhcnM7XG5wcm90byQyLnZhbHVlT2YgICAgICAgID0gdmFsdWVPZiQxO1xucHJvdG8kMi5fYnViYmxlICAgICAgICA9IGJ1YmJsZTtcbnByb3RvJDIuY2xvbmUgICAgICAgICAgPSBjbG9uZSQxO1xucHJvdG8kMi5nZXQgICAgICAgICAgICA9IGdldCQyO1xucHJvdG8kMi5taWxsaXNlY29uZHMgICA9IG1pbGxpc2Vjb25kcztcbnByb3RvJDIuc2Vjb25kcyAgICAgICAgPSBzZWNvbmRzO1xucHJvdG8kMi5taW51dGVzICAgICAgICA9IG1pbnV0ZXM7XG5wcm90byQyLmhvdXJzICAgICAgICAgID0gaG91cnM7XG5wcm90byQyLmRheXMgICAgICAgICAgID0gZGF5cztcbnByb3RvJDIud2Vla3MgICAgICAgICAgPSB3ZWVrcztcbnByb3RvJDIubW9udGhzICAgICAgICAgPSBtb250aHM7XG5wcm90byQyLnllYXJzICAgICAgICAgID0geWVhcnM7XG5wcm90byQyLmh1bWFuaXplICAgICAgID0gaHVtYW5pemU7XG5wcm90byQyLnRvSVNPU3RyaW5nICAgID0gdG9JU09TdHJpbmckMTtcbnByb3RvJDIudG9TdHJpbmcgICAgICAgPSB0b0lTT1N0cmluZyQxO1xucHJvdG8kMi50b0pTT04gICAgICAgICA9IHRvSVNPU3RyaW5nJDE7XG5wcm90byQyLmxvY2FsZSAgICAgICAgID0gbG9jYWxlO1xucHJvdG8kMi5sb2NhbGVEYXRhICAgICA9IGxvY2FsZURhdGE7XG5cbnByb3RvJDIudG9Jc29TdHJpbmcgPSBkZXByZWNhdGUoJ3RvSXNvU3RyaW5nKCkgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSB0b0lTT1N0cmluZygpIGluc3RlYWQgKG5vdGljZSB0aGUgY2FwaXRhbHMpJywgdG9JU09TdHJpbmckMSk7XG5wcm90byQyLmxhbmcgPSBsYW5nO1xuXG4vLyBTaWRlIGVmZmVjdCBpbXBvcnRzXG5cbi8vIEZPUk1BVFRJTkdcblxuYWRkRm9ybWF0VG9rZW4oJ1gnLCAwLCAwLCAndW5peCcpO1xuYWRkRm9ybWF0VG9rZW4oJ3gnLCAwLCAwLCAndmFsdWVPZicpO1xuXG4vLyBQQVJTSU5HXG5cbmFkZFJlZ2V4VG9rZW4oJ3gnLCBtYXRjaFNpZ25lZCk7XG5hZGRSZWdleFRva2VuKCdYJywgbWF0Y2hUaW1lc3RhbXApO1xuYWRkUGFyc2VUb2tlbignWCcsIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXksIGNvbmZpZykge1xuICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKHBhcnNlRmxvYXQoaW5wdXQsIDEwKSAqIDEwMDApO1xufSk7XG5hZGRQYXJzZVRva2VuKCd4JywgZnVuY3Rpb24gKGlucHV0LCBhcnJheSwgY29uZmlnKSB7XG4gICAgY29uZmlnLl9kID0gbmV3IERhdGUodG9JbnQoaW5wdXQpKTtcbn0pO1xuXG4vLyBTaWRlIGVmZmVjdCBpbXBvcnRzXG5cblxuaG9va3MudmVyc2lvbiA9ICcyLjIxLjAnO1xuXG5zZXRIb29rQ2FsbGJhY2soY3JlYXRlTG9jYWwpO1xuXG5ob29rcy5mbiAgICAgICAgICAgICAgICAgICAgPSBwcm90bztcbmhvb2tzLm1pbiAgICAgICAgICAgICAgICAgICA9IG1pbjtcbmhvb2tzLm1heCAgICAgICAgICAgICAgICAgICA9IG1heDtcbmhvb2tzLm5vdyAgICAgICAgICAgICAgICAgICA9IG5vdztcbmhvb2tzLnV0YyAgICAgICAgICAgICAgICAgICA9IGNyZWF0ZVVUQztcbmhvb2tzLnVuaXggICAgICAgICAgICAgICAgICA9IGNyZWF0ZVVuaXg7XG5ob29rcy5tb250aHMgICAgICAgICAgICAgICAgPSBsaXN0TW9udGhzO1xuaG9va3MuaXNEYXRlICAgICAgICAgICAgICAgID0gaXNEYXRlO1xuaG9va3MubG9jYWxlICAgICAgICAgICAgICAgID0gZ2V0U2V0R2xvYmFsTG9jYWxlO1xuaG9va3MuaW52YWxpZCAgICAgICAgICAgICAgID0gY3JlYXRlSW52YWxpZDtcbmhvb2tzLmR1cmF0aW9uICAgICAgICAgICAgICA9IGNyZWF0ZUR1cmF0aW9uO1xuaG9va3MuaXNNb21lbnQgICAgICAgICAgICAgID0gaXNNb21lbnQ7XG5ob29rcy53ZWVrZGF5cyAgICAgICAgICAgICAgPSBsaXN0V2Vla2RheXM7XG5ob29rcy5wYXJzZVpvbmUgICAgICAgICAgICAgPSBjcmVhdGVJblpvbmU7XG5ob29rcy5sb2NhbGVEYXRhICAgICAgICAgICAgPSBnZXRMb2NhbGU7XG5ob29rcy5pc0R1cmF0aW9uICAgICAgICAgICAgPSBpc0R1cmF0aW9uO1xuaG9va3MubW9udGhzU2hvcnQgICAgICAgICAgID0gbGlzdE1vbnRoc1Nob3J0O1xuaG9va3Mud2Vla2RheXNNaW4gICAgICAgICAgID0gbGlzdFdlZWtkYXlzTWluO1xuaG9va3MuZGVmaW5lTG9jYWxlICAgICAgICAgID0gZGVmaW5lTG9jYWxlO1xuaG9va3MudXBkYXRlTG9jYWxlICAgICAgICAgID0gdXBkYXRlTG9jYWxlO1xuaG9va3MubG9jYWxlcyAgICAgICAgICAgICAgID0gbGlzdExvY2FsZXM7XG5ob29rcy53ZWVrZGF5c1Nob3J0ICAgICAgICAgPSBsaXN0V2Vla2RheXNTaG9ydDtcbmhvb2tzLm5vcm1hbGl6ZVVuaXRzICAgICAgICA9IG5vcm1hbGl6ZVVuaXRzO1xuaG9va3MucmVsYXRpdmVUaW1lUm91bmRpbmcgID0gZ2V0U2V0UmVsYXRpdmVUaW1lUm91bmRpbmc7XG5ob29rcy5yZWxhdGl2ZVRpbWVUaHJlc2hvbGQgPSBnZXRTZXRSZWxhdGl2ZVRpbWVUaHJlc2hvbGQ7XG5ob29rcy5jYWxlbmRhckZvcm1hdCAgICAgICAgPSBnZXRDYWxlbmRhckZvcm1hdDtcbmhvb2tzLnByb3RvdHlwZSAgICAgICAgICAgICA9IHByb3RvO1xuXG4vLyBjdXJyZW50bHkgSFRNTDUgaW5wdXQgdHlwZSBvbmx5IHN1cHBvcnRzIDI0LWhvdXIgZm9ybWF0c1xuaG9va3MuSFRNTDVfRk1UID0ge1xuICAgIERBVEVUSU1FX0xPQ0FMOiAnWVlZWS1NTS1ERFRISDptbScsICAgICAgICAgICAgIC8vIDxpbnB1dCB0eXBlPVwiZGF0ZXRpbWUtbG9jYWxcIiAvPlxuICAgIERBVEVUSU1FX0xPQ0FMX1NFQ09ORFM6ICdZWVlZLU1NLUREVEhIOm1tOnNzJywgIC8vIDxpbnB1dCB0eXBlPVwiZGF0ZXRpbWUtbG9jYWxcIiBzdGVwPVwiMVwiIC8+XG4gICAgREFURVRJTUVfTE9DQUxfTVM6ICdZWVlZLU1NLUREVEhIOm1tOnNzLlNTUycsICAgLy8gPGlucHV0IHR5cGU9XCJkYXRldGltZS1sb2NhbFwiIHN0ZXA9XCIwLjAwMVwiIC8+XG4gICAgREFURTogJ1lZWVktTU0tREQnLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gPGlucHV0IHR5cGU9XCJkYXRlXCIgLz5cbiAgICBUSU1FOiAnSEg6bW0nLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA8aW5wdXQgdHlwZT1cInRpbWVcIiAvPlxuICAgIFRJTUVfU0VDT05EUzogJ0hIOm1tOnNzJywgICAgICAgICAgICAgICAgICAgICAgIC8vIDxpbnB1dCB0eXBlPVwidGltZVwiIHN0ZXA9XCIxXCIgLz5cbiAgICBUSU1FX01TOiAnSEg6bW06c3MuU1NTJywgICAgICAgICAgICAgICAgICAgICAgICAvLyA8aW5wdXQgdHlwZT1cInRpbWVcIiBzdGVwPVwiMC4wMDFcIiAvPlxuICAgIFdFRUs6ICdZWVlZLVtXXVdXJywgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDxpbnB1dCB0eXBlPVwid2Vla1wiIC8+XG4gICAgTU9OVEg6ICdZWVlZLU1NJyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gPGlucHV0IHR5cGU9XCJtb250aFwiIC8+XG59O1xuXG5yZXR1cm4gaG9va3M7XG5cbn0pKSk7XG4iXX0=
