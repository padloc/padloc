# Web-Stack Max Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three serial, green PRs that put the in-scope web stack on TypeScript 7, maximize in-scope dependency majors, and tune Dependabot so soft-focus and TypeScript majors stay human-driven.

**Architecture:** Work only on packages that gate CI (root, core, server, app, pwa, extension, admin, locale). Soft-focus (electron, cordova, tauri) gets the same TypeScript pin for install consistency only. Each PR merges to `main` only when lint + build + unit + e2e are green. PR 2 bumps dependencies in gated groups; webauthn is its own group.

**Tech Stack:** pnpm 10.15.0 workspaces, Node 24.x, TypeScript 7.x, Biome, Playwright e2e, mocha/chai unit tests, Vite (pwa/admin, no bundler rewrite), webpack (extension only).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-10-web-stack-max-modernization-design.md` (must already be on the branch or `main`)
- English-only commits, PR titles, and docs (`AGENTS.md`)
- Node engine remains `24.x`; packageManager remains `pnpm@10.15.0` unless a green bump is forced
- Exact version pins (no `^` / `~`); respect `.npmrc` `save-exact`
- Keep `experimentalDecorators: true` and `skipLibCheck: true` in root `tsconfig.json`
- Do **not** migrate to TC39 decorators, change `moduleResolution` unless TS 7 fails without it
- Do **not** upgrade electron/cordova/tauri platform majors or lift tiptap/prosemirror overrides unless a peer forces it
- Do **not** auto-merge Dependabot majors
- Soft-focus packages: TypeScript pin + install only; not a build gate
- After every mergeable PR: `pnpm install`, `pnpm run lint`, builds (pwa + extension + server `tsc`/tests), unit, e2e
- Prefer `pnpm --filter @padloc/<pkg> add <dep>@<ver>` over hand-editing only one side of the lockfile
- Re-resolve “latest” versions at implement time with `npm view <pkg> version` if pins below are stale
- Open a PR for each layer; wait for GitHub `lint` / `build` / `unit` / `e2e` before merge

## File map

| Path | Role |
| --- | --- |
| `package.json` | Root `typescript`, tooling deps (`concurrently`, `wait-on`, `ts-node`, biome/playwright as needed) |
| `packages/*/package.json` | Per-package `typescript` + in-scope deps (11 packages pin TS today) |
| `pnpm-lock.yaml` | Single lockfile; always commit with version bumps |
| `tsconfig.json` | Root compiler options; keep `skipLibCheck` / decorators |
| `packages/app/src/lib/crypto.ts` | Likely TS7 `Uint8Array` / WebCrypto fixes |
| `packages/server/src/crypto/node.ts` | Likely TS7 Node crypto buffer fixes |
| `packages/app/src/lib/auth/webauthn.ts` | Client SimpleWebAuthn v13 API |
| `packages/server/src/auth/webauthn.ts` | Server SimpleWebAuthn v13 API |
| `.github/dependabot.yml` | PR 3 policy: ignores / groups |
| `docs/superpowers/specs/2026-07-10-web-stack-max-modernization-design.md` | Source of truth (read-only during implement) |

**Packages that pin `typescript` today (all → `7.0.2` or current latest 7.x):**

- `package.json` (root)
- `packages/core/package.json`
- `packages/server/package.json`
- `packages/app/package.json`
- `packages/pwa/package.json`
- `packages/admin/package.json`
- `packages/extension/package.json`
- `packages/locale/package.json`
- `packages/electron/package.json` (soft-focus pin only)
- `packages/cordova/package.json` (soft-focus pin only)
- `packages/tauri/package.json` (soft-focus pin only)

---

## PR 1 — TypeScript 7

**Branch:** `chore/typescript-7` from up-to-date `main`  
**Target versions (verify at start):** `typescript@7.0.2`, keep `ts-node@10.9.2` unless install/peer forces a bump

### Task 1: Branch, inventory, pin TypeScript 7

**Files:**
- Modify: all 11 `package.json` files listed above (`"typescript": "5.8.3"` → `"typescript": "7.0.2"`)
- Modify: `pnpm-lock.yaml` (via install)

**Interfaces:**
- Consumes: clean `main`, Node 24, pnpm 10.15.0
- Produces: workspace resolves `typescript@7.0.2` for every package that declares it

- [ ] **Step 1: Sync main and create branch**

```bash
git checkout main
git pull --ff-only origin main
git checkout -b chore/typescript-7
node -v   # expect v24.x
pnpm -v   # expect 10.15.0
```

- [ ] **Step 2: Confirm current TypeScript latest major**

```bash
npm view typescript version
```

Expected: a `7.x.y` string (e.g. `7.0.2`). If still 7.x, use that exact version everywhere below instead of `7.0.2`.

- [ ] **Step 3: Bump TypeScript in every package that pins it**

From repo root, set the same exact version in all 11 files. Prefer a single mechanical replace of `"typescript": "5.8.3"` → `"typescript": "7.0.2"` only inside workspace `package.json` files (not `node_modules`):

```bash
# List pins first
grep -n '"typescript":' package.json packages/*/package.json

# Edit each package.json so typescript is "7.0.2" (or verified latest 7.x)
# Soft-focus packages (electron, cordova, tauri) MUST get the same pin.
```

- [ ] **Step 4: Install and refresh lockfile**

```bash
pnpm install
```

Expected: exit 0; `pnpm-lock.yaml` updated; no peer dependency hard failures on `typescript@7`.

- [ ] **Step 5: Commit pin only (even if tsc fails next)**

```bash
git add package.json packages/*/package.json pnpm-lock.yaml
git commit -m "chore: pin TypeScript 7 across workspace"
```

---

### Task 2: Make the workspace typecheck under TypeScript 7

**Files:**
- Modify (as needed): `packages/app/src/lib/crypto.ts`
- Modify (as needed): `packages/server/src/crypto/node.ts`
- Modify (as needed): any other `packages/{core,server,app,locale}/src/**/*.ts` that fail `tsc`
- Do **not** change root `skipLibCheck` or remove `experimentalDecorators`

**Interfaces:**
- Consumes: `typescript@7` from Task 1
- Produces: `tsc --noEmit` green for core + server; pwa/extension/admin builds succeed

- [ ] **Step 1: Collect type errors**

```bash
pnpm --filter @padloc/core exec tsc --noEmit
pnpm --filter @padloc/server exec tsc --noEmit
pnpm --filter @padloc/locale exec tsc --noEmit 2>/dev/null || true
```

Capture the full error list. Expected under TS 7: possible `Uint8Array` / `BufferSource` mismatches in crypto, and any new strictness from TS 6/7 defaults. `skipLibCheck: true` should suppress most `node_modules` `.d.ts` noise.

- [ ] **Step 2: Fix crypto buffer types first (highest prior risk)**

In `packages/app/src/lib/crypto.ts` and `packages/server/src/crypto/node.ts`, prefer minimal fixes:

- Pass `BufferSource` where WebCrypto/Node APIs require it
- Use `new Uint8Array(buf)` or `.buffer` slices only when needed for type narrowing
- Avoid `as any` unless a single boundary cast is cleaner than rewriting the whole crypto surface; if cast is used, keep it local and typed as narrowly as possible (`as BufferSource`)

Do not change cryptographic algorithms or parameters—types only.

- [ ] **Step 3: Fix remaining project errors**

For each remaining error:

- `TS7053` index access → narrow key type or add index signature / cast at the call site
- Decorator / metadata errors → keep `experimentalDecorators`; do not enable `experimentalDecorators: false`
- Test-only configs under `packages/*/test/tsconfig.json` that still set `suppressImplicitAnyIndexErrors` → remove that flag if TS 7 rejects it (deleted in 5.5+)

- [ ] **Step 4: Re-run typecheck until green**

```bash
pnpm --filter @padloc/core exec tsc --noEmit
pnpm --filter @padloc/server exec tsc --noEmit
```

Expected: exit 0 both.

- [ ] **Step 5: Build in-scope apps**

```bash
pnpm run pwa:build
pnpm run web-extension:build
pnpm run admin:build
```

Expected: exit 0 each. If Vite or webpack fails only on types, fix source; do not downgrade TypeScript.

- [ ] **Step 6: Unit tests**

```bash
pnpm --filter @padloc/core test
pnpm --filter @padloc/server test
```

Expected: exit 0. If mocha/ts-node fails to load TS 7, bump root and package `ts-node` to `10.9.2` (already used in several packages) consistently:

```bash
pnpm add -Dw ts-node@10.9.2
pnpm --filter @padloc/core add -D ts-node@10.9.2
pnpm --filter @padloc/server add -D ts-node@10.9.2
# also pwa/extension if they declare ts-node
```

- [ ] **Step 7: Lint**

```bash
pnpm run lint
```

Expected: exit 0. If only format issues: `pnpm run lint:fix` then re-check.

- [ ] **Step 8: E2E**

```bash
pnpm run test:e2e:ci
```

Expected: all Playwright tests pass, exit 0. Dedicated ports from existing e2e setup (PWA `18080`, API `13000`) apply.

- [ ] **Step 9: Commit fixes**

```bash
git add -A
git status   # review: no secrets, no accidental soft-focus rewrites
git commit -m "fix: resolve TypeScript 7 compile and test breakages"
```

- [ ] **Step 10: Open PR 1 and merge only when CI is green**

```bash
git push -u origin chore/typescript-7
gh pr create --base main --title "chore: upgrade TypeScript to 7" --body "$(cat <<'EOF'
## Summary
- Pin TypeScript 7 across the workspace (including soft-focus pins for install consistency)
- Fix compile/test fallout under TS 7
- Keep experimentalDecorators and skipLibCheck

## Test plan
- [x] core/server tsc
- [x] pwa/extension/admin build
- [x] unit
- [x] e2e
- [ ] CI green

Spec: docs/superpowers/specs/2026-07-10-web-stack-max-modernization-design.md
EOF
)"
```

Wait for CI (`lint`, `build`, `unit`, `e2e`). Merge with merge commit (repo default). Delete branch after merge.

---

## PR 2 — Web-stack dependency maximum

**Branch:** `chore/web-deps-max` from **updated** `main` (after PR 1 merge)  
**Rule:** After each group, at least install + lint + unit + in-scope builds. Run e2e before opening the PR and after the webauthn group.

### Task 3: Branch and fresh outdated inventory

**Files:**
- None yet (inventory only)

- [ ] **Step 1: Branch from green main**

```bash
git checkout main
git pull --ff-only origin main
git checkout -b chore/web-deps-max
```

- [ ] **Step 2: Inventory outdated in-scope packages**

```bash
pnpm outdated -r > /tmp/padloc-outdated.txt
head -200 /tmp/padloc-outdated.txt
```

Use this list to adjust target versions. Soft-focus majors in the list are **ignored** for bumps.

- [ ] **Step 3: Commit nothing** — proceed to groups.

---

### Task 4: Group 1 — Dev / test tooling

**Files:**
- Modify: `package.json`, `packages/core/package.json`, `packages/server/package.json`, `packages/app/package.json`, `packages/pwa/package.json`, `packages/admin/package.json` as needed
- Modify: `pnpm-lock.yaml`

**Target versions (re-verify with `npm view`):**

| Package | Approx target |
| --- | --- |
| `mocha` | `11.7.6` (or current latest) |
| `chai` | `6.2.2` |
| `@types/mocha` | latest matching mocha |
| `@types/chai` | latest matching chai |
| `concurrently` | `10.0.3` |
| `wait-on` | `9.0.10` |
| `http-server` | latest 14.x patch |
| `workbox-build` / `workbox-window` (pwa/admin) | latest 7.x |

**Interfaces:**
- Consumes: TS 7 green main
- Produces: unit runner works on updated mocha/chai

- [ ] **Step 1: Bump root tooling**

```bash
pnpm add -Dw concurrently@10.0.3 wait-on@9.0.10 http-server@latest
```

- [ ] **Step 2: Bump mocha/chai in core, server, app**

```bash
pnpm --filter @padloc/core --filter @padloc/server --filter @padloc/app \
  add -D mocha@latest chai@latest @types/mocha@latest @types/chai@latest
```

If chai 6 removes default exports your tests use, fix imports in:

- `packages/core/test/**/*.ts`
- `packages/server/test/**/*.ts`
- `packages/app/test/**/*.ts` (if present)

Example fix pattern:

```typescript
import { assert } from "chai";
// or: import { expect } from "chai";
```

- [ ] **Step 3: Bump workbox on pwa/admin if outdated**

```bash
pnpm --filter @padloc/pwa --filter @padloc/admin \
  add -D workbox-build@latest workbox-window@latest
```

Align `packages/app` workbox runtime packages only if required by peer deps; do not chase workbox 6→7 in app unless build demands it (app still uses older workbox-* pins for SW code).

- [ ] **Step 4: Gate**

```bash
pnpm install
pnpm run lint
pnpm --filter @padloc/core test
pnpm --filter @padloc/server test
pnpm run pwa:build
```

Expected: all exit 0.

- [ ] **Step 5: Commit group 1**

```bash
git add package.json packages/*/package.json pnpm-lock.yaml packages/*/test
git commit -m "chore: bump dev/test tooling (mocha, chai, concurrently, wait-on, workbox)"
```

---

### Task 5: Group 2 — Generally safe libraries

**Files:**
- Modify: `packages/app/package.json`, `packages/server/package.json`, `packages/core/package.json`, related types packages
- Modify: source only if APIs break (date-fns v4, dompurify v3)

**Targets (re-verify):**

| Package | Approx target | Notes |
| --- | --- | --- |
| `date-fns` | `4.4.0` | import path / locale API may change |
| `dompurify` | `3.4.11` | default export / types may move to package |
| `dotenv` | latest 16.x or 17 if clean | server |
| `fs-extra` | latest 11.x | server |
| `autosize` | latest 6.x | app |
| `@types/dompurify` | remove if bundled types suffice | |

- [ ] **Step 1: Bump date-fns in core, app, server**

```bash
pnpm --filter @padloc/core --filter @padloc/app --filter @padloc/server \
  add date-fns@4.4.0
```

Fix compile errors: date-fns v3+ often uses `date-fns/<fn>` subpath imports; update call sites under:

- `packages/app/src/lib/util.ts` (`formatDistanceToNow` dynamic import)
- any `packages/core` / `packages/server` date-fns imports

- [ ] **Step 2: Bump dompurify**

```bash
pnpm --filter @padloc/app add dompurify@3.4.11
pnpm --filter @padloc/server add dompurify@3.4.11
# Drop @types/dompurify if tsc resolves types from the package itself
```

Fix imports if default export shape changed.

- [ ] **Step 3: Bump remaining safe server/app libs**

```bash
pnpm --filter @padloc/server add dotenv@latest fs-extra@latest
pnpm --filter @padloc/app add autosize@latest
```

Update `@types/fs-extra` / `@types/autosize` only if still required.

- [ ] **Step 4: Gate**

```bash
pnpm run lint
pnpm --filter @padloc/core test
pnpm --filter @padloc/server test
pnpm run pwa:build
pnpm run admin:build
```

Expected: exit 0.

- [ ] **Step 5: Commit group 2**

```bash
git add package.json packages/*/package.json pnpm-lock.yaml packages
git commit -m "chore: bump safe web-stack libraries (date-fns, dompurify, dotenv, fs-extra, autosize)"
```

---

### Task 6: Group 3 — Server infrastructure

**Files:**
- Modify: `packages/server/package.json`
- Modify: `packages/server/src/**` only if driver APIs break
- Modify: `pnpm-lock.yaml`

**Targets (re-verify; pin back if gate fails):**

| Package | Intent |
| --- | --- |
| `nodemailer` | latest 6.x or 7.x if clean |
| `level` | latest 8.x/9.x if API compatible with `packages/server/src/storage/leveldb.ts` |
| `mongodb` | newest that keeps `packages/server/src/storage/mongodb.ts` compiling |
| `pg` | latest 8.x |
| `jsdom` | latest that works with server dompurify usage |
| `maxmind` / `geolite2-redist` | bump only if types/runtime stay green |

- [ ] **Step 1: Read storage entrypoints before bumping**

```bash
# Confirm APIs we call
sed -n '1,80p' packages/server/src/storage/leveldb.ts
sed -n '1,80p' packages/server/src/storage/mongodb.ts
sed -n '1,80p' packages/server/src/storage/postgres.ts
```

- [ ] **Step 2: Bump one subsystem at a time (nodemailer → pg → level → mongodb → jsdom)**

Example for nodemailer:

```bash
pnpm --filter @padloc/server add nodemailer@latest @types/nodemailer@latest
pnpm --filter @padloc/server exec tsc --noEmit
pnpm --filter @padloc/server test
```

Repeat pattern per package. **If a major breaks storage badly**, pin the last green version and document it in the final PR body (intentional pin).

- [ ] **Step 3: Gate after the full group**

```bash
pnpm run lint
pnpm --filter @padloc/server test
pnpm --filter @padloc/core test
pnpm run pwa:build
```

- [ ] **Step 4: Commit group 3**

```bash
git add packages/server/package.json packages/server/src pnpm-lock.yaml
git commit -m "chore: bump server infrastructure dependencies"
```

---

### Task 7: Group 4 — SimpleWebAuthn major (isolated)

**Files:**
- Modify: `packages/app/package.json`, `packages/server/package.json`
- Modify: `packages/app/src/lib/auth/webauthn.ts`
- Modify: `packages/server/src/auth/webauthn.ts`
- Possibly: drop `@simplewebauthn/typescript-types` if types re-exported from main packages in v13

**Targets (re-verify):**

| Package | Approx target |
| --- | --- |
| `@simplewebauthn/browser` | `13.3.0` |
| `@simplewebauthn/server` | `13.3.2` |
| `@simplewebauthn/typescript-types` | remove or align if still published for this major |

**Interfaces:**
- Consumes: existing `WebAuthnClient` / `WebAuthnServer` wrappers
- Produces: same `AuthClient` / `AuthServer` contracts from `@padloc/core`

- [ ] **Step 1: Install new majors**

```bash
pnpm --filter @padloc/app add @simplewebauthn/browser@13.3.0
pnpm --filter @padloc/server add @simplewebauthn/server@13.3.2
# Remove obsolete typescript-types dependency if imports move:
# pnpm --filter @padloc/app remove @simplewebauthn/typescript-types
# pnpm --filter @padloc/server remove @simplewebauthn/typescript-types
```

- [ ] **Step 2: Fix server adapter**

Update `packages/server/src/auth/webauthn.ts` to v13 APIs. Typical v7+ changes (confirm against installed package typings / README):

- Types often live in `@simplewebauthn/server` instead of `@simplewebauthn/typescript-types`
- `verifyRegistrationResponse` / `verifyAuthenticationResponse` option names may change (`response` vs `credential`, `expectedOrigin`, `expectedRPID`)
- Credential ID / public key may be `Uint8Array` instead of base64 strings — keep storing base64 via existing `bytesToBase64` / `base64ToBytes` helpers so on-disk authenticator data stays compatible

Preserve `WebAuthnConfig` fields: `rpName`, `rpID`, `origin`.

- [ ] **Step 3: Fix client adapter**

Update `packages/app/src/lib/auth/webauthn.ts`:

- `startRegistration` / `startAuthentication` may require `{ optionsJSON: ... }` wrapper in newer majors — match the installed type signatures
- `browserSupportsWebauthn` may be renamed; use whatever the package exports that means the same thing
- Keep `WebAuthnClient` implementing `AuthClient` (`supportsType`, `prepareRegistration`, `prepareAuthentication`)

- [ ] **Step 4: Compile and unit gate**

```bash
pnpm --filter @padloc/server exec tsc --noEmit
pnpm --filter @padloc/core test
pnpm --filter @padloc/server test
pnpm run pwa:build
pnpm run web-extension:build
```

- [ ] **Step 5: E2E after webauthn changes**

```bash
pnpm run test:e2e:ci
```

Expected: exit 0. (WebAuthn itself may not be covered by e2e; still required for regression.)

- [ ] **Step 6: Commit group 4 alone**

```bash
git add packages/app packages/server pnpm-lock.yaml
git commit -m "chore: upgrade SimpleWebAuthn to v13"
```

---

### Task 8: PR 2 final gate, intentional pins, open PR

**Files:**
- PR body lists intentional pins

- [ ] **Step 1: Full gate**

```bash
pnpm install
pnpm run lint
pnpm run pwa:build
pnpm run admin:build
pnpm run web-extension:build
pnpm --filter @padloc/core test
pnpm --filter @padloc/server test
pnpm run test:e2e:ci
```

Expected: all exit 0.

- [ ] **Step 2: Record intentional pins**

```bash
pnpm outdated -r | head -100
```

In the PR body, list each in-scope package still behind latest and why (e.g. `stripe` optional billing, tiptap overrides, level major deferred).

- [ ] **Step 3: Push and open PR 2**

```bash
git push -u origin chore/web-deps-max
gh pr create --base main --title "chore: maximize in-scope web-stack dependencies" --body "$(cat <<'EOF'
## Summary
- Bump in-scope deps in gated groups (tooling → safe libs → server infra → webauthn)
- Soft-focus majors intentionally skipped
- Intentional pins: <fill from Step 2>

## Test plan
- [x] lint, builds, unit, e2e
- [ ] CI green

Spec: docs/superpowers/specs/2026-07-10-web-stack-max-modernization-design.md
EOF
)"
```

Merge only when CI is green.

---

## PR 3 — Dependabot hygiene

**Branch:** `chore/dependabot-hygiene` from **updated** `main` (after PR 2 merge)

### Task 9: Update Dependabot config

**Files:**
- Modify: `.github/dependabot.yml`

**Interfaces:**
- Consumes: existing weekly npm + github-actions entries
- Produces: ignores for TypeScript major + soft-focus noise policy

- [ ] **Step 1: Branch**

```bash
git checkout main
git pull --ff-only origin main
git checkout -b chore/dependabot-hygiene
```

- [ ] **Step 2: Replace `.github/dependabot.yml` with policy-aligned config**

Write this exact file (adjust only if GitHub schema rejects a key—then drop the unsupported key, keep intent):

```yaml
version: 2

updates:
    - package-ecosystem: "npm"
      directory: "/"
      schedule:
          interval: "weekly"
          day: "monday"
          time: "09:00"
      open-pull-requests-limit: 5
      groups:
          npm-minor-and-patch:
              update-types:
                  - "minor"
                  - "patch"
      ignore:
          # Human-driven compiler majors (see modernization design)
          - dependency-name: "typescript"
            update-types: ["version-update:semver-major"]
          # Soft-focus platforms — not CI build gates; avoid noise
          - dependency-name: "electron"
          - dependency-name: "electron-*"
          - dependency-name: "@tauri-apps/*"
          - dependency-name: "tauri"
          - dependency-name: "cordova"
          - dependency-name: "cordova-*"
          - dependency-name: "@capacitor/*"
      commit-message:
          prefix: "chore"
          include: "scope"

    - package-ecosystem: "github-actions"
      directory: "/"
      schedule:
          interval: "weekly"
          day: "monday"
          time: "09:30"
      groups:
          github-actions:
              patterns:
                  - "*"
              update-types:
                  - "minor"
                  - "patch"
      commit-message:
          prefix: "ci"
          include: "scope"
```

Notes for implementer:

- Dependabot ignore `dependency-name` wildcards are supported for some patterns; if CI/config validation fails, split into explicit package names from current soft-focus `package.json` files instead of wildcards.
- Do **not** enable `auto-merge`.
- Majors for other packages may still open as individual PRs outside the minor/patch group — that is acceptable; humans review.

- [ ] **Step 3: Validate YAML locally**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml')); print('ok')"
```

Expected: `ok`

- [ ] **Step 4: Commit and open PR 3**

```bash
git add .github/dependabot.yml
git commit -m "ci: tune Dependabot ignores for TypeScript majors and soft-focus"
git push -u origin chore/dependabot-hygiene
gh pr create --base main --title "ci: Dependabot hygiene for modernization policy" --body "$(cat <<'EOF'
## Summary
- Ignore TypeScript major updates (human-driven)
- Ignore soft-focus platform dependency noise
- Keep weekly grouped minor/patch for npm and Actions

## Test plan
- [x] YAML parses
- [ ] Config accepted by GitHub Dependabot after merge

Spec: docs/superpowers/specs/2026-07-10-web-stack-max-modernization-design.md
EOF
)"
```

Merge when checks that apply are green (this PR may only need lint/title).

---

## Program completion checklist

- [ ] PR 1 merged: TypeScript 7, CI green
- [ ] PR 2 merged: in-scope deps maximized; intentional pins listed in PR body
- [ ] PR 3 merged: Dependabot policy matches design
- [ ] No soft-focus platform major upgrades required
- [ ] Spec success criteria satisfied

## Rollback

- Revert the serial PR that broke `main`
- WebAuthn group is a single commit inside PR 2 for surgical revert
- Do not force-push `main`

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| TS 7 pin all packages including soft-focus | Task 1 |
| Fix TS 7 compile; keep decorators + skipLibCheck | Task 2 |
| Serial PR 1 merge gate | Task 2 steps 6–10 |
| Dep groups tooling → safe → server → webauthn | Tasks 4–7 |
| Soft-focus not build-gated / no platform majors | Tasks 3–8 notes |
| Intentional pins documented | Task 8 |
| Dependabot hygiene | Task 9 |
| E2E mandatory | Tasks 2, 7, 8 |
| English commits / PR titles | All commit steps |

## Placeholder scan

No TBD/TODO steps. Version numbers are approximate targets with mandatory `npm view` re-check at implement time.
