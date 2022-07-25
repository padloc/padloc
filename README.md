# Padloc

[![](https://github.com/padloc/padloc/workflows/Run%20Tests/badge.svg?branch=main)](https://github.com/padloc/padloc/actions?workflow=Run+Tests)

Simple, secure password and data management for individuals and teams.

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

Since this is a monorepo consisting of multiple packages, adding/removing
to/from a single package can be less than straightforward. The following
commands are meant to make this easier.

To add a dependency to a package, run:

```sh
scope=[package_name] npm run add [dependency]
```

And to remove one:

```sh
scope=[package_name] npm run remove [dependency]
```

For example, here is how you would add `typescript` to the `@padloc/server`
package:

```sh
scope=server npm run add typescript
```

**Note**: We're trying to keep the number and size of third-party dependencies
to a minumum, so before you add a dependency, please think twice if it is really
needed! Pull requests with unnecessary dependencies will very likely be
rejected.

### Updating The Version

The Padloc project consists of many different subpackages. To simplify
versioning, we use a global version for all them. This means that when releasing
a new version, the version of all subpackages needs to be updated, regardless of
whether there have been changes in them or not. To update the global version
accross the project, you can use the following command:

```sh
npm run version [semver_version]
```

### Deployment / Publishing

Padloc has a lot of different components that all need to be
built/released/published in different ways. To manage this complexitiy, we have
compiled all deployment steps for all components in a single Github Workflow. To
release a new version, simply:

1. [Update project version](#updating-the-version)
2. Commit and push.
3. Run the
   [Publish Release](https://github.com/padloc/padloc/actions?workflow=Publish+Release)
   action.

## Licensing

This software is published under the
[GNU Affero General Public License](LICENSE). If you wish to acquire a
commercial license, please contact us as
[sales@padloc.app](mailto:sales@padloc.app?subject=Padloc%20Commercial%20License).
