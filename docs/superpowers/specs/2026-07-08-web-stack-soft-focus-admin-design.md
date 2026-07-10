# Web Stack Soft-Focus + Admin at `/admin` Design

**Date:** 2026-07-08  
**Status:** Draft for review  
**Branch target:** feature branch off current release/deploy line, then PR into `main` (or via release branch)

## Goal

Narrow day-to-day work on this fork to the **web stack** so desktop/mobile shells stop competing for attention, scripts, and CI noise — without deleting them from git history.

Also ship the **Admin portal** in the existing Dokploy production layout at:

`https://<domain>/admin`

on the same nginx reverse proxy as PWA + API.

## Non-goals

- Hard-deleting `electron`, `tauri`, or `cordova` packages
- Moving deferred packages out of the workspace into `_archive/` or another repo
- Separate admin subdomain (`admin.<domain>`)
- Edge auth lock on `/admin` (Basic Auth, IP allowlist, SSO) — documented as later hardening
- Putting the browser extension into the Docker production stack
- Changing core product crypto/auth semantics
- Upstream-style multi-platform release automation

## Decisions (locked)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Focus mode | Soft-focus (Approach A) | Packages stay in tree; default scripts/CI/docs stop advertising deferred platforms |
| Admin host | Same domain path `/admin` (Option B) | One TLS/domain/Dokploy service; admin webpack already supports `PL_ADMIN_URL_PATH` |
| Admin in production | Yes | Operator UI is in active interest for this fork |
| Extension | Keep in active web stack for local/CI build | Not required in Docker for first cut |
| Desktop/mobile | Deferred only | Re-enable later without archaeology |

## Active vs deferred packages

### Active (web stack)

| Package | Role |
| --- | --- |
| `@padloc/core` | Shared models, crypto, client/server protocol |
| `@padloc/locale` | i18n |
| `@padloc/app` | Shared Lit UI shell (dependency of pwa/admin/extension) |
| `@padloc/server` | Backend API |
| `@padloc/pwa` | Main web client at `/` |
| `@padloc/admin` | Admin portal at `/admin` |
| `@padloc/extension` | Browser extension (build scripts + CI; not Docker yet) |

### Deferred (keep in git, remove from default surface)

| Package | Notes |
| --- | --- |
| `@padloc/electron` | Desktop shell |
| `@padloc/tauri` | Desktop shell |
| `@padloc/cordova` | Mobile shell |

Workspace remains `packages/*`. No package is removed from `pnpm-workspace.yaml`.

## Architecture (production)

```text
Internet
   │
   ▼
Traefik / Dokploy (TLS, host routing)
   │
   ▼
nginx :80 (no host port publish)
   ├── location /server  → proxy_pass http://server:3000
   ├── location /admin/  → alias volume admin static (SPA)
   └── location /        → root volume pwa static (SPA)
```

Compose services:

| Service | Image/build | Role |
| --- | --- | --- |
| `server` | `Dockerfile-server` | LevelDB + FS attachments (unchanged) |
| `pwa` | `Dockerfile-pwa` | Build PWA into shared volume |
| `admin` | `Dockerfile-admin` (new) | Build Admin into shared volume |
| `nginx` | `nginx:1.27-alpine` | Static + API reverse proxy |

Volumes: `data`, `attachments`, `pwa`, `admin`.

## Soft-focus mechanics

### Root scripts (`package.json`)

Keep / add:

- `pwa:build`, `pwa:start`
- `server:start`, `server:start-dry`
- `web-extension:build`
- `admin:build`, `admin:dev`, `admin:start` (thin filters over `@padloc/admin`)
- `start` / `dev` oriented at server + pwa (+ admin for `dev`)
- `test`, `prettier*`, `locale:extract`

Remove from default developer surface (delete or park under clearly named deferred helpers if needed later):

- `electron:*`
- `cordova:*`
- `tauri:*`

Do **not** delete the packages; only stop advertising them as primary entrypoints.

### README

Add a short “Active focus” section:

- Active: server, pwa, admin, extension + shared core/app/locale
- Deferred: electron, tauri, cordova (still in `packages/`, not day-to-day)

Keep package table accurate; mark deferred rows as deferred rather than removing them.

### CI

`ci.yml` (default PR/main gate):

- lint / prettier / locale extract (existing)
- unit tests (existing)
- build PWA (existing)
- build web extension (existing)
- build Admin (new)
- server start-dry (existing)

Platform workflows (`build-electron.yml`, `build-cordova.yml`, `build-tauri.yml`):

- Prefer `workflow_dispatch` only
- Disable noisy push triggers to `main` / feature branches while platforms are deferred
- Leave files in repo so re-enabling is one config change

No change required to advisory AI review / PR title checks beyond path filters if any reference deferred packages.

## Admin deploy details (Option B)

### Build env (bake at image/build time)

| Variable | Production example |
| --- | --- |
| `PL_SERVER_URL` | `https://padloc.example/server` |
| `PL_ADMIN_URL` | `https://padloc.example/admin` |
| `PL_ADMIN_URL_PATH` | `/admin/` |
| `PL_ADMIN_DIR` | `/admin` (output dir inside container/volume) |
| `PL_PWA_URL` | same base as admin public URL for webpack CSP/asset base (admin webpack uses this for local vs prod detection and asset URLs) |

Notes:

- Admin webpack already supports subpath installs via `PL_ADMIN_URL_PATH` and rewrites favicon paths when path ≠ `/`.
- Trailing slash policy: redirect `/admin` → `/admin/` in nginx to avoid broken relative asset resolution.
- Rebuild admin (and pwa if its env changed) after any public URL change.

### `Dockerfile-admin`

Mirror `Dockerfile-pwa`:

1. Copy root + workspace manifests for `admin`, `app`, `core`, `locale`
2. `pnpm install --frozen-lockfile --filter @padloc/admin...`
3. Copy sources + assets
4. Entrypoint `pnpm run` with default `build` (or `build_and_start` if serving standalone; production compose uses build-into-volume like pwa)

### nginx rules (order matters)

More specific locations first:

```nginx
location = /admin {
    return 301 /admin/;
}

location /server {
    # existing proxy to server:3000
}

location /admin/ {
    alias /admin/;
    try_files $uri /admin/index.html;
}

location / {
    root /pwa;
    index index.html;
    try_files $uri /index.html;
}
```

Exact `alias` + `try_files` behavior must be verified in implementation; if `try_files` with `alias` is awkward on the chosen nginx version, use an equivalent named-location fallback that still serves **admin** `index.html` (never pwa) for unknown `/admin/*` paths.

### Compose sketch

```yaml
admin:
  image: padloc/admin:local
  build:
    context: .
    dockerfile: Dockerfile-admin
  environment:
    PL_ADMIN_DIR: /admin
    PL_ADMIN_URL_PATH: /admin/
    PL_ADMIN_URL: ${PL_ADMIN_URL}
    PL_SERVER_URL: ${PL_SERVER_URL}
    PL_PWA_URL: ${PL_ADMIN_URL}
  volumes:
    - admin:/admin
  command: ["build"]
  restart: on-failure

nginx:
  depends_on: [server, pwa, admin]
  volumes:
    - pwa:/pwa:ro
    - admin:/admin:ro
    - ./deploy/nginx.conf:/etc/nginx/nginx.conf:ro
```

### Dokploy

- Still one public domain → service `nginx` port `80`
- Add `PL_ADMIN_URL=https://<domain>/admin` (and path) to env
- Rebuild `pwa` + `admin` after env edits

## Security posture (explicit)

- Admin UI is **not** secret by path. Anyone who can reach the domain can load the SPA JS.
- Authorization remains **server-side** (privileged accounts / admin API capabilities).
- SPA fallback means unknown paths under `/admin/` return admin `index.html` (same class of scanner `200`s already seen on pwa).
- Later hardening (out of this design): edge Basic Auth / SSO / IP allowlist on `/admin/`, or move to Option C subdomain for isolated edge policy.

## Rollout plan

1. Soft-focus cleanup PR: scripts, README, CI workflow triggers, admin npm scripts — no production path change required.
2. Admin production PR: `Dockerfile-admin`, compose service, nginx `/admin/`, `.env.example`, `deploy/README.md`.
3. Dokploy: set admin env, rebuild admin (+ pwa if needed), smoke test.
4. Optional follow-up: edge protection for `/admin`; extension packaging docs.

Either step 1+2 can be one PR if preferred; keep reviewable commits either way.

## Success criteria

- Default local commands and CI do not require electron/tauri/cordova.
- `pnpm run admin:build` (or CI equivalent) succeeds.
- Production:
  - `/` serves PWA
  - `/admin` (and `/admin/`) serves Admin UI
  - `/server` proxies API
- Deferred packages remain in the repository and can be re-activated later.
- Design and user-facing docs state English-only repo policy remains unchanged.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| nginx `alias` + SPA fallback serves wrong app | Location order; smoke tests; never fall through `/admin` to pwa root |
| Broken asset/CSP paths under `/admin/` | Use `PL_ADMIN_URL_PATH=/admin/`; verify favicon/script URLs in built `index.html` |
| Forgetting rebuild after env change | Document build-time bake; Dokploy notes in `deploy/README.md` |
| Accidental future hard-delete of desktop packages | Soft-focus only; packages stay; README says deferred |
| Admin publicly discoverable | Accept for v1; document later edge auth |

## Alternatives considered

| Approach | Why not now |
| --- | --- |
| Hard delete desktop/mobile packages | Painful restore; upstream merge friction; unnecessary for focus |
| Archive out of workspace | More moving parts; soft-focus is enough |
| Admin on subdomain (Option C) | Better for isolated edge auth later; more DNS/TLS/Dokploy ops today |
| Admin local-only (no Docker) | Blocks production operator use that we want |

## Open implementation notes (resolve during plan/build)

- Confirm exact nginx `alias`/`try_files` idiom that works on `nginx:1.27-alpine`.
- Whether admin service should use `build` only (like current pwa) vs `build_and_start` for non-nginx debugging.
- Whether `pnpm test` currently pulls deferred package tests (if yes, scope unit job filters only if needed — prefer minimal change).

## References

- Root `docker-compose.yml` (current LevelDB + pwa + nginx)
- `deploy/nginx.conf`
- `Dockerfile-pwa` (template for `Dockerfile-admin`)
- `packages/admin/webpack.config.js` (`PL_ADMIN_URL_PATH`, CSP, devServer `:9090`)
- Prior deploy design: `docs/superpowers/specs/2026-07-08-leveldb-nginx-external-proxy-deploy-design.md`
