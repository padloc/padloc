/* jshint browser: true */
/* global padlock, chrome, cordova */

padlock.platform = (function() {
    "use strict";

    var vPrefix;
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
    var getVendorPrefix = function () {
        if (!vPrefix) {
            var styles = getComputedStyle(document.documentElement, "");
            var pre = (Array.prototype.slice.call(styles).join("").match(/-(moz|webkit|ms)-/) ||
                (styles.OLink === "" && ["", "o"]))[1];
            vPrefix = {
                lowercase: pre,
                css: "-" + pre + "-"
            };
        }
        return vPrefix;
    };

    // Names for transition end events on various platforms
    var transitionEndEventNames = {
        webkit: "webkitTransitionEnd",
        moz: "transitionend",
        ms: "MSTransitionEnd",
        o: "otransitionend"
    };

    /**
     * Returns the appropriate transition end event name for the current platform
     * @return {String} Name of the transition end event name on this platform
     */
    var getTransitionEndEventName = function () {
        return transitionEndEventNames[getVendorPrefix().lowercase];
    };

    // Names for animation end events on various platforms
    var animationEndEventNames = {
        webkit: "webkitAnimationEnd",
        moz: "animationend",
        ms: "MSAnimationEnd",
        o: "oanimationend"
    };

    /**
     * Returns the appropriate animation end event name for the current platform
     * @return {String} Name of the animation end event name on this platform
     */
    var getAnimationEndEventName = function () {
        return animationEndEventNames[getVendorPrefix().lowercase];
    };

    // Names for animation start events on various platforms
    var animationStartEventNames = {
        webkit: "webkitAnimationStart",
        moz: "animationstart",
        ms: "MSAnimationStart",
        o: "oanimationstart"
    };

    /**
     * Returns the appropriate animation start event name for the current platform
     * @return {String} Name of the animation end event name on this platform
     */
    var getAnimationStartEventName = function () {
        return animationStartEventNames[getVendorPrefix().lowercase];
    };

    // All the devices running iOS
    var iDevices = ["iPad", "iPhone", "iPod"];

    /**
     * Checks the _navigator.platform_ property to see if we are on a device
     * running iOS
     */
    var isIOS = function() {
        return iDevices.reduce(function(match, dev) {
            return match || navigator.platform.indexOf(dev) !== -1;
        }, false);
    };

    /**
     * Checks if the app is running on an iOS device in "standalone" mode,
     * i.e. when the user has added the app to the home screen
     */
    var isIOSStandalone = function() {
        return !!navigator.standalone;
    };

    //* Checks if the app is running as a packaged Chrome app
    var isChromeApp = function() {
        return (typeof chrome !== "undefined") && chrome.app && !!chrome.app.runtime;
    };

    var clipboardTextArea;

    var domSetClipboard = function(text) {
        clipboardTextArea = clipboardTextArea || document.createElement("textarea");
        clipboardTextArea.value = text;
        document.body.appendChild(clipboardTextArea);
        clipboardTextArea.select();
        document.execCommand("cut");
        document.body.removeChild(clipboardTextArea);
    };

    var domGetClipboard = function(cb) {
        clipboardTextArea = clipboardTextArea || document.createElement("textarea");
        document.body.appendChild(clipboardTextArea);
        clipboardTextArea.value = "";
        clipboardTextArea.select();
        document.execCommand("paste");
        document.body.removeChild(clipboardTextArea);
        return clipboardTextArea.value;
    };

    //* Sets the clipboard text to a given string
    var setClipboard = function(text) {
        // If cordova clipboard plugin is available, use that one. Otherwise use the execCommand implemenation
        if (typeof cordova !== "undefined" && cordova.plugins && cordova.plugins.clipboard) {
            cordova.plugins.clipboard.copy(text);
        } else {
            domSetClipboard(text);
        }
    };

    //* Retrieves the clipboard text
    var getClipboard = function(cb) {
        // If cordova clipboard plugin is available, use that one. Otherwise use the execCommand implemenation
        if (typeof cordova !== "undefined" && cordova.plugins && cordova.plugins.clipboard) {
            cordova.plugins.clipboard.paste(cb);
        } else {
            cb(domGetClipboard());
        }
    };

    var isTouch = function() {
        try {
            document.createEvent("TouchEvent");
            return true;
        } catch (e) {
            return false;
        }
    };

    return {
        getVendorPrefix: getVendorPrefix,
        getTransitionEndEventName: getTransitionEndEventName,
        getAnimationEndEventName: getAnimationEndEventName,
        getAnimationStartEventName: getAnimationStartEventName,
        isIOS: isIOS,
        isIOSStandalone: isIOSStandalone,
        isChromeApp: isChromeApp,
        isTouch: isTouch,
        setClipboard: setClipboard,
        getClipboard: getClipboard
    };
})();
