# @padloc/extension

The Padloc browser extension uses Manifest V3. Build it from the
[Padloc monorepo](../../README.md) with the repository's Node.js/npm versions
and run `npm ci` at the repository root before building.

## Build instructions

All commands below run from the repository root.

### Chromium

Chrome/Edge 127 or newer:

```sh
PL_SERVER_URL=https://api.example.com \
PL_WEB_EXTENSION_WEBAUTHN_RP_ID=vault.example.com \
npm run web-extension:build
```

Load `packages/extension/dist` as an unpacked extension in
`chrome://extensions`. Retain the extension's signing key and ID when
distributing updates.

### Firefox

Firefox 128 or newer; biometric unlock requires Firefox 150 or newer and a
stable add-on ID:

```sh
PL_EXTENSION_BROWSER=firefox \
PL_WEB_EXTENSION_FIREFOX_ID=your-existing-addon-id \
PL_SERVER_URL=https://api.example.com \
PL_WEB_EXTENSION_WEBAUTHN_RP_ID=vault.example.com \
npm run web-extension:build
```

Load `packages/extension/dist-firefox/manifest.json` through `about:debugging`.
Use the published add-on ID for updates. Grant host access to the API server and
WebAuthn RP domain.

### Safari on macOS

Safari 16.4 or newer and the full Xcode installation are required. Select Xcode
as the active developer directory or set `DEVELOPER_DIR` to its
`Contents/Developer` directory.

```sh
PL_EXTENSION_BROWSER=safari \
PL_SERVER_URL=https://api.example.com \
npm run web-extension:build

PL_APPLE_DEVELOPMENT_TEAM=YOUR_TEAM_ID \
npm run safari:project --workspace @padloc/extension
```

The resource build is written to `packages/extension/dist-safari`. The project
generator creates a macOS app and Safari extension under
`packages/extension/safari`. Open the generated Xcode project, configure signing
for both targets, and run the app. Enable the extension in Safari Settings →
Extensions and grant access to the server and pages where credentials are
filled.

The wrapper is named **Padloc Safari Extension**, with bundle ID
`app.padloc.safari` and extension ID `app.padloc.safari.Extension`. Override
these with `PL_SAFARI_APP_NAME` and `PL_SAFARI_BUNDLE_IDENTIFIER` when
generating the project. The wrapper is independent of the Tauri Padloc
application.

The generator copies web resources, the native handler, and Keychain
entitlements into the project. After rebuilding web resources, copy the contents
of `dist-safari` into the extension target's Resources folder, or regenerate
with `npm run safari:project --workspace @padloc/extension -- --force`.
Regeneration replaces local project customizations, including signing settings.

Touch ID requires a signed extension with an embedded provisioning profile,
application identifier, and its own Keychain access group. Select an Apple
Development identity and development team. Xcode may need to register the
current Mac to create a development profile; authorize registration with the
developer account owner. Unsigned builds cannot exercise the Keychain flow.
Distribution requires the appropriate Apple signing and packaging process.

### Build configuration

| Variable                          | Description                                    | Default               |
| --------------------------------- | ---------------------------------------------- | --------------------- |
| `PL_SERVER_URL`                   | Absolute Padloc API URL                        | `http://0.0.0.0:3000` |
| `PL_SERVER_PORT`                  | Port when `PL_SERVER_URL` is omitted           | `3000`                |
| `PL_EXTENSION_BROWSER`            | `chromium`, `firefox`, or `safari`             | `chromium`            |
| `PL_WEB_EXTENSION_FIREFOX_ID`     | Stable Firefox add-on ID                       | unset                 |
| `PL_WEB_EXTENSION_WEBAUTHN_RP_ID` | Chromium/Firefox WebAuthn RP host permission   | unset                 |
| `PL_APPLE_DEVELOPMENT_TEAM`       | Signing team for both generated Safari targets | unset                 |

Set `PL_WEB_EXTENSION_WEBAUTHN_RP_ID` to the server's WebAuthn RP ID when it
differs from the API hostname. The server URL determines network permissions and
CSP; page filling uses temporary `activeTab` access.

## Biometric authentication configuration

Chromium and Firefox use WebAuthn. Configure an HTTPS server (localhost is also
suitable for development) with its RP ID and exact allowed web and extension
origins:

```sh
PL_AUTH_TYPES=email,totp,webauthn_platform
PL_AUTH_WEBAUTHN_RP_ID=vault.example.com
PL_AUTH_WEBAUTHN_RP_NAME=Padloc
PL_AUTH_WEBAUTHN_ORIGINS=https://vault.example.com,chrome-extension://YOUR_EXTENSION_ID
```

Retain other authentication types enabled by the deployment. Safari additionally
requires `public_key` in `PL_AUTH_TYPES`.

`PL_AUTH_WEBAUTHN_ORIGINS` is a comma-separated allowlist. Include the web
origin as well as each trusted Chromium and Firefox extension origin; never use
wildcards or trust an origin supplied by a client. The legacy
`PL_AUTH_WEBAUTHN_ORIGIN` is a fallback only when `ORIGINS` is empty. Restart
the server after changing its configuration.

Chromium's origin uses its extension ID. Keep unpacked development IDs stable or
update the allowlist when they change. Calculate Firefox's WebAuthn origin from
its stable add-on ID:

```sh
node packages/extension/scripts/firefox-webauthn-origin.js your-existing-addon-id
```

Add the printed `moz-extension://...` origin to the allowlist. This derived
origin is distinct from the random UUID in Firefox's extension page URL.

Enroll each browser separately in Settings → Security → Biometric Unlock, then
use the fingerprint button on the unlock screen. Biometric unlock requires
server connectivity. Chromium and Firefox platform verification may use an OS
PIN instead of biometrics.

## Implementation notes

### Unlock state

Chromium and Safari use service workers; Firefox uses an event page. Background
processes can stop at any time. Unlock keys and deadlines live only in trusted
`storage.session`, never persistent local or synchronized storage. Restarting a
background process preserves the deadline; restarting the browser or reloading
the extension requires unlocking again. Lock, logout, expiry, and account
changes clear the unlock state. Content scripts cannot request unlock keys.

### Firefox authentication handoff

Firefox can close toolbar popups when a WebAuthn prompt opens
([Mozilla bug](https://bugzilla.mozilla.org/show_bug.cgi?id=2026687)).
Enrollment therefore uses a persistent extension tab, and the popup's
fingerprint button opens a compact helper window for authentication. The helper
must gain focus before calling WebAuthn. It publishes the verified unlock state,
closes, and reopens the original toolbar popup. Cancellation or failure returns
to a locked popup.

Handoffs expire after two minutes, are bound to one account and helper tab, and
are invalidated by lock/logout. Chromium authenticates directly inside its
popup. Local unlock enrollments use independent user handles so enrolling one
browser does not replace another browser's passkey. Recorded credential
transports guide the browser toward the enrolled authenticator.

### Safari Touch ID bridge

Safari uses native messaging and the existing public-key authentication protocol
rather than extension WebAuthn. The native handler runs inside the Safari
extension without requiring the wrapper or Tauri app to remain open.

Touch ID releases a 32-byte Keychain secret that decrypts a locally stored
private signing key. That key signs the server's authentication challenge. After
successful authentication, the server releases the separate wrapping key needed
to decrypt the locally stored encrypted master key.

The native secret uses the macOS data-protection Keychain with
`biometryCurrentSet` and `WhenUnlockedThisDeviceOnly`. Changing enrolled
fingerprints requires re-enrollment. Local storage contains an opaque Keychain
handle; Keychain entries are additionally scoped to Safari's profile identifier
on macOS 14 and newer. The extension has its own Keychain access group and does
not share keys with the Tauri app.
