# @padloc/electron

Padloc Desktop app, built with [Electron](https://www.electronjs.org/)

## Setup

The `@padloc/electron` package is meant to be used from within the
[Padloc monorepo](../../README.md).

```sh
git clone git@github.com:padloc/padloc.git
cd padloc
npm ci
cd packages/electron
```

## Building

To build the app, run:

```sh
npm run build
```

The resulting build can be fund in the `dist` folder.

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
