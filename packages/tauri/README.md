# @padloc/tauri (experimental)

Cross-platform native app builder for Padloc, powered by [Tauri](https://github.com/tauri-apps/tauri).

## How To Use

1. Follow the steps described in the [Getting
   Started](https://github.com/padloc/padloc/blob/master/README.md#getting-started)
   section of repo readme.

2. Follow Tauri's [setup guide](https://tauri.studio/docs/getting-started/intro/#setting-up-your-environment) for your platform.

3. Build the app:

    ```sh
    cd packages/tauri
    npm run build
    ```

    Don't forget to set the server url [configuration
    variable](https://github.com/padloc/padloc/blob/master/README.md#configuration).
    For example, if you want the app to connect to the official Padloc server:

    ```sh
    PL_SERVER_URL=https://api.padloc.app npm run build
    ```

## TODOs

Initial tests look very promising. Some things that still need figuring out.

-   [ ] **Persistent Storage**: Using IndexedDB doesn't work here for various reasons. Best option is
        probably writing a simple storage backend using Tauri's [file system api](https://tauri.studio/docs/api/js#file-system).
-   [ ] **Copy & Paste**: Doesn't work out of the box. Figure out steps to make it work.
-   [ ] **Auto-updating**: Must-have feature for desktop apps at least those not distributed through app stores or package managers. Not available in Tauri yet, but apparently on the roadmap.
-   [ ] **Code-signing**: Also on Tauri's roadmap, but not available yet
-   [ ] **Run without the embedded web server**: Would be the safer choice security-wise but doesn't seem to work as-is. Need to figure out what changes are needed to make it work.
-   [ ] **Mobile**: Waiting for Tauri to support Android and iOS builds, which could potentially replace Cordova.
