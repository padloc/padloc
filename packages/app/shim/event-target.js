/*! (c) 2017 Andrea Giammarchi (ISC) */
var EventTarget = (function() {
    "use strict";

    var G = typeof global === typeof null ? global : self;

    var findIndex =
        [].findIndex ||
        function(callback, context) {
            var i = this.length;
            while (i--) {
                if (callback.call(context, this[i])) return i;
            }
            return i;
        };

    var defineProperty = Object.defineProperty;

    // even if not unique each time, the used WeakMap
    // is one and one only so it's not required to grant
    // uniqueness per each instance. This is enough.
    var UID = "__event-target__" + Math.random();
    var WeakMap =
        G.WeakMap ||
        function WeakMap() {
            return {
                get: function get(obj) {
                    return obj[UID];
                },
                set: function set(obj, value) {
                    defineProperty(obj, UID, {
                        configurable: true,
                        value: value
                    });
                }
            };
        };

    var EventTarget = G.EventTarget;

    try {
        new EventTarget();
    } catch (e) {
        EventTarget = (function() {
            // used to relate instances to listeners
            var wm = new WeakMap();

            // get listeners or relate them once to the instance
            var get = function get(self) {
                return wm.get(self) || set(self);
            };
            var set = function set(self) {
                var dictionary = new Null();
                wm.set(self, dictionary);
                return dictionary;
            };

            // define values as configurable
            var define = function define(where, what) {
                for (var key in what) {
                    defineProperty(where, key, {
                        configurable: true,
                        value: what[key]
                    });
                }
            };

            // no need to transpile here, it's a very simple class
            function EventTarget() {}

            // EventTarget "class" definition
            define(EventTarget.prototype, {
                addEventListener: addEventListener,
                dispatchEvent: dispatchEvent,
                removeEventListener: removeEventListener
            });

            // dispatch event for each listener
            function dispatch(info) {
                var options = info.options;
                if (options && options.once) {
                    removeEventListener.call(info.target, this.type, info.listener, info.options);
                }
                if (typeof info.listener === "function") {
                    info.listener.call(info.target, this);
                } else {
                    info.listener.handleEvent(this);
                }
            }

            // search for a registered listener
            function registered(info) {
                return this === info.listener;
            }

            // public methods
            function addEventListener(type, listener, options) {
                var secret = get(this);
                var listeners = secret[type] || (secret[type] = []);
                if (findIndex.call(listeners, registered, listener) < 0) {
                    listeners.push({ target: this, listener: listener, options: options });
                }
            }

            function dispatchEvent(event) {
                var secret = get(this);
                var listeners = secret[event.type];
                if (listeners) {
                    define(event, {
                        currentTarget: this,
                        target: this
                    });
                    listeners.forEach(dispatch, event);
                    delete event.currentTarget;
                    delete event.target;
                }
                return true;
            }

            // used both as public and private method,
            // to avoid method pollution/interception of private listeners
            function removeEventListener(type, listener, options) {
                var secret = get(this);
                var listeners = secret[type];
                if (listeners) {
                    var i = findIndex.call(listeners, registered, listener);
                    if (-1 < i) listeners.splice(i, 1);
                }
            }

            // private "class"
            function Null() {}
            Null.prototype = Object.create(null);

            return EventTarget;
        })();
    }

    return EventTarget;
})();
