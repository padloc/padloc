/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "../app/node_modules/immediate/lib/browser.js":
/*!****************************************************!*\
  !*** ../app/node_modules/immediate/lib/browser.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

var Mutation = __webpack_require__.g.MutationObserver || __webpack_require__.g.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = __webpack_require__.g.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!__webpack_require__.g.setImmediate && typeof __webpack_require__.g.MessageChannel !== 'undefined') {
    var channel = new __webpack_require__.g.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in __webpack_require__.g && 'onreadystatechange' in __webpack_require__.g.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = __webpack_require__.g.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      __webpack_require__.g.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

module.exports = immediate;
function immediate(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}


/***/ }),

/***/ "../app/node_modules/lie/lib/browser.js":
/*!**********************************************!*\
  !*** ../app/node_modules/lie/lib/browser.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

var immediate = __webpack_require__(/*! immediate */ "../app/node_modules/immediate/lib/browser.js");

/* istanbul ignore next */
function INTERNAL() {}

var handlers = {};

var REJECTED = ['REJECTED'];
var FULFILLED = ['FULFILLED'];
var PENDING = ['PENDING'];

module.exports = Promise;

function Promise(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING;
  this.queue = [];
  this.outcome = void 0;
  if (resolver !== INTERNAL) {
    safelyResolveThenable(this, resolver);
  }
}

Promise.prototype["catch"] = function (onRejected) {
  return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
    typeof onRejected !== 'function' && this.state === REJECTED) {
    return this;
  }
  var promise = new this.constructor(INTERNAL);
  if (this.state !== PENDING) {
    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
    unwrap(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem.prototype.callFulfilled = function (value) {
  handlers.resolve(this.promise, value);
};
QueueItem.prototype.otherCallFulfilled = function (value) {
  unwrap(this.promise, this.onFulfilled, value);
};
QueueItem.prototype.callRejected = function (value) {
  handlers.reject(this.promise, value);
};
QueueItem.prototype.otherCallRejected = function (value) {
  unwrap(this.promise, this.onRejected, value);
};

function unwrap(promise, func, value) {
  immediate(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers.resolve(promise, returnValue);
    }
  });
}

handlers.resolve = function (self, value) {
  var result = tryCatch(getThen, value);
  if (result.status === 'error') {
    return handlers.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable(self, thenable);
  } else {
    self.state = FULFILLED;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers.reject = function (self, error) {
  self.state = REJECTED;
  self.outcome = error;
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && (typeof obj === 'object' || typeof obj === 'function') && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

Promise.resolve = resolve;
function resolve(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers.resolve(new this(INTERNAL), value);
}

Promise.reject = reject;
function reject(reason) {
  var promise = new this(INTERNAL);
  return handlers.reject(promise, reason);
}

Promise.all = all;
function all(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers.resolve(promise, values);
      }
    }
  }
}

Promise.race = race;
function race(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
  }
}


/***/ }),

/***/ "../app/node_modules/lie/polyfill.js":
/*!*******************************************!*\
  !*** ../app/node_modules/lie/polyfill.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

if (typeof __webpack_require__.g.Promise !== 'function') {
  __webpack_require__.g.Promise = __webpack_require__(/*! ./lib */ "../app/node_modules/lie/lib/browser.js");
}


/***/ }),

/***/ "../app/node_modules/localforage/src/drivers/indexeddb.js":
/*!****************************************************************!*\
  !*** ../app/node_modules/localforage/src/drivers/indexeddb.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _utils_isIndexedDBValid__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/isIndexedDBValid */ "../app/node_modules/localforage/src/utils/isIndexedDBValid.js");
/* harmony import */ var _utils_createBlob__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/createBlob */ "../app/node_modules/localforage/src/utils/createBlob.js");
/* harmony import */ var _utils_idb__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/idb */ "../app/node_modules/localforage/src/utils/idb.js");
/* harmony import */ var _utils_promise__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/promise */ "../app/node_modules/localforage/src/utils/promise.js");
/* harmony import */ var _utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/executeCallback */ "../app/node_modules/localforage/src/utils/executeCallback.js");
/* harmony import */ var _utils_executeTwoCallbacks__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/executeTwoCallbacks */ "../app/node_modules/localforage/src/utils/executeTwoCallbacks.js");
/* harmony import */ var _utils_normalizeKey__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../utils/normalizeKey */ "../app/node_modules/localforage/src/utils/normalizeKey.js");
/* harmony import */ var _utils_getCallback__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../utils/getCallback */ "../app/node_modules/localforage/src/utils/getCallback.js");









// Some code originally from async_storage.js in
// [Gaia](https://github.com/mozilla-b2g/gaia).

const DETECT_BLOB_SUPPORT_STORE = 'local-forage-detect-blob-support';
let supportsBlobs;
const dbContexts = {};
const toString = Object.prototype.toString;

// Transaction Modes
const READ_ONLY = 'readonly';
const READ_WRITE = 'readwrite';

// Transform a binary string to an array buffer, because otherwise
// weird stuff happens when you try to work with the binary string directly.
// It is known.
// From http://stackoverflow.com/questions/14967647/ (continues on next line)
// encode-decode-image-with-base64-breaks-image (2013-04-21)
function _binStringToArrayBuffer(bin) {
    var length = bin.length;
    var buf = new ArrayBuffer(length);
    var arr = new Uint8Array(buf);
    for (var i = 0; i < length; i++) {
        arr[i] = bin.charCodeAt(i);
    }
    return buf;
}

//
// Blobs are not supported in all versions of IndexedDB, notably
// Chrome <37 and Android <5. In those versions, storing a blob will throw.
//
// Various other blob bugs exist in Chrome v37-42 (inclusive).
// Detecting them is expensive and confusing to users, and Chrome 37-42
// is at very low usage worldwide, so we do a hacky userAgent check instead.
//
// content-type bug: https://code.google.com/p/chromium/issues/detail?id=408120
// 404 bug: https://code.google.com/p/chromium/issues/detail?id=447916
// FileReader bug: https://code.google.com/p/chromium/issues/detail?id=447836
//
// Code borrowed from PouchDB. See:
// https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-adapter-idb/src/blobSupport.js
//
function _checkBlobSupportWithoutCaching(idb) {
    return new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve) {
        var txn = idb.transaction(DETECT_BLOB_SUPPORT_STORE, READ_WRITE);
        var blob = (0,_utils_createBlob__WEBPACK_IMPORTED_MODULE_1__["default"])(['']);
        txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob, 'key');

        txn.onabort = function(e) {
            // If the transaction aborts now its due to not being able to
            // write to the database, likely due to the disk being full
            e.preventDefault();
            e.stopPropagation();
            resolve(false);
        };

        txn.oncomplete = function() {
            var matchedChrome = navigator.userAgent.match(/Chrome\/(\d+)/);
            var matchedEdge = navigator.userAgent.match(/Edge\//);
            // MS Edge pretends to be Chrome 42:
            // https://msdn.microsoft.com/en-us/library/hh869301%28v=vs.85%29.aspx
            resolve(
                matchedEdge ||
                    !matchedChrome ||
                    parseInt(matchedChrome[1], 10) >= 43
            );
        };
    }).catch(function() {
        return false; // error, so assume unsupported
    });
}

function _checkBlobSupport(idb) {
    if (typeof supportsBlobs === 'boolean') {
        return _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"].resolve(supportsBlobs);
    }
    return _checkBlobSupportWithoutCaching(idb).then(function(value) {
        supportsBlobs = value;
        return supportsBlobs;
    });
}

function _deferReadiness(dbInfo) {
    var dbContext = dbContexts[dbInfo.name];

    // Create a deferred object representing the current database operation.
    var deferredOperation = {};

    deferredOperation.promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        deferredOperation.resolve = resolve;
        deferredOperation.reject = reject;
    });

    // Enqueue the deferred operation.
    dbContext.deferredOperations.push(deferredOperation);

    // Chain its promise to the database readiness.
    if (!dbContext.dbReady) {
        dbContext.dbReady = deferredOperation.promise;
    } else {
        dbContext.dbReady = dbContext.dbReady.then(function() {
            return deferredOperation.promise;
        });
    }
}

function _advanceReadiness(dbInfo) {
    var dbContext = dbContexts[dbInfo.name];

    // Dequeue a deferred operation.
    var deferredOperation = dbContext.deferredOperations.pop();

    // Resolve its promise (which is part of the database readiness
    // chain of promises).
    if (deferredOperation) {
        deferredOperation.resolve();
        return deferredOperation.promise;
    }
}

function _rejectReadiness(dbInfo, err) {
    var dbContext = dbContexts[dbInfo.name];

    // Dequeue a deferred operation.
    var deferredOperation = dbContext.deferredOperations.pop();

    // Reject its promise (which is part of the database readiness
    // chain of promises).
    if (deferredOperation) {
        deferredOperation.reject(err);
        return deferredOperation.promise;
    }
}

function _getConnection(dbInfo, upgradeNeeded) {
    return new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        dbContexts[dbInfo.name] = dbContexts[dbInfo.name] || createDbContext();

        if (dbInfo.db) {
            if (upgradeNeeded) {
                _deferReadiness(dbInfo);
                dbInfo.db.close();
            } else {
                return resolve(dbInfo.db);
            }
        }

        var dbArgs = [dbInfo.name];

        if (upgradeNeeded) {
            dbArgs.push(dbInfo.version);
        }

        var openreq = _utils_idb__WEBPACK_IMPORTED_MODULE_2__["default"].open.apply(_utils_idb__WEBPACK_IMPORTED_MODULE_2__["default"], dbArgs);

        if (upgradeNeeded) {
            openreq.onupgradeneeded = function(e) {
                var db = openreq.result;
                try {
                    db.createObjectStore(dbInfo.storeName);
                    if (e.oldVersion <= 1) {
                        // Added when support for blob shims was added
                        db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);
                    }
                } catch (ex) {
                    if (ex.name === 'ConstraintError') {
                        console.warn(
                            'The database "' +
                                dbInfo.name +
                                '"' +
                                ' has been upgraded from version ' +
                                e.oldVersion +
                                ' to version ' +
                                e.newVersion +
                                ', but the storage "' +
                                dbInfo.storeName +
                                '" already exists.'
                        );
                    } else {
                        throw ex;
                    }
                }
            };
        }

        openreq.onerror = function(e) {
            e.preventDefault();
            reject(openreq.error);
        };

        openreq.onsuccess = function() {
            resolve(openreq.result);
            _advanceReadiness(dbInfo);
        };
    });
}

function _getOriginalConnection(dbInfo) {
    return _getConnection(dbInfo, false);
}

function _getUpgradedConnection(dbInfo) {
    return _getConnection(dbInfo, true);
}

function _isUpgradeNeeded(dbInfo, defaultVersion) {
    if (!dbInfo.db) {
        return true;
    }

    var isNewStore = !dbInfo.db.objectStoreNames.contains(dbInfo.storeName);
    var isDowngrade = dbInfo.version < dbInfo.db.version;
    var isUpgrade = dbInfo.version > dbInfo.db.version;

    if (isDowngrade) {
        // If the version is not the default one
        // then warn for impossible downgrade.
        if (dbInfo.version !== defaultVersion) {
            console.warn(
                'The database "' +
                    dbInfo.name +
                    '"' +
                    " can't be downgraded from version " +
                    dbInfo.db.version +
                    ' to version ' +
                    dbInfo.version +
                    '.'
            );
        }
        // Align the versions to prevent errors.
        dbInfo.version = dbInfo.db.version;
    }

    if (isUpgrade || isNewStore) {
        // If the store is new then increment the version (if needed).
        // This will trigger an "upgradeneeded" event which is required
        // for creating a store.
        if (isNewStore) {
            var incVersion = dbInfo.db.version + 1;
            if (incVersion > dbInfo.version) {
                dbInfo.version = incVersion;
            }
        }

        return true;
    }

    return false;
}

// encode a blob for indexeddb engines that don't support blobs
function _encodeBlob(blob) {
    return new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        var reader = new FileReader();
        reader.onerror = reject;
        reader.onloadend = function(e) {
            var base64 = btoa(e.target.result || '');
            resolve({
                __local_forage_encoded_blob: true,
                data: base64,
                type: blob.type
            });
        };
        reader.readAsBinaryString(blob);
    });
}

// decode an encoded blob
function _decodeBlob(encodedBlob) {
    var arrayBuff = _binStringToArrayBuffer(atob(encodedBlob.data));
    return (0,_utils_createBlob__WEBPACK_IMPORTED_MODULE_1__["default"])([arrayBuff], { type: encodedBlob.type });
}

// is this one of our fancy encoded blobs?
function _isEncodedBlob(value) {
    return value && value.__local_forage_encoded_blob;
}

// Specialize the default `ready()` function by making it dependent
// on the current database operations. Thus, the driver will be actually
// ready when it's been initialized (default) *and* there are no pending
// operations on the database (initiated by some other instances).
function _fullyReady(callback) {
    var self = this;

    var promise = self._initReady().then(function() {
        var dbContext = dbContexts[self._dbInfo.name];

        if (dbContext && dbContext.dbReady) {
            return dbContext.dbReady;
        }
    });

    (0,_utils_executeTwoCallbacks__WEBPACK_IMPORTED_MODULE_5__["default"])(promise, callback, callback);
    return promise;
}

// Try to establish a new db connection to replace the
// current one which is broken (i.e. experiencing
// InvalidStateError while creating a transaction).
function _tryReconnect(dbInfo) {
    _deferReadiness(dbInfo);

    var dbContext = dbContexts[dbInfo.name];
    var forages = dbContext.forages;

    for (var i = 0; i < forages.length; i++) {
        const forage = forages[i];
        if (forage._dbInfo.db) {
            forage._dbInfo.db.close();
            forage._dbInfo.db = null;
        }
    }
    dbInfo.db = null;

    return _getOriginalConnection(dbInfo)
        .then(db => {
            dbInfo.db = db;
            if (_isUpgradeNeeded(dbInfo)) {
                // Reopen the database for upgrading.
                return _getUpgradedConnection(dbInfo);
            }
            return db;
        })
        .then(db => {
            // store the latest db reference
            // in case the db was upgraded
            dbInfo.db = dbContext.db = db;
            for (var i = 0; i < forages.length; i++) {
                forages[i]._dbInfo.db = db;
            }
        })
        .catch(err => {
            _rejectReadiness(dbInfo, err);
            throw err;
        });
}

// FF doesn't like Promises (micro-tasks) and IDDB store operations,
// so we have to do it with callbacks
function createTransaction(dbInfo, mode, callback, retries) {
    if (retries === undefined) {
        retries = 1;
    }

    try {
        var tx = dbInfo.db.transaction(dbInfo.storeName, mode);
        callback(null, tx);
    } catch (err) {
        if (
            retries > 0 &&
            (!dbInfo.db ||
                err.name === 'InvalidStateError' ||
                err.name === 'NotFoundError')
        ) {
            return _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"].resolve()
                .then(() => {
                    if (
                        !dbInfo.db ||
                        (err.name === 'NotFoundError' &&
                            !dbInfo.db.objectStoreNames.contains(
                                dbInfo.storeName
                            ) &&
                            dbInfo.version <= dbInfo.db.version)
                    ) {
                        // increase the db version, to create the new ObjectStore
                        if (dbInfo.db) {
                            dbInfo.version = dbInfo.db.version + 1;
                        }
                        // Reopen the database for upgrading.
                        return _getUpgradedConnection(dbInfo);
                    }
                })
                .then(() => {
                    return _tryReconnect(dbInfo).then(function() {
                        createTransaction(dbInfo, mode, callback, retries - 1);
                    });
                })
                .catch(callback);
        }

        callback(err);
    }
}

function createDbContext() {
    return {
        // Running localForages sharing a database.
        forages: [],
        // Shared database.
        db: null,
        // Database readiness (promise).
        dbReady: null,
        // Deferred operations on the database.
        deferredOperations: []
    };
}

// Open the IndexedDB database (automatically creates one if one didn't
// previously exist), using any options set in the config.
function _initStorage(options) {
    var self = this;
    var dbInfo = {
        db: null
    };

    if (options) {
        for (var i in options) {
            dbInfo[i] = options[i];
        }
    }

    // Get the current context of the database;
    var dbContext = dbContexts[dbInfo.name];

    // ...or create a new context.
    if (!dbContext) {
        dbContext = createDbContext();
        // Register the new context in the global container.
        dbContexts[dbInfo.name] = dbContext;
    }

    // Register itself as a running localForage in the current context.
    dbContext.forages.push(self);

    // Replace the default `ready()` function with the specialized one.
    if (!self._initReady) {
        self._initReady = self.ready;
        self.ready = _fullyReady;
    }

    // Create an array of initialization states of the related localForages.
    var initPromises = [];

    function ignoreErrors() {
        // Don't handle errors here,
        // just makes sure related localForages aren't pending.
        return _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"].resolve();
    }

    for (var j = 0; j < dbContext.forages.length; j++) {
        var forage = dbContext.forages[j];
        if (forage !== self) {
            // Don't wait for itself...
            initPromises.push(forage._initReady().catch(ignoreErrors));
        }
    }

    // Take a snapshot of the related localForages.
    var forages = dbContext.forages.slice(0);

    // Initialize the connection process only when
    // all the related localForages aren't pending.
    return _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"].all(initPromises)
        .then(function() {
            dbInfo.db = dbContext.db;
            // Get the connection or open a new one without upgrade.
            return _getOriginalConnection(dbInfo);
        })
        .then(function(db) {
            dbInfo.db = db;
            if (_isUpgradeNeeded(dbInfo, self._defaultConfig.version)) {
                // Reopen the database for upgrading.
                return _getUpgradedConnection(dbInfo);
            }
            return db;
        })
        .then(function(db) {
            dbInfo.db = dbContext.db = db;
            self._dbInfo = dbInfo;
            // Share the final connection amongst related localForages.
            for (var k = 0; k < forages.length; k++) {
                var forage = forages[k];
                if (forage !== self) {
                    // Self is already up-to-date.
                    forage._dbInfo.db = dbInfo.db;
                    forage._dbInfo.version = dbInfo.version;
                }
            }
        });
}

function getItem(key, callback) {
    var self = this;

    key = (0,_utils_normalizeKey__WEBPACK_IMPORTED_MODULE_6__["default"])(key);

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                createTransaction(self._dbInfo, READ_ONLY, function(
                    err,
                    transaction
                ) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        var store = transaction.objectStore(
                            self._dbInfo.storeName
                        );
                        var req = store.get(key);

                        req.onsuccess = function() {
                            var value = req.result;
                            if (value === undefined) {
                                value = null;
                            }
                            if (_isEncodedBlob(value)) {
                                value = _decodeBlob(value);
                            }
                            resolve(value);
                        };

                        req.onerror = function() {
                            reject(req.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__["default"])(promise, callback);
    return promise;
}

// Iterate over all items stored in database.
function iterate(iterator, callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                createTransaction(self._dbInfo, READ_ONLY, function(
                    err,
                    transaction
                ) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        var store = transaction.objectStore(
                            self._dbInfo.storeName
                        );
                        var req = store.openCursor();
                        var iterationNumber = 1;

                        req.onsuccess = function() {
                            var cursor = req.result;

                            if (cursor) {
                                var value = cursor.value;
                                if (_isEncodedBlob(value)) {
                                    value = _decodeBlob(value);
                                }
                                var result = iterator(
                                    value,
                                    cursor.key,
                                    iterationNumber++
                                );

                                // when the iterator callback retuns any
                                // (non-`undefined`) value, then we stop
                                // the iteration immediately
                                if (result !== void 0) {
                                    resolve(result);
                                } else {
                                    cursor.continue();
                                }
                            } else {
                                resolve();
                            }
                        };

                        req.onerror = function() {
                            reject(req.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__["default"])(promise, callback);

    return promise;
}

function setItem(key, value, callback) {
    var self = this;

    key = (0,_utils_normalizeKey__WEBPACK_IMPORTED_MODULE_6__["default"])(key);

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        var dbInfo;
        self
            .ready()
            .then(function() {
                dbInfo = self._dbInfo;
                if (toString.call(value) === '[object Blob]') {
                    return _checkBlobSupport(dbInfo.db).then(function(
                        blobSupport
                    ) {
                        if (blobSupport) {
                            return value;
                        }
                        return _encodeBlob(value);
                    });
                }
                return value;
            })
            .then(function(value) {
                createTransaction(self._dbInfo, READ_WRITE, function(
                    err,
                    transaction
                ) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        var store = transaction.objectStore(
                            self._dbInfo.storeName
                        );

                        // The reason we don't _save_ null is because IE 10 does
                        // not support saving the `null` type in IndexedDB. How
                        // ironic, given the bug below!
                        // See: https://github.com/mozilla/localForage/issues/161
                        if (value === null) {
                            value = undefined;
                        }

                        var req = store.put(value, key);

                        transaction.oncomplete = function() {
                            // Cast to undefined so the value passed to
                            // callback/promise is the same as what one would get out
                            // of `getItem()` later. This leads to some weirdness
                            // (setItem('foo', undefined) will return `null`), but
                            // it's not my fault localStorage is our baseline and that
                            // it's weird.
                            if (value === undefined) {
                                value = null;
                            }

                            resolve(value);
                        };
                        transaction.onabort = transaction.onerror = function() {
                            var err = req.error
                                ? req.error
                                : req.transaction.error;
                            reject(err);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__["default"])(promise, callback);
    return promise;
}

function removeItem(key, callback) {
    var self = this;

    key = (0,_utils_normalizeKey__WEBPACK_IMPORTED_MODULE_6__["default"])(key);

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                createTransaction(self._dbInfo, READ_WRITE, function(
                    err,
                    transaction
                ) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        var store = transaction.objectStore(
                            self._dbInfo.storeName
                        );
                        // We use a Grunt task to make this safe for IE and some
                        // versions of Android (including those used by Cordova).
                        // Normally IE won't like `.delete()` and will insist on
                        // using `['delete']()`, but we have a build step that
                        // fixes this for us now.
                        var req = store.delete(key);
                        transaction.oncomplete = function() {
                            resolve();
                        };

                        transaction.onerror = function() {
                            reject(req.error);
                        };

                        // The request will be also be aborted if we've exceeded our storage
                        // space.
                        transaction.onabort = function() {
                            var err = req.error
                                ? req.error
                                : req.transaction.error;
                            reject(err);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__["default"])(promise, callback);
    return promise;
}

function clear(callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                createTransaction(self._dbInfo, READ_WRITE, function(
                    err,
                    transaction
                ) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        var store = transaction.objectStore(
                            self._dbInfo.storeName
                        );
                        var req = store.clear();

                        transaction.oncomplete = function() {
                            resolve();
                        };

                        transaction.onabort = transaction.onerror = function() {
                            var err = req.error
                                ? req.error
                                : req.transaction.error;
                            reject(err);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__["default"])(promise, callback);
    return promise;
}

function length(callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                createTransaction(self._dbInfo, READ_ONLY, function(
                    err,
                    transaction
                ) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        var store = transaction.objectStore(
                            self._dbInfo.storeName
                        );
                        var req = store.count();

                        req.onsuccess = function() {
                            resolve(req.result);
                        };

                        req.onerror = function() {
                            reject(req.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__["default"])(promise, callback);
    return promise;
}

function key(n, callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        if (n < 0) {
            resolve(null);

            return;
        }

        self
            .ready()
            .then(function() {
                createTransaction(self._dbInfo, READ_ONLY, function(
                    err,
                    transaction
                ) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        var store = transaction.objectStore(
                            self._dbInfo.storeName
                        );
                        var advanced = false;
                        var req = store.openCursor();

                        req.onsuccess = function() {
                            var cursor = req.result;
                            if (!cursor) {
                                // this means there weren't enough keys
                                resolve(null);

                                return;
                            }

                            if (n === 0) {
                                // We have the first key, return it if that's what they
                                // wanted.
                                resolve(cursor.key);
                            } else {
                                if (!advanced) {
                                    // Otherwise, ask the cursor to skip ahead n
                                    // records.
                                    advanced = true;
                                    cursor.advance(n);
                                } else {
                                    // When we get here, we've got the nth key.
                                    resolve(cursor.key);
                                }
                            }
                        };

                        req.onerror = function() {
                            reject(req.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__["default"])(promise, callback);
    return promise;
}

function keys(callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                createTransaction(self._dbInfo, READ_ONLY, function(
                    err,
                    transaction
                ) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        var store = transaction.objectStore(
                            self._dbInfo.storeName
                        );
                        var req = store.openCursor();
                        var keys = [];

                        req.onsuccess = function() {
                            var cursor = req.result;

                            if (!cursor) {
                                resolve(keys);
                                return;
                            }

                            keys.push(cursor.key);
                            cursor.continue();
                        };

                        req.onerror = function() {
                            reject(req.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__["default"])(promise, callback);
    return promise;
}

function dropInstance(options, callback) {
    callback = _utils_getCallback__WEBPACK_IMPORTED_MODULE_7__["default"].apply(this, arguments);

    var currentConfig = this.config();
    options = (typeof options !== 'function' && options) || {};
    if (!options.name) {
        options.name = options.name || currentConfig.name;
        options.storeName = options.storeName || currentConfig.storeName;
    }

    var self = this;
    var promise;
    if (!options.name) {
        promise = _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"].reject('Invalid arguments');
    } else {
        const isCurrentDb =
            options.name === currentConfig.name && self._dbInfo.db;

        const dbPromise = isCurrentDb
            ? _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"].resolve(self._dbInfo.db)
            : _getOriginalConnection(options).then(db => {
                  const dbContext = dbContexts[options.name];
                  const forages = dbContext.forages;
                  dbContext.db = db;
                  for (var i = 0; i < forages.length; i++) {
                      forages[i]._dbInfo.db = db;
                  }
                  return db;
              });

        if (!options.storeName) {
            promise = dbPromise.then(db => {
                _deferReadiness(options);

                const dbContext = dbContexts[options.name];
                const forages = dbContext.forages;

                db.close();
                for (var i = 0; i < forages.length; i++) {
                    const forage = forages[i];
                    forage._dbInfo.db = null;
                }

                const dropDBPromise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"]((resolve, reject) => {
                    var req = _utils_idb__WEBPACK_IMPORTED_MODULE_2__["default"].deleteDatabase(options.name);

                    req.onerror = req.onblocked = err => {
                        const db = req.result;
                        if (db) {
                            db.close();
                        }
                        reject(err);
                    };

                    req.onsuccess = () => {
                        const db = req.result;
                        if (db) {
                            db.close();
                        }
                        resolve(db);
                    };
                });

                return dropDBPromise
                    .then(db => {
                        dbContext.db = db;
                        for (var i = 0; i < forages.length; i++) {
                            const forage = forages[i];
                            _advanceReadiness(forage._dbInfo);
                        }
                    })
                    .catch(err => {
                        (
                            _rejectReadiness(options, err) || _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"].resolve()
                        ).catch(() => {});
                        throw err;
                    });
            });
        } else {
            promise = dbPromise.then(db => {
                if (!db.objectStoreNames.contains(options.storeName)) {
                    return;
                }

                const newVersion = db.version + 1;

                _deferReadiness(options);

                const dbContext = dbContexts[options.name];
                const forages = dbContext.forages;

                db.close();
                for (let i = 0; i < forages.length; i++) {
                    const forage = forages[i];
                    forage._dbInfo.db = null;
                    forage._dbInfo.version = newVersion;
                }

                const dropObjectPromise = new _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"]((resolve, reject) => {
                    const req = _utils_idb__WEBPACK_IMPORTED_MODULE_2__["default"].open(options.name, newVersion);

                    req.onerror = err => {
                        const db = req.result;
                        db.close();
                        reject(err);
                    };

                    req.onupgradeneeded = () => {
                        var db = req.result;
                        db.deleteObjectStore(options.storeName);
                    };

                    req.onsuccess = () => {
                        const db = req.result;
                        db.close();
                        resolve(db);
                    };
                });

                return dropObjectPromise
                    .then(db => {
                        dbContext.db = db;
                        for (let j = 0; j < forages.length; j++) {
                            const forage = forages[j];
                            forage._dbInfo.db = db;
                            _advanceReadiness(forage._dbInfo);
                        }
                    })
                    .catch(err => {
                        (
                            _rejectReadiness(options, err) || _utils_promise__WEBPACK_IMPORTED_MODULE_3__["default"].resolve()
                        ).catch(() => {});
                        throw err;
                    });
            });
        }
    }

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_4__["default"])(promise, callback);
    return promise;
}

var asyncStorage = {
    _driver: 'asyncStorage',
    _initStorage: _initStorage,
    _support: (0,_utils_isIndexedDBValid__WEBPACK_IMPORTED_MODULE_0__["default"])(),
    iterate: iterate,
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    length: length,
    key: key,
    keys: keys,
    dropInstance: dropInstance
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (asyncStorage);


/***/ }),

/***/ "../app/node_modules/localforage/src/drivers/localstorage.js":
/*!*******************************************************************!*\
  !*** ../app/node_modules/localforage/src/drivers/localstorage.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _utils_isLocalStorageValid__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/isLocalStorageValid */ "../app/node_modules/localforage/src/utils/isLocalStorageValid.js");
/* harmony import */ var _utils_serializer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/serializer */ "../app/node_modules/localforage/src/utils/serializer.js");
/* harmony import */ var _utils_promise__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/promise */ "../app/node_modules/localforage/src/utils/promise.js");
/* harmony import */ var _utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/executeCallback */ "../app/node_modules/localforage/src/utils/executeCallback.js");
/* harmony import */ var _utils_normalizeKey__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/normalizeKey */ "../app/node_modules/localforage/src/utils/normalizeKey.js");
/* harmony import */ var _utils_getCallback__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/getCallback */ "../app/node_modules/localforage/src/utils/getCallback.js");
// If IndexedDB isn't available, we'll fall back to localStorage.
// Note that this will have considerable performance and storage
// side-effects (all data will be serialized on save and only data that
// can be converted to a string via `JSON.stringify()` will be saved).








function _getKeyPrefix(options, defaultConfig) {
    var keyPrefix = options.name + '/';

    if (options.storeName !== defaultConfig.storeName) {
        keyPrefix += options.storeName + '/';
    }
    return keyPrefix;
}

// Check if localStorage throws when saving an item
function checkIfLocalStorageThrows() {
    var localStorageTestKey = '_localforage_support_test';

    try {
        localStorage.setItem(localStorageTestKey, true);
        localStorage.removeItem(localStorageTestKey);

        return false;
    } catch (e) {
        return true;
    }
}

// Check if localStorage is usable and allows to save an item
// This method checks if localStorage is usable in Safari Private Browsing
// mode, or in any other case where the available quota for localStorage
// is 0 and there wasn't any saved items yet.
function _isLocalStorageUsable() {
    return !checkIfLocalStorageThrows() || localStorage.length > 0;
}

// Config the localStorage backend, using options set in the config.
function _initStorage(options) {
    var self = this;
    var dbInfo = {};
    if (options) {
        for (var i in options) {
            dbInfo[i] = options[i];
        }
    }

    dbInfo.keyPrefix = _getKeyPrefix(options, self._defaultConfig);

    if (!_isLocalStorageUsable()) {
        return _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"].reject();
    }

    self._dbInfo = dbInfo;
    dbInfo.serializer = _utils_serializer__WEBPACK_IMPORTED_MODULE_1__["default"];

    return _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"].resolve();
}

// Remove all keys from the datastore, effectively destroying all data in
// the app's key/value store!
function clear(callback) {
    var self = this;
    var promise = self.ready().then(function() {
        var keyPrefix = self._dbInfo.keyPrefix;

        for (var i = localStorage.length - 1; i >= 0; i--) {
            var key = localStorage.key(i);

            if (key.indexOf(keyPrefix) === 0) {
                localStorage.removeItem(key);
            }
        }
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// Retrieve an item from the store. Unlike the original async_storage
// library in Gaia, we don't modify return values at all. If a key's value
// is `undefined`, we pass that value to the callback function.
function getItem(key, callback) {
    var self = this;

    key = (0,_utils_normalizeKey__WEBPACK_IMPORTED_MODULE_4__["default"])(key);

    var promise = self.ready().then(function() {
        var dbInfo = self._dbInfo;
        var result = localStorage.getItem(dbInfo.keyPrefix + key);

        // If a result was found, parse it from the serialized
        // string into a JS object. If result isn't truthy, the key
        // is likely undefined and we'll pass it straight to the
        // callback.
        if (result) {
            result = dbInfo.serializer.deserialize(result);
        }

        return result;
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// Iterate over all items in the store.
function iterate(iterator, callback) {
    var self = this;

    var promise = self.ready().then(function() {
        var dbInfo = self._dbInfo;
        var keyPrefix = dbInfo.keyPrefix;
        var keyPrefixLength = keyPrefix.length;
        var length = localStorage.length;

        // We use a dedicated iterator instead of the `i` variable below
        // so other keys we fetch in localStorage aren't counted in
        // the `iterationNumber` argument passed to the `iterate()`
        // callback.
        //
        // See: github.com/mozilla/localForage/pull/435#discussion_r38061530
        var iterationNumber = 1;

        for (var i = 0; i < length; i++) {
            var key = localStorage.key(i);
            if (key.indexOf(keyPrefix) !== 0) {
                continue;
            }
            var value = localStorage.getItem(key);

            // If a result was found, parse it from the serialized
            // string into a JS object. If result isn't truthy, the
            // key is likely undefined and we'll pass it straight
            // to the iterator.
            if (value) {
                value = dbInfo.serializer.deserialize(value);
            }

            value = iterator(
                value,
                key.substring(keyPrefixLength),
                iterationNumber++
            );

            if (value !== void 0) {
                return value;
            }
        }
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// Same as localStorage's key() method, except takes a callback.
function key(n, callback) {
    var self = this;
    var promise = self.ready().then(function() {
        var dbInfo = self._dbInfo;
        var result;
        try {
            result = localStorage.key(n);
        } catch (error) {
            result = null;
        }

        // Remove the prefix from the key, if a key is found.
        if (result) {
            result = result.substring(dbInfo.keyPrefix.length);
        }

        return result;
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

function keys(callback) {
    var self = this;
    var promise = self.ready().then(function() {
        var dbInfo = self._dbInfo;
        var length = localStorage.length;
        var keys = [];

        for (var i = 0; i < length; i++) {
            var itemKey = localStorage.key(i);
            if (itemKey.indexOf(dbInfo.keyPrefix) === 0) {
                keys.push(itemKey.substring(dbInfo.keyPrefix.length));
            }
        }

        return keys;
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// Supply the number of keys in the datastore to the callback function.
function length(callback) {
    var self = this;
    var promise = self.keys().then(function(keys) {
        return keys.length;
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// Remove an item from the store, nice and simple.
function removeItem(key, callback) {
    var self = this;

    key = (0,_utils_normalizeKey__WEBPACK_IMPORTED_MODULE_4__["default"])(key);

    var promise = self.ready().then(function() {
        var dbInfo = self._dbInfo;
        localStorage.removeItem(dbInfo.keyPrefix + key);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// Set a key's value and run an optional callback once the value is set.
// Unlike Gaia's implementation, the callback function is passed the value,
// in case you want to operate on that value only after you're sure it
// saved, or something like that.
function setItem(key, value, callback) {
    var self = this;

    key = (0,_utils_normalizeKey__WEBPACK_IMPORTED_MODULE_4__["default"])(key);

    var promise = self.ready().then(function() {
        // Convert undefined values to null.
        // https://github.com/mozilla/localForage/pull/42
        if (value === undefined) {
            value = null;
        }

        // Save the original value to pass to the callback.
        var originalValue = value;

        return new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
            var dbInfo = self._dbInfo;
            dbInfo.serializer.serialize(value, function(value, error) {
                if (error) {
                    reject(error);
                } else {
                    try {
                        localStorage.setItem(dbInfo.keyPrefix + key, value);
                        resolve(originalValue);
                    } catch (e) {
                        // localStorage capacity exceeded.
                        // TODO: Make this a specific error/event.
                        if (
                            e.name === 'QuotaExceededError' ||
                            e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
                        ) {
                            reject(e);
                        }
                        reject(e);
                    }
                }
            });
        });
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

function dropInstance(options, callback) {
    callback = _utils_getCallback__WEBPACK_IMPORTED_MODULE_5__["default"].apply(this, arguments);

    options = (typeof options !== 'function' && options) || {};
    if (!options.name) {
        var currentConfig = this.config();
        options.name = options.name || currentConfig.name;
        options.storeName = options.storeName || currentConfig.storeName;
    }

    var self = this;
    var promise;
    if (!options.name) {
        promise = _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"].reject('Invalid arguments');
    } else {
        promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve) {
            if (!options.storeName) {
                resolve(`${options.name}/`);
            } else {
                resolve(_getKeyPrefix(options, self._defaultConfig));
            }
        }).then(function(keyPrefix) {
            for (var i = localStorage.length - 1; i >= 0; i--) {
                var key = localStorage.key(i);

                if (key.indexOf(keyPrefix) === 0) {
                    localStorage.removeItem(key);
                }
            }
        });
    }

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

var localStorageWrapper = {
    _driver: 'localStorageWrapper',
    _initStorage: _initStorage,
    _support: (0,_utils_isLocalStorageValid__WEBPACK_IMPORTED_MODULE_0__["default"])(),
    iterate: iterate,
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    length: length,
    key: key,
    keys: keys,
    dropInstance: dropInstance
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (localStorageWrapper);


/***/ }),

/***/ "../app/node_modules/localforage/src/drivers/websql.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/localforage/src/drivers/websql.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _utils_isWebSQLValid__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/isWebSQLValid */ "../app/node_modules/localforage/src/utils/isWebSQLValid.js");
/* harmony import */ var _utils_serializer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/serializer */ "../app/node_modules/localforage/src/utils/serializer.js");
/* harmony import */ var _utils_promise__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/promise */ "../app/node_modules/localforage/src/utils/promise.js");
/* harmony import */ var _utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/executeCallback */ "../app/node_modules/localforage/src/utils/executeCallback.js");
/* harmony import */ var _utils_normalizeKey__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/normalizeKey */ "../app/node_modules/localforage/src/utils/normalizeKey.js");
/* harmony import */ var _utils_getCallback__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/getCallback */ "../app/node_modules/localforage/src/utils/getCallback.js");







/*
 * Includes code from:
 *
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */

function createDbTable(t, dbInfo, callback, errorCallback) {
    t.executeSql(
        `CREATE TABLE IF NOT EXISTS ${dbInfo.storeName} ` +
            '(id INTEGER PRIMARY KEY, key unique, value)',
        [],
        callback,
        errorCallback
    );
}

// Open the WebSQL database (automatically creates one if one didn't
// previously exist), using any options set in the config.
function _initStorage(options) {
    var self = this;
    var dbInfo = {
        db: null
    };

    if (options) {
        for (var i in options) {
            dbInfo[i] =
                typeof options[i] !== 'string'
                    ? options[i].toString()
                    : options[i];
        }
    }

    var dbInfoPromise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        // Open the database; the openDatabase API will automatically
        // create it for us if it doesn't exist.
        try {
            dbInfo.db = openDatabase(
                dbInfo.name,
                String(dbInfo.version),
                dbInfo.description,
                dbInfo.size
            );
        } catch (e) {
            return reject(e);
        }

        // Create our key/value table if it doesn't exist.
        dbInfo.db.transaction(function(t) {
            createDbTable(
                t,
                dbInfo,
                function() {
                    self._dbInfo = dbInfo;
                    resolve();
                },
                function(t, error) {
                    reject(error);
                }
            );
        }, reject);
    });

    dbInfo.serializer = _utils_serializer__WEBPACK_IMPORTED_MODULE_1__["default"];
    return dbInfoPromise;
}

function tryExecuteSql(t, dbInfo, sqlStatement, args, callback, errorCallback) {
    t.executeSql(
        sqlStatement,
        args,
        callback,
        function(t, error) {
            if (error.code === error.SYNTAX_ERR) {
                t.executeSql(
                    'SELECT name FROM sqlite_master ' +
                        "WHERE type='table' AND name = ?",
                    [dbInfo.storeName],
                    function(t, results) {
                        if (!results.rows.length) {
                            // if the table is missing (was deleted)
                            // re-create it table and retry
                            createDbTable(
                                t,
                                dbInfo,
                                function() {
                                    t.executeSql(
                                        sqlStatement,
                                        args,
                                        callback,
                                        errorCallback
                                    );
                                },
                                errorCallback
                            );
                        } else {
                            errorCallback(t, error);
                        }
                    },
                    errorCallback
                );
            } else {
                errorCallback(t, error);
            }
        },
        errorCallback
    );
}

function getItem(key, callback) {
    var self = this;

    key = (0,_utils_normalizeKey__WEBPACK_IMPORTED_MODULE_4__["default"])(key);

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT * FROM ${
                            dbInfo.storeName
                        } WHERE key = ? LIMIT 1`,
                        [key],
                        function(t, results) {
                            var result = results.rows.length
                                ? results.rows.item(0).value
                                : null;

                            // Check to see if this is serialized content we need to
                            // unpack.
                            if (result) {
                                result = dbInfo.serializer.deserialize(result);
                            }

                            resolve(result);
                        },
                        function(t, error) {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

function iterate(iterator, callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                var dbInfo = self._dbInfo;

                dbInfo.db.transaction(function(t) {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT * FROM ${dbInfo.storeName}`,
                        [],
                        function(t, results) {
                            var rows = results.rows;
                            var length = rows.length;

                            for (var i = 0; i < length; i++) {
                                var item = rows.item(i);
                                var result = item.value;

                                // Check to see if this is serialized content
                                // we need to unpack.
                                if (result) {
                                    result = dbInfo.serializer.deserialize(
                                        result
                                    );
                                }

                                result = iterator(result, item.key, i + 1);

                                // void(0) prevents problems with redefinition
                                // of `undefined`.
                                if (result !== void 0) {
                                    resolve(result);
                                    return;
                                }
                            }

                            resolve();
                        },
                        function(t, error) {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

function _setItem(key, value, callback, retriesLeft) {
    var self = this;

    key = (0,_utils_normalizeKey__WEBPACK_IMPORTED_MODULE_4__["default"])(key);

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                // The localStorage API doesn't return undefined values in an
                // "expected" way, so undefined is always cast to null in all
                // drivers. See: https://github.com/mozilla/localForage/pull/42
                if (value === undefined) {
                    value = null;
                }

                // Save the original value to pass to the callback.
                var originalValue = value;

                var dbInfo = self._dbInfo;
                dbInfo.serializer.serialize(value, function(value, error) {
                    if (error) {
                        reject(error);
                    } else {
                        dbInfo.db.transaction(
                            function(t) {
                                tryExecuteSql(
                                    t,
                                    dbInfo,
                                    `INSERT OR REPLACE INTO ${
                                        dbInfo.storeName
                                    } ` + '(key, value) VALUES (?, ?)',
                                    [key, value],
                                    function() {
                                        resolve(originalValue);
                                    },
                                    function(t, error) {
                                        reject(error);
                                    }
                                );
                            },
                            function(sqlError) {
                                // The transaction failed; check
                                // to see if it's a quota error.
                                if (sqlError.code === sqlError.QUOTA_ERR) {
                                    // We reject the callback outright for now, but
                                    // it's worth trying to re-run the transaction.
                                    // Even if the user accepts the prompt to use
                                    // more storage on Safari, this error will
                                    // be called.
                                    //
                                    // Try to re-run the transaction.
                                    if (retriesLeft > 0) {
                                        resolve(
                                            _setItem.apply(self, [
                                                key,
                                                originalValue,
                                                callback,
                                                retriesLeft - 1
                                            ])
                                        );
                                        return;
                                    }
                                    reject(sqlError);
                                }
                            }
                        );
                    }
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

function setItem(key, value, callback) {
    return _setItem.apply(this, [key, value, callback, 1]);
}

function removeItem(key, callback) {
    var self = this;

    key = (0,_utils_normalizeKey__WEBPACK_IMPORTED_MODULE_4__["default"])(key);

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `DELETE FROM ${dbInfo.storeName} WHERE key = ?`,
                        [key],
                        function() {
                            resolve();
                        },
                        function(t, error) {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// Deletes every item in the table.
// TODO: Find out if this resets the AUTO_INCREMENT number.
function clear(callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `DELETE FROM ${dbInfo.storeName}`,
                        [],
                        function() {
                            resolve();
                        },
                        function(t, error) {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// Does a simple `COUNT(key)` to get the number of items stored in
// localForage.
function length(callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    // Ahhh, SQL makes this one soooooo easy.
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT COUNT(key) as c FROM ${dbInfo.storeName}`,
                        [],
                        function(t, results) {
                            var result = results.rows.item(0).c;
                            resolve(result);
                        },
                        function(t, error) {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// Return the key located at key index X; essentially gets the key from a
// `WHERE id = ?`. This is the most efficient way I can think to implement
// this rarely-used (in my experience) part of the API, but it can seem
// inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
// the ID of each key will change every time it's updated. Perhaps a stored
// procedure for the `setItem()` SQL would solve this problem?
// TODO: Don't change ID on `setItem()`.
function key(n, callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT key FROM ${
                            dbInfo.storeName
                        } WHERE id = ? LIMIT 1`,
                        [n + 1],
                        function(t, results) {
                            var result = results.rows.length
                                ? results.rows.item(0).key
                                : null;
                            resolve(result);
                        },
                        function(t, error) {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

function keys(callback) {
    var self = this;

    var promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        self
            .ready()
            .then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT key FROM ${dbInfo.storeName}`,
                        [],
                        function(t, results) {
                            var keys = [];

                            for (var i = 0; i < results.rows.length; i++) {
                                keys.push(results.rows.item(i).key);
                            }

                            resolve(keys);
                        },
                        function(t, error) {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

// https://www.w3.org/TR/webdatabase/#databases
// > There is no way to enumerate or delete the databases available for an origin from this API.
function getAllStoreNames(db) {
    return new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
        db.transaction(
            function(t) {
                t.executeSql(
                    'SELECT name FROM sqlite_master ' +
                        "WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'",
                    [],
                    function(t, results) {
                        var storeNames = [];

                        for (var i = 0; i < results.rows.length; i++) {
                            storeNames.push(results.rows.item(i).name);
                        }

                        resolve({
                            db,
                            storeNames
                        });
                    },
                    function(t, error) {
                        reject(error);
                    }
                );
            },
            function(sqlError) {
                reject(sqlError);
            }
        );
    });
}

function dropInstance(options, callback) {
    callback = _utils_getCallback__WEBPACK_IMPORTED_MODULE_5__["default"].apply(this, arguments);

    var currentConfig = this.config();
    options = (typeof options !== 'function' && options) || {};
    if (!options.name) {
        options.name = options.name || currentConfig.name;
        options.storeName = options.storeName || currentConfig.storeName;
    }

    var self = this;
    var promise;
    if (!options.name) {
        promise = _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"].reject('Invalid arguments');
    } else {
        promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve) {
            var db;
            if (options.name === currentConfig.name) {
                // use the db reference of the current instance
                db = self._dbInfo.db;
            } else {
                db = openDatabase(options.name, '', '', 0);
            }

            if (!options.storeName) {
                // drop all database tables
                resolve(getAllStoreNames(db));
            } else {
                resolve({
                    db,
                    storeNames: [options.storeName]
                });
            }
        }).then(function(operationInfo) {
            return new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
                operationInfo.db.transaction(
                    function(t) {
                        function dropTable(storeName) {
                            return new _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"](function(resolve, reject) {
                                t.executeSql(
                                    `DROP TABLE IF EXISTS ${storeName}`,
                                    [],
                                    function() {
                                        resolve();
                                    },
                                    function(t, error) {
                                        reject(error);
                                    }
                                );
                            });
                        }

                        var operations = [];
                        for (
                            var i = 0, len = operationInfo.storeNames.length;
                            i < len;
                            i++
                        ) {
                            operations.push(
                                dropTable(operationInfo.storeNames[i])
                            );
                        }

                        _utils_promise__WEBPACK_IMPORTED_MODULE_2__["default"].all(operations)
                            .then(function() {
                                resolve();
                            })
                            .catch(function(e) {
                                reject(e);
                            });
                    },
                    function(sqlError) {
                        reject(sqlError);
                    }
                );
            });
        });
    }

    (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_3__["default"])(promise, callback);
    return promise;
}

var webSQLStorage = {
    _driver: 'webSQLStorage',
    _initStorage: _initStorage,
    _support: (0,_utils_isWebSQLValid__WEBPACK_IMPORTED_MODULE_0__["default"])(),
    iterate: iterate,
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    length: length,
    key: key,
    keys: keys,
    dropInstance: dropInstance
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (webSQLStorage);


/***/ }),

/***/ "../app/node_modules/localforage/src/localforage.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/localforage/src/localforage.js ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _drivers_indexeddb__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./drivers/indexeddb */ "../app/node_modules/localforage/src/drivers/indexeddb.js");
/* harmony import */ var _drivers_websql__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./drivers/websql */ "../app/node_modules/localforage/src/drivers/websql.js");
/* harmony import */ var _drivers_localstorage__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./drivers/localstorage */ "../app/node_modules/localforage/src/drivers/localstorage.js");
/* harmony import */ var _utils_serializer__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/serializer */ "../app/node_modules/localforage/src/utils/serializer.js");
/* harmony import */ var _utils_promise__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils/promise */ "../app/node_modules/localforage/src/utils/promise.js");
/* harmony import */ var _utils_executeCallback__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utils/executeCallback */ "../app/node_modules/localforage/src/utils/executeCallback.js");
/* harmony import */ var _utils_executeTwoCallbacks__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./utils/executeTwoCallbacks */ "../app/node_modules/localforage/src/utils/executeTwoCallbacks.js");
/* harmony import */ var _utils_includes__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./utils/includes */ "../app/node_modules/localforage/src/utils/includes.js");
/* harmony import */ var _utils_isArray__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./utils/isArray */ "../app/node_modules/localforage/src/utils/isArray.js");










// Drivers are stored here when `defineDriver()` is called.
// They are shared across all instances of localForage.
const DefinedDrivers = {};

const DriverSupport = {};

const DefaultDrivers = {
    INDEXEDDB: _drivers_indexeddb__WEBPACK_IMPORTED_MODULE_0__["default"],
    WEBSQL: _drivers_websql__WEBPACK_IMPORTED_MODULE_1__["default"],
    LOCALSTORAGE: _drivers_localstorage__WEBPACK_IMPORTED_MODULE_2__["default"]
};

const DefaultDriverOrder = [
    DefaultDrivers.INDEXEDDB._driver,
    DefaultDrivers.WEBSQL._driver,
    DefaultDrivers.LOCALSTORAGE._driver
];

const OptionalDriverMethods = ['dropInstance'];

const LibraryMethods = [
    'clear',
    'getItem',
    'iterate',
    'key',
    'keys',
    'length',
    'removeItem',
    'setItem'
].concat(OptionalDriverMethods);

const DefaultConfig = {
    description: '',
    driver: DefaultDriverOrder.slice(),
    name: 'localforage',
    // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
    // we can use without a prompt.
    size: 4980736,
    storeName: 'keyvaluepairs',
    version: 1.0
};

function callWhenReady(localForageInstance, libraryMethod) {
    localForageInstance[libraryMethod] = function() {
        const _args = arguments;
        return localForageInstance.ready().then(function() {
            return localForageInstance[libraryMethod].apply(
                localForageInstance,
                _args
            );
        });
    };
}

function extend() {
    for (let i = 1; i < arguments.length; i++) {
        const arg = arguments[i];

        if (arg) {
            for (let key in arg) {
                if (arg.hasOwnProperty(key)) {
                    if ((0,_utils_isArray__WEBPACK_IMPORTED_MODULE_8__["default"])(arg[key])) {
                        arguments[0][key] = arg[key].slice();
                    } else {
                        arguments[0][key] = arg[key];
                    }
                }
            }
        }
    }

    return arguments[0];
}

class LocalForage {
    constructor(options) {
        for (let driverTypeKey in DefaultDrivers) {
            if (DefaultDrivers.hasOwnProperty(driverTypeKey)) {
                const driver = DefaultDrivers[driverTypeKey];
                const driverName = driver._driver;
                this[driverTypeKey] = driverName;

                if (!DefinedDrivers[driverName]) {
                    // we don't need to wait for the promise,
                    // since the default drivers can be defined
                    // in a blocking manner
                    this.defineDriver(driver);
                }
            }
        }

        this._defaultConfig = extend({}, DefaultConfig);
        this._config = extend({}, this._defaultConfig, options);
        this._driverSet = null;
        this._initDriver = null;
        this._ready = false;
        this._dbInfo = null;

        this._wrapLibraryMethodsWithReady();
        this.setDriver(this._config.driver).catch(() => {});
    }

    // Set any config values for localForage; can be called anytime before
    // the first API call (e.g. `getItem`, `setItem`).
    // We loop through options so we don't overwrite existing config
    // values.
    config(options) {
        // If the options argument is an object, we use it to set values.
        // Otherwise, we return either a specified config value or all
        // config values.
        if (typeof options === 'object') {
            // If localforage is ready and fully initialized, we can't set
            // any new configuration values. Instead, we return an error.
            if (this._ready) {
                return new Error(
                    "Can't call config() after localforage " + 'has been used.'
                );
            }

            for (let i in options) {
                if (i === 'storeName') {
                    options[i] = options[i].replace(/\W/g, '_');
                }

                if (i === 'version' && typeof options[i] !== 'number') {
                    return new Error('Database version must be a number.');
                }

                this._config[i] = options[i];
            }

            // after all config options are set and
            // the driver option is used, try setting it
            if ('driver' in options && options.driver) {
                return this.setDriver(this._config.driver);
            }

            return true;
        } else if (typeof options === 'string') {
            return this._config[options];
        } else {
            return this._config;
        }
    }

    // Used to define a custom driver, shared across all instances of
    // localForage.
    defineDriver(driverObject, callback, errorCallback) {
        const promise = new _utils_promise__WEBPACK_IMPORTED_MODULE_4__["default"](function(resolve, reject) {
            try {
                const driverName = driverObject._driver;
                const complianceError = new Error(
                    'Custom driver not compliant; see ' +
                        'https://mozilla.github.io/localForage/#definedriver'
                );

                // A driver name should be defined and not overlap with the
                // library-defined, default drivers.
                if (!driverObject._driver) {
                    reject(complianceError);
                    return;
                }

                const driverMethods = LibraryMethods.concat('_initStorage');
                for (let i = 0, len = driverMethods.length; i < len; i++) {
                    const driverMethodName = driverMethods[i];

                    // when the property is there,
                    // it should be a method even when optional
                    const isRequired = !(0,_utils_includes__WEBPACK_IMPORTED_MODULE_7__["default"])(
                        OptionalDriverMethods,
                        driverMethodName
                    );
                    if (
                        (isRequired || driverObject[driverMethodName]) &&
                        typeof driverObject[driverMethodName] !== 'function'
                    ) {
                        reject(complianceError);
                        return;
                    }
                }

                const configureMissingMethods = function() {
                    const methodNotImplementedFactory = function(methodName) {
                        return function() {
                            const error = new Error(
                                `Method ${methodName} is not implemented by the current driver`
                            );
                            const promise = _utils_promise__WEBPACK_IMPORTED_MODULE_4__["default"].reject(error);
                            (0,_utils_executeCallback__WEBPACK_IMPORTED_MODULE_5__["default"])(
                                promise,
                                arguments[arguments.length - 1]
                            );
                            return promise;
                        };
                    };

                    for (
                        let i = 0, len = OptionalDriverMethods.length;
                        i < len;
                        i++
                    ) {
                        const optionalDriverMethod = OptionalDriverMethods[i];
                        if (!driverObject[optionalDriverMethod]) {
                            driverObject[
                                optionalDriverMethod
                            ] = methodNotImplementedFactory(
                                optionalDriverMethod
                            );
                        }
                    }
                };

                configureMissingMethods();

                const setDriverSupport = function(support) {
                    if (DefinedDrivers[driverName]) {
                        console.info(
                            `Redefining LocalForage driver: ${driverName}`
                        );
                    }
                    DefinedDrivers[driverName] = driverObject;
                    DriverSupport[driverName] = support;
                    // don't use a then, so that we can define
                    // drivers that have simple _support methods
                    // in a blocking manner
                    resolve();
                };

                if ('_support' in driverObject) {
                    if (
                        driverObject._support &&
                        typeof driverObject._support === 'function'
                    ) {
                        driverObject._support().then(setDriverSupport, reject);
                    } else {
                        setDriverSupport(!!driverObject._support);
                    }
                } else {
                    setDriverSupport(true);
                }
            } catch (e) {
                reject(e);
            }
        });

        (0,_utils_executeTwoCallbacks__WEBPACK_IMPORTED_MODULE_6__["default"])(promise, callback, errorCallback);
        return promise;
    }

    driver() {
        return this._driver || null;
    }

    getDriver(driverName, callback, errorCallback) {
        const getDriverPromise = DefinedDrivers[driverName]
            ? _utils_promise__WEBPACK_IMPORTED_MODULE_4__["default"].resolve(DefinedDrivers[driverName])
            : _utils_promise__WEBPACK_IMPORTED_MODULE_4__["default"].reject(new Error('Driver not found.'));

        (0,_utils_executeTwoCallbacks__WEBPACK_IMPORTED_MODULE_6__["default"])(getDriverPromise, callback, errorCallback);
        return getDriverPromise;
    }

    getSerializer(callback) {
        const serializerPromise = _utils_promise__WEBPACK_IMPORTED_MODULE_4__["default"].resolve(_utils_serializer__WEBPACK_IMPORTED_MODULE_3__["default"]);
        (0,_utils_executeTwoCallbacks__WEBPACK_IMPORTED_MODULE_6__["default"])(serializerPromise, callback);
        return serializerPromise;
    }

    ready(callback) {
        const self = this;

        const promise = self._driverSet.then(() => {
            if (self._ready === null) {
                self._ready = self._initDriver();
            }

            return self._ready;
        });

        (0,_utils_executeTwoCallbacks__WEBPACK_IMPORTED_MODULE_6__["default"])(promise, callback, callback);
        return promise;
    }

    setDriver(drivers, callback, errorCallback) {
        const self = this;

        if (!(0,_utils_isArray__WEBPACK_IMPORTED_MODULE_8__["default"])(drivers)) {
            drivers = [drivers];
        }

        const supportedDrivers = this._getSupportedDrivers(drivers);

        function setDriverToConfig() {
            self._config.driver = self.driver();
        }

        function extendSelfWithDriver(driver) {
            self._extend(driver);
            setDriverToConfig();

            self._ready = self._initStorage(self._config);
            return self._ready;
        }

        function initDriver(supportedDrivers) {
            return function() {
                let currentDriverIndex = 0;

                function driverPromiseLoop() {
                    while (currentDriverIndex < supportedDrivers.length) {
                        let driverName = supportedDrivers[currentDriverIndex];
                        currentDriverIndex++;

                        self._dbInfo = null;
                        self._ready = null;

                        return self
                            .getDriver(driverName)
                            .then(extendSelfWithDriver)
                            .catch(driverPromiseLoop);
                    }

                    setDriverToConfig();
                    const error = new Error(
                        'No available storage method found.'
                    );
                    self._driverSet = _utils_promise__WEBPACK_IMPORTED_MODULE_4__["default"].reject(error);
                    return self._driverSet;
                }

                return driverPromiseLoop();
            };
        }

        // There might be a driver initialization in progress
        // so wait for it to finish in order to avoid a possible
        // race condition to set _dbInfo
        const oldDriverSetDone =
            this._driverSet !== null
                ? this._driverSet.catch(() => _utils_promise__WEBPACK_IMPORTED_MODULE_4__["default"].resolve())
                : _utils_promise__WEBPACK_IMPORTED_MODULE_4__["default"].resolve();

        this._driverSet = oldDriverSetDone
            .then(() => {
                const driverName = supportedDrivers[0];
                self._dbInfo = null;
                self._ready = null;

                return self.getDriver(driverName).then(driver => {
                    self._driver = driver._driver;
                    setDriverToConfig();
                    self._wrapLibraryMethodsWithReady();
                    self._initDriver = initDriver(supportedDrivers);
                });
            })
            .catch(() => {
                setDriverToConfig();
                const error = new Error('No available storage method found.');
                self._driverSet = _utils_promise__WEBPACK_IMPORTED_MODULE_4__["default"].reject(error);
                return self._driverSet;
            });

        (0,_utils_executeTwoCallbacks__WEBPACK_IMPORTED_MODULE_6__["default"])(this._driverSet, callback, errorCallback);
        return this._driverSet;
    }

    supports(driverName) {
        return !!DriverSupport[driverName];
    }

    _extend(libraryMethodsAndProperties) {
        extend(this, libraryMethodsAndProperties);
    }

    _getSupportedDrivers(drivers) {
        const supportedDrivers = [];
        for (let i = 0, len = drivers.length; i < len; i++) {
            const driverName = drivers[i];
            if (this.supports(driverName)) {
                supportedDrivers.push(driverName);
            }
        }
        return supportedDrivers;
    }

    _wrapLibraryMethodsWithReady() {
        // Add a stub for each driver API method that delays the call to the
        // corresponding driver method until localForage is ready. These stubs
        // will be replaced by the driver methods as soon as the driver is
        // loaded, so there is no performance impact.
        for (let i = 0, len = LibraryMethods.length; i < len; i++) {
            callWhenReady(this, LibraryMethods[i]);
        }
    }

    createInstance(options) {
        return new LocalForage(options);
    }
}

// The actual localForage object that we expose as a module or via a
// global. It's extended by pulling in one of our other libraries.
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new LocalForage());


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/createBlob.js":
/*!***************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/createBlob.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// Abstracts constructing a Blob object, so it also works in older
// browsers that don't support the native Blob constructor. (i.e.
// old QtWebKit versions, at least).
// Abstracts constructing a Blob object, so it also works in older
// browsers that don't support the native Blob constructor. (i.e.
// old QtWebKit versions, at least).
function createBlob(parts, properties) {
    /* global BlobBuilder,MSBlobBuilder,MozBlobBuilder,WebKitBlobBuilder */
    parts = parts || [];
    properties = properties || {};
    try {
        return new Blob(parts, properties);
    } catch (e) {
        if (e.name !== 'TypeError') {
            throw e;
        }
        var Builder =
            typeof BlobBuilder !== 'undefined'
                ? BlobBuilder
                : typeof MSBlobBuilder !== 'undefined'
                  ? MSBlobBuilder
                  : typeof MozBlobBuilder !== 'undefined'
                    ? MozBlobBuilder
                    : WebKitBlobBuilder;
        var builder = new Builder();
        for (var i = 0; i < parts.length; i += 1) {
            builder.append(parts[i]);
        }
        return builder.getBlob(properties.type);
    }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createBlob);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/executeCallback.js":
/*!********************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/executeCallback.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function executeCallback(promise, callback) {
    if (callback) {
        promise.then(
            function(result) {
                callback(null, result);
            },
            function(error) {
                callback(error);
            }
        );
    }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (executeCallback);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/executeTwoCallbacks.js":
/*!************************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/executeTwoCallbacks.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function executeTwoCallbacks(promise, callback, errorCallback) {
    if (typeof callback === 'function') {
        promise.then(callback);
    }

    if (typeof errorCallback === 'function') {
        promise.catch(errorCallback);
    }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (executeTwoCallbacks);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/getCallback.js":
/*!****************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/getCallback.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ getCallback)
/* harmony export */ });
function getCallback() {
    if (
        arguments.length &&
        typeof arguments[arguments.length - 1] === 'function'
    ) {
        return arguments[arguments.length - 1];
    }
}


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/idb.js":
/*!********************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/idb.js ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function getIDB() {
    /* global indexedDB,webkitIndexedDB,mozIndexedDB,OIndexedDB,msIndexedDB */
    try {
        if (typeof indexedDB !== 'undefined') {
            return indexedDB;
        }
        if (typeof webkitIndexedDB !== 'undefined') {
            return webkitIndexedDB;
        }
        if (typeof mozIndexedDB !== 'undefined') {
            return mozIndexedDB;
        }
        if (typeof OIndexedDB !== 'undefined') {
            return OIndexedDB;
        }
        if (typeof msIndexedDB !== 'undefined') {
            return msIndexedDB;
        }
    } catch (e) {
        return;
    }
}

var idb = getIDB();
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (idb);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/includes.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/includes.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const sameValue = (x, y) =>
    x === y ||
    (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));

const includes = (array, searchElement) => {
    const len = array.length;
    let i = 0;
    while (i < len) {
        if (sameValue(array[i], searchElement)) {
            return true;
        }
        i++;
    }

    return false;
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (includes);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/isArray.js":
/*!************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/isArray.js ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const isArray =
    Array.isArray ||
    function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (isArray);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/isIndexedDBValid.js":
/*!*********************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/isIndexedDBValid.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _idb__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./idb */ "../app/node_modules/localforage/src/utils/idb.js");


function isIndexedDBValid() {
    try {
        // Initialize IndexedDB; fall back to vendor-prefixed versions
        // if needed.
        if (!_idb__WEBPACK_IMPORTED_MODULE_0__["default"]) {
            return false;
        }
        // We mimic PouchDB here;
        //
        // We test for openDatabase because IE Mobile identifies itself
        // as Safari. Oh the lulz...
        var isSafari =
            typeof openDatabase !== 'undefined' &&
            /(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent) &&
            !/Chrome/.test(navigator.userAgent) &&
            !/BlackBerry/.test(navigator.platform);

        var hasFetch =
            typeof fetch === 'function' &&
            fetch.toString().indexOf('[native code') !== -1;

        // Safari <10.1 does not meet our requirements for IDB support (#5572)
        // since Safari 10.1 shipped with fetch, we can use that to detect it
        return (
            (!isSafari || hasFetch) &&
            typeof indexedDB !== 'undefined' &&
            // some outdated implementations of IDB that appear on Samsung
            // and HTC Android devices <4.4 are missing IDBKeyRange
            // See: https://github.com/mozilla/localForage/issues/128
            // See: https://github.com/mozilla/localForage/issues/272
            typeof IDBKeyRange !== 'undefined'
        );
    } catch (e) {
        return false;
    }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (isIndexedDBValid);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/isLocalStorageValid.js":
/*!************************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/isLocalStorageValid.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function isLocalStorageValid() {
    try {
        return (
            typeof localStorage !== 'undefined' &&
            'setItem' in localStorage &&
            // in IE8 typeof localStorage.setItem === 'object'
            !!localStorage.setItem
        );
    } catch (e) {
        return false;
    }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (isLocalStorageValid);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/isWebSQLValid.js":
/*!******************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/isWebSQLValid.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function isWebSQLValid() {
    return typeof openDatabase === 'function';
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (isWebSQLValid);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/normalizeKey.js":
/*!*****************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/normalizeKey.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ normalizeKey)
/* harmony export */ });
function normalizeKey(key) {
    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(`${key} used as a key, but it is not a string.`);
        key = String(key);
    }

    return key;
}


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/promise.js":
/*!************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/promise.js ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// This is CommonJS because lie is an external dependency, so Rollup
// can just ignore it.
if (typeof Promise === 'undefined') {
    // In the "nopromises" build this will just throw if you don't have
    // a global promise object, but it would throw anyway later.
    __webpack_require__(/*! lie/polyfill */ "../app/node_modules/lie/polyfill.js");
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Promise);


/***/ }),

/***/ "../app/node_modules/localforage/src/utils/serializer.js":
/*!***************************************************************!*\
  !*** ../app/node_modules/localforage/src/utils/serializer.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _createBlob__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./createBlob */ "../app/node_modules/localforage/src/utils/createBlob.js");
/* eslint-disable no-bitwise */


// Sadly, the best way to save binary data in WebSQL/localStorage is serializing
// it to Base64, so this is how we store it to prevent very strange errors with less
// verbose ways of binary <-> string data storage.
var BASE_CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

var BLOB_TYPE_PREFIX = '~~local_forage_type~';
var BLOB_TYPE_PREFIX_REGEX = /^~~local_forage_type~([^~]+)~/;

var SERIALIZED_MARKER = '__lfsc__:';
var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

// OMG the serializations!
var TYPE_ARRAYBUFFER = 'arbf';
var TYPE_BLOB = 'blob';
var TYPE_INT8ARRAY = 'si08';
var TYPE_UINT8ARRAY = 'ui08';
var TYPE_UINT8CLAMPEDARRAY = 'uic8';
var TYPE_INT16ARRAY = 'si16';
var TYPE_INT32ARRAY = 'si32';
var TYPE_UINT16ARRAY = 'ur16';
var TYPE_UINT32ARRAY = 'ui32';
var TYPE_FLOAT32ARRAY = 'fl32';
var TYPE_FLOAT64ARRAY = 'fl64';
var TYPE_SERIALIZED_MARKER_LENGTH =
    SERIALIZED_MARKER_LENGTH + TYPE_ARRAYBUFFER.length;

var toString = Object.prototype.toString;

function stringToBuffer(serializedString) {
    // Fill the string into a ArrayBuffer.
    var bufferLength = serializedString.length * 0.75;
    var len = serializedString.length;
    var i;
    var p = 0;
    var encoded1, encoded2, encoded3, encoded4;

    if (serializedString[serializedString.length - 1] === '=') {
        bufferLength--;
        if (serializedString[serializedString.length - 2] === '=') {
            bufferLength--;
        }
    }

    var buffer = new ArrayBuffer(bufferLength);
    var bytes = new Uint8Array(buffer);

    for (i = 0; i < len; i += 4) {
        encoded1 = BASE_CHARS.indexOf(serializedString[i]);
        encoded2 = BASE_CHARS.indexOf(serializedString[i + 1]);
        encoded3 = BASE_CHARS.indexOf(serializedString[i + 2]);
        encoded4 = BASE_CHARS.indexOf(serializedString[i + 3]);

        /*jslint bitwise: true */
        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return buffer;
}

// Converts a buffer to a string to store, serialized, in the backend
// storage library.
function bufferToString(buffer) {
    // base64-arraybuffer
    var bytes = new Uint8Array(buffer);
    var base64String = '';
    var i;

    for (i = 0; i < bytes.length; i += 3) {
        /*jslint bitwise: true */
        base64String += BASE_CHARS[bytes[i] >> 2];
        base64String += BASE_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64String +=
            BASE_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64String += BASE_CHARS[bytes[i + 2] & 63];
    }

    if (bytes.length % 3 === 2) {
        base64String = base64String.substring(0, base64String.length - 1) + '=';
    } else if (bytes.length % 3 === 1) {
        base64String =
            base64String.substring(0, base64String.length - 2) + '==';
    }

    return base64String;
}

// Serialize a value, afterwards executing a callback (which usually
// instructs the `setItem()` callback/promise to be executed). This is how
// we store binary data with localStorage.
function serialize(value, callback) {
    var valueType = '';
    if (value) {
        valueType = toString.call(value);
    }

    // Cannot use `value instanceof ArrayBuffer` or such here, as these
    // checks fail when running the tests using casper.js...
    //
    // TODO: See why those tests fail and use a better solution.
    if (
        value &&
        (valueType === '[object ArrayBuffer]' ||
            (value.buffer &&
                toString.call(value.buffer) === '[object ArrayBuffer]'))
    ) {
        // Convert binary arrays to a string and prefix the string with
        // a special marker.
        var buffer;
        var marker = SERIALIZED_MARKER;

        if (value instanceof ArrayBuffer) {
            buffer = value;
            marker += TYPE_ARRAYBUFFER;
        } else {
            buffer = value.buffer;

            if (valueType === '[object Int8Array]') {
                marker += TYPE_INT8ARRAY;
            } else if (valueType === '[object Uint8Array]') {
                marker += TYPE_UINT8ARRAY;
            } else if (valueType === '[object Uint8ClampedArray]') {
                marker += TYPE_UINT8CLAMPEDARRAY;
            } else if (valueType === '[object Int16Array]') {
                marker += TYPE_INT16ARRAY;
            } else if (valueType === '[object Uint16Array]') {
                marker += TYPE_UINT16ARRAY;
            } else if (valueType === '[object Int32Array]') {
                marker += TYPE_INT32ARRAY;
            } else if (valueType === '[object Uint32Array]') {
                marker += TYPE_UINT32ARRAY;
            } else if (valueType === '[object Float32Array]') {
                marker += TYPE_FLOAT32ARRAY;
            } else if (valueType === '[object Float64Array]') {
                marker += TYPE_FLOAT64ARRAY;
            } else {
                callback(new Error('Failed to get type for BinaryArray'));
            }
        }

        callback(marker + bufferToString(buffer));
    } else if (valueType === '[object Blob]') {
        // Conver the blob to a binaryArray and then to a string.
        var fileReader = new FileReader();

        fileReader.onload = function() {
            // Backwards-compatible prefix for the blob type.
            var str =
                BLOB_TYPE_PREFIX +
                value.type +
                '~' +
                bufferToString(this.result);

            callback(SERIALIZED_MARKER + TYPE_BLOB + str);
        };

        fileReader.readAsArrayBuffer(value);
    } else {
        try {
            callback(JSON.stringify(value));
        } catch (e) {
            console.error("Couldn't convert value into a JSON string: ", value);

            callback(null, e);
        }
    }
}

// Deserialize data we've inserted into a value column/field. We place
// special markers into our strings to mark them as encoded; this isn't
// as nice as a meta field, but it's the only sane thing we can do whilst
// keeping localStorage support intact.
//
// Oftentimes this will just deserialize JSON content, but if we have a
// special marker (SERIALIZED_MARKER, defined above), we will extract
// some kind of arraybuffer/binary data/typed array out of the string.
function deserialize(value) {
    // If we haven't marked this string as being specially serialized (i.e.
    // something other than serialized JSON), we can just return it and be
    // done with it.
    if (value.substring(0, SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
        return JSON.parse(value);
    }

    // The following code deals with deserializing some kind of Blob or
    // TypedArray. First we separate out the type of data we're dealing
    // with from the data itself.
    var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
    var type = value.substring(
        SERIALIZED_MARKER_LENGTH,
        TYPE_SERIALIZED_MARKER_LENGTH
    );

    var blobType;
    // Backwards-compatible blob type serialization strategy.
    // DBs created with older versions of localForage will simply not have the blob type.
    if (type === TYPE_BLOB && BLOB_TYPE_PREFIX_REGEX.test(serializedString)) {
        var matcher = serializedString.match(BLOB_TYPE_PREFIX_REGEX);
        blobType = matcher[1];
        serializedString = serializedString.substring(matcher[0].length);
    }
    var buffer = stringToBuffer(serializedString);

    // Return the right type based on the code/type set during
    // serialization.
    switch (type) {
        case TYPE_ARRAYBUFFER:
            return buffer;
        case TYPE_BLOB:
            return (0,_createBlob__WEBPACK_IMPORTED_MODULE_0__["default"])([buffer], { type: blobType });
        case TYPE_INT8ARRAY:
            return new Int8Array(buffer);
        case TYPE_UINT8ARRAY:
            return new Uint8Array(buffer);
        case TYPE_UINT8CLAMPEDARRAY:
            return new Uint8ClampedArray(buffer);
        case TYPE_INT16ARRAY:
            return new Int16Array(buffer);
        case TYPE_UINT16ARRAY:
            return new Uint16Array(buffer);
        case TYPE_INT32ARRAY:
            return new Int32Array(buffer);
        case TYPE_UINT32ARRAY:
            return new Uint32Array(buffer);
        case TYPE_FLOAT32ARRAY:
            return new Float32Array(buffer);
        case TYPE_FLOAT64ARRAY:
            return new Float64Array(buffer);
        default:
            throw new Error('Unkown type: ' + type);
    }
}

var localforageSerializer = {
    serialize: serialize,
    deserialize: deserialize,
    stringToBuffer: stringToBuffer,
    bufferToString: bufferToString
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (localforageSerializer);


/***/ }),

/***/ "../core/vendor/sjcl.js":
/*!******************************!*\
  !*** ../core/vendor/sjcl.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "sjcl": () => (/* binding */ sjcl)
/* harmony export */ });
/** @fileOverview Javascript cryptography implementation.
 *
 * Crush to remove comments, shorten variable names and
 * generally reduce transmission size.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */


/*jslint indent: 2, bitwise: false, nomen: false, plusplus: false, white: false, regexp: false */
/*global document, window, escape, unescape, module, require, Uint32Array */

/**
 * The Stanford Javascript Crypto Library, top-level namespace.
 * @namespace
 */
var sjcl = {
    /**
     * Symmetric ciphers.
     * @namespace
     */
    cipher: {},

    /**
     * Hash functions.  Right now only SHA256 is implemented.
     * @namespace
     */
    hash: {},

    /**
     * Key exchange functions.  Right now only SRP is implemented.
     * @namespace
     */
    keyexchange: {},

    /**
     * Cipher modes of operation.
     * @namespace
     */
    mode: {},

    /**
     * Miscellaneous.  HMAC and PBKDF2.
     * @namespace
     */
    misc: {},

    /**
     * Bit array encoders and decoders.
     * @namespace
     *
     * @description
     * The members of this namespace are functions which translate between
     * SJCL's bitArrays and other objects (usually strings).  Because it
     * isn't always clear which direction is encoding and which is decoding,
     * the method names are "fromBits" and "toBits".
     */
    codec: {},

    /**
     * Exceptions.
     * @namespace
     */
    exception: {
        /**
         * Ciphertext is corrupt.
         * @constructor
         */
        corrupt: function(message) {
            this.toString = function() {
                return "CORRUPT: " + this.message;
            };
            this.message = message;
        },

        /**
         * Invalid parameter.
         * @constructor
         */
        invalid: function(message) {
            this.toString = function() {
                return "INVALID: " + this.message;
            };
            this.message = message;
        },

        /**
         * Bug or missing feature in SJCL.
         * @constructor
         */
        bug: function(message) {
            this.toString = function() {
                return "BUG: " + this.message;
            };
            this.message = message;
        },

        /**
         * Something isn't ready.
         * @constructor
         */
        notReady: function(message) {
            this.toString = function() {
                return "NOT READY: " + this.message;
            };
            this.message = message;
        }
    }
};
/** @fileOverview Low-level AES implementation.
 *
 * This file contains a low-level implementation of AES, optimized for
 * size and for efficiency on several browsers.  It is based on
 * OpenSSL's aes_core.c, a public-domain implementation by Vincent
 * Rijmen, Antoon Bosselaers and Paulo Barreto.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Schedule out an AES key for both encryption and decryption.  This
 * is a low-level class.  Use a cipher mode to do bulk encryption.
 *
 * @constructor
 * @param {Array} key The key as an array of 4, 6 or 8 words.
 */
sjcl.cipher.aes = function(key) {
    if (!this._tables[0][0][0]) {
        this._precompute();
    }

    var i,
        j,
        tmp,
        encKey,
        decKey,
        sbox = this._tables[0][4],
        decTable = this._tables[1],
        keyLen = key.length,
        rcon = 1;

    if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8) {
        throw new sjcl.exception.invalid("invalid aes key size");
    }

    this._key = [(encKey = key.slice(0)), (decKey = [])];

    // schedule encryption keys
    for (i = keyLen; i < 4 * keyLen + 28; i++) {
        tmp = encKey[i - 1];

        // apply sbox
        if (i % keyLen === 0 || (keyLen === 8 && i % keyLen === 4)) {
            tmp =
                (sbox[tmp >>> 24] << 24) ^
                (sbox[(tmp >> 16) & 255] << 16) ^
                (sbox[(tmp >> 8) & 255] << 8) ^
                sbox[tmp & 255];

            // shift rows and add rcon
            if (i % keyLen === 0) {
                tmp = (tmp << 8) ^ (tmp >>> 24) ^ (rcon << 24);
                rcon = (rcon << 1) ^ ((rcon >> 7) * 283);
            }
        }

        encKey[i] = encKey[i - keyLen] ^ tmp;
    }

    // schedule decryption keys
    for (j = 0; i; j++, i--) {
        tmp = encKey[j & 3 ? i : i - 4];
        if (i <= 4 || j < 4) {
            decKey[j] = tmp;
        } else {
            decKey[j] =
                decTable[0][sbox[tmp >>> 24]] ^
                decTable[1][sbox[(tmp >> 16) & 255]] ^
                decTable[2][sbox[(tmp >> 8) & 255]] ^
                decTable[3][sbox[tmp & 255]];
        }
    }
};

sjcl.cipher.aes.prototype = {
    // public
    /* Something like this might appear here eventually
  name: "AES",
  blockSize: 4,
  keySizes: [4,6,8],
  */

    /**
     * Encrypt an array of 4 big-endian words.
     * @param {Array} data The plaintext.
     * @return {Array} The ciphertext.
     */
    encrypt: function(data) {
        return this._crypt(data, 0);
    },

    /**
     * Decrypt an array of 4 big-endian words.
     * @param {Array} data The ciphertext.
     * @return {Array} The plaintext.
     */
    decrypt: function(data) {
        return this._crypt(data, 1);
    },

    /**
     * The expanded S-box and inverse S-box tables.  These will be computed
     * on the client so that we don't have to send them down the wire.
     *
     * There are two tables, _tables[0] is for encryption and
     * _tables[1] is for decryption.
     *
     * The first 4 sub-tables are the expanded S-box with MixColumns.  The
     * last (_tables[01][4]) is the S-box itself.
     *
     * @private
     */
    _tables: [[[], [], [], [], []], [[], [], [], [], []]],

    /**
     * Expand the S-box tables.
     *
     * @private
     */
    _precompute: function() {
        var encTable = this._tables[0],
            decTable = this._tables[1],
            sbox = encTable[4],
            sboxInv = decTable[4],
            i,
            x,
            xInv,
            d = [],
            th = [],
            x2,
            x4,
            x8,
            s,
            tEnc,
            tDec;

        // Compute double and third tables
        for (i = 0; i < 256; i++) {
            th[(d[i] = (i << 1) ^ ((i >> 7) * 283)) ^ i] = i;
        }

        for (x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
            // Compute sbox
            s = xInv ^ (xInv << 1) ^ (xInv << 2) ^ (xInv << 3) ^ (xInv << 4);
            s = (s >> 8) ^ (s & 255) ^ 99;
            sbox[x] = s;
            sboxInv[s] = x;

            // Compute MixColumns
            x8 = d[(x4 = d[(x2 = d[x])])];
            tDec = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
            tEnc = (d[s] * 0x101) ^ (s * 0x1010100);

            for (i = 0; i < 4; i++) {
                encTable[i][x] = tEnc = (tEnc << 24) ^ (tEnc >>> 8);
                decTable[i][s] = tDec = (tDec << 24) ^ (tDec >>> 8);
            }
        }

        // Compactify.  Considerable speedup on Firefox.
        for (i = 0; i < 5; i++) {
            encTable[i] = encTable[i].slice(0);
            decTable[i] = decTable[i].slice(0);
        }
    },

    /**
     * Encryption and decryption core.
     * @param {Array} input Four words to be encrypted or decrypted.
     * @param dir The direction, 0 for encrypt and 1 for decrypt.
     * @return {Array} The four encrypted or decrypted words.
     * @private
     */
    _crypt: function(input, dir) {
        if (input.length !== 4) {
            throw new sjcl.exception.invalid("invalid aes block size");
        }

        var key = this._key[dir],
            // state variables a,b,c,d are loaded with pre-whitened data
            a = input[0] ^ key[0],
            b = input[dir ? 3 : 1] ^ key[1],
            c = input[2] ^ key[2],
            d = input[dir ? 1 : 3] ^ key[3],
            a2,
            b2,
            c2,
            nInnerRounds = key.length / 4 - 2,
            i,
            kIndex = 4,
            out = [0, 0, 0, 0],
            table = this._tables[dir],
            // load up the tables
            t0 = table[0],
            t1 = table[1],
            t2 = table[2],
            t3 = table[3],
            sbox = table[4];

        // Inner rounds.  Cribbed from OpenSSL.
        for (i = 0; i < nInnerRounds; i++) {
            a2 = t0[a >>> 24] ^ t1[(b >> 16) & 255] ^ t2[(c >> 8) & 255] ^ t3[d & 255] ^ key[kIndex];
            b2 = t0[b >>> 24] ^ t1[(c >> 16) & 255] ^ t2[(d >> 8) & 255] ^ t3[a & 255] ^ key[kIndex + 1];
            c2 = t0[c >>> 24] ^ t1[(d >> 16) & 255] ^ t2[(a >> 8) & 255] ^ t3[b & 255] ^ key[kIndex + 2];
            d = t0[d >>> 24] ^ t1[(a >> 16) & 255] ^ t2[(b >> 8) & 255] ^ t3[c & 255] ^ key[kIndex + 3];
            kIndex += 4;
            a = a2;
            b = b2;
            c = c2;
        }

        // Last round.
        for (i = 0; i < 4; i++) {
            out[dir ? 3 & -i : i] =
                (sbox[a >>> 24] << 24) ^
                (sbox[(b >> 16) & 255] << 16) ^
                (sbox[(c >> 8) & 255] << 8) ^
                sbox[d & 255] ^
                key[kIndex++];
            a2 = a;
            a = b;
            b = c;
            c = d;
            d = a2;
        }

        return out;
    }
};

/** @fileOverview Arrays of bits, encoded as arrays of Numbers.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Arrays of bits, encoded as arrays of Numbers.
 * @namespace
 * @description
 * <p>
 * These objects are the currency accepted by SJCL's crypto functions.
 * </p>
 *
 * <p>
 * Most of our crypto primitives operate on arrays of 4-byte words internally,
 * but many of them can take arguments that are not a multiple of 4 bytes.
 * This library encodes arrays of bits (whose size need not be a multiple of 8
 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
 * array of words, 32 bits at a time.  Since the words are double-precision
 * floating point numbers, they fit some extra data.  We use this (in a private,
 * possibly-changing manner) to encode the number of bits actually  present
 * in the last word of the array.
 * </p>
 *
 * <p>
 * Because bitwise ops clear this out-of-band data, these arrays can be passed
 * to ciphers like AES which want arrays of words.
 * </p>
 */
sjcl.bitArray = {
    /**
     * Array slices in units of bits.
     * @param {bitArray} a The array to slice.
     * @param {Number} bstart The offset to the start of the slice, in bits.
     * @param {Number} bend The offset to the end of the slice, in bits.  If this is undefined,
     * slice until the end of the array.
     * @return {bitArray} The requested slice.
     */
    bitSlice: function(a, bstart, bend) {
        a = sjcl.bitArray._shiftRight(a.slice(bstart / 32), 32 - (bstart & 31)).slice(1);
        return bend === undefined ? a : sjcl.bitArray.clamp(a, bend - bstart);
    },

    /**
     * Extract a number packed into a bit array.
     * @param {bitArray} a The array to slice.
     * @param {Number} bstart The offset to the start of the slice, in bits.
     * @param {Number} blength The length of the number to extract.
     * @return {Number} The requested slice.
     */
    extract: function(a, bstart, blength) {
        // FIXME: this Math.floor is not necessary at all, but for some reason
        // seems to suppress a bug in the Chromium JIT.
        var x,
            sh = Math.floor((-bstart - blength) & 31);
        if (((bstart + blength - 1) ^ bstart) & -32) {
            // it crosses a boundary
            x = (a[(bstart / 32) | 0] << (32 - sh)) ^ (a[(bstart / 32 + 1) | 0] >>> sh);
        } else {
            // within a single word
            x = a[(bstart / 32) | 0] >>> sh;
        }
        return x & ((1 << blength) - 1);
    },

    /**
     * Concatenate two bit arrays.
     * @param {bitArray} a1 The first array.
     * @param {bitArray} a2 The second array.
     * @return {bitArray} The concatenation of a1 and a2.
     */
    concat: function(a1, a2) {
        if (a1.length === 0 || a2.length === 0) {
            return a1.concat(a2);
        }

        var last = a1[a1.length - 1],
            shift = sjcl.bitArray.getPartial(last);
        if (shift === 32) {
            return a1.concat(a2);
        } else {
            return sjcl.bitArray._shiftRight(a2, shift, last | 0, a1.slice(0, a1.length - 1));
        }
    },

    /**
     * Find the length of an array of bits.
     * @param {bitArray} a The array.
     * @return {Number} The length of a, in bits.
     */
    bitLength: function(a) {
        var l = a.length,
            x;
        if (l === 0) {
            return 0;
        }
        x = a[l - 1];
        return (l - 1) * 32 + sjcl.bitArray.getPartial(x);
    },

    /**
     * Truncate an array.
     * @param {bitArray} a The array.
     * @param {Number} len The length to truncate to, in bits.
     * @return {bitArray} A new array, truncated to len bits.
     */
    clamp: function(a, len) {
        if (a.length * 32 < len) {
            return a;
        }
        a = a.slice(0, Math.ceil(len / 32));
        var l = a.length;
        len = len & 31;
        if (l > 0 && len) {
            a[l - 1] = sjcl.bitArray.partial(len, a[l - 1] & (0x80000000 >> (len - 1)), 1);
        }
        return a;
    },

    /**
     * Make a partial word for a bit array.
     * @param {Number} len The number of bits in the word.
     * @param {Number} x The bits.
     * @param {Number} [_end=0] Pass 1 if x has already been shifted to the high side.
     * @return {Number} The partial word.
     */
    partial: function(len, x, _end) {
        if (len === 32) {
            return x;
        }
        return (_end ? x | 0 : x << (32 - len)) + len * 0x10000000000;
    },

    /**
     * Get the number of bits used by a partial word.
     * @param {Number} x The partial word.
     * @return {Number} The number of bits used by the partial word.
     */
    getPartial: function(x) {
        return Math.round(x / 0x10000000000) || 32;
    },

    /**
     * Compare two arrays for equality in a predictable amount of time.
     * @param {bitArray} a The first array.
     * @param {bitArray} b The second array.
     * @return {boolean} true if a == b; false otherwise.
     */
    equal: function(a, b) {
        if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) {
            return false;
        }
        var x = 0,
            i;
        for (i = 0; i < a.length; i++) {
            x |= a[i] ^ b[i];
        }
        return x === 0;
    },

    /** Shift an array right.
     * @param {bitArray} a The array to shift.
     * @param {Number} shift The number of bits to shift.
     * @param {Number} [carry=0] A byte to carry in
     * @param {bitArray} [out=[]] An array to prepend to the output.
     * @private
     */
    _shiftRight: function(a, shift, carry, out) {
        var i,
            last2 = 0,
            shift2;
        if (out === undefined) {
            out = [];
        }

        for (; shift >= 32; shift -= 32) {
            out.push(carry);
            carry = 0;
        }
        if (shift === 0) {
            return out.concat(a);
        }

        for (i = 0; i < a.length; i++) {
            out.push(carry | (a[i] >>> shift));
            carry = a[i] << (32 - shift);
        }
        last2 = a.length ? a[a.length - 1] : 0;
        shift2 = sjcl.bitArray.getPartial(last2);
        out.push(sjcl.bitArray.partial((shift + shift2) & 31, shift + shift2 > 32 ? carry : out.pop(), 1));
        return out;
    },

    /** xor a block of 4 words together.
     * @private
     */
    _xor4: function(x, y) {
        return [x[0] ^ y[0], x[1] ^ y[1], x[2] ^ y[2], x[3] ^ y[3]];
    },

    /** byteswap a word array inplace.
     * (does not handle partial words)
     * @param {sjcl.bitArray} a word array
     * @return {sjcl.bitArray} byteswapped array
     */
    byteswapM: function(a) {
        var i,
            v,
            m = 0xff00;
        for (i = 0; i < a.length; ++i) {
            v = a[i];
            a[i] = (v >>> 24) | ((v >>> 8) & m) | ((v & m) << 8) | (v << 24);
        }
        return a;
    }
};
/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * UTF-8 strings
 * @namespace
 */
sjcl.codec.utf8String = {
    /** Convert from a bitArray to a UTF-8 string. */
    fromBits: function(arr) {
        var out = "",
            bl = sjcl.bitArray.bitLength(arr),
            i,
            tmp;
        for (i = 0; i < bl / 8; i++) {
            if ((i & 3) === 0) {
                tmp = arr[i / 4];
            }
            out += String.fromCharCode(((tmp >>> 8) >>> 8) >>> 8);
            tmp <<= 8;
        }
        return decodeURIComponent(escape(out));
    },

    /** Convert from a UTF-8 string to a bitArray. */
    toBits: function(str) {
        str = unescape(encodeURIComponent(str));
        var out = [],
            i,
            tmp = 0;
        for (i = 0; i < str.length; i++) {
            tmp = (tmp << 8) | str.charCodeAt(i);
            if ((i & 3) === 3) {
                out.push(tmp);
                tmp = 0;
            }
        }
        if (i & 3) {
            out.push(sjcl.bitArray.partial(8 * (i & 3), tmp));
        }
        return out;
    }
};
/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Arrays of bytes
 * @namespace
 */
sjcl.codec.bytes = {
    /** Convert from a bitArray to an array of bytes. */
    fromBits: function(arr) {
        var out = [],
            bl = sjcl.bitArray.bitLength(arr),
            i,
            tmp;
        for (i = 0; i < bl / 8; i++) {
            if ((i & 3) === 0) {
                tmp = arr[i / 4];
            }
            out.push(tmp >>> 24);
            tmp <<= 8;
        }
        return out;
    },
    /** Convert from an array of bytes to a bitArray. */
    toBits: function(bytes) {
        var out = [],
            i,
            tmp = 0;
        for (i = 0; i < bytes.length; i++) {
            tmp = (tmp << 8) | bytes[i];
            if ((i & 3) === 3) {
                out.push(tmp);
                tmp = 0;
            }
        }
        if (i & 3) {
            out.push(sjcl.bitArray.partial(8 * (i & 3), tmp));
        }
        return out;
    }
};
/** @fileOverview CCM mode implementation.
 *
 * Special thanks to Roy Nicholson for pointing out a bug in our
 * implementation.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * CTR mode with CBC MAC.
 * @namespace
 */
sjcl.mode.ccm = {
    /** The name of the mode.
     * @constant
     */
    name: "ccm",

    _progressListeners: [],

    listenProgress: function(cb) {
        sjcl.mode.ccm._progressListeners.push(cb);
    },

    unListenProgress: function(cb) {
        var index = sjcl.mode.ccm._progressListeners.indexOf(cb);
        if (index > -1) {
            sjcl.mode.ccm._progressListeners.splice(index, 1);
        }
    },

    _callProgressListener: function(val) {
        var p = sjcl.mode.ccm._progressListeners.slice(),
            i;

        for (i = 0; i < p.length; i += 1) {
            p[i](val);
        }
    },

    /** Encrypt in CCM mode.
     * @static
     * @param {Object} prf The pseudorandom function.  It must have a block size of 16 bytes.
     * @param {bitArray} plaintext The plaintext data.
     * @param {bitArray} iv The initialization value.
     * @param {bitArray} [adata=[]] The authenticated data.
     * @param {Number} [tlen=64] the desired tag length, in bits.
     * @return {bitArray} The encrypted data, an array of bytes.
     */
    encrypt: function(prf, plaintext, iv, adata, tlen) {
        var L,
            out = plaintext.slice(0),
            tag,
            w = sjcl.bitArray,
            ivl = w.bitLength(iv) / 8,
            ol = w.bitLength(out) / 8;
        tlen = tlen || 64;
        adata = adata || [];

        if (ivl < 7) {
            throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");
        }

        // compute the length of the length
        for (L = 2; L < 4 && ol >>> (8 * L); L++) {}
        if (L < 15 - ivl) {
            L = 15 - ivl;
        }
        iv = w.clamp(iv, 8 * (15 - L));

        // compute the tag
        tag = sjcl.mode.ccm._computeTag(prf, plaintext, iv, adata, tlen, L);

        // encrypt
        out = sjcl.mode.ccm._ctrMode(prf, out, iv, tag, tlen, L);

        return w.concat(out.data, out.tag);
    },

    /** Decrypt in CCM mode.
     * @static
     * @param {Object} prf The pseudorandom function.  It must have a block size of 16 bytes.
     * @param {bitArray} ciphertext The ciphertext data.
     * @param {bitArray} iv The initialization value.
     * @param {bitArray} [adata=[]] adata The authenticated data.
     * @param {Number} [tlen=64] tlen the desired tag length, in bits.
     * @return {bitArray} The decrypted data.
     */
    decrypt: function(prf, ciphertext, iv, adata, tlen) {
        tlen = tlen || 64;
        adata = adata || [];
        var L,
            w = sjcl.bitArray,
            ivl = w.bitLength(iv) / 8,
            ol = w.bitLength(ciphertext),
            out = w.clamp(ciphertext, ol - tlen),
            tag = w.bitSlice(ciphertext, ol - tlen),
            tag2;

        ol = (ol - tlen) / 8;

        if (ivl < 7) {
            throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");
        }

        // compute the length of the length
        for (L = 2; L < 4 && ol >>> (8 * L); L++) {}
        if (L < 15 - ivl) {
            L = 15 - ivl;
        }
        iv = w.clamp(iv, 8 * (15 - L));

        // decrypt
        out = sjcl.mode.ccm._ctrMode(prf, out, iv, tag, tlen, L);

        // check the tag
        tag2 = sjcl.mode.ccm._computeTag(prf, out.data, iv, adata, tlen, L);
        if (!w.equal(out.tag, tag2)) {
            throw new sjcl.exception.corrupt("ccm: tag doesn't match");
        }

        return out.data;
    },

    _macAdditionalData: function(prf, adata, iv, tlen, ol, L) {
        var mac,
            tmp,
            i,
            macData = [],
            w = sjcl.bitArray,
            xor = w._xor4;

        // mac the flags
        mac = [w.partial(8, (adata.length ? 1 << 6 : 0) | ((tlen - 2) << 2) | (L - 1))];

        // mac the iv and length
        mac = w.concat(mac, iv);
        mac[3] |= ol;
        mac = prf.encrypt(mac);

        if (adata.length) {
            // mac the associated data.  start with its length...
            tmp = w.bitLength(adata) / 8;
            if (tmp <= 0xfeff) {
                macData = [w.partial(16, tmp)];
            } else if (tmp <= 0xffffffff) {
                macData = w.concat([w.partial(16, 0xfffe)], [tmp]);
            } // else ...

            // mac the data itself
            macData = w.concat(macData, adata);
            for (i = 0; i < macData.length; i += 4) {
                mac = prf.encrypt(xor(mac, macData.slice(i, i + 4).concat([0, 0, 0])));
            }
        }

        return mac;
    },

    /* Compute the (unencrypted) authentication tag, according to the CCM specification
     * @param {Object} prf The pseudorandom function.
     * @param {bitArray} plaintext The plaintext data.
     * @param {bitArray} iv The initialization value.
     * @param {bitArray} adata The authenticated data.
     * @param {Number} tlen the desired tag length, in bits.
     * @return {bitArray} The tag, but not yet encrypted.
     * @private
     */
    _computeTag: function(prf, plaintext, iv, adata, tlen, L) {
        // compute B[0]
        var mac,
            i,
            w = sjcl.bitArray,
            xor = w._xor4;

        tlen /= 8;

        // check tag length and message length
        if (tlen % 2 || tlen < 4 || tlen > 16) {
            throw new sjcl.exception.invalid("ccm: invalid tag length");
        }

        if (adata.length > 0xffffffff || plaintext.length > 0xffffffff) {
            // I don't want to deal with extracting high words from doubles.
            throw new sjcl.exception.bug("ccm: can't deal with 4GiB or more data");
        }

        mac = sjcl.mode.ccm._macAdditionalData(prf, adata, iv, tlen, w.bitLength(plaintext) / 8, L);

        // mac the plaintext
        for (i = 0; i < plaintext.length; i += 4) {
            mac = prf.encrypt(xor(mac, plaintext.slice(i, i + 4).concat([0, 0, 0])));
        }

        return w.clamp(mac, tlen * 8);
    },

    /** CCM CTR mode.
     * Encrypt or decrypt data and tag with the prf in CCM-style CTR mode.
     * May mutate its arguments.
     * @param {Object} prf The PRF.
     * @param {bitArray} data The data to be encrypted or decrypted.
     * @param {bitArray} iv The initialization vector.
     * @param {bitArray} tag The authentication tag.
     * @param {Number} tlen The length of th etag, in bits.
     * @param {Number} L The CCM L value.
     * @return {Object} An object with data and tag, the en/decryption of data and tag values.
     * @private
     */
    _ctrMode: function(prf, data, iv, tag, tlen, L) {
        var enc,
            i,
            w = sjcl.bitArray,
            xor = w._xor4,
            ctr,
            l = data.length,
            bl = w.bitLength(data),
            n = l / 50,
            p = n;

        // start the ctr
        ctr = w
            .concat([w.partial(8, L - 1)], iv)
            .concat([0, 0, 0])
            .slice(0, 4);

        // en/decrypt the tag
        tag = w.bitSlice(xor(tag, prf.encrypt(ctr)), 0, tlen);

        // en/decrypt the data
        if (!l) {
            return { tag: tag, data: [] };
        }

        for (i = 0; i < l; i += 4) {
            if (i > n) {
                sjcl.mode.ccm._callProgressListener(i / l);
                n += p;
            }
            ctr[3]++;
            enc = prf.encrypt(ctr);
            data[i] ^= enc[0];
            data[i + 1] ^= enc[1];
            data[i + 2] ^= enc[2];
            data[i + 3] ^= enc[3];
        }
        return { tag: tag, data: w.clamp(data, bl) };
    }
};




/***/ }),

/***/ "../locale/res/translations lazy recursive ^\\.\\/.*\\.json$":
/*!************************************************************************!*\
  !*** ../locale/res/translations/ lazy ^\.\/.*\.json$ namespace object ***!
  \************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var map = {
	"./_template.json": [
		"../locale/res/translations/_template.json",
		"locale_res_translations__template_json"
	],
	"./de.json": [
		"../locale/res/translations/de.json",
		"locale_res_translations_de_json"
	],
	"./es.json": [
		"../locale/res/translations/es.json",
		"locale_res_translations_es_json"
	],
	"./fr.json": [
		"../locale/res/translations/fr.json",
		"locale_res_translations_fr_json"
	],
	"./pl.json": [
		"../locale/res/translations/pl.json",
		"locale_res_translations_pl_json"
	],
	"./ru.json": [
		"../locale/res/translations/ru.json",
		"locale_res_translations_ru_json"
	]
};
function webpackAsyncContext(req) {
	if(!__webpack_require__.o(map, req)) {
		return Promise.resolve().then(() => {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}

	var ids = map[req], id = ids[0];
	return __webpack_require__.e(ids[1]).then(() => {
		return __webpack_require__.t(id, 3 | 16);
	});
}
webpackAsyncContext.keys = () => (Object.keys(map));
webpackAsyncContext.id = "../locale/res/translations lazy recursive ^\\.\\/.*\\.json$";
module.exports = webpackAsyncContext;

/***/ }),

/***/ "../app/src/lib/crypto.ts":
/*!********************************!*\
  !*** ../app/src/lib/crypto.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "WebCryptoProvider": () => (/* binding */ WebCryptoProvider),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @padloc/core/src/error */ "../core/src/error.ts");
/* harmony import */ var _padloc_core_src_sjcl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @padloc/core/src/sjcl */ "../core/src/sjcl.ts");


const webCrypto = window.crypto && window.crypto.subtle;
class WebCryptoProvider {
    async randomBytes(n) {
        const bytes = window.crypto.getRandomValues(new Uint8Array(n));
        return bytes;
    }
    async hash(input, params) {
        const bytes = await webCrypto.digest({ name: params.algorithm }, input);
        return new Uint8Array(bytes);
    }
    async generateKey(params) {
        switch (params.algorithm) {
            case "AES":
            case "HMAC":
                return this.randomBytes(params.keySize / 8);
            case "RSA":
                const keyPair = (await webCrypto.generateKey(Object.assign(params, { name: "RSA-OAEP" }), true, [
                    "encrypt",
                    "decrypt"
                ]));
                const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
                const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
                return {
                    privateKey: new Uint8Array(privateKey),
                    publicKey: new Uint8Array(publicKey)
                };
            // case "HMAC":
            //     const key = await webCrypto.generateKey(Object.assign({}, params, { name: params.algorithm }), true, [
            //         "sign",
            //         "verify"
            //     ]);
            //     const raw = await webCrypto.exportKey("raw", key);
            //     return new Uint8Array(raw));
        }
    }
    async deriveKey(password, params) {
        const baseKey = await webCrypto.importKey("raw", password, params.algorithm, false, ["deriveBits"]);
        const key = await webCrypto.deriveBits({
            name: params.algorithm,
            salt: params.salt,
            iterations: params.iterations,
            hash: params.hash
        }, baseKey, params.keySize);
        return new Uint8Array(key);
    }
    async encrypt(key, data, params) {
        switch (params.algorithm) {
            case "AES-GCM":
            case "AES-CCM":
                return this._encryptAES(key, data, params);
            case "RSA-OAEP":
                return this._encryptRSA(key, data, params);
            default:
                throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }
    }
    async decrypt(key, data, params) {
        switch (params.algorithm) {
            case "AES-GCM":
            case "AES-CCM":
                return this._decryptAES(key, data, params);
            case "RSA-OAEP":
                return this._decryptRSA(key, data, params);
            default:
                throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }
    }
    async _encryptAES(key, data, params) {
        if (params.algorithm === "AES-CCM") {
            return _padloc_core_src_sjcl__WEBPACK_IMPORTED_MODULE_1__["default"].encrypt(key, data, params);
        }
        const k = await webCrypto.importKey("raw", key, params.algorithm, false, ["encrypt"]);
        try {
            const buf = await webCrypto.encrypt({
                name: params.algorithm,
                iv: params.iv,
                additionalData: params.additionalData,
                tagLength: params.tagSize
            }, k, data);
            return new Uint8Array(buf);
        }
        catch (e) {
            throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCRYPTION_FAILED);
        }
    }
    async _decryptAES(key, data, params) {
        if (params.algorithm === "AES-CCM") {
            return _padloc_core_src_sjcl__WEBPACK_IMPORTED_MODULE_1__["default"].decrypt(key, data, params);
        }
        const k = await webCrypto.importKey("raw", key, params.algorithm, false, ["decrypt"]);
        try {
            const buf = await webCrypto.decrypt({
                name: params.algorithm,
                iv: params.iv,
                additionalData: params.additionalData,
                tagLength: params.tagSize
            }, k, data);
            return new Uint8Array(buf);
        }
        catch (e) {
            throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.DECRYPTION_FAILED);
        }
    }
    async _encryptRSA(publicKey, key, params) {
        const p = Object.assign({}, params, { name: params.algorithm });
        const k = await webCrypto.importKey("spki", publicKey, p, false, ["encrypt"]);
        try {
            const buf = await webCrypto.encrypt(p, k, key);
            return new Uint8Array(buf);
        }
        catch (e) {
            throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.DECRYPTION_FAILED);
        }
    }
    async _decryptRSA(privateKey, key, params) {
        const p = Object.assign({}, params, { name: params.algorithm });
        const k = await webCrypto.importKey("pkcs8", privateKey, p, false, ["decrypt"]);
        try {
            const buf = await webCrypto.decrypt(p, k, key);
            return new Uint8Array(buf);
        }
        catch (e) {
            throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.DECRYPTION_FAILED);
        }
    }
    async fingerprint(key) {
        const bytes = await webCrypto.digest("SHA-256", key);
        return new Uint8Array(bytes);
    }
    async sign(key, data, params) {
        switch (params.algorithm) {
            case "HMAC":
                return this._signHMAC(key, data, params);
            case "RSA-PSS":
                return this._signRSA(key, data, params);
            default:
                throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.NOT_SUPPORTED);
        }
    }
    async verify(key, signature, data, params) {
        switch (params.algorithm) {
            case "HMAC":
                return this._verifyHMAC(key, signature, data, params);
            case "RSA-PSS":
                return this._verifyRSA(key, signature, data, params);
            default:
                throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.NOT_SUPPORTED);
        }
    }
    async _signHMAC(key, data, params) {
        const p = Object.assign({}, params, { name: params.algorithm, length: params.keySize });
        const k = await webCrypto.importKey("raw", key, p, false, ["sign"]);
        const signature = await webCrypto.sign(p, k, data);
        return new Uint8Array(signature);
    }
    async _verifyHMAC(key, signature, data, params) {
        const p = Object.assign({}, params, { name: params.algorithm, length: params.keySize });
        const k = await webCrypto.importKey("raw", key, p, false, ["verify"]);
        return await webCrypto.verify(p, k, signature, data);
    }
    async _signRSA(key, data, params) {
        const p = Object.assign({}, params, { name: params.algorithm });
        const k = await webCrypto.importKey("pkcs8", key, p, false, ["sign"]);
        const signature = await webCrypto.sign(p, k, data);
        return new Uint8Array(signature);
    }
    async _verifyRSA(key, signature, data, params) {
        const p = Object.assign({}, params, { name: params.algorithm });
        const k = await webCrypto.importKey("spki", key, p, false, ["verify"]);
        return await webCrypto.verify(p, k, signature, data);
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (WebCryptoProvider);


/***/ }),

/***/ "../app/src/lib/platform.ts":
/*!**********************************!*\
  !*** ../app/src/lib/platform.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "WebPlatform": () => (/* binding */ WebPlatform)
/* harmony export */ });
/* harmony import */ var _padloc_core_src_platform__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @padloc/core/src/platform */ "../core/src/platform.ts");
/* harmony import */ var _padloc_core_src_encoding__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @padloc/core/src/encoding */ "../core/src/encoding.ts");
/* harmony import */ var _crypto__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./crypto */ "../app/src/lib/crypto.ts");
/* harmony import */ var _storage__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./storage */ "../app/src/lib/storage.ts");




const browserInfo = (async () => {
    const { default: UAParser } = await __webpack_require__.e(/*! import() | ua-parser */ "ua-parser").then(__webpack_require__.t.bind(__webpack_require__, /*! ua-parser-js */ "../app/node_modules/ua-parser-js/src/ua-parser.js", 23));
    return new UAParser(navigator.userAgent).getResult();
})();
class WebPlatform extends _padloc_core_src_platform__WEBPACK_IMPORTED_MODULE_0__.StubPlatform {
    constructor() {
        super(...arguments);
        this.crypto = new _crypto__WEBPACK_IMPORTED_MODULE_2__.WebCryptoProvider();
        this.storage = new _storage__WEBPACK_IMPORTED_MODULE_3__.LocalStorage();
    }
    // Set clipboard text using `document.execCommand("cut")`.
    // NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
    async setClipboard(text) {
        this._clipboardTextArea = this._clipboardTextArea || document.createElement("textarea");
        this._clipboardTextArea.contentEditable = "true";
        this._clipboardTextArea.readOnly = false;
        this._clipboardTextArea.value = text;
        document.body.appendChild(this._clipboardTextArea);
        const range = document.createRange();
        range.selectNodeContents(this._clipboardTextArea);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(range);
        this._clipboardTextArea.select();
        this._clipboardTextArea.setSelectionRange(0, this._clipboardTextArea.value.length); // A big number, to cover anything that could be inside the element.
        document.execCommand("cut");
        document.body.removeChild(this._clipboardTextArea);
    }
    // Get clipboard text using `document.execCommand("paste")`
    // NOTE: This only works in certain environments like Google Chrome apps with the appropriate permissions set
    async getClipboard() {
        this._clipboardTextArea = this._clipboardTextArea || document.createElement("textarea");
        document.body.appendChild(this._clipboardTextArea);
        this._clipboardTextArea.value = "";
        this._clipboardTextArea.select();
        document.execCommand("paste");
        document.body.removeChild(this._clipboardTextArea);
        return this._clipboardTextArea.value;
    }
    async getDeviceInfo() {
        const { os, browser } = await browserInfo;
        return new _padloc_core_src_platform__WEBPACK_IMPORTED_MODULE_0__.DeviceInfo({
            platform: (os.name && os.name.replace(" ", "")) || "",
            osVersion: (os.version && os.version.replace(" ", "")) || "",
            id: "",
            appVersion: "3.1.4" || 0,
            manufacturer: "",
            model: "",
            browser: browser.name || "",
            userAgent: navigator.userAgent,
            locale: navigator.language || "en",
        });
    }
    async scanQR() {
        return new Promise((resolve, reject) => {
            const tick = async () => {
                if (this._qrVideo.readyState !== this._qrVideo.HAVE_ENOUGH_DATA) {
                    requestAnimationFrame(() => tick());
                    return;
                }
                const { default: jsQR } = await __webpack_require__.e(/*! import() | jsqr */ "jsqr").then(__webpack_require__.t.bind(__webpack_require__, /*! jsqr */ "../app/node_modules/jsqr/dist/jsQR.js", 23));
                const canvas = this._qrCanvas.getContext("2d");
                this._qrCanvas.height = this._qrVideo.videoHeight;
                this._qrCanvas.width = this._qrVideo.videoWidth;
                canvas.drawImage(this._qrVideo, 0, 0, this._qrCanvas.width, this._qrCanvas.height);
                const imageData = canvas.getImageData(0, 0, this._qrCanvas.width, this._qrCanvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });
                if (code) {
                    resolve(code.data);
                }
                requestAnimationFrame(() => tick());
            };
            if (!this._qrVideo) {
                this._qrVideo = document.createElement("video");
                this._qrVideo.setAttribute("playsinline", "");
                this._qrVideo.setAttribute("muted", "");
                this._qrVideo.setAttribute("autoplay", "");
            }
            if (!this._qrCanvas) {
                this._qrCanvas = document.createElement("canvas");
                Object.assign(this._qrCanvas.style, {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    zIndex: "-1",
                });
                document.body.appendChild(this._qrCanvas);
            }
            this._qrCanvas.style.display = "block";
            navigator.mediaDevices
                .getUserMedia({ audio: false, video: { facingMode: "environment" } })
                .then((stream) => {
                // Use facingMode: environment to attemt to get the front camera on phones
                this._qrVideo.srcObject = stream;
                this._qrVideo.play();
                requestAnimationFrame(() => tick());
            }, reject);
        });
    }
    async stopScanQR() {
        const stream = this._qrVideo && this._qrVideo.srcObject;
        if (stream) {
            for (const track of stream.getTracks()) {
                track.stop();
            }
        }
        this._qrVideo && (this._qrVideo.srcObject = null);
        this._qrCanvas.style.display = "none";
    }
    async composeEmail(addr, subj, msg) {
        window.open(`mailto:${addr}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(msg)}`, "_system");
    }
    async saveFile(name, type, contents) {
        const a = document.createElement("a");
        a.href = `data:${type};base64,${(0,_padloc_core_src_encoding__WEBPACK_IMPORTED_MODULE_1__.bytesToBase64)(contents, false)}`;
        a.download = name;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}


/***/ }),

/***/ "../app/src/lib/storage.ts":
/*!*********************************!*\
  !*** ../app/src/lib/storage.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "LocalStorage": () => (/* binding */ LocalStorage)
/* harmony export */ });
/* harmony import */ var _padloc_core_src_storage__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @padloc/core/src/storage */ "../core/src/storage.ts");
/* harmony import */ var _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @padloc/core/src/error */ "../core/src/error.ts");
/* harmony import */ var localforage_src_localforage__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! localforage/src/localforage */ "../app/node_modules/localforage/src/localforage.js");


// @ts-ignore

class LocalStorage {
    async save(s) {
        await localforage_src_localforage__WEBPACK_IMPORTED_MODULE_2__["default"].setItem(`${s.kind}_${s.id}`, s.toRaw());
    }
    async get(cls, id) {
        const s = cls instanceof _padloc_core_src_storage__WEBPACK_IMPORTED_MODULE_0__.Storable ? cls : new cls();
        const data = await localforage_src_localforage__WEBPACK_IMPORTED_MODULE_2__["default"].getItem(`${s.kind}_${id}`);
        if (!data) {
            throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_1__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_1__.ErrorCode.NOT_FOUND);
        }
        return s.fromRaw(data);
    }
    async delete(s) {
        await localforage_src_localforage__WEBPACK_IMPORTED_MODULE_2__["default"].removeItem(`${s.kind}_${s.id}`);
    }
    async clear() {
        await localforage_src_localforage__WEBPACK_IMPORTED_MODULE_2__["default"].clear();
    }
    async list(_cls, _) {
        throw new _padloc_core_src_error__WEBPACK_IMPORTED_MODULE_1__.Err(_padloc_core_src_error__WEBPACK_IMPORTED_MODULE_1__.ErrorCode.NOT_SUPPORTED);
    }
}


/***/ }),

/***/ "../core/src/base32.ts":
/*!*****************************!*\
  !*** ../core/src/base32.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bytesToBase32": () => (/* binding */ bytesToBase32),
/* harmony export */   "base32ToBytes": () => (/* binding */ base32ToBytes)
/* harmony export */ });
/* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./error */ "../core/src/error.ts");

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function bytesToBase32(arr) {
    let bits = 0;
    let value = 0;
    let str = "";
    for (let i = 0; i < arr.length; i++) {
        value = (value << 8) | arr[i];
        bits += 8;
        while (bits >= 5) {
            str += chars[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        str += chars[(value << (5 - bits)) & 31];
    }
    return str;
}
function base32ToBytes(str) {
    const strUpp = str.toUpperCase();
    const arr = new Uint8Array(((str.length * 5) / 8) | 0);
    let bits = 0;
    let value = 0;
    let index = 0;
    for (let i = 0; i < strUpp.length; i++) {
        const idx = chars.indexOf(strUpp[i]);
        if (idx === -1) {
            throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR, `Invalid Base32 character found: ${strUpp[i]}`);
        }
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            arr[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return arr;
}


/***/ }),

/***/ "../core/src/base64.ts":
/*!*****************************!*\
  !*** ../core/src/base64.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "byteLength": () => (/* binding */ byteLength),
/* harmony export */   "isBase64": () => (/* binding */ isBase64),
/* harmony export */   "toByteArray": () => (/* binding */ toByteArray),
/* harmony export */   "fromByteArray": () => (/* binding */ fromByteArray)
/* harmony export */ });
const lookup = [];
const lookupURL = [];
const revLookup = [];
const code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const codeURL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
for (let i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    lookupURL[i] = codeURL[i];
    revLookup[code.charCodeAt(i)] = i;
}
// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup["-".charCodeAt(0)] = 62;
revLookup["_".charCodeAt(0)] = 63;
function getLens(b64) {
    // Remove trailing padding characters
    const trimmed = b64.replace(/=*$/, "");
    const len = trimmed.length;
    const padLen = (4 - (len % 4)) % 4;
    return [len, padLen];
}
// base64 is 4/3 + up to two characters of the original data
function byteLength(b64) {
    const lens = getLens(b64);
    return _byteLength(lens[0], lens[1]);
}
function _byteLength(validLen, placeHoldersLen) {
    return ((validLen + placeHoldersLen) * 3) / 4 - placeHoldersLen;
}
function isBase64(str) {
    for (let i = 0; i < str.length; i++) {
        if (!(typeof revLookup[str.charCodeAt(i)] === "number")) {
            return false;
        }
    }
    return true;
}
function toByteArray(b64) {
    let tmp;
    const lens = getLens(b64);
    const validLen = lens[0];
    const placeHoldersLen = lens[1];
    const arr = new Uint8Array(_byteLength(validLen, placeHoldersLen));
    let curByte = 0;
    // if there are placeholders, only get up to the last complete 4 chars
    const len = placeHoldersLen > 0 ? validLen - 4 : validLen;
    let i = 0;
    for (; i < len; i += 4) {
        tmp =
            (revLookup[b64.charCodeAt(i)] << 18) |
                (revLookup[b64.charCodeAt(i + 1)] << 12) |
                (revLookup[b64.charCodeAt(i + 2)] << 6) |
                revLookup[b64.charCodeAt(i + 3)];
        arr[curByte++] = (tmp >> 16) & 0xff;
        arr[curByte++] = (tmp >> 8) & 0xff;
        arr[curByte++] = tmp & 0xff;
    }
    if (placeHoldersLen === 2) {
        tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[curByte++] = tmp & 0xff;
    }
    if (placeHoldersLen === 1) {
        tmp =
            (revLookup[b64.charCodeAt(i)] << 10) |
                (revLookup[b64.charCodeAt(i + 1)] << 4) |
                (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[curByte++] = (tmp >> 8) & 0xff;
        arr[curByte++] = tmp & 0xff;
    }
    return arr;
}
function tripletToBase64(num, urlSafe = false) {
    const lu = urlSafe ? lookupURL : lookup;
    return lu[(num >> 18) & 0x3f] + lu[(num >> 12) & 0x3f] + lu[(num >> 6) & 0x3f] + lu[num & 0x3f];
}
function encodeChunk(uint8, start, end, urlSafe = false) {
    let tmp;
    const output = [];
    for (let i = start; i < end; i += 3) {
        tmp = ((uint8[i] << 16) & 0xff0000) + ((uint8[i + 1] << 8) & 0xff00) + (uint8[i + 2] & 0xff);
        output.push(tripletToBase64(tmp, urlSafe));
    }
    return output.join("");
}
function fromByteArray(uint8, urlSafe = false) {
    let tmp;
    const lu = urlSafe ? lookupURL : lookup;
    const padChar = urlSafe ? "" : "=";
    const len = uint8.length;
    const extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
    const parts = [];
    const maxChunkLength = 16383; // must be multiple of 3
    // go through the array every three bytes, we'll deal with trailing stuff later
    for (let i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength, urlSafe));
    }
    // pad the end with zeros, but make sure to not forget the extra bytes
    if (extraBytes === 1) {
        tmp = uint8[len - 1];
        parts.push(lu[tmp >> 2] + lu[(tmp << 4) & 0x3f] + padChar + padChar);
    }
    else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + uint8[len - 1];
        parts.push(lu[tmp >> 10] + lu[(tmp >> 4) & 0x3f] + lu[(tmp << 2) & 0x3f] + padChar);
    }
    return parts.join("");
}


/***/ }),

/***/ "../core/src/encoding.ts":
/*!*******************************!*\
  !*** ../core/src/encoding.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bytesToBase32": () => (/* reexport safe */ _base32__WEBPACK_IMPORTED_MODULE_3__.bytesToBase32),
/* harmony export */   "base32ToBytes": () => (/* reexport safe */ _base32__WEBPACK_IMPORTED_MODULE_3__.base32ToBytes),
/* harmony export */   "AsSerializable": () => (/* binding */ AsSerializable),
/* harmony export */   "AsBytes": () => (/* binding */ AsBytes),
/* harmony export */   "AsSet": () => (/* binding */ AsSet),
/* harmony export */   "AsDate": () => (/* binding */ AsDate),
/* harmony export */   "Exclude": () => (/* binding */ Exclude),
/* harmony export */   "Serialize": () => (/* binding */ Serialize),
/* harmony export */   "Serializable": () => (/* binding */ Serializable),
/* harmony export */   "marshal": () => (/* binding */ marshal),
/* harmony export */   "unmarshal": () => (/* binding */ unmarshal),
/* harmony export */   "isBase64": () => (/* reexport safe */ _base64__WEBPACK_IMPORTED_MODULE_1__.isBase64),
/* harmony export */   "bytesToBase64": () => (/* binding */ bytesToBase64),
/* harmony export */   "base64ToBytes": () => (/* binding */ base64ToBytes),
/* harmony export */   "stringToBytes": () => (/* binding */ stringToBytes),
/* harmony export */   "bytesToString": () => (/* binding */ bytesToString),
/* harmony export */   "stringToBase64": () => (/* binding */ stringToBase64),
/* harmony export */   "base64ToString": () => (/* binding */ base64ToString),
/* harmony export */   "base64ByteLength": () => (/* binding */ base64ByteLength),
/* harmony export */   "hexToBytes": () => (/* binding */ hexToBytes),
/* harmony export */   "bytesToHex": () => (/* binding */ bytesToHex),
/* harmony export */   "base64ToHex": () => (/* binding */ base64ToHex),
/* harmony export */   "hexToBase64": () => (/* binding */ hexToBase64),
/* harmony export */   "numToBytes": () => (/* binding */ numToBytes),
/* harmony export */   "bytesToNum": () => (/* binding */ bytesToNum),
/* harmony export */   "concatBytes": () => (/* binding */ concatBytes),
/* harmony export */   "equalBytes": () => (/* binding */ equalBytes),
/* harmony export */   "equalCT": () => (/* binding */ equalCT)
/* harmony export */ });
/* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./error */ "../core/src/error.ts");
/* harmony import */ var _base64__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./base64 */ "../core/src/base64.ts");
/* harmony import */ var _migrations__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./migrations */ "../core/src/migrations.ts");
/* harmony import */ var _base32__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./base32 */ "../core/src/base32.ts");




function registerSerializationOptions(proto, property, opts) {
    if (!proto.hasOwnProperty("_propertySerializationOptions")) {
        const parentOptions = proto._propertySerializationOptions || [];
        proto._propertySerializationOptions = parentOptions ? [...parentOptions] : [];
    }
    // proto._propertySerializationOptions = proto._propertySerializationOptions.filter(o => o.property === property);
    proto._propertySerializationOptions.unshift(Object.assign({
        property,
        toProperty: property,
        exclude: false,
        arrayDeserializeIndividually: true,
        toRaw: () => { },
        fromRaw: () => { }
    }, opts));
}
/**
 * Decorator for defining request handler methods
 */
function AsSerializable(cls, toProperty) {
    return (proto, prop) => registerSerializationOptions(proto, prop, {
        toProperty: toProperty || prop,
        toRaw: (val, version) => val.toRaw(version),
        fromRaw: (raw) => new cls().fromRaw(raw)
    });
}
function AsBytes(toProperty) {
    return (proto, prop) => registerSerializationOptions(proto, prop, {
        toProperty: toProperty || prop,
        toRaw: (val) => bytesToBase64(val),
        fromRaw: (raw) => base64ToBytes(raw)
    });
}
function AsSet(toProperty) {
    return (proto, prop) => registerSerializationOptions(proto, prop, {
        toProperty: toProperty || prop,
        arrayDeserializeIndividually: false,
        toRaw: (val) => [...val],
        fromRaw: (raw) => new Set(raw)
    });
}
function AsDate(toProperty) {
    return (proto, prop) => registerSerializationOptions(proto, prop, {
        toProperty: toProperty || prop,
        toRaw: (val) => {
            try {
                return val.toISOString();
            }
            catch (e) {
                return null;
            }
        },
        fromRaw: (raw) => new Date(raw)
    });
}
function Exclude() {
    return (proto, prop) => registerSerializationOptions(proto, prop, {
        exclude: true
    });
}
function Serialize(opts) {
    return (proto, prop) => registerSerializationOptions(proto, prop, opts);
}
/**
 * Base class for "serializable" classes, i.e. classes that can be serialized
 * into a plain javascript object, JSON string or byte sequence which can be
 * used for storage or data transfer. Subclasses will generally want to overwrite
 * the [[toRaw]], [[fromRaw]] and [[validate]] methods to account for their
 * specific class structure.
 *
 * @example
 *
 * ```ts
 * class MyClass extends Serializable {
 *      name: string;
 *      parent?: MyClass;
 *      bytes: Uint8Array;
 *
 *      toRaw() {
 *          return {
 *              ...super.toRaw(),
 *              bytes: bytesToBase64(this.bytes)
 *          };
 *      }
 *
 *      fromRaw({ bytes, parent, ...rest }) {
 *          return super.fromRaw({
 *              bytes: base64ToBytes(bytes),
 *              parent: parent && new MyClass().fromRaw(parent),
 *              ...rest
 *          });
 *      }
 *
 *      validate() {
 *          return (
 *              super.validate() &&
 *              typeof this.name === "string" &&
 *              this.bytes instanceof Uint8Array &&
 *              (
 *                  typeof this.parent === "undefined" ||
 *                  this.parent instanceof MyClass
 *              )
 *          )
 *      }
 * }
 * ```
 */
class Serializable {
    /**
     * A string representing the objects "type", useful for segmenting storage,
     * among other things. Defaults to the lowercase class name, but can be
     * overwritten by subclasses
     */
    get kind() {
        return this.constructor.name.toLowerCase();
    }
    /**
     * This is called during deserialization and should verify that all
     * properties have been populated with values of the correct type.
     * Subclasses should implement this method based on their class structure.
     */
    validate() {
        return true;
    }
    /**
     * Creates a raw javascript object representation of the class, which
     * can be used for storage or data transmission. Also handles "downgrading" to previous
     * versions. Use [[_toRaw]] for subclass-specific behavior.
     */
    toRaw(version) {
        let raw = this._toRaw(version);
        raw.kind = this.kind;
        raw = (0,_migrations__WEBPACK_IMPORTED_MODULE_2__.downgrade)(this.kind, raw, version);
        return raw;
    }
    /**
     * Restores propertiers from a raw object of the same form generated by
     * [[toRaw]]. The base implementation blindly copies over values from the
     * raw object via `Object.assign` so subclasses should explictly process
     * any propertyies that need special treatment.
     *
     * Also takes are of validation and "upgrading" in case the raw object
     * has an old version. Use the protected [[_fromRaw]] method to implement
     * subclass-specific behavior.
     */
    fromRaw(raw) {
        // raw.kind = raw.kind || this.kind;
        raw = (0,_migrations__WEBPACK_IMPORTED_MODULE_2__.upgrade)(this.kind, raw);
        this._fromRaw(raw);
        try {
            if (!this.validate()) {
                console.log("failed to validate", this.kind, raw);
                throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR);
            }
        }
        catch (e) {
            throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR);
        }
        return this;
    }
    /**
     * Returns a JSON serialization of the object
     */
    toJSON() {
        return JSON.stringify(this.toRaw());
    }
    /**
     * Deserializes the object from a JSON string
     */
    fromJSON(json) {
        return this.fromRaw(JSON.parse(json));
    }
    /**
     * Returns a serialization of the object in form of a byte array
     */
    toBytes() {
        return stringToBytes(this.toJSON());
    }
    /**
     * Deserializes the object from a byte array
     */
    fromBytes(bytes) {
        return this.fromJSON(bytesToString(bytes));
    }
    /**
     * Creates a deep clone of the object
     */
    clone() {
        // @ts-ignore: This causes a typescript warning for some reason but works fine in practice
        return new this.constructor().fromRaw(this.toRaw());
    }
    /**
     * Transform this object into a raw javascript object used for
     * serialization.  The default implementation simply copies all iterable
     * properties not included in the [[exlude]] array and calls [[toRaw]] on
     * any properties that are themselfes instances of [[Serializable]].  This
     * method should be overwritten by subclasses if certain properties require
     * special treatment.
     */
    _toRaw(version) {
        let raw = {};
        for (const [prop, val] of Object.entries(this)) {
            const opts = this._propertySerializationOptions &&
                this._propertySerializationOptions.find(opts => opts.property === prop);
            if (prop.startsWith("_") || (opts && opts.exclude)) {
                continue;
            }
            if (opts && typeof val !== "undefined" && val !== null) {
                raw[opts.property] = Array.isArray(val)
                    ? val.map(v => opts.toRaw(v, version))
                    : opts.toRaw(val, version);
            }
            else {
                raw[prop] = val;
            }
        }
        return raw;
    }
    /**
     * Restore values from a raw object. The default implementation simply copies over
     * all iterable properties from the base object. Overwrite this method for properties
     * that require special treatment
     */
    _fromRaw(raw) {
        for (const [prop, val] of Object.entries(raw)) {
            if (prop === "kind") {
                continue;
            }
            const opts = this._propertySerializationOptions &&
                this._propertySerializationOptions.find(opts => opts.toProperty === prop);
            // Skip properties that have no serialization options associated with them
            // and are not explicitly defined as a property on the class
            if (!opts && !this.hasOwnProperty(prop)) {
                continue;
            }
            if (opts && typeof val !== "undefined" && val !== null) {
                this[opts.property] =
                    Array.isArray(val) && opts.arrayDeserializeIndividually
                        ? val.map(v => opts.fromRaw(v))
                        : opts.fromRaw(val);
            }
            else {
                this[prop] = val;
            }
        }
    }
}
/**
 * Creates a string from a raw javascript object
 */
function marshal(obj) {
    try {
        return JSON.stringify(obj);
    }
    catch (e) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR, e.toString());
    }
}
/**
 * Creates a raw javascript object from a string
 */
function unmarshal(str) {
    try {
        return JSON.parse(str);
    }
    catch (e) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR, e.toString());
    }
}

/**
 * Converts a byte array to a base64 string
 */
function bytesToBase64(inp, urlSafe = true) {
    try {
        return (0,_base64__WEBPACK_IMPORTED_MODULE_1__.fromByteArray)(inp, urlSafe);
    }
    catch (e) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR, e.toString());
    }
}
/**
 * Converts a base64 string to a byte array
 */
function base64ToBytes(inp) {
    try {
        return (0,_base64__WEBPACK_IMPORTED_MODULE_1__.toByteArray)(inp);
    }
    catch (e) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR, e.toString());
    }
}
/**
 * Converts a utf-8 string to a byte array
 */
function stringToBytes(str) {
    try {
        return new TextEncoder().encode(str);
    }
    catch (e) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR, e.toString());
    }
}
/**
 * Converts a byte array to an utf-8 string
 */
function bytesToString(bytes, encoding = "utf-8") {
    try {
        return new TextDecoder(encoding).decode(bytes);
    }
    catch (e) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR, e.toString());
    }
}
/**
 * Converts a utf-8 string to its base64 representation
 */
function stringToBase64(str, urlSafe = true) {
    const bytes = stringToBytes(str);
    return bytesToBase64(bytes, urlSafe);
}
/**
 * Converts the base64 representation of a utf-a string to it's original representation
 */
function base64ToString(inp) {
    const bytes = base64ToBytes(inp);
    return bytesToString(bytes);
}
/**
 * Returns the byte length of a base64 string
 */
function base64ByteLength(inp) {
    return (0,_base64__WEBPACK_IMPORTED_MODULE_1__.byteLength)(inp);
}
/**
 * Converts a hex string to a byte array
 */
function hexToBytes(str) {
    try {
        const bytes = new Uint8Array(str.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(str.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }
    catch (e) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR, e.toString());
    }
}
/**
 * Converts a byte array to its hexadecimal representation
 */
function bytesToHex(bytes) {
    try {
        let str = "";
        for (const b of bytes) {
            const s = b.toString(16);
            str += s.length == 1 ? "0" + s : s;
        }
        return str;
    }
    catch (e) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCODING_ERROR, e.toString());
    }
}
/**
 * Converts a base64 string to its hexadecimal representation
 */
function base64ToHex(b64) {
    return bytesToHex(base64ToBytes(b64));
}
/**
 * Converts a hex string to its base64 representation
 */
function hexToBase64(hex) {
    return bytesToBase64(hexToBytes(hex));
}
function numToBytes(num) {
    return hexToBytes(num.toString(16).padStart(16, "0"));
}
function bytesToNum(bytes) {
    return parseInt(bytesToHex(bytes), 16);
}
/**
 * Concatenates a number of Uint8Arrays to a single array
 */
function concatBytes(arrs, delimiter) {
    let length = arrs.reduce((len, arr) => len + arr.length, 0);
    if (typeof delimiter !== "undefined") {
        length += arrs.length - 1;
    }
    const res = new Uint8Array(length);
    let offset = 0;
    for (const arr of arrs) {
        res.set(arr, offset);
        offset += arr.length;
        if (typeof delimiter !== "undefined" && offset < length) {
            res.set([delimiter], offset);
            offset++;
        }
    }
    return res;
}
/** Checks two byte arrays for equality */
function equalBytes(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
/**
 * Checks two array-like objects for equality in constant time
 * (given that the `===` operator performs in constant time over all elements)
 */
function equalCT(a, b) {
    let match = true;
    for (let i = 0; i < a.length; i++) {
        match = match && a[i] === b[i];
    }
    return a.length === b.length && match;
}


/***/ }),

/***/ "../core/src/error.ts":
/*!****************************!*\
  !*** ../core/src/error.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ErrorCode": () => (/* binding */ ErrorCode),
/* harmony export */   "Err": () => (/* binding */ Err)
/* harmony export */ });
/**
 * Error codes used within Padloc
 */
var ErrorCode;
(function (ErrorCode) {
    // Crypto Errors
    ErrorCode["INVALID_ENCRYPTION_PARAMS"] = "invalid_encryption_params";
    ErrorCode["DECRYPTION_FAILED"] = "decryption_failed";
    ErrorCode["ENCRYPTION_FAILED"] = "encryption_failed";
    ErrorCode["NOT_SUPPORTED"] = "not_supported";
    ErrorCode["MISSING_ACCESS"] = "missing_access";
    ErrorCode["VERIFICATION_ERROR"] = "verification_error";
    // Client Errors
    ErrorCode["FAILED_CONNECTION"] = "failed_connection";
    ErrorCode["UNEXPECTED_REDIRECT"] = "unexpected_redirect";
    // Server Errors
    ErrorCode["BAD_REQUEST"] = "bad_request";
    ErrorCode["INVALID_SESSION"] = "invalid_session";
    ErrorCode["SESSION_EXPIRED"] = "session_expired";
    ErrorCode["INSUFFICIENT_PERMISSIONS"] = "insufficient_permissions";
    ErrorCode["INVALID_CREDENTIALS"] = "invalid_credentials";
    ErrorCode["ACCOUNT_EXISTS"] = "account_exists";
    ErrorCode["MFA_REQUIRED"] = "email_verification_required";
    ErrorCode["MFA_FAILED"] = "email_verification_failed";
    ErrorCode["MFA_TRIES_EXCEEDED"] = "email_verification_tries_exceeded";
    ErrorCode["INVALID_RESPONSE"] = "invalid_response";
    ErrorCode["INVALID_REQUEST"] = "invalid_request";
    ErrorCode["OUTDATED_REVISION"] = "merge_conflict";
    ErrorCode["MAX_REQUEST_SIZE_EXCEEDED"] = "max_request_size_exceeded";
    ErrorCode["MAX_REQUEST_AGE_EXCEEDED"] = "max_request_age_exceeded";
    // Quota errors
    ErrorCode["ORG_FROZEN"] = "org_frozen";
    ErrorCode["ORG_QUOTA_EXCEEDED"] = "org_quota_exceeded";
    ErrorCode["MEMBER_QUOTA_EXCEEDED"] = "member_quota_exceeded";
    ErrorCode["GROUP_QUOTA_EXCEEDED"] = "group_quota_exceeded";
    ErrorCode["VAULT_QUOTA_EXCEEDED"] = "vault_quota_exceeded";
    ErrorCode["STORAGE_QUOTA_EXCEEDED"] = "storage_quota_exceeded";
    // Generic Errors
    ErrorCode["CLIENT_ERROR"] = "client_error";
    ErrorCode["SERVER_ERROR"] = "server_error";
    ErrorCode["UNKNOWN_ERROR"] = "unknown_error";
    // Encoding errors
    ErrorCode["ENCODING_ERROR"] = "encoding_error";
    ErrorCode["UNSUPPORTED_VERSION"] = "unsupported_version";
    ErrorCode["NOT_FOUND"] = "not_found";
    ErrorCode["INVALID_CSV"] = "invalid_csv";
    ErrorCode["BILLING_ERROR"] = "billing_error";
})(ErrorCode || (ErrorCode = {}));
/**
 * Custom error class augmenting the built-in `Error` with some additional properties
 */
class Err extends Error {
    constructor(code, message, { report = false, display = false, error } = {}) {
        super(message || (error && error.message) || "");
        /** Time when the error was created */
        this.time = new Date();
        this.code = code;
        this.report = report;
        this.display = display;
        this.originalError = error;
    }
    toRaw() {
        return {
            code: this.code,
            message: this.message,
            stack: this.originalError ? this.originalError.stack : this.stack
        };
    }
    toString() {
        return `Time: ${this.time.toISOString()}\nError Code: ${this.code}:\nError Message: ${this.message}\nStack Trace:\n${this.originalError ? this.originalError.stack : this.stack}`;
    }
}


/***/ }),

/***/ "../core/src/migrations.ts":
/*!*********************************!*\
  !*** ../core/src/migrations.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MIGRATIONS": () => (/* binding */ MIGRATIONS),
/* harmony export */   "EARLIEST_VERSION": () => (/* binding */ EARLIEST_VERSION),
/* harmony export */   "LATEST_VERSION": () => (/* binding */ LATEST_VERSION),
/* harmony export */   "upgrade": () => (/* binding */ upgrade),
/* harmony export */   "downgrade": () => (/* binding */ downgrade)
/* harmony export */ });
/* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./error */ "../core/src/error.ts");

const MIGRATIONS = [
    {
        from: "3.0.14",
        to: "3.1.0",
        transforms: {
            account: {
                up: ({ mainVault, orgs, ...rest }) => ({
                    mainVault: { id: mainVault },
                    orgs: orgs.map((org) => ({
                        id: org
                    })),
                    ...rest
                }),
                down: ({ mainVault, orgs, ...rest }) => ({
                    mainVault: mainVault.id,
                    orgs: orgs.map((org) => org.id),
                    ...rest
                })
            },
            all: {
                up: (raw, kind) => ({ kind, ...raw }),
                down: ({ kind, ...rest }) => rest
            }
        }
    }
];
const EARLIEST_VERSION = MIGRATIONS[0].from;
const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].to;
function norm(version = EARLIEST_VERSION) {
    return version
        .split(".")
        .map(part => part.padStart(3, "0"))
        .join();
}
function upgrade(kind, raw, version = LATEST_VERSION) {
    if (norm(raw.version) > norm(LATEST_VERSION)) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.UNSUPPORTED_VERSION, "An object could not be decoded because it was encoded with a newer version of Padloc. " +
            "Please update to the latest version to fix this problem!");
    }
    const migration = MIGRATIONS.find(m => norm(m.from) >= norm(raw.version || EARLIEST_VERSION) && norm(m.to) <= norm(version));
    if (migration) {
        let transform = migration.transforms["all"];
        raw = transform ? transform.up(raw, kind) : raw;
        transform = migration.transforms[kind];
        raw = transform ? transform.up(raw, kind) : raw;
        raw.version = migration.to;
        return upgrade(kind, raw, version);
    }
    else {
        raw.version = version;
        return raw;
    }
}
function downgrade(kind, raw, version = LATEST_VERSION) {
    const migration = MIGRATIONS.reverse().find(m => norm(m.to) <= norm(raw.version || LATEST_VERSION) && norm(m.from) >= norm(version));
    if (migration) {
        let transform = migration.transforms[kind];
        raw = transform ? transform.down(raw, kind) : raw;
        transform = migration.transforms["all"];
        raw = transform ? transform.down(raw, kind) : raw;
        raw.version = migration.from;
        return downgrade(kind, raw, version);
    }
    else {
        raw.version = norm(version) > norm(LATEST_VERSION) ? LATEST_VERSION : version;
        return raw;
    }
}


/***/ }),

/***/ "../core/src/platform.ts":
/*!*******************************!*\
  !*** ../core/src/platform.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DeviceInfo": () => (/* binding */ DeviceInfo),
/* harmony export */   "StubPlatform": () => (/* binding */ StubPlatform),
/* harmony export */   "setPlatform": () => (/* binding */ setPlatform),
/* harmony export */   "getPlatform": () => (/* binding */ getPlatform),
/* harmony export */   "getClipboard": () => (/* binding */ getClipboard),
/* harmony export */   "setClipboard": () => (/* binding */ setClipboard),
/* harmony export */   "getDeviceInfo": () => (/* binding */ getDeviceInfo),
/* harmony export */   "getCryptoProvider": () => (/* binding */ getCryptoProvider),
/* harmony export */   "getStorage": () => (/* binding */ getStorage),
/* harmony export */   "scanQR": () => (/* binding */ scanQR),
/* harmony export */   "stopScanQR": () => (/* binding */ stopScanQR),
/* harmony export */   "isBiometricAuthAvailable": () => (/* binding */ isBiometricAuthAvailable),
/* harmony export */   "biometricAuth": () => (/* binding */ biometricAuth),
/* harmony export */   "isKeyStoreAvailable": () => (/* binding */ isKeyStoreAvailable),
/* harmony export */   "keyStoreSet": () => (/* binding */ keyStoreSet),
/* harmony export */   "keyStoreGet": () => (/* binding */ keyStoreGet),
/* harmony export */   "keyStoreDelete": () => (/* binding */ keyStoreDelete),
/* harmony export */   "composeEmail": () => (/* binding */ composeEmail),
/* harmony export */   "saveFile": () => (/* binding */ saveFile)
/* harmony export */ });
/* harmony import */ var _padloc_locale_src_translate__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @padloc/locale/src/translate */ "../locale/src/translate.ts");
/* harmony import */ var _encoding__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./encoding */ "../core/src/encoding.ts");
/* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./error */ "../core/src/error.ts");
/* harmony import */ var _stub_crypto_provider__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./stub-crypto-provider */ "../core/src/stub-crypto-provider.ts");
/* harmony import */ var _storage__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./storage */ "../core/src/storage.ts");





/**
 * Object representing all information available for a given device.
 */
class DeviceInfo extends _encoding__WEBPACK_IMPORTED_MODULE_1__.Serializable {
    constructor(props) {
        super();
        /** Platform/Operating System running on the device */
        this.platform = "";
        /** OS version running on the device */
        this.osVersion = "";
        /** Unique device identifier */
        this.id = "";
        /** Padloc version installed on the device */
        this.appVersion = "";
        /** The user agent of the browser running the application */
        this.userAgent = "";
        /** The devices locale setting */
        this.locale = "en";
        /** The device manufacturer, if available */
        this.manufacturer = "";
        /** The device mode, if available */
        this.model = "";
        /** The browser the application was loaded in, if applicable */
        this.browser = "";
        this.supportsBioAuth = false;
        this.supportsKeyStore = false;
        props && Object.assign(this, props);
    }
    get description() {
        return this.browser ? (0,_padloc_locale_src_translate__WEBPACK_IMPORTED_MODULE_0__.translate)("{0} on {1}", this.browser, this.platform) : (0,_padloc_locale_src_translate__WEBPACK_IMPORTED_MODULE_0__.translate)("{0} Device", this.platform);
    }
}
/**
 * Stub implementation of the [[Platform]] interface. Useful for testing
 */
class StubPlatform {
    constructor() {
        this.crypto = new _stub_crypto_provider__WEBPACK_IMPORTED_MODULE_3__.StubCryptoProvider();
        this.storage = new _storage__WEBPACK_IMPORTED_MODULE_4__.MemoryStorage();
    }
    async setClipboard(_val) {
        throw new _error__WEBPACK_IMPORTED_MODULE_2__.Err(_error__WEBPACK_IMPORTED_MODULE_2__.ErrorCode.NOT_SUPPORTED);
    }
    async getClipboard() {
        throw new _error__WEBPACK_IMPORTED_MODULE_2__.Err(_error__WEBPACK_IMPORTED_MODULE_2__.ErrorCode.NOT_SUPPORTED);
        return "";
    }
    async getDeviceInfo() {
        return new DeviceInfo();
    }
    async scanQR() {
        throw new _error__WEBPACK_IMPORTED_MODULE_2__.Err(_error__WEBPACK_IMPORTED_MODULE_2__.ErrorCode.NOT_SUPPORTED);
        return "";
    }
    async stopScanQR() {
        throw new _error__WEBPACK_IMPORTED_MODULE_2__.Err(_error__WEBPACK_IMPORTED_MODULE_2__.ErrorCode.NOT_SUPPORTED);
    }
    async isBiometricAuthAvailable() {
        return false;
    }
    async biometricAuth() {
        throw new _error__WEBPACK_IMPORTED_MODULE_2__.Err(_error__WEBPACK_IMPORTED_MODULE_2__.ErrorCode.NOT_SUPPORTED);
        return false;
    }
    async isKeyStoreAvailable() {
        return false;
    }
    async keyStoreGet(_name) {
        throw new _error__WEBPACK_IMPORTED_MODULE_2__.Err(_error__WEBPACK_IMPORTED_MODULE_2__.ErrorCode.NOT_SUPPORTED);
        return "";
    }
    async keyStoreSet(_name, _val) {
        throw new _error__WEBPACK_IMPORTED_MODULE_2__.Err(_error__WEBPACK_IMPORTED_MODULE_2__.ErrorCode.NOT_SUPPORTED);
    }
    async keyStoreDelete(_name) {
        throw new _error__WEBPACK_IMPORTED_MODULE_2__.Err(_error__WEBPACK_IMPORTED_MODULE_2__.ErrorCode.NOT_SUPPORTED);
    }
    async composeEmail(_addr, _subject, _message) {
        throw new _error__WEBPACK_IMPORTED_MODULE_2__.Err(_error__WEBPACK_IMPORTED_MODULE_2__.ErrorCode.NOT_SUPPORTED);
    }
    async saveFile(_name, _type, _contents) { }
}
let platform = new StubPlatform();
/**
 * Set the appropriate [[Platform]] implemenation for the current environment
 */
function setPlatform(p) {
    platform = p;
}
/**
 * Get the current [[Platform]] implemenation
 */
function getPlatform() {
    return platform;
}
/** Copies the given `text` to the system clipboard */
function getClipboard() {
    return platform.getClipboard();
}
/** Retrieves the current text from the system clipboard */
function setClipboard(val) {
    return platform.setClipboard(val);
}
/** Get information about the current device */
function getDeviceInfo() {
    return platform.getDeviceInfo();
}
function getCryptoProvider() {
    return platform.crypto;
}
function getStorage() {
    return platform.storage;
}
function scanQR() {
    return platform.scanQR();
}
function stopScanQR() {
    return platform.stopScanQR();
}
function isBiometricAuthAvailable() {
    return platform.isBiometricAuthAvailable();
}
function biometricAuth(message) {
    return platform.biometricAuth(message);
}
function isKeyStoreAvailable() {
    return platform.isKeyStoreAvailable();
}
function keyStoreSet(name, value) {
    return platform.keyStoreSet(name, value);
}
function keyStoreGet(name) {
    return platform.keyStoreGet(name);
}
function keyStoreDelete(name) {
    return platform.keyStoreDelete(name);
}
function composeEmail(addr, subject, message) {
    return platform.composeEmail(addr, subject, message);
}
function saveFile(name, type, contents) {
    return platform.saveFile(name, type, contents);
}


/***/ }),

/***/ "../core/src/sjcl.ts":
/*!***************************!*\
  !*** ../core/src/sjcl.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./error */ "../core/src/error.ts");
/* harmony import */ var _vendor_sjcl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vendor/sjcl */ "../core/vendor/sjcl.js");


// Shorthands for codec functions
const bytesToBits = _vendor_sjcl__WEBPACK_IMPORTED_MODULE_1__.sjcl.codec.bytes.toBits;
const bitsToBytes = _vendor_sjcl__WEBPACK_IMPORTED_MODULE_1__.sjcl.codec.bytes.fromBits;
/**
 * [[CrypoProvider]] implemenation using the [SJCL](https://github.com/bitwiseshiftleft/sjcl)
 * library. This is used to decrypt legacy (<3.x) Padlock containers that use AES in CCM mode
 * which is unfortunately not supported by the WebCrypto standard. Only
 * supports encryption/decryption using AES-CCM.
 */
const SJCLProvider = {
    isAvailable() {
        return true;
    },
    randomBytes(_bytes) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.NOT_SUPPORTED);
    },
    async deriveKey(_password, _params) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.NOT_SUPPORTED);
    },
    async randomKey(_n = 256) {
        throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.NOT_SUPPORTED);
    },
    async decrypt(key, ct, params) {
        if (params.algorithm !== "AES-CCM") {
            throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }
        // Only AES and CCM are supported
        const algorithm = "aes";
        const mode = "ccm";
        try {
            const cipher = new _vendor_sjcl__WEBPACK_IMPORTED_MODULE_1__.sjcl.cipher[algorithm](bytesToBits(key));
            const pt = _vendor_sjcl__WEBPACK_IMPORTED_MODULE_1__.sjcl.mode[mode].decrypt(cipher, bytesToBits(ct), bytesToBits(params.iv), bytesToBits(params.additionalData), params.tagSize);
            return new Uint8Array(bitsToBytes(pt));
        }
        catch (e) {
            throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.DECRYPTION_FAILED);
        }
    },
    async encrypt(key, pt, params) {
        if (params.algorithm !== "AES-CCM") {
            throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.INVALID_ENCRYPTION_PARAMS);
        }
        // Only AES and CCM are supported
        const algorithm = "aes";
        const mode = "ccm";
        try {
            const cipher = new _vendor_sjcl__WEBPACK_IMPORTED_MODULE_1__.sjcl.cipher[algorithm](bytesToBits(key));
            var ct = _vendor_sjcl__WEBPACK_IMPORTED_MODULE_1__.sjcl.mode[mode].encrypt(cipher, bytesToBits(pt), bytesToBits(params.iv), bytesToBits(params.additionalData), params.tagSize);
            return new Uint8Array(bitsToBytes(ct));
        }
        catch (e) {
            throw new _error__WEBPACK_IMPORTED_MODULE_0__.Err(_error__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.ENCRYPTION_FAILED);
        }
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SJCLProvider);


/***/ }),

/***/ "../core/src/storage.ts":
/*!******************************!*\
  !*** ../core/src/storage.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Storable": () => (/* binding */ Storable),
/* harmony export */   "VoidStorage": () => (/* binding */ VoidStorage),
/* harmony export */   "MemoryStorage": () => (/* binding */ MemoryStorage)
/* harmony export */ });
/* harmony import */ var _encoding__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./encoding */ "../core/src/encoding.ts");
/* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./error */ "../core/src/error.ts");


/**
 * Base class for objects intended to be used in conjunction with an
 * implementation of the [[Storage]] interface.
 */
class Storable extends _encoding__WEBPACK_IMPORTED_MODULE_0__.Serializable {
}
class VoidStorage {
    async save(_obj) { }
    async get(_cls, _id) {
        throw new _error__WEBPACK_IMPORTED_MODULE_1__.Err(_error__WEBPACK_IMPORTED_MODULE_1__.ErrorCode.NOT_FOUND);
    }
    async delete(_obj) { }
    async clear() { }
    async list(_cls, _opts) {
        return [];
    }
}
/**
 * Basic in-memory storage. Useful for testing purposes
 */
class MemoryStorage {
    constructor() {
        this._storage = new Map();
    }
    async save(obj) {
        this._storage.set(`${obj.kind}_${obj.id}`, obj.toRaw());
    }
    async get(cls, id) {
        const res = cls instanceof Storable ? cls : new cls();
        const raw = this._storage.get(`${res.kind}_${id}`);
        if (!raw) {
            throw new _error__WEBPACK_IMPORTED_MODULE_1__.Err(_error__WEBPACK_IMPORTED_MODULE_1__.ErrorCode.NOT_FOUND);
        }
        return res.fromRaw(raw);
    }
    async delete(obj) {
        this._storage.delete(`${obj.kind}_${obj.id}`);
    }
    async clear() {
        this._storage.clear();
    }
    async list(cls, { offset = 0, limit = Infinity, filter } = {}) {
        const results = [];
        const iter = this._storage[Symbol.iterator]();
        let value;
        let done;
        while ((({
            value: [, value],
            done
        } = iter.next()),
            !done && results.length < limit)) {
            const item = new cls().fromRaw(value);
            if (!filter || filter(item)) {
                if (!filter || filter(item)) {
                    if (offset) {
                        offset--;
                    }
                    else {
                        results.push(item);
                    }
                }
            }
        }
        return results;
    }
}


/***/ }),

/***/ "../core/src/stub-crypto-provider.ts":
/*!*******************************************!*\
  !*** ../core/src/stub-crypto-provider.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "StubCryptoProvider": () => (/* binding */ StubCryptoProvider)
/* harmony export */ });
/* harmony import */ var _encoding__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./encoding */ "../core/src/encoding.ts");
/* harmony import */ var _error__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./error */ "../core/src/error.ts");


/**
 * StubCryptoProvider is a stub implementation of the [[CryptoProvider]]
 * interface mainly used for testing. All methods merely emulate the behavior
 * of an actual implementation in a way that makes it compatible for use
 * with the rest of the **@padloc/core** package. Needless to say, this
 * class is **NOT SECURE AND SHOULD NEVER BE USED IN A PRODUCTION ENVIRONMENT**.
 */
class StubCryptoProvider {
    async randomBytes(n) {
        const bytes = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            bytes[i] = Math.random() * 255;
        }
        return bytes;
    }
    async hash(input, _params) {
        return input.slice(0, 32);
    }
    async generateKey(params) {
        switch (params.algorithm) {
            case "AES":
            case "HMAC":
                return this.randomBytes(params.keySize / 8);
            case "RSA":
                const key = await this.randomBytes(32);
                return {
                    publicKey: key,
                    privateKey: key
                };
        }
    }
    async deriveKey(password, params) {
        const bytes = new Uint8Array(params.keySize);
        bytes.set((0,_encoding__WEBPACK_IMPORTED_MODULE_0__.concatBytes)([password, params.salt]));
        return bytes.slice(0, 32);
    }
    async encrypt(key, data, params) {
        switch (params.algorithm) {
            case "AES-GCM":
                return (0,_encoding__WEBPACK_IMPORTED_MODULE_0__.concatBytes)([key, params.iv, params.additionalData, data]);
            case "RSA-OAEP":
                return (0,_encoding__WEBPACK_IMPORTED_MODULE_0__.concatBytes)([key, data]);
            default:
                throw new _error__WEBPACK_IMPORTED_MODULE_1__.Err(_error__WEBPACK_IMPORTED_MODULE_1__.ErrorCode.NOT_SUPPORTED);
        }
    }
    async decrypt(key, data, params) {
        if (params.algorithm.startsWith("AES")) {
            params = params;
            const keyLength = key.length;
            const ivLength = params.iv.length;
            const adataLength = params.additionalData.length;
            const extractedKey = data.slice(0, keyLength);
            const iv = data.slice(keyLength, keyLength + ivLength);
            const adata = data.slice(keyLength + ivLength, keyLength + ivLength + adataLength);
            if (!(0,_encoding__WEBPACK_IMPORTED_MODULE_0__.equalBytes)(key, extractedKey) || !(0,_encoding__WEBPACK_IMPORTED_MODULE_0__.equalBytes)(iv, params.iv) || !(0,_encoding__WEBPACK_IMPORTED_MODULE_0__.equalBytes)(adata, params.additionalData)) {
                throw new _error__WEBPACK_IMPORTED_MODULE_1__.Err(_error__WEBPACK_IMPORTED_MODULE_1__.ErrorCode.DECRYPTION_FAILED);
            }
            return data.slice(keyLength + adataLength + ivLength);
        }
        else {
            const keyLength = key.length;
            const extractedKey = data.slice(0, keyLength);
            if (!(0,_encoding__WEBPACK_IMPORTED_MODULE_0__.equalBytes)(key, extractedKey)) {
                throw new _error__WEBPACK_IMPORTED_MODULE_1__.Err(_error__WEBPACK_IMPORTED_MODULE_1__.ErrorCode.DECRYPTION_FAILED);
            }
            return data.slice(keyLength);
        }
    }
    async fingerprint(key) {
        return key;
    }
    async sign(key, data, _params) {
        return (0,_encoding__WEBPACK_IMPORTED_MODULE_0__.concatBytes)([key, data]);
    }
    async verify(key, signature, data, _params) {
        const keyLength = key.length;
        const extractedKey = signature.slice(0, keyLength);
        const extractedData = signature.slice(keyLength);
        return (0,_encoding__WEBPACK_IMPORTED_MODULE_0__.equalBytes)(key, extractedKey) && (0,_encoding__WEBPACK_IMPORTED_MODULE_0__.equalBytes)(data, extractedData);
    }
}


/***/ }),

/***/ "../locale/src/translate.ts":
/*!**********************************!*\
  !*** ../locale/src/translate.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "setDefaultLanguage": () => (/* binding */ setDefaultLanguage),
/* harmony export */   "getDefaultLanguage": () => (/* binding */ getDefaultLanguage),
/* harmony export */   "loadLanguage": () => (/* binding */ loadLanguage),
/* harmony export */   "resolveLanguage": () => (/* binding */ resolveLanguage),
/* harmony export */   "translate": () => (/* binding */ translate)
/* harmony export */ });
const loadLanguagePromises = new Map();
const languages = new Map();
let defaultLanguage = "en";
function setDefaultLanguage(lang) {
    defaultLanguage = lang;
}
function getDefaultLanguage() {
    return defaultLanguage;
}
async function loadLanguage(lang, setDefault = true) {
    lang = lang.toLowerCase();
    if (loadLanguagePromises.has(lang)) {
        return loadLanguagePromises.get(lang);
    }
    const promise = (async () => {
        try {
            const { default: items } = await __webpack_require__("../locale/res/translations lazy recursive ^\\.\\/.*\\.json$")(`./${lang}.json`);
            languages.set(lang, new Map(items));
            if (setDefault) {
                defaultLanguage = lang;
            }
        }
        catch (e) {
            const dashIndex = lang.lastIndexOf("-");
            if (dashIndex !== -1) {
                return loadLanguage(lang.substring(0, dashIndex));
            }
            else {
                throw e;
            }
        }
    })();
    loadLanguagePromises.set(lang, promise);
    return promise;
}
/**
 * Resolves a given locale string to the approprivate available language
 */
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
/**
 * Translate `msg` into the current language. The message can contain simple numbered
 * placeholders that are substituted after translation with the corresponding arguments
 * passed after `msg`. E.g:
 *
 * ```ts
 * translate("Hello! My name is {0}. I am from {1}. How are you?", name, country);
 * ```
 */
function translate(msg, ...fmtArgs) {
    // Choose translations for current language
    const lang = languages.get(defaultLanguage);
    // Look up translation. If no translation is found, use the original message.
    let res = (lang && lang.get(msg)) || msg;
    // Replace placeholders with function arguments
    for (let i = 0; i < fmtArgs.length; i++) {
        res = res.replace(new RegExp(`\\{${i}\\}`, "g"), fmtArgs[i]);
    }
    return res;
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".chunk.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "@padloc/pwa:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			;
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"main": 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						} else installedChunks[chunkId] = 0;
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkIds[i]] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk_padloc_pwa"] = self["webpackChunk_padloc_pwa"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _padloc_core_src_platform__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @padloc/core/src/platform */ "../core/src/platform.ts");
/* harmony import */ var _padloc_app_src_lib_platform__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @padloc/app/src/lib/platform */ "../app/src/lib/platform.ts");


(async () => {
    (0,_padloc_core_src_platform__WEBPACK_IMPORTED_MODULE_0__.setPlatform)(new _padloc_app_src_lib_platform__WEBPACK_IMPORTED_MODULE_1__.WebPlatform());
    await Promise.all(/*! import() */[__webpack_require__.e("vendors-app_node_modules_autosize_src_autosize_js-app_node_modules_lit-element_lit-element_js-188e3a"), __webpack_require__.e("app_src_elements_app_ts")]).then(__webpack_require__.bind(__webpack_require__, /*! @padloc/app/src/elements/app */ "../app/src/elements/app.ts"));
    window.onload = () => {
        const app = document.createElement("pl-app");
        document.body.appendChild(app);
    };
})();

})();

/******/ })()
;
//# sourceMappingURL=main.js.map