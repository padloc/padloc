# @padloc/server

This package contains the Padloc backend server component.

This is the community server entry point, supporting basic provisioning only.
SCIM, directory automation, API, Stripe, directory, and OAuth provisioning,
OAuth authentication, and request/change auditing are composed by the
[enterprise server](../../enterprise/server/README.md). Basic team management
and operational logging remain available here. Deployments using enterprise
settings should use the enterprise entry point with their existing configuration
and storage.

## How to use

### Through Docker

The recommended setup for hosting the Padloc server is through Docker (For v4,
you'll have to build the Docker image from source for now. Official image coming
soon!):

```sh
docker build -t padloc/server github.com/padloc/padloc#v4 -f Dockerfile-server
docker run padloc/server
```

For some examples of a Docker-based setup, check out our
[Docker Examples](../../docs/examples/hosting/docker).

### Directly through Node.js

Currently the `@padloc/server` package is meant to be run from within the
[Padloc monorepo](../../README.md). A standalone npm package is coming soon!

First, clone and install the monorepo:

```sh
git clone git@github.com:padloc/padloc.git
cd padloc
npm ci
```

Then, you can either start the server from the root of the project...

```sh
npm run server:start
```

Or from the package directory.

```sh
cd packages/server
npm start
```

By default, the server will listen on port `3000`. To can set a different port
via the `PL_TRANSPORT_HTTP_PORT` environment variable:

```sh
PL_TRANSPORT_HTTP_PORT=3001 npm start
```

For more configuration options, please consult the
[Configuration](#configuration) section of this readme.

## Configuration

Padloc comes with a lot of configuration options, most of which deal with
selecting and configuring backends for certain aspects of the software.

All configuration options for the `@padloc/server` package are defined in the
[src/config](src/config.ts) moule, and while we'll be discussing the most
important ones here, looking at the source can be a great way to understand how
configuration options are structured and parsed, and to familiarise yourself
with some of the more advanced configuration options.

Most of Padloc's configuration happens through environment variables, and
because there are a lot of options and therefore a lot of different variables,
we've come up with a simple naming scheme that's based on the hierarchical
nature of Padloc's configuration. This means that most of the time, you'll be
able to guess the environment variable name simply by looking at the structure
defined in [src/config](src/config.ts).

The generall pattern is that in order to configure a certain aspect, you'll
first choose which backend you want to use. Then, you'll provide the
configuration options required by that specific backend by setting the
corresponding environment variables, which are name-spaced with the backend's
name.

For example, you can choose which backend to use for data storage by setting the
`PL_DATA_BACKEND` variable. By default, Padloc uses LevelDB for data storage on
the server side. To use PostgreSQL instead, simply set the `PL_DATA_BACKEND`
variable to `postgres`.

```sh
PL_DATA_BACKEND=postgres
```

Naturally, Padloc now needs to know where to reach the Postgres server, so
you'll need to set the corresponding environment variables. Our naming scheme
dictates that all postgres-related configuration options are prefixed with
`PL_DATA_POSTGRES_*`. An exampe for a full postgres configuration might look as
follows:

```sh
PL_DATA_BACKEND=postgres
PL_DATA_POSTGRES_HOST=localhost
PL_DATA_POSTGRES_PORT=5432
PL_DATA_POSTGRES_USER=someuser
PL_DATA_POSTGRES_PASSWORD=somepassword
PL_DATA_POSTGRES_DATABASE=padloc
```

Padloc is designed to be extremely modular, so you'll find that most aspects of
the software can be configured to use different backends. And if your technology
of choice isn't supported, it's usually fairly straightforward to implement the
required backend. [Pull requests welcome](../../README.md#contributing)!

### Setting Environment Variables

Environment variables can be set either the traditional way (consult the
documentation of your operating system) or via a
[`.env`](https://www.npmjs.com/package/dotenv) file. By default, Padloc will
look for a file named `.env` in the current working directory, but you can also
specifiy the path to a different file using the `--env` flag:

```sh
npm start -- --env=/path/to/env/file/.env
```

Note that by default, environment variables set through other means take
preference over the ones defined in your `.env` file. If you want your `.env`
file to override any variables set elsewhere, use the `--env-override` flag:

```sh
npm start -- --env=/path/to/env/file/.env --env-override
```

For your convenience, we've compiled **all** available environment variables in
a [`sample .env file`](resources/example.env). Simply copy the file to wherever
you want to keep it and the uncomment and edit any options you want to set (more
info about the most important configuration options below).

### General Server Options

TBD

### Data Transport

TBD

### Data Storage

TBD

### Attachment Storage

TBD

### Logging

TBD

### Authentication

TBD

### Provisioning

TBD

### IP geolocation

GeoIP adds country and optional city information to sessions, logs, and login
notifications. Locations are estimates based on IP addresses, not proof of a
user's physical location.

The `maxmind` backend reads a local, uncompressed MMDB file. It supports
databases with the MaxMind city schema, including DB-IP City Lite and GeoLite2
City; `country.names.en` must be present and nonempty, while `city.names.en` is
optional. The backend name identifies the reader, not the data provider.

| Variable                    | Default             | Purpose                                                                                                   |
| --------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------- |
| `PL_GEOIP_ENABLED`          | `true`              | Enable geolocation.                                                                                       |
| `PL_GEOIP_BACKEND`          | `maxmind`           | Select `maxmind` for a supplied MMDB or `dbip` for DB-IP City Lite.                                       |
| `PL_GEOIP_MAXMIND_DB_PATH`  | `./geoip/city.mmdb` | Path to the MMDB file, relative to the server's working directory. Docker defaults to `/geoip/city.mmdb`. |
| `PL_GEOIP_ATTRIBUTION_TEXT` | empty               | Provider attribution for login emails and client location displays.                                       |
| `PL_GEOIP_ATTRIBUTION_URL`  | empty               | Link for the attribution text; leave empty for plain text.                                                |
| `PL_GEOIP_DBIP_DB_PATH`     | `./geoip/city.mmdb` | DB-IP cache file. Docker defaults to `/geoip/city.mmdb`.                                                  |
| `PL_GEOIP_DBIP_AUTO_UPDATE` | `true`              | Automatically download and activate new monthly DB-IP City Lite editions.                                 |

The default `maxmind` backend requires a readable MMDB before startup. It never
downloads files; restart the server after manually replacing its database. For
Docker, a read-only mount under `/geoip` is sufficient.

To manage DB-IP City Lite automatically, set `PL_GEOIP_BACKEND=dbip`. This
backend extends the MMDB reader with background downloads from DB-IP's official
HTTPS endpoint. It checks at startup and daily, skips the current monthly
edition, and validates downloads before atomically replacing the cache and
activating a new reader. Failed updates retain the last working database. On
first startup, locations remain unavailable until a download succeeds; requests
do not wait for downloads. The cache directory must be writable and persistent
(mount `/geoip` in Docker). Set `PL_GEOIP_DBIP_AUTO_UPDATE=false` to use a
manually provisioned DB-IP file without downloads, and restart after replacing
it manually.

Set `PL_GEOIP_ENABLED=false` to disable the service, including automatic
updates. Neither backend submits client IPs to an external service. Configure
provider attribution using the common attribution variables on both server
runtime and client builds. For DB-IP, use `IP Geolocation by DB-IP` and
`https://db-ip.com`.

## Development

For development instructions, please refer to the
[monorepo readme](../../README.md#development).

## Contributing

For info on how to contribute to Padloc, please refer to the
[monorepo readme](../../README.md#contributing).

## Licensing

This software is published under the
[GNU Affero General Public License](../../LICENSE-AGPL.txt). If you wish to
acquire a commercial license, please contact us as
[sales@padloc.app](mailto:sales@padloc.app?subject=Padloc%20Commercial%20License).
