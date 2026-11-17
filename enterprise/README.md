# Enterprise components

Enterprise components live in `enterprise/*`; community packages and maintained
clients live in `packages/*`. Enterprise components may consume community
packages. Community packages must build and run without enterprise source or
dependencies.

The admin portal is `enterprise/admin` (`@padloc/admin`). The enterprise server
is `enterprise/server` (`@padloc/enterprise-server`): it composes directory
synchronization, SCIM, OAuth authentication, API, Stripe, directory, and OAuth
provisioning, and change/request audit logging with the community server. Only
basic provisioning remains in community. Basic operational logging, team
management, groups, vault permissions, and individual security checks remain in
the community packages.

Shared protocol models and client-side OAuth/directory controls remain in the
community packages so maintained clients can connect to either server edition.
The community server hides unavailable directory controls through provisioning
and rejects attempts to enable synchronization. Existing organization data can
still be read, edited, or have synchronization disabled.

## Development

Use the Node and npm versions specified by the root `package.json`.

```sh
npm ci
npm run dev              # Community server and PWA
npm run dev:enterprise   # Enterprise server, PWA, and admin portal
npm run admin:build      # Build the admin portal
npm run server:start:enterprise
npm run server:start-dry:enterprise
```

The community server and PWA can be installed and built without this directory.
`Dockerfile-server` and `Dockerfile-pwa` copy only their required community
workspaces; CI builds and validates both images without enterprise source. A
full root `npm ci` installs both community and enterprise workspaces.

See the [enterprise server guide](server/README.md) for configuration and Docker
deployment. The server runtime exposes service interfaces for authentication,
provisioning, directory updates, and audit storage; only the enterprise entry
point imports their enterprise implementations.

## Licensing

Padloc code under `enterprise/` is covered by the
[Padloc Enterprise Source License](../LICENSE-ENTERPRISE.txt). For community and
third-party terms, see the [repository license map](../README.md#licensing).
