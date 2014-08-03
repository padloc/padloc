/* global padlock */

/**
 * Module containing various utility functions
 */
padlock.util = (function() {
    "use strict";

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

    // RFC4122-compliant uuid generator
    var uuid = function() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == "x" ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    return {
        insert: insert,
        remove: remove,
        mixin: mixin,
        isArray: isArray,
        uuid: uuid
    };
})();