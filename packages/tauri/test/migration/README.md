# Cordova migration tests

Run the automated regression suite from the repository root:

```sh
node packages/tauri/test/migration.cjs
```

The suite covers rollback and retry, destination conflicts, read-back
verification, typed values, auxiliary authentication records, malformed sources,
and checkpoint reuse.

## Encrypted upgrade fixture

The fixture uses the actual Padloc vault encryption and startup migration. It
seeds a synthetic offline edit and checks master-password unlock, the pending
edit, empty fields, TOTP, and settings after an in-place update. The fixture
runs without a server. Use a disposable test app ID, matching signing
credentials, and a clean test device or simulator.

Build the fixture frontends with Node 26 and the workspace dependencies:

```sh
node packages/tauri/test/migration/build-encrypted.cjs /private/tmp/cordova-encrypted-www cordova
node packages/tauri/test/migration/build-encrypted.cjs /private/tmp/tauri-encrypted-www tauri
```

### iOS

Create a temporary Cordova wrapper and populate its `www` directory:

```sh
node packages/tauri/test/migration/create-cordova.cjs /private/tmp/padloc-cordova-fixture app.padloc.tauri.migration-test
cp -R /private/tmp/cordova-encrypted-www/. /private/tmp/padloc-cordova-fixture/www/
npm install --prefix /private/tmp/padloc-cordova-cli --no-save cordova@12.0.0
(
    cd /private/tmp/padloc-cordova-fixture
    cordova=/private/tmp/padloc-cordova-cli/node_modules/.bin/cordova
    "$cordova" platform add cordova-ios@6.2.0 --nosave --no-telemetry
    "$cordova" plugin add cordova-plugin-ionic-webview@5.0.0 --nosave --no-telemetry
    "$cordova" prepare ios --no-telemetry
)
node packages/tauri/test/migration/prepare-cordova-ios.cjs /private/tmp/padloc-cordova-fixture
```

Build and install the generated **Padloc Migration Test** Xcode scheme. For a
simulator build, set `CODE_SIGNING_ALLOWED=NO` and
`IPHONEOS_DEPLOYMENT_TARGET=15.0` for the app and CordovaLib. Launch the app,
press **Seed encrypted fixture**, then **Verify unlock and edits**.

Generate the matching Tauri config and build the replacement:

```sh
node packages/tauri/test/migration/create-tauri.cjs /private/tmp/padloc-cordova-fixture /private/tmp/padloc-tauri-fixture /private/tmp/tauri-encrypted-www
npm run icons --workspace @padloc/tauri
npm run ios:init --workspace @padloc/tauri -- --ci --config /private/tmp/padloc-tauri-fixture/tauri.json
npm run ios:build:sim --workspace @padloc/tauri -- --config /private/tmp/padloc-tauri-fixture/tauri.json
```

Install Tauri over Cordova, launch it, and check the fixture results. Restart
and verify that the migration checkpoint is unchanged. Run
`npm run ios:init --workspace @padloc/tauri -- --ci` to restore the generated
project to the default app identity when finished.

### Android

Use the encrypted Cordova frontend with the legacy Cordova Android wrapper and
Ionic WebView. Build the Tauri frontend with `TAURI_ENV_PLATFORM=android` so the
migration uses Android's legacy origins. Install Tauri over the seeded Cordova
app with the same test application ID and signing key, and a higher Android
version code. Verify the fixture results and restart to check the persisted
checkpoint.
