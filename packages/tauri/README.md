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

All iOS builds on this experiment branch use the separate bundle identifier
`app.padloc.tauri.ios-test` and display name **Padloc iOS Test**, supplied by
`tauri.ios.conf.json` and `Info.ios.plist`. This allows side-by-side installation
with production Padloc and keeps the app container and default Keychain access
group separate. Verify the built app's `CFBundleIdentifier` before installing on
a physical device. Existing simulator installs under `app.padloc` are not upgraded
by this test identity. Desktop bundle identifiers are unchanged.

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
PL_DATA_BACKEND=memory PL_EMAIL_BACKEND=console PL_DIRECTORY_SCIM_PORT=5001 PL_AUTH_TYPES=email,totp,public_key npm run server:start
```

Email verification codes appear in that terminal. Data disappears when the server
stops. Use test accounts only
while evaluating the experimental wrapper.

The scripts select `/Applications/Xcode.app/Contents/Developer` for Xcode child
processes without changing the system toolchain selection. Set `PADLOC_XCODE_DIR`
if Xcode is installed elsewhere. Desktop update installation and menus are
excluded from mobile. Native autofill is not provided by this experiment.
On Xcode 27, open Device Hub to interact with the simulator.

Validated locally: unsigned debug build for `aarch64-apple-ios-sim`, installed
and launched on iPhone 18 Pro / iOS 27.0; welcome screen rendered successfully.
Physical-device behavior is not yet tested.

For a later physical iPhone run, configure an Apple development team and signing
in the generated Xcode project, enable Developer Mode on the phone, and use a
backend reachable from it (`localhost` on an iPhone refers to the phone itself).

For a signed device debug build after Xcode account/team setup:

```sh
APPLE_DEVELOPMENT_TEAM=YOUR_TEAM_ID PL_SERVER_URL=http://YOUR_MAC_LAN_IP:3000 npm run ios:build:device --workspace @padloc/tauri
```

Use the same network as the Mac and test accounts only. The experimental iOS
plist permits local-network HTTP for this temporary backend and explains the
local-network permission prompt. It does not enable arbitrary internet HTTP.
Allow local-network access on the phone when testing this backend. Check the
device `.app` identifier and signing entitlements before installation; it must
be `app.padloc.tauri.ios-test`, with no production Keychain access group.

Device setup (2026-10-22): signed debug archive and IPA built successfully,
the separate test app installed on iPhone 16e / iOS 26.6.2, and launch was
confirmed by Xcode device services. Interactive device authentication and
background-security checks remain to be completed.

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

All iOS resume reconciliation lives in `src/background-lock.ts` and
`src/lifecycle.ts`. After reconciling the native timestamp, Tauri dispatches the
existing generic `resume` event to restart the shared foreground inactivity
timer. The app package's auto-lock mixin is unchanged from main; it has no
Tauri-specific event or native-cover logic. The remaining shared clipboard and
QR dialog changes are platform-independent error handling and race fixes.

The configured auto-lock toggle and timeout remain authoritative. The cover is
shown even if auto-lock is disabled; it does not itself lock the vault and does
not prevent user-initiated screenshots while the app is active. This implementation
targets the current single-webview iOS app; Android and additional app windows
need their own native lifecycle handling.

Run `node packages/tauri/test/background-security.cjs` from the repository root
for background timeout, disabled/already-locked, zero-delay, in-flight sync and
native timestamp regression checks.
Run `node packages/tauri/test/lifecycle.cjs` for lock-before-uncover ordering,
the generic resume event and failure handling that keeps the cover in place.

Simulator validation (iPhone 18 Pro, iOS 27.0): blank app-switcher snapshot,
short background return kept vault unlocked, and a visit exceeding the configured
one-minute timeout returned to the unlock screen. Physical-device lock-screen,
Control Center and interruption cases still need testing.

### Experimental iOS biometric unlock

The iOS adapter uses Padloc's existing public-key authentication protocol. A
32-byte encryption key is stored in Keychain using
`kSecAttrAccessibleWhenUnlockedThisDeviceOnly` and
`kSecAccessControlBiometryCurrentSet`. Reading the key requires native biometric
authentication. A fresh biometric-only policy check precedes each read and its
context is passed to Keychain; a prompt success by itself cannot unlock the vault.
The key does not sync or migrate to other devices. Changes to biometric
enrollment invalidate access and require setup again using the master password.
No device-passcode fallback is configured. Desktop authentication is unchanged.

The Keychain service is separate from Cordova's; existing Cordova biometric
enrollment is not migrated. Disabling unlock revokes the server authenticator
and forgets the locally wrapped master key; the protected native key may remain
until the next successful setup replaces it.

`bundle.iOS` adds LocalAuthentication and the Face ID usage description. When
updating an existing generated project, Tauri preserves `gen/apple/project.yml`;
back it up and regenerate it if the framework is missing. Simulator builds use
the local Xcode wrapper to embed the simulator application identifier in the
Mach-O entitlement section. This simulator-only identifier is not a substitute
for an Apple development team or provisioning profile on physical devices.

Run `node packages/tauri/test/biometric.cjs` for adapter encoding, error mapping,
iOS routing and desktop fallback checks. Native Keychain ACLs and physical
Face ID/Touch ID behavior require device validation.

Simulator validation (2026-10-22, iPhone 18 Pro / iOS 27.0, local backend):
signup, biometric setup, fresh-process public-key unlock with a simulated Face ID
match, interruption cancellation leaving the vault locked, and subsequent
master-password recovery passed. The
simulator did not enforce a prompt on Keychain reads alone, so the bridge also
requires a fresh native biometric policy check. Enrollment-change invalidation,
lockout, passcode changes, backup/restore and real Keychain ACL enforcement still
need physical-device checks; simulator success does not establish those guarantees.

### Native clipboard

The Tauri adapter uses the official `clipboard-manager` 2.5 plugin for native
text reads and sensitive-text writes. On iOS, sensitive writes use a local-only
pasteboard item, excluding Universal Clipboard sync. Only text read and
sensitive-text write commands are allowed, for the main window. Image, HTML,
and ordinary text-write commands are not granted.

Padloc's existing foreground countdown still clears by overwriting the clipboard
with a single space. The adapter serializes native operations so a slow copy
cannot finish after a later clear/new copy. Native errors propagate to callers,
and a failed operation does not block later requests. Empty/non-text clipboard
and denied paste access may reject according to the native plugin.

This does not add native expiration: iOS may suspend JavaScript countdowns in the
background. Exact expiry while suspended, external-app paste permissions and
cross-device sync behavior remain physical-device validation items. The shared
clipboard UI now waits for copy/clear completion, reports failures without
displaying a false success, and leaves failed clears visible for retry. A failed
replacement preserves the earlier copy's countdown; a successful replacement
starts a fresh countdown and settles the earlier request.

Deferred follow-up: expose iOS pasteboard item expiration at write time, keeping
the local-only option, through a small native bridge or an upstream plugin
extension. This is an implementation task, not just an outstanding device test.

Run `node packages/tauri/test/clipboard.cjs` for ordering, Unicode round-trip,
countdown overwrite, failure/recovery, adapter routing and capability checks.
Run `node packages/tauri/test/clipboard-ui.cjs` for shared UI expiry boundaries,
countdown replacement, pending-copy cancellation, failure/retry and simulated
webview suspension/resume.
See the [official plugin reference](https://v2.tauri.app/reference/javascript/clipboard-manager/).

Simulator smoke test (2026-10-22, iPhone 18 Pro / iOS 27.0): copied synthetic
generator text and confirmed its exact native pasteboard contents; after the
60-second foreground countdown, the native pasteboard contained only the
clearing space. Manual clear also removed the copied text. Repeated these checks
on the final shared-UI build. Backgrounding for over 60 seconds retained the text
while suspended; resuming cleared it and dismissed the banner. This confirms the
native-expiration gap, rather than validating background expiry. The final build
also had an unusually slow initial launch before reaching the unlock screen;
the cause has not been established. No physical-device clipboard checks were
performed. iOS simulator build, macOS Rust compile check, clipboard adapter/UI
tests, biometric adapter tests and six background-security scenarios passed.

### Native QR scanner

iOS uses the official barcode-scanner 2.5.3 plugin; desktop retains the existing
web scanner. The native adapter restricts detection to QR codes, uses the back
camera and places the preview behind Padloc's existing transparent scan dialog.
It checks/requests camera access only when scanning, with an iOS usage description
and an iOS-only main-window capability for scan, cancel and permission commands.
Denied permission reports that camera access can be enabled in Settings.

Cancellation during permission requests prevents a later camera start. Reopening
waits for the previous native cancellation and appearance cleanup. Successful
scans avoid a redundant native cancel; the plugin tears down the successful scan.
The shared dialog ignores results/errors from a scan closed by the user, so a
cancelled scan cannot show a spurious error or close a newer dialog.

Run `node packages/tauri/test/qr.cjs` and
`node packages/tauri/test/qr-dialog.cjs` for mocked QR results, permission flows,
cancel/reopen ordering, appearance restoration and dialog lifecycle checks.
The simulator has no camera: actual decoding, preview alignment, denied/granted
permission transitions and capture teardown require physical iPhone validation.
See the [official scanner documentation](https://v2.tauri.app/plugin/barcode-scanner/).

Validation (2026-10-22): iOS simulator build and macOS Rust compile check passed.
In the simulator, opening the authenticator field's QR control displayed the
camera usage prompt. Granting it produced the native no-camera error, closed
the scanner and restored the item form. The final build displayed the readable
native error message. Adapter/dialog tests and clipboard/biometric/background
regressions passed. This does not validate camera decoding. The scanner header
also needs safe-area review in the planned mobile UI pass: it appeared close to
the status bar while the permission prompt was visible.
