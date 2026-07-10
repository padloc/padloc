# AWS SDK Bump and Vite Roadmap Design

**Date:** 2026-07-09  
**Status:** Approved scope, implementation planning next  
**Branch target:** one PR per implementation step; merge only after GitHub checks are green

## Goal

Finish the post-TypeScript-5 modernization path without mixing unrelated risk:

- bump the AWS SDK S3 backend first
- migrate PWA and Admin from webpack to Vite in a separate spike/PR
- move the browser extension to a future WXT + Manifest V3 epic instead of including it in the Vite work

## Decisions

| Area | Decision | Reason |
| --- | --- | --- |
| AWS SDK | First implementation PR | Small, isolated server dependency bump unlocked by TypeScript 5.x |
| Vite | Separate PWA/Admin-only spike | Removes webpack from active web apps without dragging extension runtime migration into the same change |
| Extension | Future WXT + Manifest V3 epic | Current extension is MV2 and runtime migration is bigger than a build-tool swap |
| Merge policy | PR only; wait for GitHub checks and AI review | Prevent another premature merge into `main` |

## Non-goals

- Hardening work
- Extension migration in the Vite PR
- Electron, Tauri, or Cordova modernization
- Product feature work
- Direct commits to `main`

## PR 1: AWS SDK S3 Backend Bump

### Scope

Files expected to change:

- `packages/server/package.json`
- `pnpm-lock.yaml`
- `packages/server/src/attachments/s3.ts` only if current AWS SDK typings require source changes

### Current code

The S3 backend uses AWS SDK v3 modular commands:

- `S3Client`
- `GetObjectCommand`
- `PutObjectCommand`
- `DeleteObjectCommand`
- `DeleteObjectsCommand`
- `ListObjectsCommand`

This matches current AWS SDK v3 usage: create one client, reuse it, and call `client.send(new Command(...))`.

### Expected migration issues

- `GetObjectCommandOutput.Body` typing may change. If needed, prefer the current helper methods, such as `Body.transformToByteArray()`, or keep a narrow Node `Readable` cast for Node-only server runtime.
- `@aws-sdk/types` may no longer need a direct dependency if `@aws-sdk/client-s3` exports the required types transitively. Remove only if tests and typecheck confirm it is unused.

### Required checks before PR merge

- `pnpm --filter @padloc/server run test`
- `pnpm run server:start-dry`
- `pnpm run prettier:check`
- GitHub CI green: `lint`, `build`, `unit`
- CodeRabbit/Cubic review checked for real findings

## PR 2: Vite Spike for PWA and Admin

### Scope

Packages in scope:

- `@padloc/pwa`
- `@padloc/admin`

Packages explicitly out of scope:

- `@padloc/extension`
- desktop/mobile packages

### Desired end state

- `pnpm run pwa:build` uses Vite
- `pnpm run admin:build` uses Vite
- Dockerfiles still build static assets into `/pwa` and `/admin`
- nginx paths/hosts remain unchanged
- service worker, manifest, CSP, static assets, fonts, and environment variables still work

### Migration constraints

- Preserve build-time public URL behavior for Docker/Dokploy:
  - `PL_PWA_URL`
  - `PL_ADMIN_URL`
  - `PL_ADMIN_URL_PATH`
  - `PL_SERVER_URL`
- Preserve CSP generation or explicitly replace it with a simpler documented mechanism.
- Preserve service worker behavior or disable it only as an explicit spike finding, not silently.
- Keep PWA and Admin deploy outputs compatible with existing nginx volumes.

### Expected risks

| Risk | Mitigation |
| --- | --- |
| webpack-specific CSP/HTML generation | Build a small Vite plugin/script that post-processes `index.html` if needed |
| Workbox `InjectManifest` migration | Use a Vite-compatible PWA/Workbox path or keep a separate build step |
| `process.env.PL_*` references | Replace with Vite `define` values or a generated env shim |
| Static assets and fonts | Verify built HTML and asset URLs in `dist` before PR |
| Docker output paths | Keep `PL_PWA_DIR` / `PL_ADMIN_DIR` behavior or map Vite `outDir` to those dirs |

### Required checks before PR merge

- `pnpm run pwa:build`
- `pnpm run admin:build`
- `pnpm run web-extension:build` must keep passing even if extension is out of scope
- `pnpm -r run test`
- `pnpm run server:start-dry`
- `pnpm run prettier:check`
- GitHub CI green: `lint`, `build`, `unit`
- CodeRabbit/Cubic review checked for real findings

## Future Epic: WXT + Manifest V3 Extension

The browser extension should not be migrated as part of the Vite PWA/Admin work.

The current extension is Manifest V2 and has runtime-model issues that need a separate design:

- `manifest_version: 2` -> `3`
- `browser_action` -> `action`
- `background.scripts` -> service worker
- `tabs.executeScript` -> `scripting.executeScript`
- long-lived background state -> event-driven service worker state restore

WXT is the preferred candidate for that future epic because it provides TypeScript, file-based extension entrypoints, dev/build/zip workflows, and first-class extension framework support.

## Merge Discipline

For every PR in this roadmap:

1. Open PR.
2. Wait for GitHub checks to finish.
3. Inspect failing logs if any check fails.
4. Inspect CodeRabbit/Cubic review output.
5. Merge only after required checks are green and review feedback has no blocking findings.

No direct `main` merges for this roadmap.
