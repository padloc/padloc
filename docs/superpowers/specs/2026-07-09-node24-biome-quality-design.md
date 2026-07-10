# Node 24 and Biome Quality Toolchain Design

**Date:** 2026-07-09  
**Status:** Draft for review  
**Scope:** Active web stack only (`core`, `locale`, `app`, `server`, `pwa`, `admin`, `extension`, Docker, CI). Soft-focus packages (`electron`, `tauri`, `cordova`) are not intentionally modernized beyond incidental workspace effects.

## Goal

1. Raise the runtime baseline from Node 18 to Node 24 for local development, CI, and Docker.
2. Replace Prettier with Biome as the project quality tool (formatter + linter + import organization).
3. Keep deployable Dokploy web stack working (`server`, `pwa`, `admin`, nginx).

## Constraints

- Repository artifacts remain English-only.
- PR discipline: open PR, wait for GitHub checks, inspect AI review unless the user explicitly says to ignore pending review for a specific PR.
- Soft-focus legacy desktop/mobile packages stay deferred.
- Extension remains webpack for now; future WXT/MV3 is out of scope for this design.
- Unrelated untracked files (for example `docs/superpowers/backlog.md`) must not be included unless requested.

## Current State

- `.nvmrc`: `v18`
- Root `package.json` engines: `node: 18.x`, `npm: 9.x`
- `@types/node` override: `18.19.68`
- Dockerfiles (`Dockerfile-server`, `Dockerfile-pwa`, `Dockerfile-admin`): `FROM node:18-bullseye`
- Formatting: Prettier `2.8.4` via `prettier`, `prettier:check`, `format`, `format:check`
- CI lint job runs `pnpm run prettier:check` and locale extraction drift check
- After Vite migration, PWA/Admin Dockerfiles still copy `webpack.config.js`, which no longer exists. This is a known post-merge gap and must be fixed in the Node/Docker PR.

## Delivery Plan: Three PRs

### PR 1 — Node 24 + Docker/Vite cleanup

**Purpose:** Raise runtime baseline and fix Docker packaging for Vite without touching formatting policy.

**Changes:**

- `.nvmrc` → `v24`
- Root `package.json`:
  - `engines.node` → `24.x`
  - Update or relax `engines.npm` so pnpm-first workflow is not blocked
- `@types/node` override → current Node 24 types package version
- Docker base images → Node 24 (prefer `node:24-bookworm` if compatible with existing packages; otherwise `node:24-bullseye`)
- `Dockerfile-pwa` and `Dockerfile-admin`:
  - Copy `vite.config.ts` instead of deleted `webpack.config.js`
  - Ensure build still emits into `PL_PWA_DIR` / `PL_ADMIN_DIR` and serves correctly
- Package-level `engines.node` fields under active web packages, if present, should match `24.x`

**Out of scope for PR 1:**

- Biome
- Prettier removal
- Import reorganization
- Extension build-system migration

**Verification for PR 1:**

- `pnpm install`
- `pnpm run pwa:build`
- `pnpm run admin:build`
- `pnpm run web-extension:build`
- `pnpm -r run test`
- `pnpm run server:start-dry`
- `pnpm run prettier:check` (still Prettier until PR 2)
- Docker build smoke for `Dockerfile-server`, `Dockerfile-pwa`, `Dockerfile-admin` when environment allows
- GitHub CI: `lint`, `build`, `unit` green

### PR 2 — Biome as quality tool (without bulk import rewrite)

**Purpose:** Replace Prettier with Biome formatter and linter as the CI quality gate, without a giant import-order rewrite.

**Changes:**

- Add `@biomejs/biome` as root devDependency
- Add `biome.json` with:
  - Formatter settings aligned with current Prettier policy where practical:
    - indent style: spaces
    - indent width: 4
    - line width: 120
    - semicolons: always
    - quote style: double
  - Linter enabled with recommended rules as the baseline
  - Assist/import organization may be configured, but PR 2 must **not** apply a repo-wide organize-imports rewrite
  - Ignore paths ported from `.prettierignore` (dist outputs, lockfiles, generated locale resources, soft-focus build trees, etc.)
  - Prefer Biome VCS integration with git ignore when useful
- Root scripts:
  - `format` → Biome format write
  - `format:check` → Biome format check
  - `lint` → Biome check (formatter + linter quality gate)
  - Keep aliases if useful (`prettier` / `prettier:check` either removed or redirected temporarily only if needed for external docs; preferred end state is Prettier fully removed)
- CI lint job:
  - Replace `pnpm run prettier:check` with Biome quality check
  - Keep locale extraction drift check
- Remove Prettier dependency and configs (`.prettierrc.json`, `.prettierignore`) once Biome is wired

**Out of scope for PR 2:**

- Mass `organizeImports` application across the tree
- Node version changes (already done in PR 1)
- Soft-focus package modernization

**Verification for PR 2:**

- `pnpm install`
- Biome check command used by CI
- `pnpm run pwa:build`
- `pnpm run admin:build`
- `pnpm run web-extension:build`
- `pnpm -r run test`
- `pnpm run server:start-dry`
- GitHub CI green

**Rule handling:**

- Start from recommended Biome linter rules.
- If a rule creates high-noise low-value churn in this legacy monorepo, disable or downgrade that specific rule with a short English comment in `biome.json`.
- Prefer fixing real issues over disabling rules when the fix is small and local.

### PR 3 — Organize imports bulk rewrite

**Purpose:** Apply Biome import organization / assist rewrite as a standalone cleanup PR.

**Why separate:**

- The diff is expected to be large and mostly mechanical.
- Review can be skipped explicitly by the user; CI tests/build remain the gate.
- Keeps PR 2 reviewable as policy + tooling change rather than thousand-line import churn.

**Changes:**

- Enable or run Biome assist/import organization across the active codebase
- Commit the resulting mechanical import reordering and any required follow-up formatting
- No intentional behavior changes

**Verification for PR 3:**

- Biome check still green
- `pnpm run pwa:build`
- `pnpm run admin:build`
- `pnpm run web-extension:build`
- `pnpm -r run test`
- `pnpm run server:start-dry`
- GitHub CI green
- AI review may be ignored only if the user explicitly says so for this PR

## Architecture Notes

### Node 24 surface area

Anything that pins Node 18 must be updated for the active path:

- developer entrypoints (`.nvmrc`, root engines)
- type definitions (`@types/node`)
- Docker runtime/build images
- CI via `node-version-file: .nvmrc`

Soft-focus packages may still declare older engines; they remain deferred and are not a release gate for the web stack.

### Biome surface area

Biome becomes the single local/CI quality entrypoint for formatting and linting of supported text formats in the active tree. Locale extraction remains a separate correctness check because it is domain-specific and not a Biome concern.

### Docker/Vite coupling

PWA/Admin containers must build with Vite after PR #10. Node 24 upgrade is the natural place to correct Dockerfile copy lists so production images do not depend on deleted webpack files.

## Non-Goals

- Migrating extension from webpack to WXT/MV3
- Hardening/security work beyond toolchain baseline
- Re-enabling electron/tauri/cordova as first-class CI targets
- Changing product behavior, auth, storage backends, or nginx routing

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Node 24 breaks a dependency that still assumes Node 18 | Verify builds/tests/Docker early in PR 1; pin only if a concrete failure requires it |
| Biome recommended rules produce huge noisy lint diffs | In PR 2, tune specific rules with justification; keep import rewrite for PR 3 |
| Organize-imports PR is unreadable | Keep it mechanical-only; user may skip review; CI remains required |
| Docker still copies webpack artifacts | Explicit Dockerfile fix in PR 1 |
| Formatting differences vs Prettier | Accept one-time format drift under Biome defaults mapped as closely as practical |

## Success Criteria

- Active web stack develops and builds on Node 24 locally, in CI, and in Docker
- Prettier is removed; Biome is the quality tool for format + lint
- Import organization lands as a separate mechanical PR
- PWA/Admin Docker builds work with Vite configs
- Extension still builds under webpack
- Main remains mergeable only through green CI (and review policy per user instruction)

## Implementation Order

1. Write and approve this design.
2. Implementation plan for PR 1 (Node 24 + Docker/Vite cleanup), then implement/merge.
3. Implementation plan for PR 2 (Biome quality tool), then implement/merge.
4. Implementation plan for PR 3 (organize imports bulk), then implement/merge with optional review skip by explicit user decision.

## Open Decisions Resolved

- Soft-focus packages stay deferred.
- Node + Docker first, Biome second.
- Biome is a full quality tool, not formatter-only.
- Organize imports is desired and allowed to create a large mechanical diff.
- Organize imports must be a separate PR so review can be skipped while tests still pass.
