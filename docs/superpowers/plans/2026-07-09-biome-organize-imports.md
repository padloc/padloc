# Biome Organize Imports Bulk Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Biome import organization and apply a mechanical repo-wide organize-imports rewrite without intentional behavior changes.

**Architecture:** Turn on Biome assist `organizeImports`, run `biome check --write` once to reorder imports, re-verify quality gate and builds, open a bulk PR. Review may be skipped by explicit user decision; CI remains required.

**Tech Stack:** Biome 2.5.3 (`@biomejs/biome`), pnpm 10.15.0, Node 24.

## Global Constraints

- English-only repository artifacts.
- Spec: `docs/superpowers/specs/2026-07-09-node24-biome-quality-design.md` **PR 3 only**.
- Mechanical import reorder only — no product/feature changes.
- Preserve side-effect imports that register Lit custom elements (do not drop bare `import "./x"` lines).
- Do not include untracked `docs/superpowers/backlog.md`.
- Open PR; wait for GitHub `lint`, `build`, `unit`. AI review may be ignored only if user explicitly says so for this PR.

---

### Task 1: Enable assist/organizeImports and apply rewrite

**Files:**
- Modify: `biome.json` (`assist` block)
- Modify: many `*.ts` / `*.js` files under Biome includes (import order only)

- [ ] **Step 1: Branch from latest main**

```bash
git checkout main
git pull origin main
git checkout -b chore/biome-organize-imports
```

- [ ] **Step 2: Enable assist organizeImports in `biome.json`**

Replace the current:

```json
"assist": {
    "enabled": false
}
```

with:

```json
"assist": {
    "enabled": true,
    "actions": {
        "source": {
            "organizeImports": "on"
        }
    }
}
```

Keep all existing formatter/linter/files settings unchanged.

- [ ] **Step 3: Apply organize imports + format/lint safe writes**

```bash
pnpm exec biome check --write .
```

Expected: many files change import order; command should end with exit 0 or only remaining warnings consistent with current gate.

- [ ] **Step 4: Confirm quality gate still green**

```bash
pnpm run lint
pnpm run format:check
```

Expected: exit 0.

- [ ] **Step 5: Spot-check side-effect imports still present**

```bash
# Examples that must remain (custom element registration):
grep -n 'import "\./select"' packages/app/src/elements/settings-display.ts
grep -n 'import "\./toggle-button"' packages/app/src/elements/settings-display.ts
grep -n 'import "\./button"' packages/app/src/elements/app.ts || true
```

If organize-imports removed a needed bare side-effect import, restore it in that file.

- [ ] **Step 6: Commit**

```bash
git add biome.json
git add -A
git restore --staged docs/superpowers/backlog.md 2>/dev/null || true
git commit -m "style: enable Biome organizeImports and apply rewrite"
```

---

### Task 2: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Builds**

```bash
pnpm run pwa:build
pnpm run admin:build
pnpm run web-extension:build
```

Expected: all succeed.

- [ ] **Step 2: Tests + server dry-run**

```bash
pnpm -r run test
pnpm run server:start-dry
```

Expected: tests pass; dry-run starts.

- [ ] **Step 3: Dirty tree check**

```bash
git status --short
```

Expected: clean except intentionally untracked local files.

---

### Task 3: Open PR (review skip allowed by user)

**Files:** none (git/GitHub only)

- [ ] **Step 1: Push and open PR**

```bash
git push -u origin chore/biome-organize-imports
gh pr create --base main --head chore/biome-organize-imports \
  --title "style: apply Biome organizeImports rewrite" \
  --body "$(cat <<'EOF'
## Summary
- Enable Biome assist `organizeImports`
- Apply mechanical import reorder across the active tree
- No intentional behavior changes

## Review note
This PR is a bulk mechanical rewrite. Per design, human/AI review may be skipped; CI tests/build remain the merge gate.

## Verification
- pnpm run lint
- pnpm run format:check
- pnpm run pwa:build
- pnpm run admin:build
- pnpm run web-extension:build
- pnpm -r run test
- pnpm run server:start-dry

Spec: docs/superpowers/specs/2026-07-09-node24-biome-quality-design.md (PR 3)
Plan: docs/superpowers/plans/2026-07-09-biome-organize-imports.md
EOF
)"
```

- [ ] **Step 2: Wait for CI**

```bash
gh pr checks <PR> --watch
```

Required green: `lint`, `build`, `unit`, `PR Title`.

- [ ] **Step 3: Merge when CI green**

User has pre-authorized skipping review for this mechanical PR. Merge after CI green:

```bash
gh pr merge <PR> --squash --delete-branch
```

---

## Self-review

1. Spec PR 3 covered: enable organizeImports + bulk rewrite + separate PR.
2. Side-effect import preservation called out.
3. No placeholders.
