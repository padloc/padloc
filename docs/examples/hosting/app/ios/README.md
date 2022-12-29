# iOS Example

This is a basic example of how to build an iOS app for a self-hosted version of
Padloc.

It's extrapolated from the
[Build Cordova GitHub Action](/.github/workflows/build-cordova.yml), which does
it automatically for the SaaS version of Padloc.

This example assumes you already have `Node` and `NPM` installed.

## Setup Instructions

0. Install [Xcode (13.2+)](https://developer.apple.com/xcode/resources/).
1. Clone or download [this repository](/) and `cd` into it.
2. Install the dependencies and build an unsigned IPA, pointing to your server
   (via `PL_SERVER_URL` variable):

    ```sh
    npm ci && PL_SERVER_URL=https://example.com/server/ npm run cordova:build:ios
    ```

That's it! You should now have an `.ipa` file in
`packages/cordova/platforms/ios/build/` you can install on your iOS devices.
