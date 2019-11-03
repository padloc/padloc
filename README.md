# Padloc

Simple, secure password and data management for individuals and teams (formerly known as Padlock).

This repo is split into multiple packages:

| Package Name                          | Description                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [@padloc/core](packages/core)         | Core Logic                                                                                                                                |
| [@padloc/app](packages/app)           | Web-based UI components                                                                                                                   |
| [@padloc/server](packages/server)     | The Backend Server                                                                                                                        |
| [@padloc/pwa](packages/pwa)           | The Web Client, a [Progressive Web App](https://developers.google.com/web/progressive-web-apps) built on top of the `@padloc/app` package |
| [@padloc/locale](packages/locale)     | Package containing translations and other localization-related things                                                                     |
| [@padloc/electron](packages/electron) | The Desktop App, built with Electron                                                                                                      |
| [@padloc/cordova](packages/cordova)   | Cordova project for building iOS and Android app.                                                                                         |

## Getting Started

#### Step 0: Install Prerequisites

You'll need

-   [node.js](https://nodejs.org/) v12 or greater
-   [Git](https://git-scm.com/)

#### Step 1: Clone the Repo

```sh
git clone https://github.com/padloc/padloc
cd padloc
```

#### Step 2: Install Dependencies

```sh
npm install
```

#### Step 3: Start Server and Web Client

```sh
PL_DATA_DIR=~/padloc-data \
PL_SERVER_PORT=3000 \
PL_PWA_PORT=8080 \
npm run start
```

For more configuration options, see [Configuration](#configuration)

## Scripts

| Command                | Description                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm start`            | Starts both backend server and web client.                                                                                                                        |
| `npm run server:start` | Starts only backend server.                                                                                                                                       |
| `npm run pwa:start`    | Starts only web client (You'll need to run `npm run pwa:build` first).                                                                                            |
| `npm run pwa:build`    | Builds the web client                                                                                                                                             |
| `npm run dev`          | Starts backend server and client app in dev mode, which watches for changes in the source files and automatically rebuilds/restarts the corresponding components. |
| `npm test`             | Run tests.                                                                                                                                                        |

## Configuration

| Environment Variable | Default                          | Description                                                                                               |
| -------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `PL_SERVER_PORT`     | `3000`                           | Which port to host the backend server on                                                                  |
| `PL_SERVER_URL`      | `http://0.0.0.0:$PL_SERVER_PORT` | Public URL that will resolve to the backend server. Used by clients to send requests.                     |
| `PL_PWA_PORT`        | `8080`                           | Which port to host the web client on                                                                      |
| `PL_PWA_URL`         | `http://0.0.0.0:$PL_PWA_PORT`    | Public URL that will resolve to the web client. Used by the server to generate links into the web client. |
| `PL_PWA_DIR`         | `./packages/pwa/dist`            | Build directory for web client.                                                                           |
| `PL_DATA_DIR`        | `./data`                         | Directory used by server for persistent data storage                                                      |
| `PL_ATTACHMENTS_DIR` | `./attachments`                  | Directory used by server to store attachments                                                             |
| `PL_LOGS_DIR`        | `./logs`                         | Directory used by server to store logs                                                                    |
| `PL_EMAIL_USER`      | -                                | SMTP user for sending emails.                                                                             |
| `PL_EMAIL_SERVER`    | -                                | SMTP server for sending emails                                                                            |
| `PL_EMAIL_PORT`      | -                                | SMTP port for sending emails                                                                              |
| `PL_EMAIL_PASSWORD`  | -                                | SMTP password for sending email                                                                           |
| `PL_REPORT_ERRORS`   | -                                | Email address used for reporting unexpected errors in the backend.                                        |

## Security

For a security design overview, check out the [security whitepaper](security.md).
