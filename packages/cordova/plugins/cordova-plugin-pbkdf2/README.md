# PBKDF2 Cordova Plugin

This plugin provides a javascript interface for native implementations of the
[PBKDF2](https://www.ietf.org/rfc/rfc2898.txt) algorithm on iOS and Android.

The iOS implementation uses the `CommonCrypto` module while the Android implemenation
uses [https://github.com/m9aertner/PBKDF2](https://github.com/m9aertner/PBKDF2)

## Installation

Simply add through the cordova cli:

```sh
cordova plugin add cordova-plugin-pbkdf2
```

## Usage

The plugin adds the `pbkdf2` function to the global scope:

```js
pbkdf2(
    "password", // the password
    "X1oXfKeBOw08ahdSFjeP2Q==", // Base64-encoded salt
    {
        iterations: 100000, // number of iterations to be used (default: 10000)
        keySize: 512, // desired key size (supported values: 256, 512, default: 256)
    },
    (key) => console.log(key), // Success callback. Single argument is the Base64-encoded derived key
    (err) => console.error(err), // Error callback
);
```

The function also returns a promise if the `Promise` constructor is found. Otherwise it returns `undefined`.
