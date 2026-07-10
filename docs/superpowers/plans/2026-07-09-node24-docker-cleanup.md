# Node 24 + Docker/Vite Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the active web stack runtime baseline from Node 18 to Node 24 in local/CI/Docker and fix PWA/Admin Dockerfiles to copy Vite configs after the webpack removal.

**Architecture:** Update version pins (`.nvmrc`, engines, `@types/node`) first, then Docker base images and Dockerfile copy lists for Vite. Soft-focus packages (`electron`, `tauri`, `cordova`) keep their existing engines unless an install-time conflict forces a no-op bump. No Biome/Prettier changes in this PR.

**Tech Stack:** Node 24, pnpm 10.15.0, Docker (`node:24-bookworm`), TypeScript 5.8, Vite 5 for PWA/Admin.

## Global Constraints

- English-only repository artifacts.
- Active web stack only: `core`, `locale`, `app`, `server`, `pwa`, `admin`, `extension`, Docker, CI.
- Soft-focus deferred: `electron`, `tauri`, `cordova` (do not modernize intentionally).
- Do not include untracked `docs/superpowers/backlog.md`.
- Open PR only; wait for GitHub `lint`, `build`, `unit`; inspect AI review before merge unless user says otherwise.
- Spec: `docs/superpowers/specs/2026-07-09-node24-biome-quality-design.md` PR 1 section only.

---

### Task 1: Pin Node 24 for tooling and active package engines

**Files:**
- Modify: `.nvmrc`
- Modify: `package.json` (root `engines`, `pnpm.overrides["@types/node"]`)
- Modify: `packages/core/package.json`
- Modify: `packages/locale/package.json`
- Modify: `packages/app/package.json`
- Modify: `packages/server/package.json`
- Modify: `packages/pwa/package.json`
- Modify: `packages/admin/package.json`
- Modify: `packages/extension/package.json`
- Modify: `CONTRIBUTING.md` (Node version mention)
- Modify: `pnpm-lock.yaml` (via install)

**Do not modify soft-focus engines unless install fails:**
- `packages/electron/package.json`
- `packages/tauri/package.json`
- `packages/cordova/package.json`

- [ ] **Step 1: Create branch from latest main**

```bash
git checkout main
git pull origin main
git checkout -b chore/node-24-docker-cleanup
```

Expected: branch `chore/node-24-docker-cleanup` based on latest `main`.

- [ ] **Step 2: Update `.nvmrc`**

Write file contents exactly:

```text
v24
```

- [ ] **Step 3: Update root package engines and `@types/node` override**

In root `package.json`:

```json
"engines": {
    "node": "24.x"
},
```

Remove the `npm` engine pin if present (project is pnpm-first). Keep `packageManager: "pnpm@10.15.0"`.

In `pnpm.overrides`:

```json
"@types/node": "24.13.3"
```

- [ ] **Step 4: Bump active package engines to Node 24**

In each of:
- `packages/core/package.json`
- `packages/locale/package.json`
- `packages/app/package.json`
- `packages/server/package.json`
- `packages/pwa/package.json`
- `packages/admin/package.json`
- `packages/extension/package.json`

set:

```json
"engines": {
    "node": "24.x"
}
```

If a package also pins `"npm": "9.x"`, remove the npm pin (pnpm-first).

- [ ] **Step 5: Update contributor docs**

In `CONTRIBUTING.md`, replace Node 18 wording with Node 24 and `.nvmrc` reference, for example:

```markdown
-   Node.js 24 (see `.nvmrc`)
```

- [ ] **Step 6: Install to refresh lockfile types resolution**

```bash
pnpm install
```

Expected: lockfile updates for `@types/node@24.13.3`; no engine hard-fail for active packages.

- [ ] **Step 7: Smoke typecheck/tests still work after types bump**

```bash
pnpm --filter @padloc/core exec tsc --noEmit
pnpm --filter @padloc/server exec tsc --noEmit
pnpm -r run test
```

Expected: all pass. If `@types/node@24` introduces only soft-focus package issues, leave soft-focus alone and continue.

- [ ] **Step 8: Commit**

```bash
git add .nvmrc package.json pnpm-lock.yaml CONTRIBUTING.md \
  packages/core/package.json packages/locale/package.json packages/app/package.json \
  packages/server/package.json packages/pwa/package.json packages/admin/package.json \
  packages/extension/package.json
git commit -m "chore: raise active web stack to Node 24"
```

---

### Task 2: Docker Node 24 images + Vite config copy fix

**Files:**
- Modify: `Dockerfile-server`
- Modify: `Dockerfile-pwa`
- Modify: `Dockerfile-admin`
- Modify: `deploy/README.md` only if it documents Node 18 Docker bases

- [ ] **Step 1: Update Dockerfile-server base image**

Change first line:

```dockerfile
FROM node:24-bookworm
```

Leave the rest of the server Dockerfile structure unchanged unless install requires package-manager tweaks.

- [ ] **Step 2: Update Dockerfile-pwa for Node 24 and Vite**

1. Base image:

```dockerfile
FROM node:24-bookworm
```

2. Replace webpack copy line with Vite config:

From:

```dockerfile
COPY packages/pwa/tsconfig.json packages/pwa/webpack.config.js ./packages/pwa/
```

To:

```dockerfile
COPY packages/pwa/tsconfig.json packages/pwa/vite.config.ts ./packages/pwa/
```

Do not reintroduce webpack files.

- [ ] **Step 3: Update Dockerfile-admin for Node 24 and Vite**

1. Base image:

```dockerfile
FROM node:24-bookworm
```

2. Replace webpack copy line with Vite config:

From:

```dockerfile
COPY packages/admin/tsconfig.json packages/admin/webpack.config.js ./packages/admin/
```

To:

```dockerfile
COPY packages/admin/tsconfig.json packages/admin/vite.config.ts ./packages/admin/
```

- [ ] **Step 4: Grep for leftover webpack Dockerfile references**

```bash
rg -n "webpack\.config\.js|node:18" Dockerfile-server Dockerfile-pwa Dockerfile-admin
```

Expected: no matches.

- [ ] **Step 5: Docker build smoke (if Docker available)**

```bash
docker build -f Dockerfile-server -t padloc-server:node24-test .
docker build -f Dockerfile-pwa -t padloc-pwa:node24-test .
docker build -f Dockerfile-admin -t padloc-admin:node24-test .
```

Expected: all three builds succeed. If Docker is unavailable in the environment, note that in the PR body and rely on local package builds + CI.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile-server Dockerfile-pwa Dockerfile-admin
# include deploy docs only if edited
git commit -m "chore: run Docker images on Node 24 with Vite configs"
```

---

### Task 3: Full local verification gate

**Files:** none (verification only)

- [ ] **Step 1: Confirm Node pin**

```bash
cat .nvmrc
node -v
```

Expected: `.nvmrc` is `v24`. Local node may already be 24.x in this environment; CI will use `.nvmrc`.

- [ ] **Step 2: Install + format check (still Prettier in this PR)**

```bash
pnpm install
pnpm run prettier:check
```

Expected: pass. Do not introduce Biome in this PR.

- [ ] **Step 3: Builds**

```bash
pnpm run pwa:build
pnpm run admin:build
pnpm run web-extension:build
```

Expected: all succeed.

- [ ] **Step 4: Tests + server dry-run**

```bash
pnpm -r run test
pnpm run server:start-dry
```

Expected: tests pass; dry-run starts without crash.

- [ ] **Step 5: Final dirty-tree check**

```bash
git status --short
```

Expected: clean except intentionally untracked local files such as `docs/superpowers/backlog.md`.

---

### Task 4: Open PR and wait for checks/review

**Files:** none (git/GitHub only)

- [ ] **Step 1: Push branch**

```bash
git push -u origin chore/node-24-docker-cleanup
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --base main --head chore/node-24-docker-cleanup \
  --title "chore: raise web stack to Node 24 and fix Docker Vite copies" \
  --body "$(cat <<'EOF'
## Summary
- Raise active web stack runtime to Node 24 (`.nvmrc`, engines, `@types/node`)
- Update Docker base images to Node 24
- Fix PWA/Admin Dockerfiles to copy `vite.config.ts` instead of deleted webpack configs
- Keep soft-focus electron/tauri/cordova engines deferred

## Verification
- pnpm install
- pnpm run prettier:check
- pnpm run pwa:build
- pnpm run admin:build
- pnpm run web-extension:build
- pnpm -r run test
- pnpm run server:start-dry
- docker build smoke for server/pwa/admin (if available)

Spec: docs/superpowers/specs/2026-07-09-node24-biome-quality-design.md (PR 1)
Plan: docs/superpowers/plans/2026-07-09-node24-docker-cleanup.md
EOF
)"
```

- [ ] **Step 3: Wait for GitHub checks**

```bash
gh pr checks <PR> --watch
```

Required green: `lint`, `build`, `unit`, `PR Title`. `e2e` may skip. Inspect CodeRabbit/Cubic unless user explicitly says ignore.

- [ ] **Step 4: Merge only after green checks and review policy satisfied**

```bash
gh pr merge <PR> --squash --delete-branch
```

Do not merge if checks fail or unresolved blocking review findings remain.

---

## Self-review

1. **Spec coverage (PR 1 only):**
   - `.nvmrc` → Task 1
   - engines/`@types/node` → Task 1
   - Docker Node 24 → Task 2
   - Dockerfile Vite copy fix → Task 2
   - active package engines → Task 1
   - verification → Task 3
   - PR discipline → Task 4
2. **No Biome/Prettier migration in this plan** (belongs to later PRs).
3. **No placeholders** left for implementers.

## Handoff

After this PR merges, next plans are:
1. Biome quality tool (formatter + linter + CI, no bulk import rewrite)
2. Separate mechanical organize-imports PR
