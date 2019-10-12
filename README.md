# Padloc

Simple, secure password and data management for individuals and teams (formerly known as Padlock).

This repo is split into multiple packages:

|                                   |                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [@padloc/core](packages/core)     | Core Logic                                                                                                          |
| [@padloc/app](packages/app)       | Web-based UI components                                                                                             |
| [@padloc/server](packages/server) | Backend Server                                                                                                      |
| [@padloc/pwa](packages/pwa)       | [Progressive Web App](https://developers.google.com/web/progressive-web-apps) built on top of `@padloc/app` package |

## Get Started

```
git clone https://github.com/padloc/padloc
cd padloc
npm install
```

## Build

```
npm run build
```

Runs `npm run build` in all packages.

## Start

```
npm start
```

Runs `npm start` in all packages. This will:

-   Start the backend server listening on port [`$PL_SERVER_PORT`](#configuration)
-   Start a file server for the web app listening on port [`$PL_CLIENT_PORT`](configuration)

## Development

```
npm run dev
```

This will start compilers for all packages in watch mode, start the node.js server
and host the web app.

## Configuration

The node.js server and build commands are configured via environment variables:

| Environment Variable | Description                                                                           |
| -------------------- | ------------------------------------------------------------------------------------- |
| `PL_SERVER_PORT`     | Which port to start the backend server on                                             |
| `PL_SERVER_URL`      | URL the server will be available at. This will be used by the client for api requests |
| `PL_PWA_PORT`        | Which port to host the pwa at                                                         |
| `PL_PWA_URL`         | URL of the client app. This will be used by the server to generate deep links.        |
| `PL_EMAIL_USER`      | SMTP user for sending emails.                                                         |
| `PL_EMAIL_SERVER`    | SMTP server for sending emails                                                        |
| `PL_EMAIL_PORT`      | SMTP port for sending emails                                                          |
| `PL_EMAIL_PASSWORD`  | SMTP password for sending email                                                       |
| `PL_DB_PATH`         | Database path used by backend server                                                  |
| `PL_REPORT_ERRORS`   | Email address used for reporting unexpected errors in the backend.                    |

## Security

For an security design overview, check out [this document](security.md).
