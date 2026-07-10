# Web-Stack Max Modernization — Design

**Date:** 2026-07-10  
**Status:** Approved for planning  
**Type:** Multi-PR toolchain + dependency modernization  
**Scope decision:** Web-stack packages + TypeScript 7; serial PRs per layer

## Summary

Raise the **in-scope web stack** (root tooling, core, server, app, pwa, extension,
admin, locale) to the newest practical dependency majors, including **TypeScript
7**, while keeping CI green after every mergeable layer. Soft-focus desktop/mobile
packages (electron, cordova, tauri) stay install-compatible only. Dependabot is
tuned so ongoing hygiene does not fight this work.

This is **not** a single big-bang PR and **not** a product epic (no CF Worker, no
MV3 product work, no Vite bundler rewrite).

## Goals

1. TypeScript **7.x** (current stable at implement time, e.g. `7.0.2`) as the
   monorepo compiler pin for all packages that declare `typescript`.
2. Maximum safe major/minor bumps for **in-scope** runtime and dev dependencies.
3. Dependabot hygiene aligned with soft-focus exclusion and manual majors for
   high-risk pins (`typescript`).
4. Every mergeable PR leaves readiness gates green.

## Non-goals

- Electron / Cordova / Tauri **feature** or major platform upgrades (Tauri 2,
  Cordova 13, etc.)
- Cloudflare Worker backend (B-002)
- Browser extension MV3 / autofill product work (B-001)
- Vite (or other) bundler replacement for PWA/admin
- Turning off `skipLibCheck` (see below) as part of this cycle
- Auto-merge of major Dependabot PRs
- Changing Node engine off `24.x`

## In-scope packages

| Package | Role in gates |
| --- | --- |
| root (`padloc`) | tooling, lockfile, scripts |
| `@padloc/core` | unit + types foundation |
| `@padloc/server` | unit + server start paths |
| `@padloc/app` | consumed by pwa/extension/admin builds |
| `@padloc/pwa` | production web build |
| `@padloc/extension` | web-extension build |
| `@padloc/admin` | admin build (same web stack) |
| `@padloc/locale` | shared, low risk |

**Soft-focus (out of build gate):** `@padloc/electron`, `@padloc/cordova`,
`@padloc/tauri` — may receive the same `typescript` pin and `engines` alignment
so `pnpm install` stays consistent; no requirement that those packages build in
CI for this cycle.

## Readiness gates (every PR)

All of the following must pass before merge:

1. `pnpm install` (lockfile committed)
2. `pnpm run lint` / Biome check
3. Builds: PWA, server typecheck/start-dry or package test compile, extension
4. Unit: `pnpm -r` tests for core/server (and app if present)
5. E2E: `pnpm run test:e2e:ci` (or CI e2e job equivalent)

CI on GitHub is the source of truth for the PR; local gates should match.

## Delivery model — serial PRs

Merge order is strict: **PR N lands on green `main` before PR N+1 branches**.

| PR | Suggested branch | Content |
| --- | --- | --- |
| **1** | `chore/typescript-7` | Pin `typescript@7.x` everywhere it is declared; fix compile errors; align `ts-node` / related loaders if required |
| **2** | `chore/web-deps-max` | In-scope dependency majors/minors in **gated groups** (see below) |
| **3** | `chore/dependabot-hygiene` | Dependabot config: groups, ignores, limits — no surprise soft-focus or TS major floods |

One epic branch / one mega-PR is rejected: too hard to review and roll back.

## PR 1 — TypeScript 7

### Intent

Single compiler major so later dependency bumps that require modern TS do not
fight an old checker.

### Expected work

- Bump `typescript` in root and all packages that pin it (including soft-focus
  pins for install consistency).
- Fix **project source** type errors under TS 7.
- Keep **`experimentalDecorators: true`** and existing decorator usage; do not
  migrate to TC39 stage-3 decorators in this cycle.
- Keep **`skipLibCheck: true`** (already set in root `tsconfig.json`).
- Do not expand `strict` flags beyond what is needed to compile.

### Known risk clusters (from prior 5.x work + TS 7)

- `Uint8Array` / `BufferSource` generics in crypto (`app` WebCrypto, `server`
  Node crypto)
- Index signature access (`TS7053`-class issues) if any remain
- Test harness: mocha + `ts-node` / `TS_NODE_TRANSPILE_ONLY`
- Any removed or changed compiler defaults in TS 6/7 that surface only after bump

### Explicitly deferred with TS 7

- `skipLibCheck: false` — would force fixing third-party `.d.ts` noise; separate
  follow-up if desired later
- `moduleResolution` / `module` modernization (e.g. `bundler` / `nodenext`) —
  only if TS 7 **requires** a change to compile; otherwise leave as-is

### Done when

- All in-scope packages typecheck/build under TS 7
- Unit + e2e green
- Soft-focus still installs

## PR 2 — Web-stack dependency maximum

### Strategy

Bump in **groups**. After each group: install + lint + build + unit (e2e at least
once per PR before merge; preferred after high-risk groups too).

### Group order

1. **Dev / test tooling** — mocha, chai, `@types/*` (chai/mocha/node alignment),
   concurrently, wait-on, http-server, workbox packages used by pwa/admin
2. **Generally safe libraries** — date-fns, dompurify, dotenv, fs-extra,
   autosize, and similar non-protocol libs
3. **Server infrastructure** — nodemailer, level, mongodb, pg, jsdom, maxmind /
   geolite2 **if** versions remain compatible with Node 24 and our storage code
4. **Auth (isolated)** — `@simplewebauthn/browser`, `@simplewebauthn/server`,
   and related types **5.x → current major** as its own group (breaking API;
   exercise register/auth paths carefully)
5. **Leave pinned / optional unless trivial**
   - Stripe + `@types/stripe` (deprecated types package; billing not a hard
     product goal for this fork)
   - Root `pnpm.overrides` for tiptap / prosemirror — do **not** lift unless a
     forced peer dependency requires it
   - Webpack major — out of scope (bundler epic)

### Soft-focus rule for PR 2

Do **not** spend cycles on cordova/electron/tauri major dependency trees.
Incidental lockfile resolution is fine; no platform upgrade work.

### Done when

- In-scope packages on newest practical versions that keep gates green
- Document any intentional pin left behind (package + reason) in the PR body

## PR 3 — Dependabot hygiene

### Current state

`.github/dependabot.yml` already schedules weekly npm + github-actions updates
with minor/patch grouping and open-PR limits.

### Changes in this PR

- Keep weekly cadence and grouping for minor/patch
- **Ignore or exclude** high-churn soft-focus paths where Dependabot noise is
  pure cost (electron/cordova/tauri) **or** document that those PRs are
  closed/deferred by policy
- Treat **`typescript` major** as human-driven (ignore major for `typescript` if
  Dependabot supports it; otherwise close such PRs by policy)
- Do not enable auto-merge for majors
- Optionally raise clarity of commit prefixes (already `chore` / `ci`)

### Done when

- Config committed and matches policy above
- No requirement that Dependabot has already opened a PR in this environment

## `skipLibCheck` policy

Root `tsconfig.json` has `"skipLibCheck": true`.

**Meaning:** TypeScript does not typecheck declaration files from dependencies;
it still typechecks our `src/`.

**Decision for this cycle:** leave `true`. Turning it off is a separate
strictness epic (third-party `.d.ts` churn under TS 7 would dominate the diff).

## Rollback

- Prefer revert of the serial PR that introduced the break
- Do not force-push shared `main`
- High-risk auth group (webauthn): isolated commit inside PR 2 for easy revert

## Success criteria (program)

- [ ] PR 1 merged: monorepo on TypeScript 7, CI green
- [ ] PR 2 merged: in-scope deps maximized with documented remaining pins
- [ ] PR 3 merged: Dependabot policy matches soft-focus + TS major rules
- [ ] No soft-focus platform major upgrades required for success
- [ ] English-only commits and docs (repo policy)

## Implementation notes for the planner

- Start from up-to-date `main`
- Use exact versions (`save-exact` / existing pin style)
- Prefer `pnpm` workspace filters over root-wide blind upgrades
- After TS 7, re-run a fresh outdated inventory before choosing PR 2 versions
- E2E is mandatory; do not claim done on unit alone

## References

- Prior TS follow-up (historical): `docs/superpowers/specs/2026-07-08-typescript-5x-upgrade-followup.md`
- Modernization phases 0–3 (done baseline): `docs/superpowers/plans/2026-07-07-padloc-modernization-phases-0-3.md`
- Dependabot config: `.github/dependabot.yml`
- Backlog product items deferred: B-001, B-002 in `docs/superpowers/backlog.md`
