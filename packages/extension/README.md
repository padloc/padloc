# @padloc/extension

The Padloc browser extension, using Manifest V3.

## Setup

Use this package from within the [Padloc monorepo](../../README.md). Install the
repository's Node.js/npm versions and run `npm ci` at the repository root.

## Building

From the repository root, build for Chrome/Edge (127 or newer):

```sh
PL_SERVER_URL=https://your-padloc-server.example npm run web-extension:build
```

Load `packages/extension/dist` as an unpacked extension.

Build Firefox separately (128 or newer):

```sh
PL_EXTENSION_BROWSER=firefox \
PL_SERVER_URL=https://your-padloc-server.example \
PL_WEB_EXTENSION_FIREFOX_ID=your-existing-addon-id \
npm run web-extension:build
```

Load `packages/extension/dist-firefox/manifest.json` through `about:debugging`.
Use the existing add-on ID for signed updates; temporary development builds can
omit the ID. Firefox uses an event page, while Chromium uses a service worker.
The JavaScript implementation is shared, but the manifests are different.

### Safari on macOS

Safari 16.4 or newer on macOS is supported by a separate Manifest V3 build using
a service worker. This target requires `storage.session` to keep unlock keys in
memory across background restarts. It never falls back to persistent key
storage.

Build the Safari resources from the repository root:

```sh
PL_EXTENSION_BROWSER=safari \
PL_SERVER_URL=https://your-padloc-server.example \
npm run web-extension:build
```

The output is `packages/extension/dist-safari`. On a Mac with the full Xcode
installation selected as the active developer directory, generate the containing
macOS app and Safari Web Extension target:

```sh
npm run safari:project --prefix packages/extension
```

Apple's `safari-web-extension-converter` creates an Xcode project under
`packages/extension/safari`, with `--macos-only`; no iOS app is generated. Open
that project in Xcode, select a signing team for both the app and extension, and
run the macOS app. Enable the extension in Safari > Settings > Extensions, and
grant access to the configured Padloc server and pages where you want to fill
credentials. For local development, enable **Allow Unsigned Extensions** in
Safari's Develop menu (enable developer features in Safari's Advanced settings
if necessary).

From the extension package directory, `npm run build:safari` builds the same
resources. The generator copies those resources into the Xcode project. After
changing the extension, rebuild and copy the new `dist-safari` contents into the
extension target's Resources folder, or remove the generated `safari` directory
and regenerate it. Keep any signing/project customizations before regenerating.

`PL_SAFARI_APP_NAME` (default `Padloc Safari Extension`) and
`PL_SAFARI_BUNDLE_IDENTIFIER` (default `app.padloc.safari`) configure the
generated app. Use your own stable bundle ID and signing identity for
distribution. App Store distribution requires signing and submission through
Apple's tooling; the CI artifact is an unsigned macOS app for validation, not an
App Store release.

Safari controls the badge color. If the browser does not expose
`action.openPopup`, the locked context-menu entry directs you to unlock using
the toolbar popup.

From this package directory, `npm run build` accepts the same environment
variables. Other build options include:

| Variable                      | Description                                    | Default               |
| ----------------------------- | ---------------------------------------------- | --------------------- |
| `PL_SERVER_URL`               | Absolute URL of the Padloc server              | `http://0.0.0.0:3000` |
| `PL_SERVER_PORT`              | Port used when `PL_SERVER_URL` is omitted      | `3000`                |
| `PL_EXTENSION_BROWSER`        | `chromium`, `firefox` or `safari`              | `chromium`            |
| `PL_WEB_EXTENSION_FIREFOX_ID` | Existing Firefox add-on ID, for signed updates | unset                 |

The server's origin determines the network permission and CSP. Browser host
permissions cover the host across ports; the CSP restricts connections to the
configured origin. Page filling continues to use the temporary `activeTab`
permission, rather than requesting access to every website.

For upgrading an installed extension, retain its existing extension ID and
signing key. The encrypted `storage.local` records retain their existing names
and format, so an in-place update needs no vault conversion. Uninstalling an
extension removes its local data and is not an upgrade procedure.

## Unlock state and automatic locking

The background process can stop at any time. Only the master key, account ID,
random unlock ID, last activity time, and lock deadline are kept in
`storage.session`. This area is memory-backed and restricted to trusted
extension contexts. It is not exposed to content scripts. No unlock key is
written to `storage.local` or `storage.sync`.

A new background instance loads the existing encrypted snapshot and restores the
unlock state without resetting its deadline. Reopening the popup or interacting
with it renews valid unlock state. Delayed activity from an expired or
superseded unlock state cannot unlock the app. Every key request and
context-menu fill checks the deadline, even if an alarm was delayed during
sleep. Worker startup also recreates the alarm, because browsers may discard
alarms.

Manual lock, logout, expiry, and account changes discard the unlock key and
notify open popups to clear their unlocked state. Disabling automatic locking
keeps the app unlocked across background restarts, but restarting the browser,
reloading/updating/disabling the extension, or clearing session storage requires
unlocking again.

The popup retains the existing UI, clipboard and drag/drop operations, TOTP,
vault editing, attachments, and synchronization. The background reads a local
snapshot without writing it back or starting a second sync that could race a
popup save or lock. It uses a DOM-free platform and WebCrypto; its RPC transport
uses `fetch`. Extension PDF previews use blob-backed frames while keeping
`object-src` restricted to `self`. All background dependencies, including
translations, are bundled into one file so worker restarts never depend on
loading additional scripts.

## Verification

From this package directory:

```sh
npm test
npm run build
# Run this command with Node.js 18+ (CI uses Node.js 22):
npm run test:worker
```

Unit tests cover unlock-state validation, deadlines, alarm restoration, and RPC
transport behavior. Worker tests execute the actual Chromium build in fresh
JavaScript contexts with real WebCrypto, encrypted account/vault fixtures, and
simulated browser APIs. They cover unlock-state restoration, lost alarms,
badges, menus, script injection and filling, sender validation, expiry, manual
lock, logout, account changes, and disabled automatic locking. These tests
supplement manual browser testing; they do not emulate browser permission
enforcement or store review.

CI also builds the Safari resources, runs the background lifecycle suite without
optional toolbar/session-access APIs, and uses a macOS runner to convert and
compile an unsigned Safari app. Run the Safari bundle checks locally after
building with:

```sh
PL_EXTENSION_BROWSER=safari npm run test:worker
```

Before distributing a build, verify in Chrome/Edge, Firefox, and Safari on
macOS:

1. Update an existing installation and check that its account, vaults, settings,
   and popup route are retained.
2. Unlock, close the popup, terminate the background through developer tools,
   and reopen it before the deadline. It should stay unlocked. Repeat after the
   deadline and after computer sleep; it must require unlocking.
3. Keep the popup open through an alarm lock, manually lock it, and log out.
   Check other open extension views too. Repeat with automatic locking disabled
   and confirm that a browser restart still clears the unlock state.
4. Check URL matches, badge preference, locked/unlocked context menus, password
   and TOTP field filling, clipboard copy, drag/drop, popup shortcut, and focus.
5. Create/edit/delete items, synchronize changes, upload/download attachments,
   import/export, and check password auditing against a configured server.
6. Confirm that content scripts cannot read session storage or request a master
   key, and that restricted pages fail to fill without revealing credentials.

## Development and contributing

See the [monorepo development instructions](../../README.md#development) and
[contribution guide](../../README.md#contributing).

### Biometric unlock prototype

Build against an HTTPS server (localhost is also suitable for development). Set
`PL_WEB_EXTENSION_WEBAUTHN_RP_ID` to the server's configured WebAuthn RP ID when
it differs from the API hostname, so the extension receives host permission:

```sh
PL_SERVER_URL=https://api.example.com \
PL_WEB_EXTENSION_WEBAUTHN_RP_ID=vault.example.com \
npm run web-extension:build
```

Load `dist` in `chrome://extensions` and copy its extension ID. Configure the
server with its existing web origin and RP configuration plus the exact trusted
extension origin, then restart it:

```sh
PL_AUTH_TYPES=email,totp,webauthn_platform
PL_AUTH_WEBAUTHN_RP_ID=vault.example.com
PL_AUTH_WEBAUTHN_RP_NAME=Padloc
PL_AUTH_WEBAUTHN_ORIGINS=https://vault.example.com,chrome-extension://YOUR_EXTENSION_ID
```

Keep any other authentication types your deployment already enables in
`PL_AUTH_TYPES`. The updated WebAuthn server requires Node.js 22 or newer (the
repository targets Node.js 26).

`PL_AUTH_WEBAUTHN_ORIGINS` is a comma-separated allowlist for web and extension
origins; never use a wildcard or accept an origin supplied by a client. Unpacked
extension IDs can change when the checkout location changes; update the
allowlist accordingly. Keep the web origin in the array too, so existing web
credentials continue to work. The legacy `PL_AUTH_WEBAUTHN_ORIGIN` setting is
used only when `ORIGINS` is empty.

Open the toolbar popup, log in/unlock with your master password, and enable
Biometric Unlock under Settings > Security. After locking, use the fingerprint
button in the popup to unlock. Chromium can keep the popup alive during its
WebAuthn prompt. No separate tab is required.

For debugging, the same `popup.html` can still be opened in an extension tab.
Avoid using multiple app tabs concurrently in this prototype, since they each
hold an app-state snapshot.

Biometric unlock requires server connectivity, and the OS may offer PIN
verification instead of biometrics. Safari uses the native Keychain bridge
described below.

#### Firefox

Firefox 150 or newer supports extension WebAuthn. The extension still installs
on Firefox 128+, but biometric unlock stays disabled on versions below 150.
Build with a stable add-on ID (use your existing published ID for updates):

```sh
PL_EXTENSION_BROWSER=firefox \
PL_WEB_EXTENSION_FIREFOX_ID=your-existing-addon-id \
PL_SERVER_URL=https://api.example.com \
PL_WEB_EXTENSION_WEBAUTHN_RP_ID=vault.example.com \
npm run web-extension:build
```

Load `dist-firefox/manifest.json` through `about:debugging`. Grant host access
to the API server and RP domain. Calculate the trusted WebAuthn origin using the
same add-on ID:

```sh
node packages/extension/scripts/firefox-webauthn-origin.js your-existing-addon-id
```

Add the printed `moz-extension://...` origin to `PL_AUTH_WEBAUTHN_ORIGINS`
(comma-separated with the web and any Chromium origins) and restart the server.
This is the stable SHA-256-derived WebAuthn origin, not the random UUID in
Firefox's extension page URL. Changing the add-on ID changes its trusted origin.
Builds without an explicit add-on ID keep biometrics disabled.

Use the original fingerprint button on Firefox's unlock screen. On first use, it
opens a persistent extension tab for enrollment; enabling Biometric Unlock in
Settings > Security uses the same setup flow. Close the tab after enrollment.

For subsequent unlocks, click the same fingerprint button in the toolbar popup.
A compact 240 × 140 extension window briefly shows “Unlocking…” behind the
browser, then requests focus before calling WebAuthn (a focused document is
required). After successful verification, the existing session unlock state is
saved, the helper window closes, and the original browser window's popup reopens
automatically. Authentication does not run invisibly in the background.

Firefox
[currently closes toolbar popups when a WebAuthn prompt appears](https://bugzilla.mozilla.org/show_bug.cgi?id=2026687),
so the helper window owns the complete operation rather than relying on the
original popup to stay alive. Handoffs expire after two minutes, are bound to
one account and helper tab, and are invalidated by lock/logout. Canceling Touch
ID or an authentication failure closes the helper and reopens the original
toolbar popup locked, without displaying an intermediate error form. Closing the
helper manually abandons the attempt. The controls appear only when a platform
authenticator is available.

Direct WebAuthn from the toolbar popup was tested on Firefox 159 on macOS: the
popup closed when the biometric prompt opened. The original fingerprint button
therefore starts the helper-window handoff; Chromium continues to authenticate
inside the popup itself. No extra toolbar-popup buttons are added.

If Chrome offers only a phone or USB key after enrolling another browser, its
previous credential may have been replaced by the OS passkey provider. Local
unlock enrollments now use separate opaque user handles so enrolling Firefox
does not replace Chrome's passkey, or vice versa. Existing affected enrollments
need to be disabled and enabled again in Settings > Security after unlocking
with the master password. The server also retains credential transports and
prefers the current device for platform authentication.

Manual acceptance checks on Touch ID/Windows Hello hardware:

-   Register, lock, unlock, then open the toolbar popup and verify autofill
    works.
-   Cancel registration/authentication; verify the extension stays locked.
-   Remove the extension origin from the server allowlist; registration and
    unlock must fail, while the regular web app still works.
-   Lock or log out while the OS prompt is open; verify no stale unlock is
    restored.
-   Restart the browser and verify a fresh authentication is required.

Safari biometric unlock uses the native Safari extension bundled inside **Padloc
Safari Extension.app** (bundle ID `app.padloc.safari`), independently of the
Tauri Padloc application. The tracked handler in `native/safari` is copied into
each generated Xcode project. To regenerate an existing project, pass
`-- --force` to `npm run safari:project`; this replaces the generated project,
including any local signing settings. Enable `public_key` in the server's
`PL_AUTH_TYPES` alongside the existing authentication types. Enroll separately
in Safari using Settings → Security → Biometric Unlock. The native bridge stores
the encryption key for the public-key authenticator in the macOS data-protection
Keychain, protected with `biometryCurrentSet` and `WhenUnlockedThisDeviceOnly`.
Changing enrolled fingerprints requires re-enrollment. Each enrollment has a
random handle, with native Keychain entries additionally scoped to Safari's
profile identifier on macOS 14 and newer. No App Group or access to the Tauri
application's Keychain items is needed. Keychain operations require a signed
extension; unsigned CI builds validate compilation only. Select your development
team for both generated targets before testing Touch ID locally.

For a signed local project, set `PL_APPLE_DEVELOPMENT_TEAM` when running
`safari:project` (for example,
`PL_APPLE_DEVELOPMENT_TEAM=YOUR_TEAM_ID npm run safari:project --workspace @padloc/extension`).
This applies the team to both targets; the build still needs a usable Apple
Development signing identity.

The Safari extension target includes `Biometric.entitlements`, with its own
application identifier and Keychain group. A signed development build must embed
a provisioning profile for that identity. When the current Mac is not
registered, Xcode can register it with
`-allowProvisioningUpdates -allowProvisioningDeviceRegistration` after the
developer account owner authorizes registration. A plain signature without these
entitlements can show Touch ID but fails Keychain operations with `-34018`.
