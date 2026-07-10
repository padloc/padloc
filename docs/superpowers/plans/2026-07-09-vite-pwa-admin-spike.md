# Vite PWA/Admin Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove PWA and Admin can build with Vite while preserving Docker static output, service worker, manifest, CSP, and existing env semantics.

**Architecture:** Replace webpack configs for `@padloc/pwa` and `@padloc/admin` with Vite configs. Keep shared app/core code untouched except for Vite-compatible asset import syntax. Do not touch extension.

**Tech Stack:** Vite, vite-plugin-pwa injectManifest, TypeScript 5.8, Lit, pnpm workspaces.

## Global Constraints

- English-only repository artifacts.
- PWA/Admin only; extension is out of scope.
- Preserve `PL_PWA_URL`, `PL_ADMIN_URL`, `PL_ADMIN_URL_PATH`, `PL_SERVER_URL`, `PL_*_DIR` build-time behavior.
- Keep Docker outputs `/pwa` and `/admin` compatible with existing nginx compose.
- Open PR and wait for CI/review before merge.

---

### Task 1: Add Vite dependencies and configs

**Files:**
- Modify: `packages/pwa/package.json`
- Modify: `packages/admin/package.json`
- Add: `packages/pwa/vite.config.ts`
- Add: `packages/admin/vite.config.ts`
- Modify: `pnpm-lock.yaml`

- [x] Add `vite` and `vite-plugin-pwa` dev dependencies to PWA/Admin.
- [x] Replace PWA/Admin `build` and `dev` scripts with Vite commands.
- [x] Keep `start` scripts unchanged.

### Task 2: Convert HTML and assets

**Files:**
- Modify: `packages/pwa/src/index.html`
- Modify: `packages/admin/src/index.html`
- Modify: `packages/app/src/elements/support.ts`

- [x] Replace webpack template title with static title/transform-compatible HTML.
- [x] Add Vite module script for each app.
- [x] Convert markdown import to `?raw`.

### Task 3: Build and verify locally

- [x] `pnpm install`
- [x] `pnpm run pwa:build`
- [x] `pnpm run admin:build`
- [x] `pnpm run web-extension:build`
- [x] `pnpm -r run test`
- [x] `pnpm run server:start-dry`
- [x] `pnpm run prettier:check`

### Task 4: PR

- [ ] Commit.
- [ ] Push branch and open PR.
- [ ] Wait for GitHub checks and AI review before merge.

## Self-review

- Scope is PWA/Admin only.
- Extension is untouched.
- No direct `main` merge.
