# @padloc/tauri

Native cross-platform app, powered by
[Tauri](https://github.com/tauri-apps/tauri).

## Setup

The `@padloc/tauri` package is meant to be used from within the
[Padloc monorepo](../../README.md).

```sh
git clone git@github.com:padloc/padloc.git
cd padloc
npm ci
cd packages/tauri
```

You also need to follow
[Tauri's setup guide](https://v2.tauri.app/start/prerequisites/)

## Building

To build the app, run:

```sh
npm run build
```

The web assets are written to `dist`. Native installers and app bundles are
written to `src-tauri/target/release/bundle` (or
`target/<target>/release/bundle` when cross-compiling). Release builds require
`TAURI_SIGNING_PRIVATE_KEY` and optionally `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
for signed updater artifacts.

You can also build a debug version of the app, useful for - well - debugging:

```sh
npm run build:debug
# macOS app bundle only (skip DMG packaging):
npm run build:debug -- --bundles app
```

Debug bundles are written to `src-tauri/target/debug/bundle`. The local config
disables updater artifact signing, so no production signing key is needed.
Install a stable Rust toolchain before building. Linux requires WebKitGTK 4.1
and the system packages listed in `.github/workflows/build-tauri.yml`.

### Build options

All build options are provided as environment variables:

| Variable Name   | Description                                        | Default                 |
| --------------- | -------------------------------------------------- | ----------------------- |
| `PL_SERVER_URL` | URL to the [server component](../server/README.md) | `http://localhost:3000` |

## Releasing and updates

The `Publish Release` workflow builds signed bundles for Intel/Apple Silicon
macOS, Linux x86_64, and Windows x86_64. Each build stages its installers,
updater archive, signature, and checksums. The publish job validates and merges
all four manifest fragments, uploads the bundles, then uploads
`tauri-update.json` last. A failed or incomplete build does not publish a new
update feed.

The workflow maps the existing `TAURI_PRIVATE_KEY` and `TAURI_KEY_PASSWORD`
GitHub secrets to Tauri 2's `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` environment variables. Keep the existing
signing key: installed apps verify updates against its public key. macOS release
signing/notarization also uses the configured Apple certificate, identity,
account, and team secrets.

`createUpdaterArtifacts` uses `v1Compatible` while migrating existing installs.
The feed includes Tauri 2 architecture keys and legacy platform aliases; its
signatures contain the actual `.sig` contents. Switch to native v2 archives only
after the v1 migration window, updating the staging helper accordingly. Releases
start as prereleases. After the complete feed is uploaded, Production releases
are promoted to stable; Beta releases remain prereleases and are not advertised
by the stable `/releases/latest/` updater endpoint.

To stage a platform's signed build manually:

```sh
PL_VENDOR_VERSION=4.4.0 node generate-tauri-update-file.js stage darwin-aarch64 src-tauri/target/release/bundle release-artifacts
# After collecting all four platforms into release-artifacts:
PL_VENDOR_VERSION=4.4.0 node generate-tauri-update-file.js merge release-artifacts tauri-update.json
npm run test:release
```

For unattended macOS packaging, `CI=true npm run build:debug` uses Tauri's CI
DMG mode, which skips Finder window customization. The `Build Tauri` workflow
also checks that each native executable stays running on its matching runner;
Linux runs under Xvfb. These startup checks do not replace interactive tests of
login, vault operations, or device integrations.

## Development

For rapid development, there is also dev mode:

```sh
npm run dev
```

## Contributing

For info on how to contribute to Padloc, please refer to the
[monorepo readme](../../README.md#contributing).
