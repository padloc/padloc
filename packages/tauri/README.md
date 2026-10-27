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

The native cover in `plugins/privacy-cover/ios/Sources/PrivacyCoverPlugin.swift` masks the app window before
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

### External links

The Tauri wrapper uses the official opener 2.7.2 plugin to hand external URLs
to the operating system's default application. The adapter, legacy `window.open`
compatibility shim and capture handler for links inside shadow DOM all live in
`src/links.ts`; no app-package changes are needed. Absolute and protocol-relative
links are intercepted, while relative routes and fragments retain app routing.
Protocol-relative links use HTTPS. Download links retain the existing download
flow. Email composition encodes the subject and body before invoking the opener.

Both the frontend and native capability restrict opening to HTTP, HTTPS, mailto
and tel. Credential-bearing URLs are rejected by the adapter. No file-opening,
file-reveal or shell permissions are granted. The plugin's automatic link
interceptor is disabled so the wrapper handles each click once. Failed launches
show a generic warning without including potentially sensitive URL contents.

Run `node packages/tauri/test/links.cjs` for scheme validation, native routing,
legacy calls, shadow-DOM links, internal navigation and error handling. Physical
iPhone testing of browser return, mail/tel handler availability and background
security during app switching remains deferred. On iOS the plugin acknowledges
dispatch without confirming that the target application actually handled it.

Validation (2026-10-22): iOS simulator build, macOS Rust compile check and link
adapter/regression tests passed. Tapping Support → Website in the iPhone 18 Pro
simulator opened `padloc.app` in Safari; returning restored the Support view
without a stuck privacy cover. Mail and telephone handoff were not device-tested.

### iOS file sharing and imports

`TauriPlatform.saveFile` presents the native iOS share sheet for vault exports,
ZIP exports and downloaded attachments. Desktop retains its existing download
flow. The Padloc adapter is `src/files.ts`; native sharing lives in
`plugins/file-sharing`; it exposes no filesystem path access to JavaScript.
Names must be plain filenames, and the experimental limit is 64 MiB per shared
file. The native sheet infers the file type from its extension.

Shares are serialized. Each export is staged in the app's private cache with
Complete file protection and backup exclusion. The file is removed after the
share sheet completes or is cancelled. App startup removes leftovers from a
terminated sharing session, and a new export refuses to proceed if stale files
cannot be removed. An iPad popover anchor is configured. Destination apps and
copies deliberately saved by the user manage their own data after sharing.

Imports and attachment uploads retain the existing HTML file inputs, which use
the iOS system picker in WKWebView. The only shared change is a generic `cancel`
handler so import selection resolves to null when dismissed. No iOS-specific
logic was added to the app package.

Run `node packages/tauri/test/files.cjs` and
`node packages/tauri/test/file-picker.cjs` for binary data, cancellation, name/size
validation, error recovery and file-selection regression checks. Physical iPhone
file protection, iCloud/provider behavior, other share destinations, interrupted
shares and iPad presentation still require validation.


### Physical iPhone validation — 2026-10-23

User-operated checks on iPhone 16e / iOS 26.6.2 with the local throwaway account:

- Biometric setup, fresh Face ID unlock, cancellation leaving the vault locked,
  master-password recovery, and Face ID unlock after terminating/relaunching passed.
- App-switcher privacy cover, return before the one-minute timeout, and locking
  after the timeout passed, with no stuck privacy cover.
- Native clipboard copy, foreground countdown clearing, and manual clearing passed.
  Native expiry while suspended remains deferred.
- A valid dummy TOTP QR scanned successfully. QR header safe-area padding was
  corrected and confirmed on the phone. Camera denial/revocation remains untested.
- Website handoff to Safari and return passed; mail/telephone handoff is untested.
- Share-sheet cancellation/reopening, CSV Save to Files and reimport, and attachment
  upload/download/save passed. The original share sheet rendered only 145 points
  wide despite a 390-point app window. Presentation-style/adaptation changes did
  not fix it. A temporary UIWindow initialized with the active UIWindowScene,
  removed on completion with the original key window restored, fixed presentation.

The QR safe-area rule is a generic shared layout fix; native sharing remains in
Tauri. Simulator checks also verified CSV save/import and removal of staged files
on cancellation/completion, including a checksum match for the saved export.
Hardware Keychain enrollment invalidation/lockout, file protection while locked,
iPad/rotation, other file providers/share destinations, interrupted sharing, and
large/encrypted/ZIP export UI paths still require targeted validation.


### Local native plugins

Native privacy protection, protected biometric storage and file sharing now live
in three independent local Tauri plugins under `plugins/`. Each owns its Rust
commands, iOS Swift and Android Kotlin implementations, native build setup,
TypeScript guest API and generated command permissions. The app registers them
with `.plugin(...)`; it no longer exposes these as app-level invoke commands.
The main mobile window receives only the six required command grants through
`src-tauri/capabilities/native-plugins.json`. Plugin defaults grant no commands.

- `privacy-cover`: install through the native WebView load hook, retain native pause
  timestamps/generations, emit resume notifications and wait for acknowledgment.
  Padloc's timeout/lock policy remains in `src/background-lock.ts` and
  `src/lifecycle.ts`. Native protection currently supports the single main WebView.
- `biometric-keystore`: availability and device-bound, current-enrollment
  Keychain storage/retrieval of a 32-byte key. The service identifier is unchanged,
  so this refactor does not require biometric re-enrollment. Padloc's public-key
  protocol and app error mapping remain in `src/biometric.ts` and core.
- `file-sharing`: validate/stage bytes, present the scene-based native sharing
  window and remove temporary files after completion/cancellation and at startup.
  Export formatting and user-facing error dialogs stay in the application adapter.

All three provide explicit unsupported implementations outside iOS/Android;
biometric availability returns false there. Android uses the same guest API and
Padloc policy, with platform-specific native protection described below.
There are no npm workspace/dependency changes: the wrapper imports local guest
sources directly, and Cargo resolves local plugin crates with path dependencies.
Do not publish these private packages without reviewing their API and guarantees.

Run `test/biometric.cjs`, `test/lifecycle.cjs` and `test/files.cjs` to exercise the
real guest bindings with mocked IPC and adapter behavior. The simulator harness
`test/plugin-smoke.ts` uses no account data: it checks every granted command using
availability/invalid requests, acknowledges native resumes, and opens a dummy file
share sheet. Build its frontend with `node test/build-plugin-smoke.cjs /absolute/tmp/output`
and a temporary Tauri frontend/config override; restore the normal generated iOS
project afterward. Physical-device revalidation of biometric enrollment/unlock and share/background
transitions is required after changes to native implementations.

Plugin refactor validation — 2026-10-26: adapter/regression tests and iOS/macOS
compilation passed. On the iOS 27 simulator, all six namespaced commands reached
their native implementations with the configured permissions; invalid biometric
and sharing requests were rejected before accessing secrets. The dummy share sheet
rendered at normal width and cancellation returned `completed=false`. Backgrounding
and reopening acknowledged a new native resume and removed the privacy cover.
These checks did not enroll biometrics or read account/vault data.

Physical plugin smoke check — 2026-10-26, iPhone 16e: user confirmed the
account-free harness passed command routing/validation, normal share-sheet
presentation and cancellation (`completed=false`), and Home Screen/reopen with
an increased privacy resume acknowledgment count. The harness was then replaced
in place by the full test app configured for `https://web.padloc.app/server`,
using `app.padloc.tauri.ios-test`. User also confirmed a fresh Face ID unlock successfully opened the vault
through the extracted biometric plugin in this full-app build.

### Experimental Android baseline

Android work lives on `codex/tauri-android`. The platform override uses
`app.padloc.tauri.androidtest` / **Padloc Android Test**, separate from released
Padloc and the iOS test app. Generated Gradle projects, SDKs, emulator images and
build outputs are not checked in.

Install Android Studio (or Java 21), Android SDK command-line tools,
platform/build tools, NDK and an ARM64 emulator image. Add the Rust target with
`rustup target add aarch64-linux-android`. The wrapper selects Android Studio's
bundled Java or Homebrew Java 21, defaults the SDK to `~/Library/Android/sdk`, and
selects the newest installed NDK. Set `JAVA_HOME`, `ANDROID_HOME` and `NDK_HOME`
explicitly to use other installations. It does not change shell profiles.

With the repository's Node 26 environment active:

```sh
npm run android:init --workspace @padloc/tauri -- --ci
PL_SERVER_URL=http://10.0.2.2:3000 npm run android:build:debug --workspace @padloc/tauri -- --ci
# Start a configured emulator first for an interactive development session:
PL_SERVER_URL=http://10.0.2.2:3000 npm run android:dev --workspace @padloc/tauri
```

For the emulator, `10.0.2.2` reaches a test backend running on the Mac at
`127.0.0.1:3000`. Use disposable local data and console email delivery; keep real
accounts out of baseline checks. Debug Android builds permit this local HTTP
connection; release builds retain the generated cleartext prohibition.

The three local plugins now have Android backends and mobile adapter routing.
Their six command grants apply only to the main mobile window. This is still
experimental: Android QR integration, full account/vault flows, physical-device
validation and upgrades from Cordova Android remain separate work. Use synthetic
data for initial emulator checks.

Android build validation — 2026-10-26: ARM64 debug APK built with Tauri CLI
2.12.3, Java 21, NDK 28.2.13676358 and Gradle 9.6.1. The generated app targets
API 37; the bundled Tauri/official plugin libraries also require API 36. Both
platforms and build-tools 36/37 are installed. APK metadata confirms
`app.padloc.tauri.androidtest`, label `Padloc Android Test`, minimum API 24 and
target API 37. Inspection of the APK's embedded compressed frontend assets
confirmed `http://10.0.2.2:3000` and no production backend URL. The disposable
backend uses in-memory storage/attachments, console email and loopback binding.
Emulator validation passed on the API 36 / Android 16 Google APIs ARM64 image,
using the `Padloc_Android_Test` Pixel 7 AVD. Installation and cold launch succeeded;
the user confirmed the welcome/login screen renders normally. The app process
remained alive, no AndroidRuntime crash was logged, and an emulator-side request
to `http://10.0.2.2:3000/healthcheck` returned HTTP 200. No production accounts or
physical devices were used. Signup/vault operations and native Android plugin
parity have not yet been validated.

Place command-line tools under `$ANDROID_HOME/cmdline-tools/latest`, alongside
`platform-tools`, `emulator`, `ndk` and `system-images`. `avdmanager` locates SDK
packages relative to its own installation, so tools in a separate Homebrew SDK
root will not discover images installed in `~/Library/Android/sdk`. The Android
wrapper puts the tools in the selected SDK first on its PATH.

The installed Google APIs ARM64 API 36 image downloads as a 1.87 GB archive.
Create the same virtual device with the SDK-local `avdmanager`:

```sh
"$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd --name Padloc_Android_Test --package 'system-images;android-36;google_apis;arm64-v8a' --device pixel_7
"$ANDROID_HOME/emulator/emulator" -avd Padloc_Android_Test -memory 2048 -no-snapshot
```

### Android native plugins

- Privacy: `FLAG_SECURE` prevents screenshots/casting and recents snapshots,
  matching Cordova Android. A native cover appears on pause and stays until the
  current resume generation is acknowledged after Padloc reconciles auto-lock.
  Elapsed background time uses Android's monotonic clock. Covered WebView content
  is excluded from accessibility until acknowledgement.
- Biometrics: AndroidX `BIOMETRIC_STRONG` and an authenticated AES-GCM CryptoObject
  protect each store/read operation. The wrapping key stays in AndroidKeyStore,
  requires authentication on every use, and is invalidated by enrollment changes.
  Only encrypted 32-byte secrets are stored in the app's no-backup directory;
  the identifier is authenticated as additional data. Replacement commits through
  AtomicFile before deleting the old key. Cancellation preserves the old record.
  No PIN fallback is offered by this plugin; the master password remains available
  through Padloc. Hardware-backed enforcement depends on the actual device and
  has not been established by emulator testing.
- Sharing: an unexported FileProvider exposes only temporary exports, with read-only
  URI grants and a 64 MiB decoded-file limit. Files remain available for asynchronous
  receivers for ten minutes, then grants are revoked and cache files removed while
  the process runs. The provider rejects new opens after expiry even if cleanup
  was delayed; already-open file descriptors cannot be revoked. Startup also
  deletes leftovers. Android returns `completed=null` because chooser results do
  not reliably establish delivery or cancellation; iOS retains its boolean result.

Android plugin validation — 2026-10-26, API 36 ARM64 emulator: all six command
permissions and invalid-input checks passed. Synthetic-key storage, fresh-prompt
read/decryption, persistence across app update/cold launch, read cancellation and
cancelled replacement preserving the old key passed. A stale privacy acknowledgement
left the native cover in place; the matching acknowledgement removed it. Sharing
opened with the correct filename, dismissal returned `completed=null`, staged bytes
matched the fixture, and an unrelated UID was denied provider access without a
grant. Adapter/security regression tests, Android APK build, macOS cargo check and
iOS simulator cargo check passed. No physical device or production account was used.

Still to validate: physical-device enrollment changes/lockout, full Padloc
registration/unlock/sync, recipient delivery of exports and large-file boundaries,
Android minimum-API behavior, screenshot/recents behavior across OEM devices, and
process-death/interruption edge cases. These smoke checks do not certify full
Android feature parity. The harness now includes synthetic biometric store/read,
cancellation/replacement and a delayed privacy-resume check; it never uses vault
keys or account data.

### Native plugin source layout

Each plugin follows Tauri's mobile bridge layout:

- `src/commands.rs`: the WebView command entry points, with unchanged names and permissions.
- `src/mobile.rs`: shared Rust forwarding and error handling for Swift/Kotlin calls.
- `src/desktop.rs`: explicit unsupported behavior on desktop.
- `src/lib.rs`: platform selection, native plugin registration and command registration.
- `ios/Package.swift` and `ios/Sources/`: Swift package using Tauri's `Plugin`/`Invoke` APIs.
- `android/`: the Kotlin library, using the same native method names.

The iOS implementations no longer use Objective-C C exports, manual JSON buffers,
Rust FFI or custom `cc` compilation. Biometric Keychain queries keep the original
service (`app.padloc.tauri.biometric.v1`), account identifiers and device-only,
current-enrollment ACLs. Blocking biometric/Keychain work stays on a serial worker;
UIKit privacy notifications and share presentation stay on the main thread. The
share sheet retains the separate scene-initialized window needed for proper sizing.

Swift bridge refactor validation — 2026-10-27: iOS simulator app linking, Android
APK build, macOS cargo check and biometric/lifecycle/sharing regression tests
passed. The iOS harness verified all six command routes and input validation;
the scene-based share sheet rendered at normal width and dismissal returned
`completed=false`. A simulated Face ID match stored the synthetic protected
key; a fresh Face ID match read back the exact synthetic bytes. Native resume
acknowledgements restored the harness after authentication. Simulator UI input
was delayed, but backgrounding during the prompt rejected key access as cancelled
and reopening removed the privacy cover. Replacement and physical-device
revalidation remain necessary after this Swift rewrite. Earlier
Objective-C biometric test results are historical, not proof of the rewrite.

### Platform and device information

Webpack exposes the target's `TAURI_ENV_PLATFORM` as `PL_PLATFORM` (`ios`,
`android`, `darwin`, `windows`, `linux`, etc.). Mobile behavior is derived from
that value; there are no separate `PL_IOS` or `PL_MOBILE` environment flags.
A standalone Webpack build without Tauri leaves the target empty rather than
assuming that the build host is the target.

`getDeviceInfo` uses the official OS plugin's native platform and running OS
version, with readable platform names (`iOS`, `Android`, `macOS`, etc.). This
corrects misleading WebView user agents, including iPads advertising macOS.
The inherited WebView metadata remains available, and provides a fallback if
native OS information cannot be read. The OS plugin initializes these values
natively at app startup; its platform/version JavaScript getters need no IPC
permissions. We do not enable its hostname or locale commands.

Other Tauri hook variables are `TAURI_ENV_ARCH`, `TAURI_ENV_FAMILY`,
`TAURI_ENV_TARGET_TRIPLE`, and `TAURI_ENV_PLATFORM_VERSION`. They describe the
build target/environment, not hardware model or installed OS version, and are
not added to the device record. Neither these variables nor the official OS
plugin exposes hardware model/manufacturer. Those fields retain the shared
adapter's values rather than substituting architecture or inventing a model.

Android physical testing — 2026-10-27, Pixel 3a / Android 12 (API 32), WebView
149.0.7827.91: installed `app.padloc.tauri.androidtest` alongside production
`app.padloc`. Local backend uses the Mac loopback interface and USB forwarding:
`adb -s <device> reverse tcp:3000 tcp:3000`, with the client built for
`http://127.0.0.1:3000`. Reapply forwarding after a USB reconnection.
The user confirmed signup, fingerprint enrollment, fresh fingerprint unlock,
biometric cancellation and master-password fallback. Expired background auto-lock
exposed a black cover: failed/offline synchronization could leave `state.syncing`
true indefinitely. Core synchronization now clears its busy state in `finally`
and accounts for overlapping whole-app, active-vault and queued-vault work.
Regression tests cover those cases. Physical retesting of this fix is pending;
sharing, clipboard, background timing and preview privacy are not yet signed off.
