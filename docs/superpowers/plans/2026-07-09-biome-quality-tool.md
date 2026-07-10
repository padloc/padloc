# Biome Quality Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Prettier with Biome as the project quality tool (formatter + linter) for the active web stack, without a bulk organize-imports rewrite.

**Architecture:** Add root `@biomejs/biome` and `biome.json` mapped to current Prettier style, switch scripts and CI lint to `biome check`, remove Prettier, then apply a one-time `biome format --write` and the minimum lint fixes/rule disables needed for a green CI gate. Import organization stays off for this PR (separate later PR).

**Tech Stack:** Biome 2.x (`@biomejs/biome`), pnpm 10.15.0, Node 24, GitHub Actions CI.

## Global Constraints

- English-only repository artifacts.
- Spec: `docs/superpowers/specs/2026-07-09-node24-biome-quality-design.md` **PR 2 only**.
- **No** repo-wide organize-imports rewrite in this PR (PR 3 later).
- Soft-focus packages are not intentionally modernized; ignore their build outputs.
- Do not include untracked `docs/superpowers/backlog.md`.
- Open PR only; wait for GitHub `lint`, `build`, `unit`; inspect AI review before merge unless user says otherwise.
- Prefer fixing real lint issues over disabling rules; if a recommended rule is high-noise/low-value in this monorepo, disable it in `biome.json` with a short English comment.

---

### Task 1: Add Biome config, scripts, and remove Prettier wiring

**Files:**
- Create: `biome.json`
- Modify: `package.json` (devDependencies + scripts)
- Modify: `.github/workflows/ci.yml` (lint job)
- Delete: `.prettierrc.json`
- Delete: `.prettierignore`
- Modify: `pnpm-lock.yaml` (via install)
- Modify: `CONTRIBUTING.md` only if it mentions Prettier as the formatter

- [ ] **Step 1: Create branch from latest main**

```bash
git checkout main
git pull origin main
git checkout -b chore/biome-quality-tool
```

- [ ] **Step 2: Install Biome and remove Prettier**

```bash
pnpm add -D -w @biomejs/biome@2.5.3
pnpm remove -w prettier
```

If `2.5.3` is not the latest 2.x at install time, use the latest stable 2.x from `npm view @biomejs/biome version` instead and record the exact version in the commit/PR body.

- [ ] **Step 3: Create `biome.json`**

Write this file at repo root (adjust only if Biome CLI rejects a key for the installed version):

```json
{
    "$schema": "https://biomejs.dev/schemas/2.5.3/schema.json",
    "vcs": {
        "enabled": true,
        "clientKind": "git",
        "useIgnoreFile": true
    },
    "files": {
        "includes": [
            "**",
            "!**/node_modules",
            "!**/dist",
            "!**/build",
            "!**/pnpm-lock.yaml",
            "!**/package-lock.json",
            "!**/.superpowers",
            "!**/docs/superpowers",
            "!**/cypress/fixtures",
            "!**/packages/locale/res",
            "!**/packages/app/src/core/*.js",
            "!**/packages/extension/dist",
            "!**/packages/pwa/dist",
            "!**/packages/admin/dist",
            "!**/packages/cordova/plugins",
            "!**/packages/cordova/platforms",
            "!**/packages/cordova/www",
            "!**/packages/electron/app",
            "!**/packages/electron/build",
            "!**/packages/electron/dist",
            "!**/packages/tauri/dist",
            "!**/packages/tauri/src-tauri/target",
            "!**/packages/tauri/tauri-update.json",
            "!**/.flatpak-builder",
            "!**/purekeep/assets/email"
        ]
    },
    "formatter": {
        "enabled": true,
        "indentStyle": "space",
        "indentWidth": 4,
        "lineWidth": 120
    },
    "javascript": {
        "formatter": {
            "quoteStyle": "double",
            "semicolons": "always",
            "trailingCommas": "es5"
        }
    },
    "json": {
        "formatter": {
            "indentStyle": "space",
            "indentWidth": 4,
            "lineWidth": 120
        }
    },
    "linter": {
        "enabled": true,
        "rules": {
            "recommended": true
        }
    },
    "assist": {
        "enabled": false
    }
}
```

Notes:
- `assist.enabled: false` keeps organize-imports out of this PR.
- Ignore set mirrors `.prettierignore` plus common build/vendor noise.
- If schema URL version must match package version exactly, set both to the installed version.

- [ ] **Step 4: Replace root scripts in `package.json`**

```json
"format": "biome format --write .",
"format:check": "biome format .",
"lint": "biome check .",
"lint:fix": "biome check --write ."
```

Remove scripts:
- `prettier`
- `prettier:check`

- [ ] **Step 5: Update CI lint job**

In `.github/workflows/ci.yml`, replace:

```yaml
- name: Run prettier check
  run: pnpm run prettier:check
```

with:

```yaml
- name: Run Biome check
  run: pnpm run lint
```

Keep the locale extraction drift step unchanged.

- [ ] **Step 6: Delete Prettier configs**

```bash
git rm .prettierrc.json .prettierignore
```

- [ ] **Step 7: Update CONTRIBUTING if needed**

If CONTRIBUTING mentions Prettier, point formatting/linting to Biome scripts (`pnpm run format`, `pnpm run lint`).

- [ ] **Step 8: Commit tooling only**

```bash
git add biome.json package.json pnpm-lock.yaml .github/workflows/ci.yml CONTRIBUTING.md
git add -u .prettierrc.json .prettierignore
git commit -m "chore: replace Prettier with Biome quality tool"
```

Expected: tooling commit only; `biome check` may still fail until Tasks 2–3.

---

### Task 2: Apply Biome formatting baseline

**Files:**
- Modify: any source/config files Biome reformats under includes

- [ ] **Step 1: Run format write**

```bash
pnpm run format
```

Expected: files reformatted; no crash.

- [ ] **Step 2: Confirm format check is clean**

```bash
pnpm run format:check
```

Expected: exit 0.

- [ ] **Step 3: Commit format baseline**

```bash
git add -A
# ensure backlog stays untracked:
git restore --staged docs/superpowers/backlog.md 2>/dev/null || true
git status --short
git commit -m "style: apply Biome format baseline"
```

If there are zero formatting changes, skip the commit and note that in the report.

---

### Task 3: Make `biome check` (lint + format) green

**Files:**
- Modify: source files with real, local lint fixes
- and/or Modify: `biome.json` rule overrides for high-noise rules only

- [ ] **Step 1: Run full quality check and capture failures**

```bash
pnpm run lint 2>&1 | tee /tmp/opencode/biome-check-initial.log
```

Expected initially: non-zero if lint findings exist.

- [ ] **Step 2: Apply safe autofixes where appropriate**

```bash
pnpm exec biome check --write --unsafe=false .
```

Do **not** enable assist/organize-imports.

Re-run:

```bash
pnpm run lint 2>&1 | tee /tmp/opencode/biome-check-after-safe.log
```

- [ ] **Step 3: Fix remaining findings**

Strategy (in order):
1. Fix small local correctness/style issues in active web packages.
2. For recommended rules that produce large low-value churn across legacy code, disable or set to `"off"` / `"warn"` in `biome.json` under `linter.rules` with a short English comment explaining why.
3. Never bulk-reorder imports in this PR.

Example override shape (only if needed):

```json
"linter": {
    "enabled": true,
    "rules": {
        "recommended": true,
        "style": {
            "noNonNullAssertion": "off"
        }
    }
}
```

- [ ] **Step 4: Confirm check is green**

```bash
pnpm run lint
```

Expected: exit 0.

- [ ] **Step 5: Commit lint green state**

```bash
git add -A
git restore --staged docs/superpowers/backlog.md 2>/dev/null || true
git commit -m "chore: make Biome lint gate green"
```

If split is cleaner, two commits are fine: source fixes vs rule overrides.

---

### Task 4: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Install + quality**

```bash
pnpm install
pnpm run lint
pnpm run format:check
```

Expected: all pass.

- [ ] **Step 2: Builds**

```bash
pnpm run pwa:build
pnpm run admin:build
pnpm run web-extension:build
```

Expected: all succeed.

- [ ] **Step 3: Tests + server dry-run**

```bash
pnpm -r run test
pnpm run server:start-dry
```

Expected: tests pass; dry-run starts.

- [ ] **Step 4: Ensure Prettier is gone**

```bash
grep -R "prettier" package.json .github/workflows/ci.yml || true
test ! -f .prettierrc.json
test ! -f .prettierignore
```

Expected: no Prettier scripts/deps in active tooling; config files deleted. Mentions in historical docs under `docs/superpowers/` are OK and ignored by Biome includes.

- [ ] **Step 5: Dirty tree check**

```bash
git status --short
```

Expected: clean except intentionally untracked local files such as `docs/superpowers/backlog.md`.

---

### Task 5: Open PR and wait for checks/review

**Files:** none (git/GitHub only)

- [ ] **Step 1: Push branch**

```bash
git push -u origin chore/biome-quality-tool
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --base main --head chore/biome-quality-tool \
  --title "chore: replace Prettier with Biome quality tool" \
  --body "$(cat <<'EOF'
## Summary
- Replace Prettier with Biome formatter + linter
- Add `biome.json` with Prettier-aligned style and recommended lint rules
- Keep assist/organize-imports disabled for this PR (bulk rewrite is a follow-up)
- Update CI lint job to `pnpm run lint`
- Remove Prettier dependency and configs

## Verification
- pnpm install
- pnpm run lint
- pnpm run format:check
- pnpm run pwa:build
- pnpm run admin:build
- pnpm run web-extension:build
- pnpm -r run test
- pnpm run server:start-dry

Spec: docs/superpowers/specs/2026-07-09-node24-biome-quality-design.md (PR 2)
Plan: docs/superpowers/plans/2026-07-09-biome-quality-tool.md
EOF
)"
```

- [ ] **Step 3: Wait for checks**

```bash
gh pr checks <PR> --watch
```

Required green: `lint`, `build`, `unit`, `PR Title`. Inspect CodeRabbit/Cubic unless user says otherwise.

- [ ] **Step 4: Merge only when green and review policy satisfied**

```bash
gh pr merge <PR> --squash --delete-branch
```

---

## Self-review

1. **Spec coverage (PR 2):** Biome dep/config, scripts, CI, Prettier removal, formatter alignment, recommended lint, no bulk imports → Tasks 1–5.
2. **No organize-imports rewrite** in this plan.
3. **No placeholders** for implementers.

## Follow-up (not this PR)

PR 3: enable Biome assist/organize-imports and apply mechanical import rewrite as a separate bulk PR (review may be skipped by explicit user decision; CI still required).
