# Web Stack Soft-Focus + Admin at `/admin` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soft-focus the monorepo on the web stack (server/pwa/admin/extension + shared core/app/locale) and serve Admin at `/admin` on the existing nginx/Dokploy stack.

**Architecture:** Keep deferred packages (`electron`, `tauri`, `cordova`) in git but remove them from default scripts and noisy CI push triggers. Add `Dockerfile-admin` mirroring pwa, a compose `admin` service that builds into a volume, and nginx `location /admin/` before `/`.

**Tech Stack:** pnpm workspace, Docker Compose, nginx:1.27-alpine, webpack admin SPA, GitHub Actions.

## Global Constraints

- All repository artifacts in English only (AGENTS.md).
- Do not delete `packages/electron|tauri|cordova`.
- Do not introduce host ports on root compose (Dokploy/Traefik only).
- Admin path is `/admin/` (Option B), same domain as PWA.
- Build-time env bake for PWA and Admin public URLs.
- Match existing Dockerfile-pwa / deploy style; no drive-by refactors.

## File map

| File | Action |
| --- | --- |
| `package.json` | Soft-focus scripts: drop electron/cordova/tauri defaults; add admin scripts |
| `README.md` | Active focus vs deferred packages |
| `.github/workflows/ci.yml` | Add admin build step |
| `.github/workflows/build-electron.yml` | `workflow_dispatch` only |
| `.github/workflows/build-cordova.yml` | `workflow_dispatch` only |
| `.github/workflows/build-tauri.yml` | `workflow_dispatch` only |
| `Dockerfile-admin` | New, mirror pwa |
| `docker-compose.yml` | Add admin service + volume |
| `deploy/nginx.conf` | `/admin` redirect + `/admin/` static |
| `.env.example` | `PL_ADMIN_URL`, `PL_ADMIN_URL_PATH` |
| `deploy/README.md` | Document admin path and env |

---

### Task 1: Soft-focus root scripts and README

**Files:**
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Update root scripts**

In `package.json` `scripts`, replace platform scripts with web-stack surface:

```json
"scripts": {
    "pwa:build": "pnpm --filter @padloc/pwa run build",
    "pwa:start": "pnpm --filter @padloc/pwa run start",
    "admin:build": "pnpm --filter @padloc/admin run build",
    "admin:dev": "pnpm --filter @padloc/admin run dev",
    "admin:start": "pnpm --filter @padloc/admin run start",
    "server:start": "pnpm --filter @padloc/server run start",
    "server:start-dry": "pnpm --filter @padloc/server run start-dry",
    "web-extension:build": "pnpm --filter @padloc/extension run build",
    "start": "pnpm run pwa:build && pnpm --filter @padloc/server --filter @padloc/pwa --parallel run start",
    "start:v3": "http-server cypress/fixtures/v3-client -s -p 8081 --proxy http://0.0.0.0:8081?",
    "dev": "pnpm --filter @padloc/server --filter @padloc/pwa --filter @padloc/admin --parallel run dev",
    "repl": "pnpm --filter @padloc/server run repl",
    "test": "pnpm -r run test",
    "test:e2e": "concurrently --prefix=name --prefix-length=30 --kill-others --success=first -n app,v3-app,maildev,cypress \"PL_DATA_BACKEND=memory PL_DISABLE_SW=true PL_EMAIL_BACKEND=smtp PL_EMAIL_SMTP_HOST=localhost PL_EMAIL_SMTP_PORT=1025 PL_EMAIL_SMTP_IGNORE_TLS=true pnpm start\" \"pnpm run start:v3\" \"npx maildev\" \"./node_modules/.bin/wait-on tcp:localhost:8080 && CYPRESS_CRASH_REPORTS=0 cypress run\"",
    "test:e2e:dev": "concurrently --prefix=name --prefix-length=30 --kill-others --success=first -n app,v3-app,cypress \"PL_DATA_BACKEND=memory PL_DISABLE_SW=true PL_EMAIL_BACKEND=smtp PL_EMAIL_SMTP_HOST=localhost PL_EMAIL_SMTP_PORT=1025 PL_EMAIL_SMTP_IGNORE_TLS=true pnpm run dev\" \"pnpm run start:v3\" \"npx maildev\" \"./node_modules/.bin/wait-on tcp:localhost:8080 && CYPRESS_CRASH_REPORTS=0 cypress open\"",
    "locale:extract": "pnpm --filter @padloc/locale run extract",
    "add": "echo 'Use: pnpm add <pkg> --filter @padloc/<scope>' && exit 1",
    "prettier": "prettier --write .",
    "prettier:check": "prettier --check .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "update-version": "echo 'Versioning is manual in this fork' && exit 1"
}
```

Remove: all `electron:*`, `cordova:*`, `tauri:*` keys.

- [ ] **Step 2: Update README About table + Active focus**

After the package table, ensure `@padloc/admin` is listed. Mark electron/cordova/tauri as deferred. Add section:

```markdown
## Active focus (this fork)

Day-to-day work targets the **web stack**:

| Active | Role |
| --- | --- |
| `@padloc/core`, `@padloc/locale`, `@padloc/app` | Shared foundation |
| `@padloc/server` | API |
| `@padloc/pwa` | Web client (`/`) |
| `@padloc/admin` | Admin portal (`/admin`) |
| `@padloc/extension` | Browser extension (local/CI build) |

**Deferred** (still in `packages/`, not default scripts/CI): `@padloc/electron`, `@padloc/tauri`, `@padloc/cordova`.
```

Update local install snippet if it still says `npm ci` / `npm start` only — keep working, prefer `pnpm` where this fork already uses it in nearby docs. Minimal change: leave clone steps if already mixed; do not rewrite entire Development section.

- [ ] **Step 3: Commit**

```bash
git add package.json README.md
git commit -m "chore: soft-focus monorepo on web stack scripts"
```

---

### Task 2: CI soft-focus + admin build

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/build-electron.yml`
- Modify: `.github/workflows/build-cordova.yml`
- Modify: `.github/workflows/build-tauri.yml`

- [ ] **Step 1: Add admin build to ci.yml build job**

After "Build web extension", add:

```yaml
            - name: Build admin
              run: pnpm run admin:build
```

- [ ] **Step 2: Strip push triggers from platform workflows**

For each of `build-electron.yml`, `build-cordova.yml`, `build-tauri.yml`:

Keep `workflow_dispatch` block. Remove the entire `push:` block (branches + paths).

Resulting `on:` should only be `workflow_dispatch` (with existing inputs).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/build-electron.yml .github/workflows/build-cordova.yml .github/workflows/build-tauri.yml
git commit -m "ci: build admin and silence deferred platform push workflows"
```

---

### Task 3: Dockerfile-admin

**Files:**
- Create: `Dockerfile-admin`

- [ ] **Step 1: Create Dockerfile mirroring pwa for admin**

```dockerfile
FROM node:18-bullseye

EXPOSE 9090

ENV PL_ASSETS_DIR=/assets
ENV PL_ADMIN_DIR=/admin

RUN corepack enable

WORKDIR /padloc

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY packages/admin/package.json ./packages/admin/
COPY packages/app/package.json ./packages/app/
COPY packages/core/package.json ./packages/core/
COPY packages/locale/package.json ./packages/locale/

RUN pnpm install --frozen-lockfile --filter @padloc/admin...

COPY packages/admin/src ./packages/admin/src
COPY packages/admin/tsconfig.json packages/admin/webpack.config.js ./packages/admin/
COPY packages/app/src ./packages/app/src
COPY packages/app/types ./packages/app/types
COPY packages/app/tsconfig.json ./packages/app/
COPY packages/core/src ./packages/core/src
COPY packages/core/vendor ./packages/core/vendor
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/locale/src ./packages/locale/src
COPY packages/locale/res ./packages/locale/res
COPY packages/locale/tsconfig.json ./packages/locale/
COPY assets /assets

WORKDIR /padloc/packages/admin

ENTRYPOINT ["pnpm", "run"]

CMD ["build_and_start"]
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile-admin
git commit -m "build: add Dockerfile-admin for admin portal static build"
```

---

### Task 4: Compose + nginx + env docs

**Files:**
- Modify: `docker-compose.yml`
- Modify: `deploy/nginx.conf`
- Modify: `.env.example`
- Modify: `deploy/README.md`

- [ ] **Step 1: Extend docker-compose.yml**

Add admin service and wire nginx:

```yaml
services:
    server:
        image: padloc/server:local
        build:
            context: .
            dockerfile: Dockerfile-server
        environment:
            PL_DATA_BACKEND: leveldb
            PL_DATA_LEVELDB_DIR: /data
            PL_ATTACHMENTS_BACKEND: fs
            PL_ATTACHMENTS_FS_DIR: /attachments
            PL_SERVER_CLIENT_URL: ${PL_SERVER_CLIENT_URL:-http://localhost}
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
            context: .
            dockerfile: Dockerfile-pwa
        environment:
            PL_PWA_DIR: /pwa
            PL_SERVER_URL: ${PL_SERVER_URL:-http://localhost/server}
            PL_PWA_URL: ${PL_PWA_URL:-http://localhost}
            PL_PWA_PORT: "80"
        volumes:
            - pwa:/pwa
        command: ["build"]
        restart: on-failure

    admin:
        image: padloc/admin:local
        build:
            context: .
            dockerfile: Dockerfile-admin
        environment:
            PL_ADMIN_DIR: /admin
            PL_ADMIN_URL_PATH: ${PL_ADMIN_URL_PATH:-/admin/}
            PL_ADMIN_URL: ${PL_ADMIN_URL:-http://localhost/admin}
            PL_SERVER_URL: ${PL_SERVER_URL:-http://localhost/server}
            PL_PWA_URL: ${PL_ADMIN_URL:-http://localhost/admin}
        volumes:
            - admin:/admin
        command: ["build"]
        restart: on-failure

    nginx:
        image: nginx:1.27-alpine
        depends_on:
            - server
            - pwa
            - admin
        volumes:
            - pwa:/pwa:ro
            - admin:/admin:ro
            - ./deploy/nginx.conf:/etc/nginx/nginx.conf:ro
        expose:
            - "80"
        restart: unless-stopped

volumes:
    data:
    attachments:
    pwa:
    admin:
```

- [ ] **Step 2: Update deploy/nginx.conf**

Replace the server block locations with:

```nginx
        location = /admin {
            return 301 /admin/;
        }

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

        location /admin/ {
            alias /admin/;
            try_files $uri $uri/ /admin/index.html;
        }

        location / {
            root /pwa;
            index index.html;
            try_files $uri /index.html;
        }
```

If `try_files` with `alias` fails nginx config test, use:

```nginx
        location /admin/ {
            alias /admin/;
            try_files $uri $uri/ @admin_spa;
        }

        location @admin_spa {
            root /admin;
            rewrite ^ /index.html break;
        }
```

Validate with: `docker run --rm -v "$PWD/deploy/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:1.27-alpine nginx -t`

Note: named location + alias is tricky; prefer testing. Working pattern for nginx alias SPA:

```nginx
        location /admin/ {
            alias /admin/;
            index index.html;
            try_files $uri $uri/ /admin/index.html;
        }
```

If nginx rejects `/admin/index.html` fallback under alias, fall back to:

```nginx
        location /admin/ {
            alias /admin/;
            index index.html;
            error_page 404 =200 /admin/index.html;
        }
```

Ship a config that passes `nginx -t` and serves `index.html` for unknown `/admin/*` paths without falling through to pwa.

- [ ] **Step 3: Update .env.example**

```env
# Public URLs used by the PWA/Admin builds and server.
# For Dokploy, set these to your real public domain.
PL_PWA_URL=https://padloc.example.com
PL_SERVER_URL=https://padloc.example.com/server
PL_SERVER_CLIENT_URL=https://padloc.example.com
PL_ADMIN_URL=https://padloc.example.com/admin
PL_ADMIN_URL_PATH=/admin/

# Email backend for invites/notifications.
# console is fine for first boot.
PL_EMAIL_BACKEND=console
```

- [ ] **Step 4: Update deploy/README.md**

Document admin service, env vars, paths `/`, `/admin`, `/server`, volumes including `admin`. Note rebuild after env change. Note admin UI is not edge-protected in v1.

- [ ] **Step 5: nginx -t and commit**

```bash
docker run --rm -v "$PWD/deploy/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:1.27-alpine nginx -t
git add docker-compose.yml deploy/nginx.conf .env.example deploy/README.md
git commit -m "feat: serve admin portal at /admin on nginx stack"
```

---

### Task 5: Verify builds

**Files:** none (verification only)

- [ ] **Step 1: Local admin script exists**

```bash
node -e "const s=require('./package.json').scripts; if(!s['admin:build']) process.exit(1); console.log('ok', Object.keys(s).filter(k=>/electron|cordova|tauri/.test(k)))"
```

Expected: `ok []`

- [ ] **Step 2: Build admin (if node_modules present)**

```bash
pnpm run admin:build
```

Expected: webpack completes; `packages/admin/dist/index.html` exists (or `PL_ADMIN_DIR` path).

If full pnpm install is too heavy in the agent environment, at least validate Dockerfiles parse and nginx -t passes; note residual smoke for Dokploy.

- [ ] **Step 3: Optional compose config**

```bash
docker compose config >/dev/null
```

Expected: exit 0.

- [ ] **Step 4: Final commit only if verification fixed anything; else done**

---

## Self-review vs spec

| Spec item | Task |
| --- | --- |
| Soft-focus Approach A | Task 1 |
| Deferred platforms stay in tree | Task 1 (no deletes) |
| Admin Option B `/admin` | Task 4 |
| Dockerfile-admin | Task 3 |
| CI admin build + silence platform push | Task 2 |
| .env / deploy docs | Task 4 |
| No host ports | Task 4 compose |
| Security note later edge auth | Task 4 deploy README |

No placeholders left. Types/names: `PL_ADMIN_URL`, `PL_ADMIN_URL_PATH`, volume `admin`, service `admin`.
