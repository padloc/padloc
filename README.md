# Padloc

[![](https://github.com/padloc/padloc/workflows/Run%20Tests/badge.svg?branch=main)](https://github.com/padloc/padloc/actions?workflow=Run+Tests)

Simple, secure password and data management for individuals and teams.

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/padloc/padloc/tree/main)

## About

This repo is split into multiple packages:

| Package Name                            | Description                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [@padloc/core](packages/core)           | Core Logic                                                                                       |
| [@padloc/app](packages/app)             | Web-based UI components                                                                          |
| [@padloc/server](packages/server)       | The Backend Server                                                                               |
| [@padloc/pwa](packages/pwa)             | The Web Client, a [Progressive Web App](https://developers.google.com/web/progressive-web-apps). |
| [@padloc/locale](packages/locale)       | Package containing translations and other localization-related things                            |
| [@padloc/electron](packages/electron)   | The Desktop App, built with Electron                                                             |
| [@padloc/cordova](packages/cordova)     | Cordova project for building iOS and Android app.                                                |
| [@padloc/tauri](packages/tauri)         | Cross-platform native app, powered by [Tauri](https://github.com/tauri-apps/tauri)               |
| [@padloc/extension](packages/extension) | Padloc browser extension                                                                         |

## How to use

As you can see in the [About](#about) section, there are lots of different
components to play with! But at a minimum, in order to set up and use your own
instance of Padloc you'll need to install and configure the
[Server](packages/server) and [Web Client](packages/pwa). In practice, there a
few different ways to do this, but if you just want to install and test Padloc
locally, doing so is really quite easy:

```sh
git clone git@github.com:padloc/padloc.git
cd padloc
nvm install && nvm use
npm install --global npm@11.20.0
npm ci
npm start
```

The web client is now available at `http://localhost:8080`!

In-depth guides on how to host your own "productive" version of Padloc and how
to build and distribute your own versions of the desktop and mobile apps are
coming soon!

## Contributing

All kinds of contributions are welcome!

If you want to **report a bug or have a feature request**, please
[create an issue](https://github.com/padloc/padloc/issues).

If you **have question, feedback or would just like to chat**, head over to the
[discussions](https://github.com/padloc/padloc/discussions) section.

If you want to **contribute to Padloc directly** by implementing a new feature
or fixing an existing issue, feel free to
[create a pull request](https://github.com/padloc/padloc/pulls)! However if you
plan to work on anything non-trivial, please do talk to us first, either by
commenting on an existing issue, creating a new issue or by pinging us in the
dissusions section!

To learn how to get started working on Padloc, refer to the
[Development](#development) section of the readme.

## Security

For a security design overview, check out the
[security whitepaper](security.md).

## Development

### Setup

Setting up your dev environment for working with Padloc is as simple as:

```sh
git clone git@github.com:padloc/padloc.git
cd padloc
nvm install && nvm use
npm install --global npm@11.20.0
npm ci
```

This may take a minute, so maybe grab a cup of ☕️.

### Dev Mode

To start "dev mode", simply run

```sh
npm run dev
```

from the root of the project. This will start the backend server (by default
listening on port `3000`), as well as the PWA (available on
`http://localhost:8080`) by default.

The server and PWA port can be changed vie the `PL_TRANSPORT_HTTP_PORT` and
`PL_PWA_PORT` environvent variables, respectively. For more configuration
options, check out the **Conguration** section of the
[server](packages/server#configuration) and [pwa](packages/pwa#configuration).

### Formatting

This project is formatted with [Prettier](https://prettier.io/). To re-format
all files using our [.prettierrc.json](.prettierrc.json) specification, run the
following from the root of the project.

```sh
npm run format
```

To simply check whether everything is formatted correctly, you can use the
following command:

```sh
npm run format:check
```

### Testing

To run unit tests, use:

```sh
npm run test
```

Cypress end-to-end tests can be run via:

```sh
npm run test:e2e
```

And to start cypress tests in "dev mode":

```ssh
npm run test:e2e:dev
```

### Adding / removing dependencies

Use npm workspaces to manage dependencies from the repository root:

```sh
npm install --workspace @padloc/server --save-exact typescript
npm uninstall --workspace @padloc/server typescript
```

These commands update the selected package and the shared root lockfile.

**Note**: We're trying to keep the number and size of third-party dependencies
to a minumum, so before you add a dependency, please think twice if it is really
needed! Pull requests with unnecessary dependencies will very likely be
rejected.

### Deployment / Publishing

Padloc has a lot of different components that all need to be
built/released/published in different ways. To manage this complexitiy, we have
compiled all deployment steps for all components in a single Github Workflow. To
release a new version, simply:

Run the
[Publish Release](https://github.com/padloc/padloc/actions?workflow=Publish+Release)
action for the desired commit, specifying the environment, `vendor_version`, and
build number. The workflow uses that version for the release tag and app
artifacts.

## Licensing

This software is published under the
[GNU Affero General Public License](LICENSE). If you wish to acquire a
commercial license, please contact us as
[sales@padloc.app](mailto:sales@padloc.app?subject=Padloc%20Commercial%20License).
