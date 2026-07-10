# TypeScript 5.x Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the web stack from TypeScript 4.4.3 to TypeScript 5.x with matching `@types/node@18` and unblocked server deps (`mongodb`, optional AWS SDK).

**Architecture:** Clear environment blockers first (mongodb → `@types/node@18` → drop override), then bump TypeScript and remove `suppressImplicitAnyIndexErrors`, then fix remaining project-source errors in mechanical clusters (index access, `Uint8Array` crypto). Gate after each cluster with unit tests and web builds.

**Tech Stack:** TypeScript 5.x, `@types/node@18`, mongodb driver (latest 4.x or 5.x that typechecks), pnpm workspaces, mocha/ts-node unit tests, webpack builds for pwa/admin/extension.

## Global Constraints

- English-only repository artifacts.
- In-scope packages: core, locale, app, server, pwa, admin, extension, root.
- Deferred packages (electron/cordova/tauri): bump typescript pin only if cheap; do not invest in fixing their builds.
- Keep `experimentalDecorators` + existing decorator style (no TC39 decorator migration).
- Prefer minimal typing fixes over refactors; crypto-layer changes must preserve runtime behavior.
- Gate: `pnpm -r run test` (core+server), `pnpm run pwa:build`, `pnpm run admin:build`, `pnpm run web-extension:build`, `pnpm run server:start-dry`.
- Do not enable hardening / product features in this epic.

## File map

| File | Role |
| --- | --- |
| `tsconfig.json` | Drop `suppressImplicitAnyIndexErrors` |
| `package.json` | root TS + `@types/node` override |
| `packages/*/package.json` | typescript / types / mongodb pins |
| `packages/core/src/config.ts` | index-access cluster |
| `packages/app/src/lib/crypto.ts` | Uint8Array / WebCrypto cluster |
| `packages/server/src/crypto/node.ts` | Node crypto buffer types |
| `packages/server/src/storage/mongodb.ts` | mongodb API if driver major bumps |
| `pnpm-lock.yaml` | lockfile |

---

### Task 1: Unpin environment — mongodb + @types/node@18

**Files:**
- Modify: `packages/server/package.json`
- Modify: `packages/core/package.json`, `packages/locale/package.json` (`@types/node`)
- Modify: root `package.json` `pnpm.overrides["@types/node"]`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Bump mongodb within a type-compatible range**

Prefer latest `4.x` first (smaller API drift). If still broken vs `@types/node@18`, try `5.x`.

```bash
pnpm add mongodb@4.17.2 --filter @padloc/server
```

- [ ] **Step 2: Bump `@types/node` to 18 and remove override pin**

Set exact `18.19.68` (or latest 18.x) in core/server/locale and root override to `18.19.68` (or delete override if all packages pin 18).

```bash
pnpm add -D @types/node@18.19.68 --filter @padloc/core --filter @padloc/server --filter @padloc/locale
```

Edit root `package.json` overrides: `"@types/node": "18.19.68"`.

- [ ] **Step 3: Install + typecheck server/core still on TS 4.4.3**

```bash
pnpm install
pnpm --filter @padloc/core run test
pnpm --filter @padloc/server run test
```

Expected: green, or only fixable source/type issues from mongodb API. Fix minimal source if driver signatures changed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: bump mongodb and @types/node to unblock TS 5.x"
```

---

### Task 2: Bump TypeScript 5.x + remove suppressImplicitAnyIndexErrors

**Files:**
- Modify: root + packages typescript pins to same `5.8.3` (or latest 5.x)
- Modify: `tsconfig.json` (remove `suppressImplicitAnyIndexErrors`)

- [ ] **Step 1: Bump typescript across in-scope packages**

```bash
pnpm add -D typescript@5.8.3 --filter @padloc/core --filter @padloc/server --filter @padloc/app --filter @padloc/pwa --filter @padloc/admin --filter @padloc/extension --filter @padloc/locale
# also root package.json typescript
```

Deferred packages: bump pin if listed, no build verification required.

- [ ] **Step 2: Remove suppressImplicitAnyIndexErrors from tsconfig.json**

Delete the line `"suppressImplicitAnyIndexErrors": true,`.

- [ ] **Step 3: Capture error inventory**

```bash
pnpm --filter @padloc/core exec tsc --noEmit 2>&1 | tee /tmp/ts5-core.log || true
pnpm --filter @padloc/server exec tsc --noEmit 2>&1 | tee /tmp/ts5-server.log || true
pnpm --filter @padloc/app exec tsc --noEmit 2>&1 | tee /tmp/ts5-app.log || true
```

Record counts by `error TS####`.

- [ ] **Step 4: Commit the bump even if red** only if preferred; else keep uncommitted until fixes. Prefer: commit bump + config, then fix commits.

```bash
git add -A
git commit -m "chore: upgrade TypeScript to 5.x, drop suppressImplicitAnyIndexErrors"
```

---

### Task 3: Fix TS7053 index-access cluster

**Files:** primarily `packages/core/src/config.ts` and scattered `obj[key]` / `this[prop]` sites from inventory.

- [ ] **Step 1: Fix core config and other TS7053 with minimal casts/index signatures**

Prefer `as keyof typeof obj` or typed index signatures over `any`.

- [ ] **Step 2: Gate**

```bash
pnpm --filter @padloc/core run test
```

- [ ] **Step 3: Commit**

```bash
git commit -am "fix: resolve TS7053 index access under TypeScript 5"
```

---

### Task 4: Fix Uint8Array / BufferSource crypto cluster

**Files:**
- `packages/app/src/lib/crypto.ts`
- `packages/server/src/crypto/node.ts`
- any related core crypto call sites

- [ ] **Step 1: Align types with WebCrypto/Node crypto expecting BufferSource**

Prefer `Uint8Array` views over `ArrayBuffer` where needed; use narrow helpers if repeated.

- [ ] **Step 2: Gate**

```bash
pnpm --filter @padloc/core run test
pnpm --filter @padloc/server run test
```

- [ ] **Step 3: Commit**

```bash
git commit -am "fix: align crypto buffer types for TypeScript 5"
```

---

### Task 5: Fix remaining errors + full web gate

- [ ] **Step 1: Clear remaining tsc errors in app/server/core**

- [ ] **Step 2: Full gate**

```bash
pnpm install --frozen-lockfile
pnpm -r run test
pnpm run pwa:build
pnpm run admin:build
pnpm run web-extension:build
pnpm run server:start-dry
```

- [ ] **Step 3: Optional same-PR** aws-sdk bump if green and low risk; otherwise leave for follow-up.

- [ ] **Step 4: Commit + PR**

```bash
git commit -am "chore: complete TypeScript 5.x upgrade for web stack"
```

---

## Self-review vs follow-up spec

| Spec item | Task |
| --- | --- |
| mongodb then @types/node@18 | Task 1 |
| Mechanical TS7053 | Task 3 |
| Crypto Uint8Array | Task 4 |
| Remove suppressImplicitAnyIndexErrors | Task 2 |
| aws-sdk re-attempt | Task 5 optional |
| Decorators stay experimental | Global constraint |
