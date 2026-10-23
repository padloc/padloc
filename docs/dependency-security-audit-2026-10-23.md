# Dependency security audit — 2026-10-23

Base: `padloc/padloc` main at `5af597c9` (fetched from origin). Local branch:
`security/dependency-audit-2026-10-23`. No changes pushed.

Rebased locally on 2026-10-30 onto `origin/main` at `e03779f7`, preserving the
new Tauri mobile dependencies and extension biometric safeguards. The upstream
server's enrollment handles, origin allowlist, user-verification policy and
attestation setting (`none`) are retained. The upgraded browser client uses
base64url user handles, so the legacy v5 user-ID rewrite is removed and the
upstream enrollment tests check the decoded handle. Both upstream and audit
WebAuthn regression suites are retained. The audit counts and validation results
below describe the original 2026-10-23 audit, not a fresh vulnerability scan.

Rebase validation: all 61 workspace tests pass (17 core, 18 extension, 26
server). PWA, Chromium extension and Tauri JavaScript builds pass. Formatting,
npm lockfile consistency and Cargo lockfile dependency-reference checks pass.

Audited the full npm workspace lockfile, including production, development,
optional and platform-specific dependencies, with `npm audit --json`. Audited
the Tauri Cargo lockfile with OSV Scanner. These are known-advisory scans, not a
source-code security review or a guarantee of vulnerability absence.

## Results

| npm severity | Before | After |
| ------------ | -----: | ----: |
| Critical     |      8 |     0 |
| High         |     55 |    15 |
| Moderate     |     49 |     4 |
| Low          |      9 |     0 |
| Total        |    121 |    19 |

Counts are npm affected-package totals, including dependents of vulnerable
packages; they are not counts of independent CVEs. No audit exclusions, severity
filters or advisory suppressions were added.

Upgraded vulnerable direct dependencies and compatible transitive dependencies.
Major updates include DOMPurify, SimpleWebAuthn, Tiptap, Nodemailer, Cypress,
Electron and its packaging tools, Cordova and vulnerable mobile plugins, Workbox
build tools and Sharp. Updated AWS S3, MongoDB, YAML, diff and ts-loader.
Selected webpack-dev-server 5.2.7 to fix its direct advisories while preserving
compatibility with webpack-cli 5. Removed redundant type packages and replaced
vulnerable ts-node-dev with Node's native watch mode plus ts-node.

Added scoped overrides for MailDev's DOMPurify and Socket.IO, external-editor's
tmp, and Xcode/SockJS UUID dependencies. Verified the resulting lockfile
contains only tmp 0.2.7 and uuid 11.1.1, and checked the affected APIs.

Adapted WebAuthn registration/authentication to the current asynchronous APIs
and credential shapes while retaining the existing persisted credential ID,
public key and counter format. Regression tests cover new registration,
existing-key authentication, rejected signatures and counter persistence. The
new WebAuthn API requires direct attestation in place of the removed indirect
attestation option. Updated DOMPurify imports, GeoIP's module API, Tiptap
mounting, Electron window opening, SMTP's void return contract and the MongoDB
conversion helper.

Cargo updates include rustls-webpki 0.103.16 and webpki-root-certs 1.0.11,
clearing RUSTSEC-2026-0382 and RUSTSEC-2026-0383, plus compatible Tauri updates.

## Unresolved findings

| Dependency             | Advisory / constraint                                                                                                                                                    | Required follow-up                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| braces 3.0.3           | GHSA-vfj7-8cjw-p6xm; the latest published version remains affected. Drives 15 high npm package findings through micromatch, Cordova, webpack-dev-server and Workbox CLI. | Await a patched upstream release or replace the consumers' brace/glob implementation. |
| file-type 16.5.4       | GHSA-5v7r-6r5c-r473; fix starts at 21.3.1, outside Jimp 0.16's supported range and with a changed API.                                                                   | Migrate the webpack-pwa-manifest/Jimp image-generation chain.                         |
| phin 2.9.3             | GHSA-x565-32qp-m3vf; fixed in 3.7.1, whose promise API replaces the callback API used by Jimp 0.16.                                                                      | Migrate Jimp or replace the image-generation chain. Do not force a breaking override. |
| glib 0.18.5            | RUSTSEC-2024-0429 / GHSA-wrw7-89jp-8q8g (same issue); fixed in 0.20, but Tauri's GTK3 dependency requires 0.18.                                                          | Upstream GTK/Tauri dependency migration.                                              |
| zip 4.6.1              | RUSTSEC-2026-0367, RUSTSEC-2026-0368, RUSTSEC-2026-0369; fixes require 9.x, while tauri-plugin-updater 2.14.0 requires 4.x on Windows.                                   | Upstream updater migration; validate Windows update extraction before release.        |
| proc-macro-error 1.0.4 | RUSTSEC-2024-0370: unmaintained, with no patched version. Pulled in by GTK/GLib macros.                                                                                  | Upstream macro dependency replacement.                                                |

Jimp, file-type and phin account for the four remaining moderate npm package
findings. npm's suggested forced fixes include downgrades of modern Cordova and
Workbox; those do not establish a safe, supported remediation. The audit still
exits nonzero because the findings above remain unresolved.

## Validation

Used Node 26.12.1 and npm 11.20.0, matching repository requirements.

-   `npm test`: 36 passing (14 core, 8 extension, 14 server), including the new
    WebAuthn and HTML sanitization tests; workspace TypeScript checks pass.
-   Built extension worker lifecycle suites: Chromium 11 passing, Safari 11
    passing.
-   PWA and admin builds pass.
-   Chromium, Firefox and Safari extension UI/background builds pass.
-   Electron and Cordova webpack bundles pass. Native packaging, signing and
    device execution were not validated.
-   Zero-configuration server startup (`server:start-dry`) passes.
-   `webpack serve --help` loads the patched development server with the
    existing CLI.
-   Scoped-override API smoke checks pass.
-   Full Prettier check and translation extraction pass; extraction leaves no
    locale resource changes.
-   npm lockfile validation uses `npm ci --dry-run --ignore-scripts --offline`.
-   `cargo check --locked` is blocked by missing system GLib/GTK/WebKit
    development libraries (first failure: pkg-config cannot locate glib-2.0 >=
    2.70).
-   Cypress verification is blocked by missing Xvfb (`spawn Xvfb ENOENT`), so
    the end-to-end suite was not run. Native runtime and end-to-end validation
    remain necessary before release, especially for the major platform upgrades.

Raw before/after audit JSON and command logs are saved locally outside the
repository at `/workspace/scratch/padloc-security-audit/`.
