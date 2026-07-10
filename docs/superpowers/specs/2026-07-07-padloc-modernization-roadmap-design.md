# Padloc Modernization Roadmap — Design

**Date:** 2026-07-07
**Branch:** `t1-node18-web-runtime`
**Status:** Approved design, ready for implementation planning
**Type:** Multi-phase roadmap spec (epic: "update project to modern dependencies")

## Summary

This is the roadmap spec for the first epic of the padloc fork: modernizing the
project's tooling and dependencies. The Node 18 runtime baseline is already
established (commits `7241f8f7`, `8605892f`). This epic continues by migrating
the package manager, removing deprecated tooling, cautiously updating
dependencies, and replacing the bundler.

The work is split into **five strictly sequential phases**. Each phase is a
self-contained commit (or small series) that leaves the project green against
all readiness criteria.

## Focus & Priorities

Confirmed with the project owner:

- **Package manager → pnpm workspaces** (mature, low risk for native modules/webpack)
- **Lerna → removed entirely**; task orchestration via native `pnpm -r` / `--filter`
- **Dependency updates → cautious**, done as a separate phase (tooling first)
- **Target bundler → Vite**
- **In-scope targets:** PWA (web app), Server, Browser extension
- **Deferred targets:** electron, cordova, tauri (later, separate specs)

## Readiness Criteria (applies to every phase)

A phase is "done" only when all of the following are green:

1. `install` + `build` (pwa / extension / server) pass
2. Unit tests (core / server mocha) pass — `pnpm -r test`
3. E2E tests (cypress) pass
4. CI workflows updated and green

Criterion 4 nuance: CI is migrated to pnpm in Phase 2. For Phase 0 and Phase 1,
"CI green" is satisfied by the criteria running **locally** (install/build/unit/
e2e); the CI workflow files themselves are not yet expected to be pnpm-based
until Phase 2. From Phase 2 onward, criterion 4 means the actual GitHub Actions
workflows are green.

Additional cross-cutting principles:

- Each phase is an isolated commit/series leaving the project green.
- Strict linear ordering of phases: 0 → 1 → 2 → 3 → 4.
- Within a phase, updates are done in groups with a gate-check after each group.
- Tooling changes are kept separate from library version bumps (do not mix
  causes of breakage).
- The riskiest work (Vite) is last and isolated, preceded by its own spike.

## Architecture — Phase Overview

```
Phase 0: Node 18 catch-up      → .nvmrc 16→18 (residual node16 cleanup)
Phase 1: pnpm + remove Lerna   → pnpm workspaces, single lockfile, scripts on pnpm --filter
Phase 2: CI + Docker on pnpm   → workflows and Dockerfiles via corepack/pnpm
Phase 3: Cautious dep upgrade  → version bumps w/o breaking majors, remove openssl-legacy
Phase 4: webpack → Vite        → PWA + extension on Vite (separate detailed brainstorm)
```

Dependencies between phases are strictly linear. Phase 2 (CI) comes immediately
after pnpm so that "green CI" becomes an automatic gate for later phases.

**Epic boundaries:**

- Detailed scope: Phases 0–3 (foundation + cautious upgrade)
- Direction only: Phase 4 (Vite) — goal, criteria, and known risks are captured
  here, but the detailed migration plan is a separate brainstorming + spike
  before Phase 4 starts.
- Out of scope: electron / cordova / tauri (later specs); TypeScript 5.x upgrade
  is a candidate to split into its own sub-phase/spec, decided in Phase 3.

---

## Phase 0 — Node 18 catch-up

Small catch-up phase closing an omission from commit `7241f8f7`. This phase is
now complete in the implementation branch.

**Changes:**

- `.nvmrc`: `v16.13.1` → `v18` (completed; all CI workflows read
  `node-version-file: ".nvmrc"`, so they auto-pick up Node 18)

**Not touched here:** CI hardcode of `npm@8.2.0` / `npm ci` — that moves to
Phase 2 with the pnpm switch.

**Readiness:** install + build + unit green on Node 18.

**Risk:** minimal — single edit.

---

## Phase 1 — pnpm workspaces + remove Lerna

Core of the epic. Changes **only** install/link/task-run mechanics. Library
versions are not touched.

**Root changes:**

- Add `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - "packages/*"
  ```
- `package.json`:
  - Add `"packageManager": "pnpm@10.15.0"` (for corepack; completed in the implementation branch)
  - Remove `lerna` from devDependencies
  - Delete `postinstall` / `bootstrap` (`lerna bootstrap`) — pnpm links
    workspace packages automatically on `install`
  - Rewrite `lerna run --scope @padloc/X` → `pnpm --filter @padloc/X run ...`
  - Rewrite `lerna run --parallel --scope '@padloc/{server,pwa}'` →
    `pnpm --filter @padloc/server --filter @padloc/pwa --parallel run ...`
  - `add` / `remove` scripts (built on `lerna add`) → `pnpm add --filter`
  - `update-version` / `version` / `publish` (`lerna version` / `lerna publish`)
    → removed (no npm publishing needed in the fork)
- Delete `lerna.json`

**Lockfiles:**

- Delete root `package-lock.json` + all 10 in `packages/*/`
- Generate a single `pnpm-lock.yaml`

**`.npmrc`:**

- `save-exact=true` — pnpm honors it, keep
- Add hoisting config for native modules: `sharp` is used in webpack configs via
  `require("sharp")` from root `node_modules`. pnpm is strict (isolated
  `node_modules`) by default. Use either `node-linker=hoisted` or a targeted
  `public-hoist-pattern[]=*sharp*`. **Decision finalized during implementation**
  via an actual build run.

**Intra-package dependencies:**

- Convert `"@padloc/core": "4.3.0"` etc. to `"workspace:*"` — cleaner and guards
  against accidental install from npm.

**Key risks for this phase:**

1. **sharp** (native) + pnpm strict node_modules → PWA build may not resolve
   `require("sharp")`. Mitigation: hoist pattern.
2. **ts-node** resolution in server under isolated node_modules.
3. **maildev** git dependency (had a dedicated fix in `8605892f`) — verify pnpm
   installs it.
4. Phantom dependencies — packages that "accidentally" worked via npm hoisting
   may break. This is mostly a benefit (surfaces real missing deps) but requires
   targeted `pnpm add`.

**Readiness:** install + build (pwa/extension/server) + unit (core/server) +
e2e green. CI still on npm here (migrated in Phase 2), but everything must work
locally.

**Risk:** medium (native module hoisting is the main unknown).

---

## Phase 2 — CI + Docker on pnpm

Migrate build infrastructure to pnpm so that "green CI" becomes the automatic
gate for later phases.

**CI workflows (`.github/workflows/`):**

In-scope (PWA/server/extension/tests):

- `run-tests.yml` — primary gate (unit + e2e)
- `build-web-extension.yml`
- `update-dockerhub.yml`, `update-deployment.yml` — if they build server/pwa

Replacement pattern in each:

- Remove `npm i -g npm@8.2.0` + `npm ci`
- Add `pnpm/action-setup` (or `corepack enable`) → `pnpm install --frozen-lockfile`
- Replace `npm run X` → `pnpm run X`
- `actions/setup-node@v3` + `cache: 'pnpm'` for store cache
- `node-version-file: ".nvmrc"` already picks up Node 18 (from Phase 0) — keep

Platform workflows (electron/cordova/tauri):

- Formally out of epic scope, but they use `npm ci` and **will break** after
  lockfile removal in Phase 1. So they must at minimum be converted to
  `pnpm install`, to avoid leaving CI red. Full build verification of these
  targets is deferred. Explicit boundary: **convert to pnpm install; green
  build of these targets is out of scope.**

**Docker:**

- `Dockerfile-pwa`, `Dockerfile-server` (already `node:18-bullseye` from the
  baseline commit):
  - Enable corepack (`RUN corepack enable`) or `npm i -g pnpm`
  - `npm ci` / `lerna bootstrap` → `pnpm install --frozen-lockfile`
  - Adjust build commands for pnpm
  - Verify whether `SHARP_IGNORE_GLOBAL_LIBVIPS=1` from the baseline is still
    needed/correct under pnpm
- `docker-compose.yml` — verify it references the current Dockerfiles/commands

**Readiness:** CI green (run-tests: install + build + unit + e2e); Docker images
pwa/server build and start; platform workflows at least pass the install phase.

**Risk:** medium — corepack/pnpm in CI is usually smooth, but cache and
`--frozen-lockfile` require the Phase 1 `pnpm-lock.yaml` to be committed and
consistent.

---

## Phase 3 — Cautious dependency upgrade

With tooling modernized and CI green, cautiously raise library versions.
Principle: **cautious, no breaking majors without a clear reason.**

**Priority goal — remove `--openssl-legacy-provider`:**

This flag is a workaround for old webpack using a deprecated `hashFunction`
(MD4), unavailable in OpenSSL 3 (Node 17+). It appears in `build`/`dev` scripts
for pwa, extension, electron, cordova. Ways to remove:

- The webpack config already sets `hashFunction: "sha256"` (in pwa) — the flag
  may already be unnecessary; try removing and verifying
- Or bump webpack 5.52 → current 5.9x, which does not pull legacy crypto
- Fully eliminated in Phase 4 (Vite), but removed here as a clean step for
  in-scope web targets

**Update categories (increasing risk):**

1. **Safe (patch/minor)** — run `pnpm update` within semver, update
   `pnpm-lock.yaml`. Low risk.
2. **Deprecated packages**, targeted:
   - `webextension-polyfill-ts` (deprecated) → `webextension-polyfill` +
     `@types/webextension-polyfill` (requires import fixes in extension)
   - Review `@types/stripe` / `stripe` (currently 8.x — old), `@types/node`
     16.x → 18.x
3. **TypeScript 4.4.3 → 5.x** — **decided within this phase by fact.** Concrete
   risks:
   - `suppressImplicitAnyIndexErrors` removed in TS 5.5 → must drop the flag and
     fix surfaced index errors
   - Decorator behavior: project uses `experimentalDecorators`; legacy
     decorators are supported in TS 5.x but ensure the new standard decorators
     don't activate
   - Unified TS: `typescript` is currently pinned individually in 6+ places.
     Consider hoisting to a single root devDependency, or at least sync the
     version.

   **The TS-major decision is made inside Phase 3** after estimating the fix
   volume. If the fixes are large, split TS 5.x into a sub-phase 3b or a separate
   spec. This is an explicit fork.

**Not touched in this phase:**

- webpack itself (moves to Phase 4) — only a minimal bump if needed to drop
  openssl-legacy
- UI framework majors (`lit` 2.x) without a clear reason
- electron/cordova/tauri dependencies (out of scope)

**Work order within the phase:** update in groups; after each group run
`install + build + unit + e2e`. Do not dump everything into one commit.

**Readiness:** all criteria green; `--openssl-legacy-provider` removed from
in-scope web targets; deprecated packages (at least `webextension-polyfill-ts`)
replaced.

**Risk:** medium-high (especially TS 5.x). Mitigation — grouped updates with a
gate after each.

---

## Phase 4 — webpack → Vite (direction only)

Final and riskiest phase. This spec captures the **goal, criteria, and known
risks**; the detailed migration plan is a separate brainstorming before Phase 4
(the config is heavily customized).

**Goal:** replace webpack with Vite for **PWA** and **extension** (in-scope
targets). Server stays on ts-node (not bundled).

**Capabilities to reproduce in Vite (from the current PWA webpack config):**

| Current webpack capability | Vite equivalent | Risk |
|---|---|---|
| `ts-loader` TS compilation | Vite/esbuild native | ⚠️ `emitDecoratorMetadata` — esbuild support partial; critical for core decorators |
| `EnvironmentPlugin` (PL_* env) | `define` / `import.meta.env` + plugin | medium |
| `HtmlWebpackPlugin` + CSP injection (complex dev/prod logic) | `transformIndexHtml` hook | high — custom CSP logic ~150 lines |
| `WebpackPwaManifest` | `vite-plugin-pwa` | medium |
| `workbox-webpack-plugin` `InjectManifest` (SW from `app/src/sw.ts`) | `vite-plugin-pwa` (Workbox injectManifest) | medium |
| `sharp` favicon generation in build hook | custom Vite plugin / separate script | medium |
| `file-loader` / `raw-loader` / `css-loader` | Vite native `?raw`, `?url`, css | low |
| `clean-webpack-plugin` | Vite cleans `outDir` itself | low |
| extension: multiple entries / manifest | `@crxjs/vite-plugin` or manual rollup input | high |

**Main technical risk — `emitDecoratorMetadata`:** core relies on
reflect-metadata + decorators. esbuild (Vite's engine) historically does **not
emit decorator metadata** the way tsc does. Possible paths:
`@rollup/plugin-typescript` / `vite-plugin-checker` + tsc for metadata, or a
babel/swc plugin. **This is the key viability question for Phase 4** — must be
validated with a spike at the very start of the Phase 4 brainstorm.

**Readiness:** PWA and extension build on Vite; CSP, SW, PWA manifest, favicon
work; `--openssl-legacy-provider` fully gone; all criteria
(install/build/unit/e2e/CI) green.

**Explicit boundary:** the detailed Phase 4 plan = a separate brainstorming +
decorator-metadata spike **before** implementation. This spec provides direction
and risks only.

**Risk:** high. Hence it is last and isolated.

---

## Non-goals

- **electron / cordova / tauri** — platform targets. In Phase 2 only their
  install phase is fixed (to keep CI green); full build modernization is
  deferred to separate specs.
- **SWC** — deferred candidate for speeding up server/tests. Requires
  compatibility validation with `emitDecoratorMetadata`. Not part of this epic.
  (esbuild inside Vite already covers web transpilation, so SWC would be
  redundant there.)
- **UI framework majors** (`lit` 2.x → 3.x, etc.) without clear need.
- **TypeScript 5.x** — may be split into a separate sub-phase/spec if the fix
  volume in Phase 3 turns out large (fork decided by fact).
- **npm publishing** (`lerna publish` / `version`) — not needed in the fork;
  removed.

## Consolidated Key Risks

- `emitDecoratorMetadata` + reflect-metadata — cross-cutting risk for
  esbuild/SWC/Vite (Phase 4, critical)
- `sharp` (native) + pnpm strict node_modules — hoisting (Phase 1)
- `maildev` git dependency under pnpm (Phase 1)
- `--openssl-legacy-provider` legacy crypto (Phase 3)
- `suppressImplicitAnyIndexErrors` under TS 5.x (Phase 3)
- Phantom dependencies surfacing under strict pnpm (Phase 1)
