# AWS SDK S3 Bump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the server S3 attachment backend from the old AWS SDK v3 pins to current v3 packages.

**Architecture:** Keep the existing `S3AttachmentStorage` shape and AWS SDK v3 command pattern. Bump only `@aws-sdk/client-s3` and `@aws-sdk/types`; adjust `GetObjectCommand` body handling only if TypeScript requires it.

**Tech Stack:** AWS SDK for JavaScript v3, TypeScript 5.8, Node 18 runtime, pnpm.

## Global Constraints

- English-only repository artifacts.
- AWS is PR 1; Vite remains separate.
- Do not touch PWA/Admin Vite migration in this PR.
- Do not touch extension, Electron, Tauri, or Cordova.
- Merge only after GitHub `lint`, `build`, and `unit` checks are green and AI review has no blocking findings.

---

### Task 1: Bump AWS SDK packages

**Files:**
- Modify: `packages/server/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: existing `S3AttachmentStorage` imports from `@aws-sdk/client-s3`.
- Produces: same runtime API, newer SDK types/packages.

- [ ] **Step 1: Update exact dependency pins**

Set:

```json
"@aws-sdk/client-s3": "3.1083.0",
"@aws-sdk/types": "3.974.0"
```

- [ ] **Step 2: Install**

Run: `pnpm install`

Expected: lockfile updates without unresolved peer errors.

- [ ] **Step 3: Typecheck server**

Run: `pnpm --filter @padloc/server exec tsc --noEmit`

Expected: pass. If `GetObjectCommandOutput.Body` errors, update `packages/server/src/attachments/s3.ts` to use `obj.Body.transformToByteArray()` when present, with a Node `Readable` fallback.

---

### Task 2: Verification and PR

**Files:** no additional expected files.

- [ ] **Step 1: Run local gate**

Run:

```bash
pnpm --filter @padloc/server run test
pnpm run server:start-dry
pnpm run prettier:check
```

Expected: all pass.

- [ ] **Step 2: Commit**

```bash
git add packages/server/package.json pnpm-lock.yaml docs/superpowers/plans/2026-07-09-aws-sdk-s3-bump.md
git commit -m "chore: bump AWS SDK S3 client"
```

- [ ] **Step 3: Open PR and wait**

Open a PR to `main`. Do not merge until GitHub CI and review are green.

---

## Self-review

- Spec coverage: AWS SDK PR scope covered.
- No placeholders.
- No Vite or extension work included.
