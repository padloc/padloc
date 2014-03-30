define(function() {
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
            var styles = window.getComputedStyle(document.documentElement, '');
            var pre = (Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1];
            vPrefix = {
                lowercase: pre,
                css: '-' + pre + '-'
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

    // Names for animation iteration events on various platforms
    var animationIterationEventNames = {
        webkit: "webkitAnimationIteration",
        moz: "animationiteration",
        ms: "MSAnimationIteration",
        o: "oanimationiteration"
    };

    /**
     * Returns the appropriate animation end event name for the current platform
     * @return {String} Name of the animation end event name on this platform
     */
    var getAnimationIterationEventName = function () {
        return animationIterationEventNames[getVendorPrefix().lowercase];
    };

    // All the devices running iOS
    var iDevices = ["iPad", "iPhone", "iPod"];
    
    /**
     * Checks the _navigator.platform_ property to see if we are on a device
     * running iOS
     */
    var isIOS = function() {
        return iDevices.indexOf(navigator.platform) != -1;
    };

    /**
     * Checks if the app is running on an iOS device in 'standalone' mode,
     * i.e. when the user has added the app to the home screen
     */
    var isIOSStandalone = function() {
        return !!navigator.standalone;
    };
 
    return {
        getVendorPrefix: getVendorPrefix,
        getTransitionEndEventName: getTransitionEndEventName,
        getAnimationEndEventName: getAnimationEndEventName,
        getAnimationIterationEventName: getAnimationIterationEventName,
        isIOS: isIOS,
        isIOSStandalone: isIOSStandalone
    };
});