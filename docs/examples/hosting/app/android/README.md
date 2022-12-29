# Android Example

This is a basic example of how to build an Android app for a self-hosted version
of Padloc.

It's extrapolated from the
[Build Cordova GitHub Action](/.github/workflows/build-cordova.yml), which does
it automatically for the SaaS version of Padloc.

This example assumes you already have `Node` and `NPM` installed.

## Setup Instructions

0. Install [Java (1.8)](https://www.java.com/en/download/) or
   [OpenJDK (11)](https://openjdk.org/install/).
1. Install [Android Studio](https://developer.android.com/studio/) and make sure
   you select, for the build tools to be installed, `Android API 30`,
   `Android SDK Build tools 30`, and `Android SDK CLI Tools`.
2. Install [Gradle (7.2)](https://gradle.org/install/).
3. Clone or download [this repository](/) and `cd` into it.
4. Install the dependencies and build an unsigned APK, pointing to your server
   (via `PL_SERVER_URL` variable):

    ```sh
    npm ci && PL_SERVER_URL=https://example.com/server/ npm run cordova:build:android
    ```

That's it! You should now have an `.apk` file in
`packages/cordova/platforms/android/app/build/` you can install on your Android
devices.
