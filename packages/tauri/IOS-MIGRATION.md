# Cordova → Tauri iOS migration investigation

Branch: `experiment/tauri-ios-migration`, based on `69bbf8f4` from
`experiment/tauri-ios`. The parent branch is published; this branch is local.

## Confirmed from repository and installed dependency sources

- CordovaPlatform and TauriPlatform inherit WebPlatform.storage. Both use
  `packages/app/src/lib/storage.ts`: localForage records named `${kind}_${id}`,
  with serialized `toRaw()` values. No wrapper-specific database name or driver
  configuration was found in these adapters.
- Installed localForage defaults are database `localforage`, store
  `keyvaluepairs`; selected driver and actual on-device locations still need
  measurement. Do not assume IndexedDB is the only historical backend.
- Core AppState has id `app-state`; it contains settings, device/session/account,
  organization/vault state, remembered master key and item index. Preserve the
  entire raw state, particularly offline edits, rather than restoring from sync.
- Cordova uses ionic-webview 5.0.0. Its iOS engine defaults to
  `ionic://localhost`; the checked-in config has no hostname/iosScheme override.
- Installed Tauri source uses `tauri://localhost` for the bundled app origin.
  Same storage adapter does not mean same WebKit origin/database access.
- Cordova fingerprint-aio and Tauri use different native Keychain adapters.
  Existing key identifiers, ACLs and biometric registration must be investigated
  independently of migrating the encrypted app database. Never delete the old
  credential just because the new adapter cannot read it.

## Next experiment

Build a Cordova fixture under the separate test app identity; populate synthetic
account data, settings, empty fields, a TOTP item and unsynced offline edits.
Record origin, selected localForage driver and database/store metadata. Upgrade
in place to a Tauri fixture using the same test identity, team and compatible
version, without uninstalling. Keep production `app.padloc` untouched.

Evaluate a narrowly scoped native reader WebView at the old origin using the
same persistent WKWebsiteDataStore. Serve bundled migration code only, block
network navigation, and export raw localForage records through a restricted
native message handler. This is a candidate, not a verified solution: WebKit
origin/storage compatibility and historical paths must be measured first.
Do not copy or edit live WebKit SQLite files.

## Required migration properties

Run before normal application initialization can save empty state. Preserve the
source, validate copied data before marking completion, retry safely after
interruption, never overwrite an existing Tauri account without reconciliation,
and surface a recoverable error rather than silently opening an empty vault.
Do not log plaintext, tokens, raw app state or biometric secrets. Verify unlock
with the master password and preservation of offline edits before allowing sync.

No production migration code or production-device modifications have been made.


## Simulator feasibility result — 2026-10-23

Built a standalone Cordova 6.2.0 + Ionic WebView 5.0.0 fixture using installed
packages, with default localForage configuration. Xcode 27 requires a scene
lifecycle; a generated-fixture-only scene delegate attaches Cordova's window.
This is a storage-engine probe, not a full legacy Padloc app or release binary.
The full Cordova asset build currently lacks its sharp native binary.

Cordova displayed `ionic://localhost`, driver `asyncStorage` (IndexedDB), database
`localforage`, store `keyvaluepairs`. Seeded synthetic JSON with settings and
representative offline edits (including empty fields/TOTP), plus Uint8Array
`[0,255,128,42]`. The source fixture read back a complete JSON match and bytes.

Installed the Tauri fixture over Cordova without uninstalling. Its
`tauri://localhost` store returned no probe data. Both origin-specific WebKit
IndexedDB directories remained after the upgrade (the simulator moved/renamed
the sandbox directory; its absolute path is not a stable identifier).

A hidden WKWebView with the default persistent WKWebsiteDataStore and a bundled
`ionic://localhost/migration-probe` scheme handler then read the legacy marker and
exact binary bytes successfully. It uses a readonly IndexedDB transaction;
creation is aborted if the legacy database is absent. It does not copy records,
change the legacy store, or touch WebKit SQLite files. All code is experimental:
`migration-probe` Cargo feature, test identity guard, and two synthetic keys only.
There is no production migration command or automatic app-state migration.

The first simulator experiment had already installed a separate
`app.padloc.tauri.migration-test` fixture before the user's preference to reuse
the existing test identity arrived. No phone fixture was installed. Subsequent
fixture generation defaults to `app.padloc.tauri.ios-test`; both wrappers must
use the same ID. Never use production `app.padloc` for these scripts.

### Remaining implementation

- Run a full Padloc app upgrade using the existing test identity and synthetic
  encrypted account/vault state, including real offline edits and preferences.
- Turn the old-origin reader into a bounded, versioned, validated transport;
  detect absence separately from read errors and close on failures/timeouts.
- Copy and verify app state before normal initialization, with conflict checks,
  interruption/retry handling and a completion marker; preserve the source.
- Verify master-password unlock, offline edits, settings and sync afterward.
- Investigate legacy Keychain access separately; cover older WebKit storage
  layouts/drivers and signed physical-device upgrades before release.

## Recoverable migration implementation — 2026-10-23

The branch now contains an iOS-only native `read_cordova_storage` command and a
startup migration entirely under `packages/tauri`. It executes before importing
the shared app module, because normal App.load can save empty state after an
unhandled storage failure. Failed migration shows a retry screen and does not
initialize the app or erase either origin.

The native reader serves only its bundled page at a fixed legacy-origin URL,
blocks other navigation and network content, uses readonly IndexedDB, validates
message origin/main frame, and closes on error/termination/15-second timeout.
Its response is bounded to 1000 records / 48 MiB. It transports plain structured
values with explicit tags, including nested undefined, Uint8Array and ArrayBuffer;
unsupported types abort rather than silently coercing or omitting records.
All localForage records are copied, including auxiliary public-key auth records.
Keychain secrets are not read or migrated by this command.

The destination uses one IndexedDB readwrite transaction for conflict checks,
copying, read-back equality checks, and the versioned completion marker. The
marker includes record count and a canonical SHA-256 digest. Abort/interruption
leaves neither partial records nor a completion marker. A completed marker skips
further migration; independently initialized Tauri data is never overwritten.
The source remains intact. AppState is schema-validated on a separate clone;
actual decryption still requires the user's master password.

Automated tests exercise aborts at several write positions, retry, verification
failure, conflicting and identical destination data, binary/undefined transport,
auxiliary auth records, malformed source/checkpoint and completed-run idempotence.

### Encrypted simulator validation

Used the existing `app.padloc.tauri.ios-test` identity on a new iPhone 16e/iOS 27
simulator, preserving the previous simulator and the physical iPhone. The fixture
uses real Padloc AppState/Account/Vault encryption and serialization models, not
mock ciphertext. Under Cordova it generated a synthetic encrypted account, vault
with pending offline changes, empty password/URL fields and a TOTP field, plus
nondefault theme and lock timeout. The raw stored state was checked not to contain
the item name or TOTP secret in plaintext. Master-password recovery passed before
upgrading. Updating in place to Tauri migrated the record; password unlock,
offline edit, empty fields, TOTP type, settings and pending-change state all passed.

The first transport attempt failed closed; investigation exposed optional
undefined properties that plain JSON would lose. Tagged structured encoding now
preserves these and is covered through the actual bundled reader script in tests.

This remains experimental. The fixture is not the full authenticated app shell:
server session continuity/sync, historical released state versions, device-signed
upgrades, legacy Keychain compatibility, and storage-driver/path variants remain
unverified. The current reader supports the observed Ionic IndexedDB origin;
it detects localStorage fallback keys as unsupported and stops. Historical
WebSQL-only data is not supported and must be investigated before release.
Large stores exceeding the bounds require an explicit recovery/export strategy.

Cold Tauri relaunch repeated all encrypted-state checks with the same completion
marker/digest. Reinstalling the Cordova fixture in place (without uninstalling)
then unlocked the original legacy record with all checks passing, confirming
that migration left the source recoverable. The Tauri fixture was restored
afterward; production and physical-phone apps were not modified.

The normal iOS application (not just the fixture) also compiled and started on
the previous simulator with existing Tauri-only data, reaching its normal unlock
view. The old temporary server session was rejected and the normal session-expiry
dialog appeared; this does not establish authenticated sync continuity. No normal
app state is initialized if migration itself fails.
