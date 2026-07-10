# E2E Dynamic Ports Design

**Date:** 2026-07-10  
**Status:** Approved design, ready for implementation planning  
**Related:** `docs/superpowers/specs/2026-07-10-playwright-e2e-design.md`, `scripts/e2e.sh`

## Summary

Make local Playwright e2e resilient when default ports are already bound (e.g. another project’s Vite on `:3000`). `scripts/e2e.sh` will pick free ports for the Padloc server and PWA, export the existing env knobs, and wait/run Playwright against those ports. CI behavior stays the same when defaults are free.

All repository artifacts must be in English per `AGENTS.md`.

## Goals

- `pnpm run test:e2e` and `test:e2e:dev` succeed when `:3000` and/or `:8080` are occupied by unrelated processes.
- Prefer defaults (`3000`, `8080`) when free so CI and docs stay predictable.
- Reuse existing env contracts (`PL_SERVER_PORT`, `PL_PWA_PORT`, `PL_SERVER_URL`, `PL_PWA_URL`, `E2E_BASE_URL`) — no app code changes.
- Bake `PL_SERVER_URL` **before** `vite build` / `pnpm start` so the client talks to the chosen API port.

## Non-goals

- Dynamic maildev ports beyond the current 1080→1082 fallback (already implemented).
- Dynamic SCIM port (`5000`) unless it becomes a real conflict later.
- Killing or reclaiming foreign processes on preferred ports.
- Changing Playwright test sources solely for ports (they already use `e2eEnv.baseURL`).
- Multi-worker parallel e2e stacks on one machine.

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | Server + PWA ports only |
| Mechanism | Shell free-port pick in `scripts/e2e.sh` |
| Defaults | Prefer 3000 / 8080 when free |
| Explicit override | Honor pre-set `PL_SERVER_PORT` / `PL_PWA_PORT`; fail if that port is busy |
| Client URL | `PL_SERVER_URL=http://127.0.0.1:$SERVER_PORT` before app start/build |
| Playwright | `E2E_BASE_URL=http://127.0.0.1:$PWA_PORT` |
| wait-on | Use chosen ports, not hard-coded 8080/3000 |

## Architecture

```
pnpm run test:e2e
        │
        ├─ ensure maildev (existing logic)
        ├─ pick SERVER_PORT (prefer 3000) and PWA_PORT (prefer 8080)
        ├─ export PL_* + E2E_BASE_URL
        ├─ start app (build bakes PL_SERVER_URL; http-server / vite use PL_PWA_PORT)
        ├─ wait-on tcp:localhost:$PWA_PORT tcp:localhost:$SERVER_PORT
        └─ playwright test (baseURL = E2E_BASE_URL)
```

### Port selection

```text
pick_free_port preferred:
  if PL_*_PORT already set in environment:
    if that port is free → use it
    else → fail with a clear error (do not silently rebind)
  else:
    if preferred is free → use preferred
    else scan upward (preferred+1 … preferred+N) for a free TCP listen port
    if none → fail
```

Implementation detail: reuse the existing `port_in_use` helper in `e2e.sh` (or equivalent). Prefer pure bash + `ss` already used in the script; avoid new dependencies.

Log once at start:

```text
e2e ports: server=$SERVER_PORT pwa=$PWA_PORT maildev=$E2E_MAILDEV_URL
```

### Env mapping

| Variable | Purpose |
|----------|---------|
| `PL_SERVER_PORT` | Server HTTP listen (`HTTPReceiverConfig.port` via config env) |
| `PL_SERVER_URL` | API origin baked into PWA at build / available to Vite define |
| `PL_PWA_PORT` | Static `http-server` or Vite dev listen port |
| `PL_PWA_URL` | PWA public origin (proxy / CSP helpers) |
| `E2E_BASE_URL` | Playwright `baseURL` (`e2e/helpers/env.ts`) |

Use `127.0.0.1` (or `localhost` consistently with existing defaults) for loopback URLs so client and wait-on agree.

### Why order matters

`pnpm start` runs `pwa:build` then serves `dist`. Vite injects `PL_SERVER_URL` at build time (`packages/pwa/vite.config.ts`). If the server port is chosen only after build, the PWA still calls the default API port and e2e fails in confusing ways. Therefore port pick + export **must** happen before `APP_CMD`.

For `test:e2e:dev` (`pnpm run dev`), Vite reads env at process start the same way — export still must precede app start.

### Failure modes

| Case | Behavior |
|------|----------|
| Preferred free | Use 3000 / 8080 (CI unchanged) |
| Preferred busy, no override | Pick next free port; log it |
| Override set and busy | Exit non-zero with “port N already in use” |
| No free port in scan range | Exit non-zero |
| App fails to bind after pick | Existing concurrently/wait-on failure (race with another process is rare; acceptable) |

## Out of scope (explicit)

- Changing default ports in production Docker / Dokploy.
- Teaching the app to discover its API URL at runtime (would remove bake-time coupling; larger product change).
- Fixing flaky auth/items selectors (separate work on the e2e branch).

## Verification

1. With nothing on 3000/8080: `pnpm run test:e2e` uses defaults (visible in log).
2. With a listener on 3000 (e.g. foreign Vite): e2e picks another server port, builds with matching `PL_SERVER_URL`, tests pass.
3. `PL_SERVER_PORT=3000` while 3000 busy: script fails fast with a clear message.
4. CI: no workflow change required if runners have free defaults.

## Implementation surface

- **Primary:** `scripts/e2e.sh`
- **No change expected:** `playwright.config.ts`, `e2e/helpers/env.ts`, package scripts (unless a one-line comment in package.json is useful)
- **Docs touch (optional, same PR or follow-up):** note dynamic ports in the Playwright e2e design or a short README blurb under e2e helpers — only if we already touch docs for the flaky-test work

## Success criteria

- Local e2e no longer fails with `EADDRINUSE :::3000` when an unrelated process holds the default port.
- Zero intentional app/runtime source changes for this feature.
- Explicit env overrides remain strict (no silent rebinding).
