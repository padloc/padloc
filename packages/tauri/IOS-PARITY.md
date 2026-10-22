# Cordova → Tauri iOS feature parity

Assessment: 2026-10-21. Code base: main `0acdfe2e` plus the experimental iOS
wrapper on `experiment/tauri-ios`. This is a source and documentation audit,
not verification that the proposed plugins work in this app.

Implementation update: the experiment now includes an iOS native snapshot cover
and native-timestamp resume reconciliation for background auto-lock. See the
README for simulator validation and remaining physical-device checks. The inventory
below records the original audit baseline. The experiment also now has an iOS
biometric Keychain bridge connected to the existing public-key protocol; see the
README for its protections and validation limits.

Clipboard update: native text copy/read is integrated with the official
clipboard-manager 2.5 plugin. Sensitive writes use iOS local-only pasteboard
items, and the existing foreground countdown overwrites copied text. Native
background expiration and physical-device paste-permission checks remain open.

QR update: the iOS adapter now uses the official barcode-scanner 2.5.3 plugin
with QR-only detection and the existing scan dialog. Camera permission handling,
cancellation, appearance restoration and stale-result isolation are implemented.
Real camera decoding and capture-session behavior still need physical iPhone
validation; simulator/mock checks cannot establish those.

## Scope and current state

`packages/cordova/package.json` declares 14 enabled Cordova plugins, plus
Swift-support and Promise compatibility dependencies. This checkout has no
generated `packages/cordova/plugins` or `platforms` directory, so this inventory
describes the declared configuration and installed npm dependency sources,
not a verified inventory from a shipping IPA.

The Tauri platform adapter currently overrides device info only. Clipboard,
files, QR scanning, and URL opening inherit browser implementations;
biometric key storage inherits the unsupported stub. The smoke test covered
signup, item creation/editing, and manual lock/unlock, not native feature parity.

## Plugin inventory

| Cordova plugin | Actual role in Padloc | Tauri iOS replacement / remaining work |
| --- | --- | --- |
| `cordova-plugin-fingerprint-aio` | `biometricKeyStore`: protected storage/retrieval of a secret; backs biometric public-key authentication and unlock | **Largest gap.** Official biometric plugin supplies availability/prompting, but its iOS implementation does not provide the protected secret store. Implement or audit a Keychain plugin matching the existing access controls, then reuse `PublicKeyAuthClient` in `TauriPlatform`. |
| `cordova-plugin-privacyscreen` | Native on-load observers cover/hide the window when the app resigns active, preventing vault contents in app-switcher snapshots | Native lifecycle privacy overlay, preferably owned by a small Swift Tauri plugin. No JavaScript call is needed in Cordova, so searching only TS misses this behavior. This is snapshot protection, not a claim that iOS screenshots are universally blocked. |
| `cordova-clipboard` | Native text copy/paste via the platform adapter | Official `clipboard-manager` supports iOS text. Replace browser `execCommand` fallback; retain countdown clearing, test paste permission UX and background behavior. Native expiry/local-only copying is useful additional hardening, not established Cordova parity. |
| `cordova-plugin-qrscanner` | Camera-backed `scanQR` / `stopScanQR`, transparent camera preview behind app | Official `barcode-scanner`: QR format, scan/cancel, camera usage description and permissions. Adapt existing preview and cancellation UI; validate on an iPhone. |
| `cordova-plugin-x-socialsharing` | `saveFile` shares generated file bytes through native sheet: exports and downloaded attachments | Native share sheet for temporary files, preserving filename/MIME type and handling cancellation/cleanup. `dialog` + `fs` can support file import/export pieces, but a file picker alone does not reproduce sharing to other apps. Custom Swift `UIActivityViewController` bridge or an audited sharing plugin. |
| `cordova-plugin-inappbrowser` | Only `_system` opening is used, through `openExternalUrl` | Official `opener.openUrl` for browser links; audit inherited `composeEmail` too. Embedded browser/session features are not used here. Opener's documented iOS support is URLs, not general file opening. |
| `cordova-plugin-device` | Native manufacturer/model/platform/OS version and friendly Apple model names | Official `os` for OS information plus a small native model-info command if required. Keep the existing model-name map; avoid relying on WKWebView user-agent inference. |
| `cordova-plugin-app-version` | Declared; no direct app-version plugin call found in application source | Core Tauri app version APIs or existing bundled `PL_VERSION` / `PL_VENDOR_VERSION`. Low effort; distinguish version from build number. |
| `cordova-plugin-keyboard` | Native webview/keyboard behavior, with keyboard sizing/accessory preferences in config | Validate software-keyboard resize, focus, scroll-to-input, accessory bar and safe-area behavior. Configure WKWebView/native integration where needed; no explicit JS keyboard API use found. Desktop keyboard smoke testing does not cover this. |
| `cordova-plugin-statusbar` | Status-bar appearance/overlay preferences in `config.xml`; no direct JS use found | iOS native status-bar / safe-area configuration, theme and contrast validation. No requirement for a dedicated plugin unless runtime controls are needed. |
| `cordova-plugin-splashscreen` | Launch/splash assets and behavior configured in `config.xml`; no explicit JS use found | Generated iOS launch storyboard/assets plus startup UX validation; avoid carrying over Cordova-specific timing flags blindly. |
| `cordova-plugin-ionic-webview` | Cordova WKWebView host and resource/storage environment | Tauri already provides WKWebView. Validate origin/CSP, file access, durable storage, backup and upgrade behavior; no direct plugin port. |
| `cordova-plugin-backbutton` | Shared app/dialog listeners implement Android back behavior | Not an iOS parity item. Port native Android back events if/when Android is added. |
| `cordova-plugin-androidx-adapter` | Android build compatibility | No iOS replacement. Tauri owns its Android dependency setup. |

`cordova-plugin-add-swift-support` and `es6-promise-plugin` are build/runtime
compatibility dependencies, not separate end-user features. Tauri's native
tooling and modern webview replace their role.

## Cross-cutting gaps outside the plugin list

1. **Background auto-lock:** `packages/app/src/mixins/auto-lock.ts` records
   Cordova `pause` and checks elapsed time on `resume`. There is no equivalent
   bridge in the prototype. Tauri's native `WindowEvent::Suspended/Resumed`
   can feed a platform lifecycle abstraction. Test the timeout after suspension,
   lock-screen transitions and biometric prompts; a foreground timer is not
   evidence that background lock works.
2. **Authentication protocol parity:** Cordova advertises Email, TOTP and
   `AuthType.PublicKey`, and explicitly routes public-key challenges through
   `PublicKeyAuthClient`. Tauri inherits the web adapter's different supported
   types and WebAuthn platform-authenticator behavior. Reproduce Cordova's
   public-key flow explicitly; a Face ID prompt or a WebAuthn feature check
   does not make these protocols interchangeable. The Tauri webpack variable
   `PL_CLIENT_SUPPORTED_AUTH_TYPES` is email-only, but no consumer was found;
   the adapter's runtime supported-types list is the relevant path to audit.
3. **Protected secret semantics:** Cordova uses Keychain accessibility
   `WhenUnlockedThisDeviceOnly`, enrollment-bound access (`biometryCurrentSet`),
   and requests no backup credential fallback. Preserve these semantics,
   including enrollment-change invalidation and cancellation. An unprotected
   key plus a separate successful prompt is not an equivalent replacement.
4. **Data persistence and upgrades:** both adapters inherit localforage storage.
   Tauri/Cordova origin and container differences mean an in-place replacement
   needs a tested migration or deliberate re-login/re-sync path. Do not assume
   current biometric registrations or local encrypted vaults will transfer.
5. **Configuration parity:** Cordova locks iPhone to portrait while allowing
   iPad rotations; generated Tauri configuration currently allows landscape on
   iPhone too. Reconcile orientation, privacy usage descriptions, keyboard,
   launch screen, backup and safe-area settings in reproducible config.
6. **File import and attachments:** browser file inputs are still inherited.
   Exercise Files/iCloud pickers, download/share, large files and cancellation.
   Native save/share and import are related but distinct operations.

No iOS credential-provider/autofill extension was found in the Cordova package
or declared plugin set. Native autofill would be additional scope unless there
is shipping native code outside this repository to include in the inventory.

## Suggested implementation order

1. Lifecycle bridge and native snapshot privacy overlay.
2. Biometric Keychain secret storage and public-key authenticator adapter.
3. Native clipboard, external URLs, QR scanning and file sharing/export.
4. Device info, software keyboard, launch/status/orientation polish.
5. Physical-device acceptance tests and upgrade/storage migration tests.

Before calling parity complete, test Face ID success/cancel/lockout/enrollment
changes; background lock and app-switcher snapshots; copy/paste/clear; scan/cancel
and permission denial; export/import and attachments; app relaunch/offline sync;
and iPhone/iPad keyboard/orientation behavior. The simulator smoke test covers
none of the hardware-sensitive acceptance cases.

## Evidence and current upstream references

Local evidence: `packages/cordova/package.json`, `config.xml`, `src/platform.ts`;
installed `node_modules/cordova-plugin-fingerprint-aio/src/ios/Fingerprint.swift`
and `cordova-plugin-privacyscreen/src/ios/PrivacyScreenPlugin.m`;
`packages/core/src/auth/public-key.ts`; `packages/app/src/mixins/auto-lock.ts`,
`elements/clipboard.ts`, `lib/platform.ts`; `packages/tauri/src/platform.ts`.

- [Official biometric plugin](https://v2.tauri.app/plugin/biometric/)
- [Biometric iOS source](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/biometric/ios/Sources/BiometricPlugin.swift)
- [Biometric native API: cipher support is Android-only](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/biometric/src/mobile.rs)
- [Clipboard iOS text support](https://v2.tauri.app/plugin/clipboard/)
- [Barcode scanning, permissions and preview](https://v2.tauri.app/plugin/barcode-scanner/)
- [External URL opener: iOS limitations](https://v2.tauri.app/plugin/opener/)
- [Dialog and iOS file URIs](https://v2.tauri.app/plugin/dialog/)
- [OS information](https://v2.tauri.app/plugin/os-info/)
- [Tauri native lifecycle events](https://docs.rs/tauri/latest/tauri/enum.WindowEvent.html)

Upstream documentation describes current upstream capabilities, not the exact
versions in this prototype. Pin and inspect selected plugin releases during
implementation; in particular, Android biometric cipher support is not evidence
of iOS Keychain secret-store support.
