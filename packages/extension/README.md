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

`PL_SAFARI_APP_NAME` (default `Padloc`) and `PL_SAFARI_BUNDLE_IDENTIFIER`
(default `app.padloc.safari`) configure the generated app. Use your own stable
bundle ID and signing identity for distribution. App Store distribution requires
signing and submission through Apple's tooling; the CI artifact is an unsigned
macOS app for validation, not an App Store release.

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

## Unlock sessions and automatic locking

The background process can stop at any time. Only the master key, account ID,
random unlock-session ID, last activity time, and lock deadline are kept in
`storage.session`. This area is memory-backed and restricted to trusted
extension contexts. It is not exposed to content scripts. No unlock key is
written to `storage.local` or `storage.sync`.

A new background instance loads the existing encrypted snapshot and restores the
session without resetting its deadline. Reopening the popup or interacting with
it renews a valid session. Delayed activity from an expired or superseded
session cannot unlock the app. Every key request and context-menu fill checks
the deadline, even if an alarm was delayed during sleep. Worker startup also
recreates the alarm, because browsers may discard alarms.

Manual lock, logout, expiry, and account changes discard the session key and
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

Unit tests cover session validation, deadlines, alarm restoration, and RPC
transport behavior. Worker tests execute the actual Chromium build in fresh
JavaScript contexts with real WebCrypto, encrypted account/vault fixtures, and
simulated browser APIs. They cover session restoration, lost alarms, badges,
menus, script injection and filling, sender validation, expiry, manual lock,
logout, account changes, and disabled automatic locking. These tests supplement
manual browser testing; they do not emulate browser permission enforcement or
store review.

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
   and confirm that a browser restart still clears the unlock session.
4. Check URL matches, badge preference, locked/unlocked context menus, password
   and TOTP field filling, clipboard copy, drag/drop, popup shortcut, and focus.
5. Create/edit/delete items, synchronize changes, upload/download attachments,
   import/export, and check password auditing against a configured server.
6. Confirm that content scripts cannot read session storage or request a master
   key, and that restricted pages fail to fill without revealing credentials.

## Development and contributing

See the [monorepo development instructions](../../README.md#development) and
[contribution guide](../../README.md#contributing).
