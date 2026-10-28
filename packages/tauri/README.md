# @padloc/tauri

Padloc's desktop and mobile app wrapper, built with
[Tauri 2](https://v2.tauri.app/). Run the commands below from the repository
root.

## Prerequisites

-   Node.js and npm versions specified by `.nvmrc` and the root `package.json`.
-   A stable Rust toolchain installed with rustup.
-   The
    [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/)
    for the operating system you are building on.

```sh
nvm use
npm ci
```

Native projects and build outputs are generated locally and are not committed.

## Backend configuration

Set `PL_SERVER_URL` when starting development or building. It is embedded in the
web assets; changing it requires restarting development or rebuilding the app.
The default is `http://localhost:3000`.

```sh
PL_SERVER_URL=https://web.padloc.app/server npm run build --workspace @padloc/tauri
```

To run a disposable local backend with console email verification codes:

```sh
PL_DATA_BACKEND=memory PL_ATTACHMENTS_BACKEND=memory PL_EMAIL_BACKEND=console PL_DIRECTORY_SCIM_PORT=5001 PL_AUTH_TYPES=email,totp,public_key npm run server:start
```

Data and attachments disappear when this server stops. See the
[server README](../server/README.md) for persistent storage and other settings.

Mobile devices need an address they can reach:

| Target                                                | Local backend URL             |
| ----------------------------------------------------- | ----------------------------- |
| Desktop or iOS simulator                              | `http://localhost:3000`       |
| Android emulator                                      | `http://10.0.2.2:3000`        |
| Android device with USB forwarding                    | `http://127.0.0.1:3000`       |
| iPhone on the same network as the development machine | `http://YOUR_MAC_LAN_IP:3000` |

For an iPhone LAN connection, the backend must listen on a reachable interface;
allow local-network access when prompted. The iOS configuration permits local
HTTP networking. Android debug builds permit local HTTP; release builds require
HTTPS unless their native network policy is explicitly changed.

## Desktop

Build on the target operating system. Linux requires WebKitGTK 4.1 and the
system dependencies listed in `.github/workflows/build-tauri.yml`.

```sh
# Development with frontend hot reload:
npm run dev --workspace @padloc/tauri

# Debug bundle without updater signing credentials:
npm run build:debug --workspace @padloc/tauri

# macOS debug app only, without DMG packaging:
npm run build:debug --workspace @padloc/tauri -- --bundles app

# Release bundles:
npm run build --workspace @padloc/tauri
```

Frontend assets are written to `packages/tauri/dist`. Native bundles are under
`packages/tauri/src-tauri/target/debug/bundle` or `target/release/bundle`;
explicit Rust targets add a target-triple directory. `CARGO_TARGET_DIR`
overrides the target directory.

Release builds produce signed updater artifacts and require
`TAURI_SIGNING_PRIVATE_KEY`, with `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` when the
key is password-protected. Platform code signing and macOS notarization also
require the corresponding platform credentials. The debug configuration disables
updater artifact signing. For unattended macOS DMG packaging, set `CI=true`.

## iOS

Build on macOS with full Xcode, its command-line tools and the desired simulator
runtime installed. Install CocoaPods and XcodeGen, then add the Rust targets:

```sh
brew install cocoapods xcodegen
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
npm run ios:init --workspace @padloc/tauri -- --ci
```

The wrapper selects `/Applications/Xcode.app/Contents/Developer` without
changing the system Xcode selection. Set `PADLOC_XCODE_DIR` for a different
installation.

### Simulator

```sh
PL_SERVER_URL=http://localhost:3000 npm run ios:build:sim --workspace @padloc/tauri
PL_SERVER_URL=http://localhost:3000 npm run ios:dev --workspace @padloc/tauri
```

The build command produces an unsigned ARM64 simulator app using bundled web
assets; no development certificate is required. Development mode lets you select
a simulator and uses the frontend development server.

### iPhone or iPad

Sign in to Xcode, select an Apple development team, connect and trust the
device, and enable Developer Mode on it. Automatic signing requires permission
to create or use a development certificate, register the device and create a
provisioning profile.

```sh
APPLE_DEVELOPMENT_TEAM=YOUR_TEAM_ID PL_SERVER_URL=https://web.padloc.app/server npm run ios:build:device --workspace @padloc/tauri
```

The generated Xcode project is in `packages/tauri/src-tauri/gen/apple`. Build
outputs are under its `build` directory; signed device builds export an IPA
under `build/arm64`. Use Xcode to install/run, or install the archived app using
Xcode's command-line tools:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun devicectl list devices
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun devicectl device install app --device DEVICE_ID packages/tauri/src-tauri/gen/apple/build/padloc_iOS.xcarchive/Products/Applications/Padloc.app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun devicectl device process launch --device DEVICE_ID app.padloc
```

iOS uses the production identifier `app.padloc` and display name **Padloc**.
Installing a signed build with this identity updates the released app rather
than installing alongside it. These settings live in
`src-tauri/tauri.ios.conf.json` and `src-tauri/Info.ios.plist`.

## Android

Install Android Studio or Java 21, Android SDK command-line tools, platform
tools, SDK platforms/build tools 36 and 37, and the NDK. For an emulator, also
install a system image and create an AVD in Android Studio's Device Manager.

```sh
rustup target add aarch64-linux-android
npm run android:init --workspace @padloc/tauri -- --ci
```

`scripts/android.sh` selects Android Studio's Java runtime or Homebrew Java 21,
defaults the SDK to `~/Library/Android/sdk`, and selects the newest installed
NDK. Override `JAVA_HOME`, `ANDROID_HOME` and `NDK_HOME` as needed. For example,
use `ANDROID_HOME` to select the SDK path on Linux or Windows development hosts
with a compatible shell. These settings affect the invocation, not shell
profiles.

The wrapper also copies the tracked `android/MainActivity.kt` into the generated
project before build/dev. Use the npm scripts so system-bar insets and device
orientation handling are included after regenerating the native project.

### Emulator

Start an ARM64 emulator, then run:

```sh
PL_SERVER_URL=http://10.0.2.2:3000 npm run android:build:debug --workspace @padloc/tauri -- --ci
PL_SERVER_URL=http://10.0.2.2:3000 npm run android:dev --workspace @padloc/tauri
```

### Physical device

Enable Developer Options and USB debugging, connect the device, and authorize
the computer on the device. Use `adb` from the SDK's `platform-tools` directory:

```sh
adb devices
adb -s DEVICE_ID reverse tcp:3000 tcp:3000
PL_SERVER_URL=http://127.0.0.1:3000 npm run android:build:debug --workspace @padloc/tauri -- --ci
adb -s DEVICE_ID install -r packages/tauri/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
adb -s DEVICE_ID shell am start -W -n app.padloc/.MainActivity
```

USB forwarding may need to be reapplied after reconnecting. To use a remote
backend instead, set `PL_SERVER_URL` to its HTTPS URL when building.

The debug build script targets ARM64 and produces the APK shown above. For other
architectures or release builds, use the wrapper directly from `packages/tauri`,
for example `sh scripts/android.sh build --target aarch64 --apk --ci`, and
configure Android release signing before distribution.

The generated Gradle project lives in `packages/tauri/src-tauri/gen/android`.
Android uses the production identifier `app.padloc` and name **Padloc**.
Installing with this identity updates the released app and requires a compatible
signing certificate. These settings live in `src-tauri/tauri.android.conf.json`.
If an existing generated project uses a previous test identity, move
`src-tauri/gen/android` aside before running `android:init` again;
initialization does not remove sources generated under the old package name.

## Contributing

See the [monorepo contributing guide](../../README.md#contributing).
