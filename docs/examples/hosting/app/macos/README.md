# macOS Example

This is a basic example of how to build a macOS app for a self-hosted version of
Padloc.

It's extrapolated from the
[Build Electron GitHub Action](/.github/workflows/build-electron.yml), which
does it automatically for the SaaS version of Padloc.

This example assumes you already have `Node` and `NPM` installed.

## Setup Instructions

1. Clone or download [this repository](/) and `cd` into it.
2. Install the dependencies and build an unsigned macOS app, pointing to your
   web app (via `PL_PWA_URL` variable):

    ```sh
    npm ci && PL_PWA_URL=https://example.com CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build
    ```

That's it! You should now have a `.dmg` file in `packages/electron/dist/` you
can install on your macOS devices.
