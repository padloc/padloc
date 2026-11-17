# Enterprise server

`@padloc/enterprise-server` composes enterprise services with `@padloc/server`.
It provides SCIM, directory membership/group synchronization, API, Stripe,
directory, and OAuth provisioning, OAuth authentication, and optional
request/change auditing. Basic operational logging stays in the community
server.

## Running locally

From the repository root, using the required Node/npm versions:

```sh
npm ci
npm run server:start:enterprise
```

Use `npm run dev:enterprise` for the server, PWA, and admin portal together.
`npm run server:start-dry:enterprise` validates composition without opening
HTTP, provisioning, or SCIM listeners or contacting Stripe.

The workspace start/dev commands run from `packages/server`, preserving its
`.env` location and relative database/attachment paths. Enterprise settings keep
their existing `PL_DIRECTORY_*`, `PL_AUTH_OAUTH_*`, `PL_PROVISIONING_*`,
`PL_CHANGE_LOG_*`, and `PL_REQUEST_LOG_*` names. SCIM is enabled by default in
the enterprise edition. Audit logging remains opt-in with
`PL_CHANGE_LOG_ENABLED=true` and `PL_REQUEST_LOG_ENABLED=true`.

Only `PL_PROVISIONING_BACKEND=basic` is available in the community server. The
enterprise server also accepts `api`, `stripe`, `directory`, and `oauth`:

-   `api` requires `PL_PROVISIONING_API_API_KEY`; its authenticated provisioning
    endpoint uses `PL_PROVISIONING_API_PORT` (default `4000`).
-   `stripe` uses `PL_PROVISIONING_STRIPE_*` configuration, including
    `SECRET_KEY` and `PUBLIC_KEY`; its billing/webhook endpoint uses `PORT`
    (default `4000`). Normal startup loads plans from the configured Stripe
    account.
-   `directory` and `oauth` use their corresponding
    `PL_PROVISIONING_DIRECTORY_*` and `PL_PROVISIONING_OAUTH_*` settings
    alongside directory/auth configuration.

Publish port `4000` separately when using API or Stripe provisioning in Docker.
The provisioner implementations and Stripe SDK dependency live exclusively in
the enterprise server workspace.

The community entry point (`npm run server:start`) does not initialize these
services and rejects enterprise-only settings with an explanatory error. Switch
existing deployments using those settings to the enterprise entry point. OAuth
authentication does not replace vault decryption or unlock behavior.

## Docker

```sh
docker build -f Dockerfile-server-enterprise -t padloc/server-enterprise .
docker run --rm -p 3000:3000 -p 5000:5000 padloc/server-enterprise
```

Pass the existing environment configuration and persistent storage mounts when
switching an existing deployment. The community `Dockerfile-server` excludes
enterprise source and dependencies; `Dockerfile-server-enterprise` adds only the
enterprise server workspace, without the admin portal.

## Interfaces and licensing

Community code defines the wire models and service interfaces. Enterprise code
implements them and supplies services to the reusable community runtime. The
community runtime never imports this workspace. Tests cover configuration
isolation, composition, directory synchronization, and audit storage.

The [Padloc Enterprise Source License](../../LICENSE-ENTERPRISE.txt) covers the
enterprise server code. The Docker image includes the enterprise and community
licenses.
