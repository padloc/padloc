# Linux Example

This is a basic example of how to build a Linux app for a self-hosted version of
Padloc.

It's extrapolated from the
[Build Electron GitHub Action](/.github/workflows/build-electron.yml), which
does it automatically for the SaaS version of Padloc.

This example assumes you already have `Node` and `NPM` installed.

## Setup Instructions

1. Clone or download [this repository](/) and `cd` into it.
2. Install the dependencies and build an unsigned Linux app, pointing to your
   web app (via `PL_PWA_URL` variable):

    ```sh
    npm ci && PL_PWA_URL=https://example.com npm run electron:build
    ```

That's it! You should now have a few different files in
`packages/electron/dist/` (depending on your system, but at least `.AppImage`
and potentially `.deb` or `.rpm`) you can install on your Linux devices.
