# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to
[Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## 4.4.0 (Unreleased)

### New stuff & Improvements

-   Migrate the desktop app to Tauri 2, including native menus and automatic
    update support. ([#789](https://github.com/padloc/padloc/pull/789))
-   Add Tauri-based iOS and Android builds with biometric key storage, native
    file sharing, QR scanning and a background privacy screen. Deprecate the
    Cordova package; migration of existing Cordova local data is not included.
    ([#798](https://github.com/padloc/padloc/pull/798))
-   Migrate browser extensions to Manifest V3, preserving unlock sessions across
    background restarts. ([#785](https://github.com/padloc/padloc/pull/785))
-   Add Safari extension support on macOS with Safari 16.4 or newer.
    ([#786](https://github.com/padloc/padloc/pull/786))
-   Add biometric unlock to Chromium, Firefox 150+ and Safari extensions,
    including Touch ID support for Safari on macOS.
    ([#801](https://github.com/padloc/padloc/pull/801))
-   Update German and Russian translations.
    ([#728](https://github.com/padloc/padloc/pull/728),
    [#730](https://github.com/padloc/padloc/pull/730))

## 4.3.1

### Security fixes

-   Validate SCIM secret tokens before returning user and group directory data.
    ([#807](https://github.com/padloc/padloc/pull/807))
-   Prevent filesystem attachment path traversal that could expose other vaults'
    attachment metadata and encrypted contents or delete server files and
    directories.
-   Prevent organization updates from claiming and deleting vaults belonging to
    other organizations or accounts.
-   Prevent prototype pollution through SCIM user patch operations.
-   Enforce the three-attempt limit for incorrect email verification codes in
    the legacy authentication API.
-   Reduce the default HTTP request body limit from 1 GB to 10 MB to reduce
    memory exhaustion risk. Deployments requiring larger requests can explicitly
    configure `PL_TRANSPORT_HTTP_MAX_REQUEST_SIZE`. Supported attachment uploads
    up to 5 MB remain within the default limit after encoding.
-   Remove SCIM debug logging that exposed user data, group memberships and
    authentication tokens.
-   Update vulnerable server and shared-core dependencies.
    ([#802](https://github.com/padloc/padloc/pull/802))
-   Update vulnerable client, build and desktop updater dependencies.
    ([#802](https://github.com/padloc/padloc/pull/802),
    [#804](https://github.com/padloc/padloc/pull/804))

### Bug fixes

-   Compare OAuth email addresses without regard to capitalization.
-   Fix literal searches containing punctuation, including dotted names and
    URLs, while preserving case-insensitive, multi-term matching.
    ([#805](https://github.com/padloc/padloc/pull/805))
-   Support both modern and legacy LastPass CSV export formats.
    ([#735](https://github.com/padloc/padloc/pull/735))

### Development & Build

-   Move to Node.js 26.12.1 and npm 11.20.0, using npm workspaces and a single
    root lockfile. Update Docker images, build tooling and CI accordingly.
    ([#791](https://github.com/padloc/padloc/pull/791),
    [#792](https://github.com/padloc/padloc/pull/792))
-   Use HTTPS for development dependency retrieval, allowing Electron builds
    without GitHub SSH access.
    ([#724](https://github.com/padloc/padloc/pull/724))

## 4.3.0

### New stuff & Improvements

-   You can now edit, reorder, delete, unlist and even assign colors to tags!
    You can find the new tag management features under Settings / Tags.
-   It is now finally possible to change your email address.
-   Improved search - if you enter multiple search terms separated by spaces,
    Padloc will now look for those terms individually instead of the full search
    string.
-   You can now select a value of 0 (instant) for auto lock on mobile devices.
-   Increased password generator limits to 12 words for passphrases and 150
    characters for random strings.
-   Changed default PBKDF2 iterations to 1 Million

### Bug fixes

-   When importing CSV files, it wasn't possible to select any column other than
    the first for item names.

## 4.2.0

### New stuff & Improvements

-   You can now import Dashlane, KeePass, and NordPass .csv files directly
-   You can now import iCloud/Safari, Chrome, and Firefox .csv files with
    passwords directly
-   You can now override the import format for .csv files
-   You will now see buttons to create and import items on a new/empty
    account/vault
-   Added new Macedonian translation (Ти благодарам @andrejdaskalov)
-   Updated Tauri engine
-   Added new server healthcheck endpoint
-   Added new Caddy Docker example
-   Added new DigitalOcean "one-click-install" button

### Bug fixes

-   Fixed importing Bitwarden files with empty URIs
-   Fixed showing security report and MFA for users with an org that has a
    premium plan
-   Fixed display of long tags
-   Fixed CSP for the admin package

## 4.1.0

### New stuff & Improvements

-   You will now receive an email notification when there's been 5 failed login
    attempts
-   You will also receive an email notification when there's been a successful
    login from a new or untrusted device; you can disable these from your
    security settings
-   Your items will now start keeping historical changes and you can restore
    them
-   You can now set an expiration time for your items, and have them show in
    your Security Report once that expiration date passes
-   You can now import Bitwarden .json files directly
-   You can now import recent LastPass .csv files directly (with one-time
    password support)
-   If you belong to an org that has a premium plan, you can now benefit from
    those features in your private vault
-   Added new Chinese Traditional (Taiwan) translation (謝謝你 @rhuba8324)
-   Added new Turkish translation (Teşekkürler @halacoglu)
-   Updated French translation (Merci @detobel36)

### Bug fixes

-   Fixed the extraneous scrollbar on web extension popup
-   Fixed the fact you could end up in edit mode while navigating back/forward
-   Fixed being able to press the biometric toggle even when the device wasn't
    supported

## 4.0.2

### New stuff & Improvements

-   Added new Italian translation (grazie @coluzziandrea)
-   Updated multiple dependencies for security and reliability improvements
-   Many minor UI and UX improvements

### Bug fixes

-   Fixed various usability issues with full-screen note editing on iOS
-   Fixed the problem with changing the master password

## 4.0.0

Initial release of Padloc 4 (changes before 4.0.0 are not included in this
change log), though
[some can be seen in this commit](https://github.com/padloc/padloc/blob/12b027b37ccf123b15a066e4715354f4cf080384/CHANGELOG.md).
