# @padloc/tauri

Native cross-platform app, powered by
[Tauri](https://github.com/tauri-apps/tauri).

## Setup

The `@padloc/tauri` package is meant to be used from within the
[Padloc monorepo](../../README.md).

```sh
git clone git@github.com:padloc/padloc.git
cd padloc
npm ci
cd packages/tauri
```

You also need to follow
[Tauri's setup guide](https://v2.tauri.app/start/prerequisites/)

## Building

To build the app, run:

```sh
npm run build
```

The web assets are written to `dist`. Native installers and app bundles are
written to `src-tauri/target/release/bundle` (or
`target/<target>/release/bundle` when cross-compiling). Release builds require
`TAURI_SIGNING_PRIVATE_KEY` and optionally `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
for signed updater artifacts.

You can also build a debug version of the app, useful for - well - debugging:

```sh
npm run build:debug
# macOS app bundle only (skip DMG packaging):
npm run build:debug -- --bundles app
```

Debug bundles are written to `src-tauri/target/debug/bundle`. The local config
disables updater artifact signing, so no production signing key is needed.
Install a stable Rust toolchain before building. Linux requires WebKitGTK 4.1
and the system packages listed in `.github/workflows/build-tauri.yml`.

### Build options

All build options are provided as environment variables:

| Variable Name   | Description                                        | Default                 |
| --------------- | -------------------------------------------------- | ----------------------- |
| `PL_SERVER_URL` | URL to the [server component](../server/README.md) | `http://localhost:3000` |

## Releasing and updates

The `Publish Release` workflow builds signed bundles for Intel/Apple Silicon
macOS, Linux x86_64, and Windows x86_64. Each build stages its installers,
updater archive, signature, and checksums. The publish job validates and merges
all four manifest fragments, uploads the bundles, then uploads
`tauri-update.json` last. A failed or incomplete build does not publish a new
update feed.

The workflow maps the existing `TAURI_PRIVATE_KEY` and `TAURI_KEY_PASSWORD`
GitHub secrets to Tauri 2's `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` environment variables. Keep the existing
signing key: installed apps verify updates against its public key. macOS release
signing/notarization also uses the configured Apple certificate, identity,
account, and team secrets.

`createUpdaterArtifacts` uses `v1Compatible` while migrating existing installs.
The feed includes Tauri 2 architecture keys and legacy platform aliases; its
signatures contain the actual `.sig` contents. Switch to native v2 archives only
after the v1 migration window, updating the staging helper accordingly. Releases
start as prereleases. After the complete feed is uploaded, Production releases
are promoted to stable; Beta releases remain prereleases and are not advertised
by the stable `/releases/latest/` updater endpoint.

To stage a platform's signed build manually:

```sh
PL_VENDOR_VERSION=4.4.0 node generate-tauri-update-file.js stage darwin-aarch64 src-tauri/target/release/bundle release-artifacts
# After collecting all four platforms into release-artifacts:
PL_VENDOR_VERSION=4.4.0 node generate-tauri-update-file.js merge release-artifacts tauri-update.json
npm run test:release
```

For unattended macOS packaging, `CI=true npm run build:debug` uses Tauri's CI
DMG mode, which skips Finder window customization. The `Build Tauri` workflow
also checks that each native executable stays running on its matching runner;
Linux runs under Xvfb. These startup checks do not replace interactive tests of
login, vault operations, or device integrations.

## Development

For rapid development, there is also dev mode:

```sh
npm run dev
```

## Contributing

For info on how to contribute to Padloc, please refer to the
[monorepo readme](../../README.md#contributing).


## Experimental iOS build

Use Node 26.12.0 / npm 11.20.0 and full Xcode with an installed iOS simulator.
Install CocoaPods and XcodeGen (`brew install cocoapods xcodegen`), then
`rustup target add aarch64-apple-ios aarch64-apple-ios-sim`.

From the repository root:

```sh
npm ci
npm run ios:init --workspace @padloc/tauri -- --ci
npm run ios:build:sim --workspace @padloc/tauri
npm run ios:dev --workspace @padloc/tauri
```

The simulator build uses bundled web assets and does not require an Apple signing
certificate. `ios:dev` starts the web development server and lets you select a
simulator. The default backend is `http://localhost:3000`; start a local test
backend separately or set `PL_SERVER_URL` before building. For an in-memory local backend:

```sh
PL_DATA_BACKEND=memory PL_EMAIL_BACKEND=console PL_DIRECTORY_SCIM_PORT=5001 npm run server:start
```

Email verification codes appear in that terminal. Data disappears when the server
stops. Use test accounts only
while evaluating the experimental wrapper.

The scripts select `/Applications/Xcode.app/Contents/Developer` for Xcode child
processes without changing the system toolchain selection. Set `PADLOC_XCODE_DIR`
if Xcode is installed elsewhere. Desktop update installation and menus are
excluded from mobile. Native autofill and biometric integration are not provided
by this experiment. On Xcode 27, open Device Hub to interact with the simulator.

Validated locally: unsigned debug build for `aarch64-apple-ios-sim`, installed
and launched on iPhone 18 Pro / iOS 27.0; welcome screen rendered successfully.
Physical-device behavior is not yet tested.

For a later physical iPhone run, configure an Apple development team and signing
in the generated Xcode project, enable Developer Mode on the phone, and use a
backend reachable from it (`localhost` on an iPhone refers to the phone itself).

Smoke test (2026-10-21, local in-memory backend): email verification and
throwaway account signup succeeded; created a website login item, edited its
title, saved it, locked the vault, and unlocked with the generated master
passphrase. The edited item and its fields remained visible after unlocking.
No blocking app errors were observed in these flows. Attachments, native autofill,
biometrics, offline/relaunch behavior, and physical iPhone runs remain untested.


### iOS background security

The native cover in `src-tauri/native/privacy.m` masks the app window before
UIKit captures an inactive/background snapshot. It handles application and scene
notifications for the main webview. Activation asks the app to reconcile the
native background timestamp with the configured auto-lock delay. The cover stays
until that check, any required lock, and rendering have completed. A generation
check prevents a delayed response from uncovering a newer background visit.
If reconciliation fails, the cover stays up. If a sync is in flight when locking
is due, the cover stays up until sync settles and the vault is locked.

The configured auto-lock toggle and timeout remain authoritative. The cover is
shown even if auto-lock is disabled; it does not itself lock the vault and does
not prevent user-initiated screenshots while the app is active. This implementation
targets the current single-webview iOS app; Android and additional app windows
need their own native lifecycle handling.

Run `node packages/tauri/test/background-security.cjs` from the repository root
for background timeout, disabled/already-locked, zero-delay, in-flight sync and
native timestamp regression checks.

Simulator validation (iPhone 18 Pro, iOS 27.0): blank app-switcher snapshot,
short background return kept vault unlocked, and a visit exceeding the configured
one-minute timeout returned to the unlock screen. Physical-device lock-screen,
Control Center and interruption cases still need testing.
