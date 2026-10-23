# Storage-origin feasibility fixture

This is **not** a production migration, a full Padloc vault fixture, or proof of
physical-device migration. It tests only synthetic JSON and binary records.
The native reader is compiled only with `--features migration-probe` and refuses
production app IDs. Default fixture identity is the existing Padloc iOS Test ID.
Installing the Cordova fixture replaces that test app's executable; never
uninstall between the Cordova and Tauri stages. Do not use production identities.

Use Node 26, installed workspace dependencies and the configured Xcode developer
directory. From the repository root, choose new absolute temporary directories:

```sh
node packages/tauri/test/migration/create-cordova.cjs /private/tmp/padloc-cordova-probe
ln -s "$PWD/node_modules" /private/tmp/padloc-cordova-probe/node_modules
```

In that fixture directory, use the repo's Cordova executable to add the repo's
local `node_modules/cordova-ios` platform and
`node_modules/cordova-plugin-ionic-webview` plugin (`--nosave --no-telemetry`), then
run `cordova prepare ios`. Run this **after prepare**, which can rewrite plists:

```sh
node packages/tauri/test/migration/prepare-cordova-ios.cjs /private/tmp/padloc-cordova-probe
```

Build its `platforms/ios/Padloc Migration Test.xcodeproj`, scheme
`Padloc Migration Test`, with the simulator SDK, `CODE_SIGNING_ALLOWED=NO` and
`IPHONEOS_DEPLOYMENT_TARGET=15.0` (including CordovaLib). Install and launch on
the simulator, press **Seed synthetic records**, and verify `matches: true` and
binary `[0,255,128,42]`. Keep the data; terminate the executable before updating.

Create matching Tauri frontend/config (from the repo root):

```sh
node packages/tauri/test/migration/create-tauri.cjs /private/tmp/padloc-cordova-probe /private/tmp/padloc-tauri-probe
npm run ios:init --workspace @padloc/tauri -- --ci --config /private/tmp/padloc-tauri-probe/tauri.json
npm run ios:build:sim --workspace @padloc/tauri -- --config /private/tmp/padloc-tauri-probe/tauri.json
```

Install `gen/apple/build/arm64-sim/Padloc Migration Test.app` in place and launch.
The normal Tauri origin should report `found: false`. Then build with the same
config plus `--features migration-probe`, update in place again and check the
**Legacy reader (read only)** output: old origin, expected marker and exact bytes.
Do not press Seed in Tauri; it is restricted to the legacy origin.

The initial experiment used `app.padloc.tauri.migration-test`, before the user's
request to reuse the existing test identity arrived. Passing that ID as the
third argument to create-cordova reproduces the initial isolated experiment.

After fixture work, run normal `npm run ios:init --workspace @padloc/tauri -- --ci`
to restore the generated normal test project. Do not ship a feature-enabled
probe build. Data and generated assets remain in temporary/ignored locations.

## Encrypted AppState fixture

`encrypted.ts` uses the actual Account/AppState/Vault encryption and serialization
models, a public dummy password, and no server. It seeds a pending offline item
with empty password/URL fields, TOTP and nondefault settings. The Tauri variant
runs the real pre-startup migration and decrypts/verifies all of these values.
It does not exercise the full signed-in application shell or server sync.

Build web assets with:

```sh
node packages/tauri/test/migration/build-encrypted.cjs /private/tmp/cordova-encrypted-www cordova
node packages/tauri/test/migration/build-encrypted.cjs /private/tmp/tauri-encrypted-www tauri
```

Copy the Cordova output into the generated fixture's `www`, prepare and apply the
scene bootstrap, then build/install it on a clean simulator using the existing
test app ID. Seed and verify before upgrading. Point a Tauri override config at
`tauri-encrypted-www`, retaining the same ID, and build without `migration-probe`.
Update in place, verify recovery, and restart to check checkpoint idempotence.

Run `node packages/tauri/test/migration.cjs` for atomic abort/retry, conflicts,
read-back verification, typed-value transport (including nested undefined),
auxiliary authentication records, malformed sources and checkpoint tests.
