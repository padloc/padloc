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
[Tauri's setup guide](https://tauri.studio/docs/getting-started/intro/#setting-up-your-environment)

## Building

To build the app, run:

```sh
npm run build
```

The resulting build can be found in the `dist` folder.

You can also build a debug version of the app, useful for - well - debugging:

```sh
npm run build:debug
```

### Build options

All build options are provided as environment variables:

| Variable Name   | Description                                        | Default  |
| --------------- | -------------------------------------------------- | -------- |
| `PL_SERVER_URL` | URL to the [server component](../server/README.md) | `./dist` |

## Development

For rapid development, there is also dev mode:

```sh
npm run dev
```

## Contributing

For info on how to contribute to Padloc, please refer to the
[monorepo readme](../../README.md#contributing).
