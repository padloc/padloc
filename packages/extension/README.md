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

From this package directory, `npm run build` accepts the same environment
variables. Other build options include:

| Variable                      | Description                                    | Default               |
| ----------------------------- | ---------------------------------------------- | --------------------- |
| `PL_SERVER_URL`               | Absolute URL of the Padloc server              | `http://0.0.0.0:3000` |
| `PL_SERVER_PORT`              | Port used when `PL_SERVER_URL` is omitted      | `3000`                |
| `PL_EXTENSION_BROWSER`        | `chromium` or `firefox`                        | `chromium`            |
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

Before distributing either build, verify in Chrome/Edge and Firefox:

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
