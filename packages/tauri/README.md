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

## Development

For rapid development, there is also dev mode:

```sh
npm run dev
```

## Contributing

For info on how to contribute to Padloc, please refer to the
[monorepo readme](../../README.md#contributing).
