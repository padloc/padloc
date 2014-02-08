/**
 * Module containing various utility functions
 */
define(function() {

    /**
     * Inserts an object or an array at the specified index
     * @param  {Array}   arr The array that the object(s) should be inserted into
     * @param  {Object}  rec Object or array of objects to insert
     * @param  {Integer} i   Where to insert the object(s)
     * return  {Array}       A new array that contains the inserted object(s)
     */
    function insert(arr, rec, i) {
        i = i || 0;
        return arr.slice(0, i).concat(rec).concat(arr.slice(i));
    }

    /**
     * Remove a object from an array
     * @param  {Array}   arr  Array to remove the object from
     * @param  {Integer} from Where to start removing
     * @param  {Integer} to   Where to stop removing
     * @return {Array}        New array where the element(s) has/have been removed
     */
    function remove(arr, from, to) {
        from = Math.max(from, 0);
        to = Math.max(from, to || 0);
        return arr.slice(0, from).concat(arr.slice(to + 1));
    }

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

    /**
     * Copies over all properties from the _source_ to the _target_. Properties
     * will only be overwritten if _overwrite_ is true. Returns the _target_ object
     */
    var mixin = function(target, source, overwrite) {
        for (var prop in source) {
            if (source.hasOwnProperty(prop) && (overwrite || !target.hasOwnProperty(prop))) {
                target[prop] = source[prop];
            }
        }
        return target;
    };

    var isArray = function(obj) {
        return Object.prototype.toString.call(obj) === "[object Array]";
    };

    return {
        insert: insert,
        remove: remove,
        getVendorPrefix: getVendorPrefix,
        getTransitionEndEventName: getTransitionEndEventName,
        getAnimationEndEventName: getAnimationEndEventName,
        mixin: mixin,
        isArray: isArray
    };
});