# LevelDB + NGINX External Proxy Deploy Design

**Date:** 2026-07-08  
**Status:** Draft for review  
**Branch target:** feature branch, then PR into `main`

## Goal

Add a production-oriented Docker Compose example that runs Padloc with:

- LevelDB storage
- filesystem attachments
- internal NGINX that unifies PWA + API on one port
- no published host ports
- integration with an external reverse proxy over a shared Docker network

This is the preferred self-host layout when TLS/domain routing is already handled by an external proxy (Traefik, Caddy, nginx-proxy, existing host nginx-in-docker, etc.).

## Non-goals

- Changing application source code
- Replacing or rewriting the existing `basic`, `nginx`, `caddy`, or `postgres-nginx-letsencrypt` examples
- Shipping a full external proxy stack inside this compose file
- Postgres/Mongo backends in this example
- Automatic certificate issuance inside this stack

## Existing context

The repo already has Docker hosting examples under:

`docs/examples/hosting/docker/`

| Example | Backend | Proxy | Host ports |
| --- | --- | --- | --- |
| `basic` | LevelDB | none | yes (`3000`, `8080`) |
| `nginx` | LevelDB | internal nginx | yes (`80`) |
| `caddy` | LevelDB | internal caddy | yes |
| `postgres-nginx-letsencrypt` | Postgres | internal nginx + certbot | yes |

None of those match the requested layout: LevelDB + internal nginx + external reverse proxy + no host port publish.

Root `docker-compose.yml` remains a monorepo/dev-oriented compose file and is out of scope for this design.

## Chosen approach

Create a new example directory:

```text
docs/examples/hosting/docker/leveldb-nginx-external-proxy/
  docker-compose.yml
  nginx.conf
  .env.example
  README.md
```

Update the index file:

`docs/examples/hosting/docker/README.md`

to link the new example.

## Architecture

```text
Internet / LAN clients
        |
        v
[external reverse proxy container]
  TLS / domain routing / auth edge
        |
        | shared Docker network: proxy
        v
[padloc nginx :80]
  location /        -> static files from pwa volume
  location /server  -> http://server:3000
        |
        +--> server (LevelDB + attachments)
        +--> pwa (build static assets into shared volume)
```

### Service roles

1. **server**
   - Image built from repo `Dockerfile-server`
   - Storage backend: `leveldb`
   - Attachments backend: `fs`
   - Exposes only container port `3000`
   - Persists data and attachments via named volumes
   - Not published to the host

2. **pwa**
   - Image built from repo `Dockerfile-pwa`
   - Runs build command to produce static assets into shared volume
   - Not published to the host
   - Not required at runtime after successful build, but remains in compose for rebuilds

3. **nginx**
   - Official `nginx` image
   - Serves PWA static files from volume
   - Proxies `/server` to the Padloc API
   - Listens on container port `80`
   - Joins external Docker network `proxy`
   - Not published to the host

## Network design

- Compose defines:
  - internal default network for `server`, `pwa`, `nginx`
  - external network named `proxy`
- Only `nginx` attaches to `proxy`
- External reverse proxy containers must also join `proxy`
- Upstream target for the external proxy:

```text
http://nginx:80
```

or, if a custom service/container name is used, the matching Docker DNS name on the shared network.

Network creation is a manual prerequisite:

```sh
docker network create proxy
```

## Environment and URL contract

Public-facing URLs must be the real domain values, not `localhost`.

Required variables in `.env.example`:

```env
PL_HOSTNAME=padloc.example.com
PL_PWA_URL=https://padloc.example.com
PL_SERVER_URL=https://padloc.example.com/server
PL_SERVER_CLIENT_URL=https://padloc.example.com
```

Server storage variables:

```env
PL_DATA_BACKEND=leveldb
PL_DATA_LEVELDB_DIR=/data
PL_ATTACHMENTS_BACKEND=fs
PL_ATTACHMENTS_FS_DIR=/attachments
PL_EMAIL_BACKEND=console
```

Notes:

- `PL_SERVER_URL` is used by the PWA build and must match the external path served by nginx (`/server`).
- `PL_SERVER_CLIENT_URL` should match the public PWA origin.
- Email remains `console` in the example; production SMTP is a follow-up.

## Volume design

Named volumes:

- `data` mounted at `/data` on `server` for LevelDB
- `attachments` mounted at `/attachments` on `server`
- `pwa` shared between `pwa` build output and nginx static root

This keeps vault data, attachments, and built frontend assets outside the container filesystem.

## NGINX config

Reuse the proven path model from `docs/examples/hosting/docker/nginx/nginx.conf`:

- `/` serves static PWA assets
- `/server` reverse-proxies to `http://server:3000`
- `client_max_body_size 10m` for attachments
- gzip for common static content types
- `X-Frame-Options deny`

No TLS termination inside this nginx instance. TLS belongs to the external reverse proxy.

## Compose shape

High-level compose responsibilities:

```yaml
services:
  server:
    build: Dockerfile-server from repo root context
    env for LevelDB + attachments + public client URL
    volumes: data, attachments
    expose: "3000"
    restart: unless-stopped

  pwa:
    build: Dockerfile-pwa from repo root context
    env for public PWA/server URLs
    volumes: pwa
    command: ["build"]
    restart: on-failure

  nginx:
    image: nginx
    depends_on: [server, pwa]
    volumes: pwa + local nginx.conf
    expose: "80"
    networks: [default, proxy]
    restart: unless-stopped

networks:
  proxy:
    external: true

volumes:
  data:
  attachments:
  pwa:
```

Build context policy:

- Prefer building from the local repository root so the example matches this fork’s current Node 18 + pnpm Dockerfiles.
- Do not hardcode `github.com/padloc/padloc.git#main` for this fork-oriented example.

Because the example lives under `docs/examples/...`, compose build context should point back to the repo root with a relative path, for example:

```yaml
build:
  context: ../../../../
  dockerfile: Dockerfile-server
```

Exact relative path must be verified during implementation from:

`docs/examples/hosting/docker/leveldb-nginx-external-proxy/`

to repo root.

## README contents

The example README must include:

1. Prerequisites
   - Docker + Compose
   - external reverse proxy already available
   - `docker network create proxy`
2. Configuration
   - copy `.env.example` to `.env`
   - set public domain URLs
3. Start
   - `docker compose up -d --build`
4. External proxy examples
   - minimal nginx upstream example
   - minimal Traefik/Caddy notes if short and accurate
5. Data location
   - LevelDB and attachments volumes
6. Upgrade/rebuild notes
   - rebuild images after pulling this fork
   - `pwa` rebuild when public URLs change

## Index update

Update `docs/examples/hosting/docker/README.md` with a fifth entry:

- LevelDB + NGINX for external reverse proxy

## Validation plan

Implementation validation:

1. YAML/compose file syntax check
2. Relative build context path resolves to repo root Dockerfiles
3. English-only content check for new files
4. Optional local smoke test if Docker is available:
   - create network `proxy`
   - `docker compose up -d --build`
   - confirm `nginx` is reachable from another container on `proxy`
   - confirm `/` serves PWA and `/server` reaches API health endpoint if available

If full smoke test is not possible in the environment, document manual validation steps clearly in the README and PR description.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Wrong public URLs bake into PWA | Document that `PL_SERVER_URL` / `PL_PWA_URL` are build-time and must be public domain values |
| External network missing | Fail fast via `external: true`; README shows create command first |
| Relative build context mistakes | Verify path during implementation; keep Dockerfiles at repo root |
| Confusion with existing nginx example | New directory name and index description explicitly say "external reverse proxy" |
| Data loss on container recreate | Named volumes for LevelDB and attachments |

## Alternatives considered

1. **Modify existing `nginx` example**
   - Rejected: breaks the simple host-port demo.
2. **No internal nginx, expose server+pwa separately**
   - Rejected: user wants one unified upstream port/path for the external proxy.
3. **Root monorepo compose profiles**
   - Rejected: mixes development monorepo concerns with deploy examples.

## Implementation outline

After this design is approved:

1. Create feature branch if not already present.
2. Add the new example directory and files.
3. Update docker examples index.
4. Validate paths and English-only content.
5. Open PR with deploy-focused title, for example:

```text
docs: add LevelDB nginx external-proxy compose example
```

## Success criteria

- New example exists under `docs/examples/hosting/docker/leveldb-nginx-external-proxy/`
- Stack uses LevelDB + FS attachments
- Internal nginx unifies PWA and API on container port 80
- No host ports are published
- External Docker network integration is documented and configured
- Existing examples remain unchanged
- All new repository artifacts are English-only
