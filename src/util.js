define(function() {
    function insert(arr, rec, i) {
        i = i || 0;
        return arr.slice(0, i).concat(rec).concat(arr.slice(i));
    }

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

    var transitionEndEventNames = {
        webkit: "webkitTransitionEnd",
        moz: "transitionend",
        ms: "MSTransitionEnd",
        o: "otransitionend"
    };

    var getTransitionEndEventName = function () {
        return transitionEndEventNames[getVendorPrefix().lowercase];
    };

    var animationEndEventNames = {
        webkit: "webkitAnimationEnd",
        moz: "animationend",
        ms: "MSAnimationEnd",
        o: "oanimationend"
    };

    var getAnimationEndEventName = function () {
        return animationEndEventNames[getVendorPrefix().lowercase];
    };

    return {
        insert: insert,
        remove: remove,
        getVendorPrefix: getVendorPrefix,
        getTransitionEndEventName: getTransitionEndEventName,
        getAnimationEndEventName: getAnimationEndEventName
    };
});