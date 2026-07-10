# Padloc Modernization (Phases 0–3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate padloc from Lerna+npm to pnpm workspaces, move CI/Docker onto pnpm, and cautiously upgrade dependencies — leaving the project green at every step.

**Architecture:** Five phases collapse here into four detailed ones (0–3). Phase 0 finishes the Node 18 baseline. Phase 1 replaces Lerna bootstrap and 11 npm lockfiles with a single pnpm workspace. Phase 2 rewrites CI workflows and Dockerfiles onto pnpm/corepack. Phase 3 raises dependency versions in small gated groups, removing the `--openssl-legacy-provider` crypto workaround. Bundler replacement (Vite) is a separate plan.

**Tech Stack:** pnpm workspaces, corepack, Node 18, TypeScript, webpack (until Vite plan), ts-node, mocha, cypress, GitHub Actions, Docker.

## Global Constraints

- Node runtime: `18.x` (verbatim from `package.json` engines)
- npm engine field currently `9.x`; add `"packageManager": "pnpm@10.15.0"` for corepack (pnpm 10 is the latest major that runs on Node 18; pnpm 11 requires newer Node and fails with `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`)
- Implementation environment: Node 18 via nvm (`nvm use 18`), pnpm 10.15.0 via corepack
- Package manager: **pnpm workspaces**; Lerna removed entirely
- Task orchestration: native `pnpm -r` / `pnpm --filter`, never `lerna`
- In-scope build targets: `@padloc/pwa`, `@padloc/server`, `@padloc/extension`
- Deferred targets (install-fix only, no build verification): electron, cordova, tauri
- Intra-package deps use `workspace:*`
- Keep `save-exact=true` in `.npmrc`
- Readiness per phase: `install` + `build` (pwa/extension/server) + unit (core/server) + e2e (cypress) green; from Phase 2, real CI green
- Do NOT bump library versions in Phases 0–2 (tooling only). Version bumps happen only in Phase 3, in gated groups.
- TypeScript stays 4.4.3 unless the Phase 3 TS fork decides otherwise.

---

## File Structure

Files created or modified across phases:

- `.nvmrc` (modify) — Node version pin
- `pnpm-workspace.yaml` (create) — workspace package globs
- `.npmrc` (modify) — pnpm hoist config for native `sharp`
- `package.json` (modify) — remove lerna, add packageManager, rewrite scripts
- `lerna.json` (delete) — Lerna config
- `package-lock.json` + `packages/*/package-lock.json` (delete, 11 files) — old lockfiles
- `pnpm-lock.yaml` (create) — single lockfile
- `packages/*/package.json` (modify) — `workspace:*` intra-deps
- `.github/workflows/run-tests.yml` (modify) — pnpm install/run, fix stale cache paths
- `.github/workflows/build-web-extension.yml` (modify) — pnpm
- `.github/workflows/build-electron.yml` (modify) — pnpm install only
- `.github/workflows/build-cordova.yml` (modify) — pnpm install only
- `.github/workflows/build-tauri.yml` (modify) — pnpm install only
- `Dockerfile-server` (modify) — corepack + pnpm
- `Dockerfile-pwa` (modify) — corepack + pnpm
- `docker-compose.yml` (verify/modify) — command references

---

## PHASE 0 — Node 18 catch-up

### Task 0.1: Fix `.nvmrc` to Node 18

**Files:**
- Modify: `.nvmrc`

**Interfaces:**
- Consumes: nothing
- Produces: Node 18 pin consumed by all CI workflows via `node-version-file: ".nvmrc"`

- [ ] **Step 1: Verify current value and that it is the only node16 trace**

Run: `cat .nvmrc && grep -rn "16\.13\|node:16" --include="*.yml" --include="Dockerfile*" .github Dockerfile-* 2>/dev/null`
Expected: `.nvmrc` prints `v16.13.1`; grep prints nothing (Dockerfiles already node:18).

- [ ] **Step 2: Update `.nvmrc`**

Replace the entire file contents with:

```
v18
```

- [ ] **Step 3: Verify**

Run: `cat .nvmrc`
Expected: `v18`

- [ ] **Step 4: Commit**

```bash
git add .nvmrc
git commit -m "chore: pin .nvmrc to Node 18 (finish Node 18 baseline)"
```

---

## PHASE 1 — pnpm workspaces + remove Lerna

> Prerequisite for the whole phase: `nvm use 18 && corepack enable && corepack prepare pnpm@10.15.0 --activate`. All commands below assume `pnpm` resolves to v10.x on Node 18.

### Task 1.1: Add pnpm workspace + packageManager, keep Lerna temporarily

This task establishes the workspace definition and pnpm metadata WITHOUT deleting Lerna yet, so we can generate the lockfile and see what breaks before ripping scripts out.

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json:13-16` (engines block region), add `packageManager` field

**Interfaces:**
- Consumes: nothing
- Produces: `pnpm-workspace.yaml` defining `packages/*`; `packageManager` field for corepack

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
    - "packages/*"
```

- [ ] **Step 2: Add `packageManager` field to `package.json`**

Insert the field immediately after the `"version"` line (`package.json:4`), so the top of the file reads:

```json
{
    "name": "padloc",
    "private": true,
    "version": "4.3.0",
    "packageManager": "pnpm@10.15.0",
```

(Use `pnpm@10.15.0`; run `pnpm --version` to confirm it matches, then substitute the exact patch if different.)

- [ ] **Step 3: Verify pnpm sees the workspace**

Run: `pnpm -r list --depth -1`
Expected: lists all 10 `@padloc/*` packages (admin, app, cordova, core, electron, extension, locale, pwa, server, tauri). It is OK if it warns about lockfile; do not install yet.

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: add pnpm-workspace.yaml and packageManager field"
```

### Task 1.2: Convert intra-package deps to `workspace:*`

**Files:**
- Modify: `packages/pwa/package.json:22-23` (`@padloc/app`, `@padloc/core`)
- Modify: `packages/extension/package.json:23-24` (`@padloc/app`, `@padloc/core`)
- Modify: `packages/app/package.json:23-24` (`@padloc/core`, `@padloc/locale`)
- Modify: `packages/core/package.json:14` (`@padloc/locale`)
- Modify: `packages/server/package.json:25-26` (`@padloc/core`, `@padloc/locale`)
- Modify: `packages/admin/package.json:21-23` (`@padloc/app`, `@padloc/core`, `@padloc/locale`)
- Modify: `packages/cordova/package.json` (`@padloc/app`, `@padloc/core`)
- Modify: `packages/electron/package.json` (`@padloc/app`, `@padloc/core`)
- Modify: `packages/tauri/package.json` (`@padloc/app`, `@padloc/core`)

> NOTE (execution finding): cordova, electron, and tauri also carry `@padloc/*` deps at `"4.3.0"`. They MUST be converted too — otherwise the verification grep fails and `pnpm install` (Task 1.3) tries to fetch non-existent npm versions of workspace-local packages. All 9 packages with `@padloc/*` deps are converted.

**Interfaces:**
- Consumes: `pnpm-workspace.yaml` from Task 1.1
- Produces: all `@padloc/*` intra-deps pinned to `workspace:*` so pnpm links from the workspace

- [ ] **Step 1: Replace each `"@padloc/<x>": "4.3.0"` with `"@padloc/<x>": "workspace:*"`**

In every file listed above, change intra-workspace dependency version strings from `"4.3.0"` to `"workspace:*"`. Example for `packages/pwa/package.json`:

```json
    "dependencies": {
        "@padloc/app": "workspace:*",
        "@padloc/core": "workspace:*"
    },
```

Do the same for `@padloc/app`, `@padloc/core`, `@padloc/locale` wherever they appear as dependencies in the six files. Do NOT change third-party versions.

- [ ] **Step 2: Verify no stray `@padloc/*: "4.3.0"` remains**

Run: `grep -rn '"@padloc/[a-z]*": "4' packages/*/package.json`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add packages/*/package.json
git commit -m "chore: use workspace:* for intra-package dependencies"
```

### Task 1.3: Remove Lerna scripts + old lockfiles and generate pnpm-lock.yaml

> **MERGED TASK (execution finding).** Originally Tasks 1.3 (lockfiles) and 1.4
> (remove lerna) were separate, but they are coupled: the root `postinstall`
> runs `lerna bootstrap`, and Lerna 5 crashes on the `workspace:*` protocol
> (`Unsupported URL Type "workspace:"`), which aborts `pnpm install`'s lifecycle
> before native builds run. So the lerna scripts MUST be removed in the SAME
> task that first runs `pnpm install`. Additionally, pnpm 10 blocks dependency
> build scripts by default, so `sharp`'s native binary is not built unless it is
> allow-listed via `onlyBuiltDependencies`. Both fixes are folded in below.

**Files:**
- Modify: `package.json` (devDependencies: remove lerna; scripts: lerna → pnpm)
- Modify: `pnpm-workspace.yaml` (add `onlyBuiltDependencies` for native builds)
- Modify: `.npmrc` (sharp hoist)
- Delete: `lerna.json`
- Delete: `package-lock.json` + all 10 `packages/*/package-lock.json`
- Create: `pnpm-lock.yaml` (generated)

**Interfaces:**
- Consumes: `pnpm-workspace.yaml`, `workspace:*` deps
- Produces: single `pnpm-lock.yaml`; lerna fully removed; `sharp` native binary built and resolvable; workspace symlinks

- [ ] **Step 1: Add sharp hoist pattern to `.npmrc`**

Set `.npmrc` contents to:

```
save-exact=true
public-hoist-pattern[]=*sharp*
```

Rationale: the webpack configs `require("sharp")` from a hoisted location; pnpm's default isolated store would hide it.

- [ ] **Step 2: Allow native builds in `pnpm-workspace.yaml`**

pnpm 10 does NOT run dependency build/install scripts unless they are approved. `sharp` needs its native binary compiled/downloaded. Append to `pnpm-workspace.yaml` so it reads exactly:

```yaml
packages:
    - "packages/*"

onlyBuiltDependencies:
    - sharp
```

- [ ] **Step 3: Remove `lerna` from devDependencies**

Delete this line from `package.json` devDependencies:

```json
        "lerna": "5.1.8",
```

- [ ] **Step 4: Replace the `scripts` block**

Replace the entire `"scripts"` object in `package.json` with the following (lerna → pnpm, bootstrap removed, publish/version removed):

```json
    "scripts": {
        "pwa:build": "pnpm --filter @padloc/pwa run build",
        "pwa:start": "pnpm --filter @padloc/pwa run start",
        "server:start": "pnpm --filter @padloc/server run start",
        "server:start-dry": "pnpm --filter @padloc/server run start-dry",
        "electron:start": "pnpm --filter @padloc/electron run start",
        "electron:build": "pnpm --filter @padloc/electron run build",
        "electron:build:flatpak": "pnpm --filter @padloc/electron run build:flatpak",
        "web-extension:build": "pnpm --filter @padloc/extension run build",
        "cordova:start:android": "pnpm --filter @padloc/cordova run start:android",
        "cordova:start:ios": "pnpm --filter @padloc/cordova run start:ios",
        "cordova:build": "pnpm --filter @padloc/cordova run build:android && pnpm --filter @padloc/cordova run build:ios",
        "cordova:build:android": "pnpm --filter @padloc/cordova run build:android",
        "cordova:build:android:signed": "pnpm --filter @padloc/cordova run build:android:signed",
        "cordova:build:ios": "pnpm --filter @padloc/cordova run build:ios",
        "cordova:build:ios:signed": "pnpm --filter @padloc/cordova run build:ios:signed",
        "start": "pnpm run pwa:build && pnpm --filter @padloc/server --filter @padloc/pwa --parallel run start",
        "start:v3": "http-server cypress/fixtures/v3-client -s -p 8081 --proxy http://0.0.0.0:8081?",
        "dev": "pnpm --filter @padloc/server --filter @padloc/pwa --filter @padloc/admin --parallel run dev",
        "tauri:dev": "pnpm --filter @padloc/server --filter @padloc/tauri --parallel run dev",
        "tauri:update": "pnpm --filter @padloc/tauri run update-tauri",
        "tauri:build": "pnpm --filter @padloc/tauri run build",
        "tauri:build:debug": "pnpm --filter @padloc/tauri run build:debug",
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

Notes on removals: `postinstall`/`bootstrap` (lerna bootstrap) removed — pnpm links on install; `remove` script (lerna exec) removed; `version`/`publish` (lerna) removed. `SHARP_IGNORE_GLOBAL_LIBVIPS` env from the old bootstrap script is dropped because there is no bootstrap step; re-add per-package only if a build fails on sharp.

- [ ] **Step 5: Delete `lerna.json`**

Run: `rm lerna.json`

- [ ] **Step 6: Delete all npm lockfiles**

Run:
```bash
rm package-lock.json packages/*/package-lock.json
```

- [ ] **Step 7: Install with pnpm (generates lockfile, builds sharp)**

Run: `pnpm install`
Expected: completes with NO `lerna-debug.log` and NO postinstall error (there is no postinstall now); creates `pnpm-lock.yaml`; links `@padloc/*` workspace packages; builds `sharp` (allowed via `onlyBuiltDependencies`). Note any warnings about missing/phantom deps for Task 1.4 (verification).

If sharp still is not built after install, run `pnpm rebuild sharp` and re-verify; if that fails, report BLOCKED with the exact error.

- [ ] **Step 8: Verify sharp resolves, workspace links exist, lerna gone**

Run:
```bash
node -e "require('sharp'); console.log('sharp ok')"
ls -la packages/pwa/node_modules/@padloc
grep -rn "lerna" package.json .npmrc pnpm-workspace.yaml 2>/dev/null; ls lerna.json 2>/dev/null
```
Expected: prints `sharp ok`; `packages/pwa/node_modules/@padloc` contains symlinks to `app` and `core`; no lerna references and `lerna.json` gone.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: migrate to pnpm workspaces, remove lerna, single pnpm-lock.yaml"
```

### Task 1.4: Verify builds/tests, fix phantom dependencies

> **Execution finding from Task 1.3:** pnpm 10 reported `Ignored build scripts:
> cypress, electron, leveldown`. These native/post-install builds are blocked by
> default. `cypress` needs its binary for e2e (Step 3); `leveldown` is a server
> storage backend dependency; `electron` is out of scope this epic. If e2e or
> server tests fail due to a missing binary, add the offending package to
> `onlyBuiltDependencies` in `pnpm-workspace.yaml` (alongside `sharp`) and
> re-run `pnpm install`. Prefer `cypress` and `leveldown` if needed; leave
> `electron` unless an in-scope step requires it.

**Files:**
- Modify: `packages/*/package.json` (only if a phantom dep must be declared)
- Modify: `pnpm-workspace.yaml` (only if a blocked build script must be allow-listed)

**Interfaces:**
- Consumes: full pnpm workspace
- Produces: green `build` (pwa/extension/server), green unit tests, green e2e; any previously-phantom deps explicitly declared; any required native builds allow-listed

- [ ] **Step 1: Build the three in-scope targets**

Run:
```bash
pnpm run pwa:build && pnpm run web-extension:build && pnpm run server:start-dry
```
Expected: all succeed. If a build fails with "Cannot find module X", `X` is a phantom dependency — add it with `pnpm add X --filter @padloc/<pkg>` (exact version matching what npm previously hoisted), then re-run.

- [ ] **Step 2: Run unit tests**

Run: `pnpm -r run test`
Expected: core and server mocha suites pass (`tsc --noEmit` + mocha). Fix any newly-surfaced missing `@types/*` via `pnpm add -D @types/... --filter @padloc/<pkg>`.

- [ ] **Step 3: Run e2e**

Run: `pnpm run test:e2e`
Expected: cypress run passes. (Requires local build + maildev.)

- [ ] **Step 4: Verify prettier still clean**

Run: `pnpm run prettier:check`
Expected: passes.

- [ ] **Step 5: Commit any phantom-dep fixes**

```bash
git add -A
git commit -m "fix: declare previously-hoisted phantom dependencies for pnpm"
```

(If no fixes were needed, skip this commit.)

---

## PHASE 2 — CI + Docker on pnpm

### Task 2.1: Migrate `run-tests.yml` to pnpm

> **Prerequisite finding (from Task 1.4):** the workflow runs `pnpm run
> prettier:check`, which currently FAILS on our internal planning docs
> (`docs/superpowers/plans/*.md`, `docs/superpowers/specs/*.md`). These are SDD
> workflow artifacts, not shipped product docs. Before/while migrating the
> workflow, resolve this so the prettier gate is green: add `docs/superpowers/`
> to `.prettierignore` (consistent with the existing `.superpowers/**/*` entry).
> Do NOT reformat the planning docs into product history.

**Files:**
- Modify: `.github/workflows/run-tests.yml` (entire file)
- Modify: `.prettierignore` (add `docs/superpowers/`)

**Interfaces:**
- Consumes: `pnpm-lock.yaml`, `.nvmrc`=v18, root pnpm scripts
- Produces: primary CI gate running on pnpm; stale `packages/manage/node_modules` cache path removed; prettier gate green

- [ ] **Step 0: Make prettier gate green**

Add `docs/superpowers/` to `.prettierignore`. Verify: `pnpm run prettier:check` exits 0.

- [ ] **Step 1: Replace the whole workflow file**

```yaml
name: Run Tests

on:
    push:
        branches:
            - main
    pull_request:

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: pnpm/action-setup@v4
              with:
                  version: 10
            - uses: actions/setup-node@v3
              with:
                  node-version-file: ".nvmrc"
                  cache: "pnpm"
            - name: Install dependencies
              run: pnpm install --frozen-lockfile
            - name: Run prettier check
              run: pnpm run prettier:check
            - name: Run translation checks
              run: |
                  pnpm run locale:extract
                  if [ $(git status --porcelain | wc -l) -ne "0" ]; then
                    echo "Missing translations detected."
                    exit 1
                  fi
            - name: Run pwa test build
              run: pnpm run pwa:build
            - name: Run web extention test build
              run: pnpm run web-extension:build
            - name: Test starting zero-config server
              run: pnpm run server:start-dry
            - name: Run tests
              run: pnpm test
```

Notes: removed the manual `actions/cache@v3` block (with the stale `packages/manage/node_modules` path — no `manage` package exists) in favor of `cache: "pnpm"`; removed `npm i -g npm@8.2.0`. e2e stays out of this workflow as before.

- [ ] **Step 2: Lint the YAML locally**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/run-tests.yml')); print('yaml ok')"`
Expected: `yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .prettierignore .github/workflows/run-tests.yml
git commit -m "ci: run tests on pnpm, drop stale cache paths"
```

### Task 2.2: Migrate `build-web-extension.yml` to pnpm

**Files:**
- Modify: `.github/workflows/build-web-extension.yml:33-45` (setup + install + build steps)

**Interfaces:**
- Consumes: pnpm scripts, `.nvmrc`
- Produces: extension build workflow on pnpm

- [ ] **Step 1: Replace the node-setup + install steps**

Change the setup-node / install region so that:
- `pnpm/action-setup@v4` is added before `actions/setup-node@v3`; it reads the exact pnpm version from `packageManager`
- `actions/setup-node@v3` gains `cache: "pnpm"` alongside `node-version-file: ".nvmrc"`
- the install block `npm i -g npm@8.2.0 web-ext@6.6.0` / `npm ci` becomes:

```yaml
            - name: Install dependencies
              run: |
                  npm i -g web-ext@6.6.0
                  pnpm install --frozen-lockfile
```

- the build step `run: npm run web-extension:build` becomes `run: pnpm run web-extension:build`

- [ ] **Step 2: Validate YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build-web-extension.yml')); print('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build-web-extension.yml
git commit -m "ci: build web extension on pnpm"
```

> **Final-review addition (execution finding):** `.github/workflows/publish-release.yml`
> was MISSED in the original Phase 2 scope. It has 6 jobs all using `npm i -g
> npm@8.2.0` + `npm ci`, which hard-fail once lockfiles are deleted. It is
> `workflow_dispatch`-only (does not block PR/push CI) but the next release
> dispatch would break. It was migrated to pnpm (6 jobs: `pnpm/action-setup@v4`
> v10 + `cache: "pnpm"` + `pnpm install --frozen-lockfile`; `web-ext@6.6.0`
> global preserved in the extension job) in commit `ci: migrate publish-release
> workflow to pnpm`. All `.github/workflows/*.yml` are now pnpm-based.

### Task 2.3: Fix install phase in platform workflows (electron/cordova/tauri)

These are out of epic scope for build verification, but their `npm ci` breaks once lockfiles are gone. Convert install only.

**Files:**
- Modify: `.github/workflows/build-electron.yml` (each setup-node + `npm i -g npm@8.2.0` + `npm ci` block)
- Modify: `.github/workflows/build-cordova.yml` (each such block)
- Modify: `.github/workflows/build-tauri.yml` (each such block)

**Interfaces:**
- Consumes: pnpm workspace
- Produces: platform workflows install via pnpm (build steps left as-is; not verified this epic)

- [ ] **Step 1: In each file, for every job that installs deps, apply the same pattern**

Before each `actions/setup-node@v3`, add:

```yaml
            - uses: pnpm/action-setup@v4
              with:
                  version: 10
```

Add `cache: "pnpm"` to each `actions/setup-node@v3` `with:` block (which already has `node-version-file: ".nvmrc"`).

Replace each occurrence of:
```yaml
                  npm i -g npm@8.2.0
                  npm ci
```
with:
```yaml
                  pnpm install --frozen-lockfile
```

(For cordova/electron/tauri where extra globals are installed alongside — e.g. tauri may keep other `npm i -g` tools — keep those global installs but drop `npm@8.2.0` and replace `npm ci` with `pnpm install --frozen-lockfile`.)

Leave all `npm run <target>:build` build steps unchanged for now (or convert to `pnpm run` for consistency; either works since root scripts exist).

- [ ] **Step 2: Validate all three YAMLs**

Run:
```bash
for f in build-electron build-cordova build-tauri; do python3 -c "import yaml; yaml.safe_load(open('.github/workflows/$f.yml')); print('$f ok')"; done
```
Expected: `build-electron ok`, `build-cordova ok`, `build-tauri ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build-electron.yml .github/workflows/build-cordova.yml .github/workflows/build-tauri.yml
git commit -m "ci: convert platform workflows install to pnpm (build unverified)"
```

### Task 2.4: Migrate `Dockerfile-server` to pnpm

**Files:**
- Modify: `Dockerfile-server` (entire file)

**Interfaces:**
- Consumes: `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- Produces: server image built with pnpm; no lerna.json copy; no per-package lockfiles

- [ ] **Step 1: Replace the file**

```dockerfile
FROM node:18-bullseye

EXPOSE 3000

ENV PL_ASSETS_DIR=/assets
ENV PL_ATTACHMENTS_DIR=/attachments

RUN corepack enable

WORKDIR /padloc

# Only copy over the package manifests + workspace/lock files first,
# so dependency install is cached across source-only changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/core/package.json ./packages/core/
COPY packages/locale/package.json ./packages/locale/

# Install dependencies for the server target and its workspace deps
RUN pnpm install --frozen-lockfile --filter @padloc/server...

# Now copy over source files and assets
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
COPY packages/core/src ./packages/core/src
COPY packages/core/vendor ./packages/core/vendor
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/locale/src ./packages/locale/src
COPY packages/locale/res ./packages/locale/res
COPY packages/locale/tsconfig.json ./packages/locale/
COPY assets /assets
COPY packages/server/do-ca.crt ./packages/server/

WORKDIR /padloc/packages/server

ENTRYPOINT ["pnpm", "run"]

CMD ["start"]
```

Notes: `--filter @padloc/server...` installs server plus its workspace dependency closure. `do-ca.crt` copy preserved.

- [ ] **Step 2: Build the image**

Run: `docker build -f Dockerfile-server -t padloc-server-test .`
Expected: build succeeds through `pnpm install` and source copy.

- [ ] **Step 3: Smoke-test dry start**

Run: `docker run --rm -e PL_DATA_BACKEND=memory padloc-server-test start-dry`
Expected: server boots in dry-run and exits cleanly (no crash).

- [ ] **Step 4: Commit**

```bash
git add Dockerfile-server
git commit -m "docker: build server image with pnpm/corepack"
```

### Task 2.5: Migrate `Dockerfile-pwa` to pnpm

**Files:**
- Modify: `Dockerfile-pwa` (entire file)

**Interfaces:**
- Consumes: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc` (sharp hoist)
- Produces: pwa image built with pnpm

- [ ] **Step 1: Replace the file**

```dockerfile
FROM node:18-bullseye

EXPOSE 8080

ENV PL_ASSETS_DIR=/assets
ENV PL_PWA_DIR=/pwa

RUN corepack enable

WORKDIR /padloc

# Only copy over the package manifests + workspace/lock files first.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY packages/pwa/package.json ./packages/pwa/
COPY packages/app/package.json ./packages/app/
COPY packages/core/package.json ./packages/core/
COPY packages/locale/package.json ./packages/locale/

# Install dependencies for the pwa target and its workspace deps
RUN pnpm install --frozen-lockfile --filter @padloc/pwa...

# Now copy over source files and assets
COPY packages/pwa/src ./packages/pwa/src
COPY packages/pwa/tsconfig.json packages/pwa/webpack.config.js ./packages/pwa/
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

WORKDIR /padloc/packages/pwa

ENTRYPOINT ["pnpm", "run"]

CMD ["build_and_start"]
```

- [ ] **Step 2: Build the image**

Run: `docker build -f Dockerfile-pwa -t padloc-pwa-test .`
Expected: build succeeds, including `pnpm run build` step if triggered; `sharp` favicon generation must not fail (verifies `.npmrc` hoist works inside the image).

- [ ] **Step 3: Commit**

```bash
git add Dockerfile-pwa
git commit -m "docker: build pwa image with pnpm/corepack"
```

### Task 2.6: Verify docker-compose references

**Files:**
- Modify (only if needed): `docker-compose.yml`

**Interfaces:**
- Consumes: the two updated Dockerfiles
- Produces: compose file consistent with pnpm-based images

- [ ] **Step 1: Inspect compose file**

Run: `grep -n "Dockerfile\|command\|npm\|lerna\|entrypoint" docker-compose.yml`
Expected: identify any `npm`/`lerna` command overrides. If a service overrides `command:`/`entrypoint:` with `npm run ...`, change it to `pnpm run ...`. If it only references `Dockerfile-server`/`Dockerfile-pwa` with no npm command, no change needed.

- [ ] **Step 2: Validate compose config**

Run: `docker compose config >/dev/null && echo "compose ok"`
Expected: `compose ok`.

- [ ] **Step 3: Commit (only if changed)**

```bash
git add docker-compose.yml
git commit -m "docker: align compose commands with pnpm"
```

---

## PHASE 3 — Cautious dependency upgrade

> Principle: update in small groups; after EACH group run the gate: `pnpm install && pnpm run pwa:build && pnpm run web-extension:build && pnpm run server:start-dry && pnpm -r run test`. Commit per group.

### Task 3.1: Remove `--openssl-legacy-provider` from in-scope web targets

**Files:**
- Modify: `packages/pwa/package.json:46-47` (`build`, `dev` scripts)
- Modify: `packages/extension/package.json:45` (`build` script)

**Interfaces:**
- Consumes: existing webpack config (`hashFunction: "sha256"` already set in pwa)
- Produces: pwa/extension build scripts without the OpenSSL legacy flag

- [ ] **Step 1: Confirm the flag is present**

Run: `grep -n "openssl-legacy-provider" packages/pwa/package.json packages/extension/package.json`
Expected: matches in pwa `build`/`dev` and extension `build`.

- [ ] **Step 2: Remove the flag from pwa scripts**

In `packages/pwa/package.json`, change:
```json
        "build": "NODE_OPTIONS=--openssl-legacy-provider webpack",
        "dev": "NODE_OPTIONS=--openssl-legacy-provider webpack serve",
```
to:
```json
        "build": "webpack",
        "dev": "webpack serve",
```

- [ ] **Step 3: Remove the flag from extension script**

In `packages/extension/package.json`, change:
```json
        "build": "NODE_OPTIONS=--openssl-legacy-provider webpack"
```
to:
```json
        "build": "webpack"
```

- [ ] **Step 4: Gate — build both without the flag**

Run: `pnpm run pwa:build && pnpm run web-extension:build`
Expected: both succeed on Node 18. If pwa fails with an OpenSSL/hash error, ensure `output.hashFunction: "sha256"` exists in `packages/pwa/webpack.config.js` (it does at line 43) and add the same to `packages/extension/webpack.config.js` if that config produces a hash error; re-run.

- [ ] **Step 5: Commit**

```bash
git add packages/pwa/package.json packages/extension/package.json
git commit -m "chore: drop --openssl-legacy-provider from pwa/extension builds"
```

### Task 3.2: Replace deprecated `webextension-polyfill-ts`

**Files:**
- Modify: `packages/extension/package.json:27` (dependency)
- Modify: extension source files importing `webextension-polyfill-ts`

**Interfaces:**
- Consumes: extension build
- Produces: extension using maintained `webextension-polyfill` + `@types/webextension-polyfill`

- [ ] **Step 1: Find all imports of the deprecated package**

Run: `grep -rn "webextension-polyfill-ts" packages/extension/src`
Expected: a list of import sites. Record them.

- [ ] **Step 2: Swap the dependency**

Run:
```bash
pnpm remove webextension-polyfill-ts --filter @padloc/extension
pnpm add webextension-polyfill --filter @padloc/extension
pnpm add -D @types/webextension-polyfill --filter @padloc/extension
```

- [ ] **Step 3: Update imports**

For each import found in Step 1, change:
```ts
import { browser } from "webextension-polyfill-ts";
```
to:
```ts
import browser from "webextension-polyfill";
```
(Adjust for the actual imported symbols; the maintained package exports the `browser` object as default. If code used a named `Runtime`/`Tabs` type from the old package, import types via `import type { Runtime, Tabs } from "webextension-polyfill";`.)

- [ ] **Step 4: Gate — build extension**

Run: `pnpm run web-extension:build`
Expected: builds with no unresolved `webextension-polyfill-ts` reference.

- [ ] **Step 5: Verify no stale references remain**

Run: `grep -rn "webextension-polyfill-ts" packages/extension`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: migrate extension to maintained webextension-polyfill"
```

### Task 3.3: Safe within-major (minor/patch) updates (grouped)

> **Execution finding:** the repo uses `save-exact=true`, so EVERY dependency is
> pinned to an exact version with no `^`/`~` range. Therefore `pnpm update`
> (without `--latest`) is a no-op. To actually update, the exact pin strings must
> be rewritten to the newest version **within the current major**. This is still
> "cautious" (no major bumps) but is a deliberate edit, not `pnpm update`.
> Decision confirmed with the project owner: apply same-major patch/minor bumps.

**Files:**
- Modify: `packages/*/package.json` (rewrite exact pins to newest within-major, in-scope packages only)
- Modify: `pnpm-lock.yaml` (regenerated by install)

**Interfaces:**
- Consumes: full workspace
- Produces: in-scope dependencies raised to newest within-major, still green

**Scope:** in-scope packages only — core, app, locale, pwa, extension, server.
Do NOT touch electron/cordova/tauri. Do NOT bump any MAJOR. Do NOT change
`typescript` (Task 3.5 owns that). Do NOT remove/loosen the root `pnpm.overrides`
block (it pins tiptap/prosemirror/@types-node/pg-protocol to keep TS 4.4.3
compiling) — skip any candidate that would conflict with an override.

- [ ] **Step 1: List within-major candidates**

Run: `pnpm -r outdated || true`
Record, per in-scope package, each dependency whose "Latest" shares the SAME major as "Current" (e.g. `pg 8.7.1 → 8.22.0`, `jszip 3.10.0 → 3.10.1`, `qrcode 1.5.0 → 1.5.4`). Ignore rows where only a new major exists. Ignore anything pinned by `pnpm.overrides`.

- [ ] **Step 2: Rewrite pins one package-group at a time**

For each in-scope package, edit its `package.json`, changing the exact version string of each same-major candidate to the newest within-major version (keep exact pins — no `^`/`~`). Do ONE package group, then gate (Step 3), before moving to the next. Order (lowest risk first): locale, core, app, extension, pwa, server.

- [ ] **Step 3: Gate after EACH group**

Run:
```bash
pnpm install && pnpm run pwa:build && pnpm run web-extension:build && pnpm run server:start-dry && pnpm -r run test
```
Expected: all green. (e2e/cypress cannot run in this sandbox — no outbound TLS — SKIP it; verify in real CI.) If a group breaks the gate, revert JUST the offending pin(s) for that group (restore the old exact version + `pnpm install`), note which bump broke it, and continue. Prefer safety over completeness.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: apply safe within-major dependency updates"
```
(If, after skipping breakers, NO bump survived, make no commit and report that.)

### Task 3.4: `@types/node` 16.x → 18.x  — DEFERRED (execution outcome)

> **OUTCOME: deferred, no change.** `@types/node@18` could not be adopted under
> current constraints. Two independent blockers (verified against the real
> `pnpm run test` gate):
> 1. **mongodb@4.1.0 type conflict (affects ALL 18.x, even TS-4.4.3-parseable
>    ones):** Node 18's `@types/node` changed `Writable.end()` to return `this`
>    (was `void` in Node 16), breaking `mongodb.d.ts`'s
>    `GridFSBucketWriteStream.end(): void` overrides → 6× `TS2416`.
> 2. **TS 4.4.3 parser ceiling (18.19.90+):** `https.d.ts` generic
>    `Server<Request, Response>` syntax → parse errors.
>
> `@types/node` is pinned in THREE places (root `pnpm.overrides`, `core`,
> `server`) — all remain `16.11.7`. Revisit AFTER Task 3.5 (TS upgrade) AND
> only together with a mongodb driver bump. TS 5.x alone does NOT unblock this.

**Files:**
- Modify: `packages/server/package.json` (`@types/node`) — *not modified; deferred*

**Interfaces:**
- Consumes: Node 18 runtime
- Produces: server typed against Node 18

- [ ] **Step 1: Bump the types package**

Run: `pnpm add -D @types/node@18 --filter @padloc/server`

- [ ] **Step 2: Gate — typecheck + server tests**

Run: `pnpm --filter @padloc/server run test`
Expected: `tsc --noEmit` passes with Node 18 types; mocha suite passes. Fix any newly-surfaced type errors minimally.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: align @types/node with Node 18"
```

### Task 3.5: TypeScript 5.x fork — decision + (conditional) upgrade

> **OUTCOME: DEFERRED (spike done, decision B).** The spike measured TS 5.9.3:
> **~131 distinct errors** (~84 project-source + 47 environment). Errors are
> **mechanical, not structural** — decorators/reflect-metadata are CLEAN (zero
> errors), which was the main feared risk. But: ~45 index-access errors (from
> removing `suppressImplicitAnyIndexErrors`), ~55 `Uint8Array<ArrayBufferLike>`
> crypto-layer errors entangled with the pinned old `@types/node@16`, and 47
> environment errors that are **unfixable without bumping `@types/node@18` +
> `mongodb`** (both blocked, see Task 3.4). Decision confirmed with project owner:
> **defer TS 5.x to its own spec.** Follow-up spec stub written to
> `docs/superpowers/specs/2026-07-08-typescript-5x-upgrade-followup.md`.
> **Phase 3 completes on TypeScript 4.4.3.** No code change on this branch.

This task has a decision gate. TS is pinned individually at `4.4.3` in `core`, `app` (via dep), `pwa`, `extension`, `server`. The blocker is `suppressImplicitAnyIndexErrors` (removed in TS 5.5) in `tsconfig.json:15`, plus decorator behavior.

**Files:**
- Modify (if proceeding): `tsconfig.json`, `packages/{core,pwa,extension,server}/package.json` typescript version, possibly source files with index-access errors

**Interfaces:**
- Consumes: whole workspace
- Produces: EITHER a TS 5.x upgrade (if fix volume acceptable) OR a documented deferral to a separate spec

- [ ] **Step 1: Spike — measure the fix volume on a throwaway branch**

Run:
```bash
git checkout -b spike/ts5
pnpm add -D typescript@5 --filter @padloc/core --filter @padloc/pwa --filter @padloc/extension --filter @padloc/server
```
Then remove `"suppressImplicitAnyIndexErrors": true,` from `tsconfig.json` and run:
```bash
pnpm -r run test 2>&1 | tee /tmp/ts5-errors.log
```
Expected: a count of type errors. Count them: `grep -c "error TS" /tmp/ts5-errors.log`.

- [ ] **Step 2: Decision gate**

- If errors are **few and mechanical** (index-signature access, e.g. `obj[key]` needing `obj[key as keyof T]` or an index signature) — proceed to Step 3 on the spike branch, then merge.
- If errors are **many or structural** (decorator/metadata behavior changes, framework type breaks) — abandon the spike (`git checkout - && git branch -D spike/ts5`), and instead document TS 5.x as a separate follow-up spec. Record the error count and top categories in `docs/superpowers/specs/` as a short note. Then STOP this task (Phase 3 completes without TS 5.x).

- [ ] **Step 3 (only if proceeding): Fix errors minimally and unify TS version**

Fix each surfaced error with the least-invasive typing change. Ensure all in-scope packages use `typescript@5.x` at the same patch. Re-run:
```bash
pnpm install && pnpm run pwa:build && pnpm run web-extension:build && pnpm run server:start-dry && pnpm -r run test
```
Expected: all green.

- [ ] **Step 4: Commit (path depends on decision)**

If upgraded:
```bash
git add -A
git commit -m "chore: upgrade to TypeScript 5.x, drop suppressImplicitAnyIndexErrors"
```
If deferred:
```bash
git add docs/superpowers/specs/
git commit -m "docs: defer TypeScript 5.x to a separate spec (fix volume too large)"
```

### Task 3.6: Full readiness verification for Phase 3

**Files:** none (verification only)

**Interfaces:**
- Consumes: all Phase 3 changes
- Produces: confirmation all readiness criteria pass

- [ ] **Step 1: Full gate**

Run:
```bash
pnpm install --frozen-lockfile && pnpm run pwa:build && pnpm run web-extension:build && pnpm run server:start-dry && pnpm -r run test && pnpm run test:e2e && pnpm run prettier:check
```
Expected: every command green.

- [ ] **Step 2: Confirm no deprecated markers remain in scope**

Run: `grep -rn "openssl-legacy-provider\|webextension-polyfill-ts\|lerna" package.json packages/pwa packages/extension packages/server 2>/dev/null`
Expected: no output.

- [ ] **Step 3: Final phase tag commit (optional)**

```bash
git commit --allow-empty -m "chore: Phase 3 complete — cautious dependency upgrade green"
```

---

## Self-Review Notes

- **Spec coverage:** Phase 0 (Task 0.1), Phase 1 (Tasks 1.1–1.4: pnpm-workspace, workspace:*, merged lerna-removal+lockfile+sharp-build, phantom-dep verify), Phase 2 (Tasks 2.1–2.6: run-tests, extension CI, platform install-fix, both Dockerfiles, compose), Phase 3 (Tasks 3.1–3.6: openssl-legacy, webextension-polyfill, safe updates, @types/node, TS5 fork, verification). All spec sections covered.
- **Non-goals honored:** electron/cordova/tauri build unverified (install-fix only, Task 2.3); SWC absent; TS 5.x is a fork with explicit deferral path (Task 3.5); Vite is a separate plan.
- **Readiness criteria** attached to phases via gate steps.
- **Maildev git dependency** covered implicitly by `pnpm install` in Task 1.3 (verify it resolves during install; if it fails, it surfaces there before any commit).
