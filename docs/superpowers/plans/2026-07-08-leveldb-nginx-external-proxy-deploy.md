# LevelDB NGINX External Proxy Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Docker Compose example that runs Padloc with LevelDB, internal NGINX unifying PWA+API on one port, and no host ports for external reverse-proxy integration.

**Architecture:** New example under `docs/examples/hosting/docker/leveldb-nginx-external-proxy/` with `server`, `pwa`, and `nginx` services. Internal nginx serves `/` from the pwa volume and proxies `/server` to the API. Only nginx joins external Docker network `proxy`.

**Tech Stack:** Docker Compose, nginx, LevelDB, Padloc `Dockerfile-server` / `Dockerfile-pwa`, pnpm/Node 18 images.

## Global Constraints

- Repository artifacts MUST be English-only.
- Do not modify product source code.
- Do not rewrite existing `basic`, `nginx`, `caddy`, or `postgres-nginx-letsencrypt` examples.
- Build context must use this fork's repo root, not `github.com/padloc/padloc.git#main`.
- No host port publish in the new compose file.
- Storage backend is LevelDB; attachments backend is filesystem.
- Public URLs in env must be real domain values, not localhost.

---

## File Structure

- Create: `docs/examples/hosting/docker/leveldb-nginx-external-proxy/docker-compose.yml`
- Create: `docs/examples/hosting/docker/leveldb-nginx-external-proxy/nginx.conf`
- Create: `docs/examples/hosting/docker/leveldb-nginx-external-proxy/.env.example`
- Create: `docs/examples/hosting/docker/leveldb-nginx-external-proxy/README.md`
- Modify: `docs/examples/hosting/docker/README.md`

Relative build context from the new example dir to repo root: `../../../../..`

---

### Task 1: Create compose stack and nginx config

**Files:**
- Create: `docs/examples/hosting/docker/leveldb-nginx-external-proxy/docker-compose.yml`
- Create: `docs/examples/hosting/docker/leveldb-nginx-external-proxy/nginx.conf`

**Interfaces:**
- Consumes: repo-root `Dockerfile-server`, `Dockerfile-pwa`
- Produces: runnable compose stack with external network `proxy`

- [ ] **Step 1: Create nginx.conf**

```nginx
user  nginx;
worker_processes  auto;

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    types_hash_max_size 2048;

    # Required for attachments
    client_max_body_size 10m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    include mime.types;

    add_header X-Frame-Options deny;

    server {
        server_name _;
        listen 80;

        location /server {
            resolver 127.0.0.11 valid=60s;
            set $server "http://server:3000";
            proxy_pass $server;

            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Host $host;
        }

        location / {
            root /pwa;
            index index.html;
            try_files $uri /index.html;
        }
    }
}

events {
}
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
version: "3.7"

services:
    server:
        image: padloc/server:local
        build:
            context: ../../../../..
            dockerfile: Dockerfile-server
        env_file: .env
        environment:
            PL_DATA_BACKEND: leveldb
            PL_DATA_LEVELDB_DIR: /data
            PL_ATTACHMENTS_BACKEND: fs
            PL_ATTACHMENTS_FS_DIR: /attachments
            PL_SERVER_CLIENT_URL: ${PL_SERVER_CLIENT_URL}
            PL_EMAIL_BACKEND: ${PL_EMAIL_BACKEND:-console}
        expose:
            - "3000"
        volumes:
            - data:/data
            - attachments:/attachments
        restart: unless-stopped

    pwa:
        image: padloc/pwa:local
        build:
            context: ../../../../..
            dockerfile: Dockerfile-pwa
        env_file: .env
        environment:
            PL_PWA_DIR: /pwa
            PL_SERVER_URL: ${PL_SERVER_URL}
            PL_PWA_URL: ${PL_PWA_URL}
        volumes:
            - pwa:/pwa
        command: ["build"]
        restart: on-failure

    nginx:
        image: nginx:1.27-alpine
        depends_on:
            - server
            - pwa
        volumes:
            - pwa:/pwa:ro
            - ./nginx.conf:/etc/nginx/nginx.conf:ro
        expose:
            - "80"
        networks:
            - default
            - proxy
        restart: unless-stopped

networks:
    proxy:
        external: true

volumes:
    data:
    attachments:
    pwa:
```

- [ ] **Step 3: Validate compose path and YAML**

Run:

```bash
python3 - <<'PY'
import os, pathlib, yaml
base = pathlib.Path('docs/examples/hosting/docker/leveldb-nginx-external-proxy')
compose = yaml.safe_load((base/'docker-compose.yml').read_text())
ctx = pathlib.Path(compose['services']['server']['build']['context'])
resolved = (base/ctx).resolve()
assert resolved == pathlib.Path('.').resolve(), resolved
assert (resolved/'Dockerfile-server').exists()
assert (resolved/'Dockerfile-pwa').exists()
yaml.safe_load((base/'nginx.conf').read_text()) if False else None
print('compose path ok')
print('services:', sorted(compose['services']))
print('external network:', compose['networks']['proxy'])
assert 'ports' not in compose['services']['server']
assert 'ports' not in compose['services']['pwa']
assert 'ports' not in compose['services']['nginx']
print('no host ports ok')
PY
```

Expected:
- `compose path ok`
- services include `nginx`, `pwa`, `server`
- `no host ports ok`

- [ ] **Step 4: Commit**

```bash
git add docs/examples/hosting/docker/leveldb-nginx-external-proxy/docker-compose.yml \
        docs/examples/hosting/docker/leveldb-nginx-external-proxy/nginx.conf
git commit -m "docs: add leveldb nginx external-proxy compose stack"
```

---

### Task 2: Add env example and README

**Files:**
- Create: `docs/examples/hosting/docker/leveldb-nginx-external-proxy/.env.example`
- Create: `docs/examples/hosting/docker/leveldb-nginx-external-proxy/README.md`
- Modify: `docs/examples/hosting/docker/README.md`

**Interfaces:**
- Consumes: compose variable names from Task 1
- Produces: operator docs and sample env values

- [ ] **Step 1: Create `.env.example`**

```env
# Public hostname and URLs used by the PWA build and server config.
# These must be the real externally reachable values, not localhost.
PL_HOSTNAME=padloc.example.com
PL_PWA_URL=https://padloc.example.com
PL_SERVER_URL=https://padloc.example.com/server
PL_SERVER_CLIENT_URL=https://padloc.example.com

# Storage
PL_DATA_BACKEND=leveldb
PL_DATA_LEVELDB_DIR=/data
PL_ATTACHMENTS_BACKEND=fs
PL_ATTACHMENTS_FS_DIR=/attachments

# Email (console is fine for first boot; replace with SMTP later)
PL_EMAIL_BACKEND=console
```

- [ ] **Step 2: Create README.md**

```markdown
# LevelDB + NGINX for External Reverse Proxy

This example runs Padloc with:

- LevelDB storage
- filesystem attachments
- internal NGINX that serves the PWA and proxies the API on one port
- no published host ports

The stack is designed to sit behind an external reverse proxy on a shared
Docker network named `proxy`.

## Architecture

- `server` stores vault data in LevelDB and attachments on disk
- `pwa` builds static frontend assets into a shared volume
- `nginx` serves:
  - `/` from the PWA volume
  - `/server` to the Padloc API
- external reverse proxy reaches this stack at `http://nginx:80`

## Prerequisites

1. Docker and Docker Compose
2. An external reverse proxy container that can join Docker networks
3. Create the shared network once:

```sh
docker network create proxy
```

## Setup

1. Copy this folder or work from the repository checkout.
2. Create env file:

```sh
cp .env.example .env
```

3. Edit `.env` and set real public URLs:

```env
PL_HOSTNAME=padloc.example.com
PL_PWA_URL=https://padloc.example.com
PL_SERVER_URL=https://padloc.example.com/server
PL_SERVER_CLIENT_URL=https://padloc.example.com
```

Important: `PL_SERVER_URL` and `PL_PWA_URL` are used during the PWA build.
If you change them later, rebuild the `pwa` service.

4. Start the stack from this directory:

```sh
docker compose up -d --build
```

## Connect an external reverse proxy

Attach your external proxy container to the `proxy` network and route the
public hostname to:

```text
http://nginx:80
```

### Example external nginx upstream

```nginx
upstream padloc {
    server nginx:80;
}

server {
    listen 443 ssl;
    server_name padloc.example.com;

    # TLS certificates are managed by the external proxy.
    # ssl_certificate     /path/to/fullchain.pem;
    # ssl_certificate_key /path/to/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://padloc;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Example Traefik labels alternative

If your external proxy is Traefik and you prefer labels on this stack's
`nginx` service, add labels in a local override file. This example keeps
compose free of a specific external-proxy vendor.

## Data and volumes

Named volumes:

- `data` - LevelDB database files
- `attachments` - encrypted attachment blobs
- `pwa` - built frontend assets for nginx

Recreating containers does not delete named volumes.

## Upgrade / rebuild

After pulling newer code in this fork:

```sh
docker compose up -d --build
```

If public URLs changed:

```sh
docker compose up -d --build pwa
docker compose restart nginx
```

## Notes

- This stack does not terminate TLS. Terminate TLS on the external reverse proxy.
- Email defaults to console logging. Configure SMTP before production invite flows.
- Existing simple demos remain available under `basic`, `nginx`, and `caddy`.
```

- [ ] **Step 3: Update docker examples index**

Replace `docs/examples/hosting/docker/README.md` with:

```markdown
# Docker Examples

This directory contains various examples on hosting the Padloc server and web
app via Docker.

-   [Basic Example](basic)
-   [Example of using **NGINX** as a reverse proxy](nginx)
-   [Example of using **Caddy** as a reverse proxy](caddy)
-   [Advanced Example using **Postgres**, **NGINX** and **Letsencrypt**](postgres-nginx-letsencrypt)
-   [LevelDB + NGINX for an external reverse proxy](leveldb-nginx-external-proxy)
```

- [ ] **Step 4: Validate English-only and files exist**

Run:

```bash
test -f docs/examples/hosting/docker/leveldb-nginx-external-proxy/.env.example
test -f docs/examples/hosting/docker/leveldb-nginx-external-proxy/README.md
grep -n 'leveldb-nginx-external-proxy' docs/examples/hosting/docker/README.md
grep -nP '\p{Cyrillic}' docs/examples/hosting/docker/leveldb-nginx-external-proxy docs/examples/hosting/docker/README.md || true
```

Expected:
- files exist
- index link present
- no Cyrillic output

- [ ] **Step 5: Commit**

```bash
git add docs/examples/hosting/docker/leveldb-nginx-external-proxy/.env.example \
        docs/examples/hosting/docker/leveldb-nginx-external-proxy/README.md \
        docs/examples/hosting/docker/README.md
git commit -m "docs: document leveldb nginx external-proxy deploy example"
```

---

### Task 3: Final verification

**Files:** none expected beyond previous tasks.

- [ ] **Step 1: Full structural verification**

Run:

```bash
python3 - <<'PY'
import pathlib, yaml
base = pathlib.Path('docs/examples/hosting/docker/leveldb-nginx-external-proxy')
required = ['docker-compose.yml','nginx.conf','.env.example','README.md']
for name in required:
    assert (base/name).exists(), name
compose = yaml.safe_load((base/'docker-compose.yml').read_text())
for svc in ['server','pwa','nginx']:
    assert svc in compose['services']
    assert 'ports' not in compose['services'][svc]
assert compose['services']['server']['environment']['PL_DATA_BACKEND'] == 'leveldb'
assert compose['networks']['proxy']['external'] is True
ctx = (base/pathlib.Path(compose['services']['server']['build']['context'])).resolve()
assert ctx == pathlib.Path('.').resolve()
print('final verification ok')
PY
```

Expected: `final verification ok`

- [ ] **Step 2: Optional Docker smoke test if daemon available**

Run:

```bash
docker info >/dev/null 2>&1 && \
  docker network create proxy 2>/dev/null || true && \
  (cd docs/examples/hosting/docker/leveldb-nginx-external-proxy && \
    cp -n .env.example .env && \
    docker compose config >/tmp/padloc-compose-config.yml && \
    echo 'compose config ok') || echo 'docker unavailable, skipped smoke test'
```

Expected: either `compose config ok` or `docker unavailable, skipped smoke test`

- [ ] **Step 3: Commit only if verification required extra fixes**

No commit if clean. Otherwise:

```bash
git add -A docs/examples/hosting/docker
git commit -m "docs: finalize leveldb nginx external-proxy example"
```

---

## Self-Review Notes

- Spec coverage: new example dir, LevelDB, internal nginx, no host ports, external `proxy` network, env/README, index update.
- No product source changes.
- Build context uses local fork root via `../../../../..`.
- English-only artifacts.
