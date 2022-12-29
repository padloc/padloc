# Edge Example

This is a basic example of how to build an Edge extension for a self-hosted
version of Padloc.

It's extrapolated from the
[Build Web Extension GitHub Action](/.github/workflows/build-web-extension.yml),
which does it automatically for the SaaS version of Padloc.

This example assumes you already have `Node` and `NPM` installed.

## Setup Instructions

0. Make sure you
   [setup your Edge browser to install unsigned/unpacked extensions](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading).
1. Clone or download [this repository](/) and `cd` into it.
2. Install the dependencies and build an unsigned web extension directory,
   pointing to your server (via `PL_SERVER_URL` variable):

    ```sh
    npm ci && PL_SERVER_URL=https://example.com/server/ npm run web-extension:build
    ```

That's it! You should now have a directory with the unsigned extension in in
`packages/extension/dist` you can ZIP or directly install on your Edge browsers.
