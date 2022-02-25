# @padloc/extension

The Padloc browser extension.

## Setup

The `@padloc/extension` package is meant to be used from within the
[Padloc monorepo](../../README.md).

```sh
git clone git@github.com:padloc/padloc.git
cd padloc
npm ci
cd packages/extension
```

## Building

To build an unpacked version of the web extension, simply run the following from
within the package directory.

```sh
npm run build
```

The resulting build can be fund in the `dist` folder.

### Build options

All build options are provided as environment variables:

| Variable Name   | Description                                        | Default  |
| --------------- | -------------------------------------------------- | -------- |
| `PL_SERVER_URL` | URL to the [server component](../server/README.md) | `./dist` |

### Installing an unpacked extension

Once built, the easiest way to install and use the extension is to install it as
an "unpacked extension". Steps vary from browser to browser:

Google Chrome:
https://developer.chrome.com/docs/extensions/mv3/getstarted/#unpacked

Firefox:
https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#installing

## Development

For development instructions, please refer to the
[monorepo readme](../../README.md#development).

## Contributing

For info on how to contribute to Padloc, please refer to the
[monorepo readme](../../README.md#contributing).
