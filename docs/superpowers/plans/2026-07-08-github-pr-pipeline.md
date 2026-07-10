# GitHub PR Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mature GitHub Flow pull-request pipeline with required fast checks, advisory AI review, E2E on demand/nightly, contributor templates, Dependabot, and a manual GitHub UI setup guide.

**Architecture:** Implement all repository-file changes in one branch, then apply GitHub-only settings manually after merge. Required PR gates are split into fast CI jobs (`lint`, `build`, `unit`) and a semantic PR-title check. E2E and AI reviews are visible but non-blocking at first.

**Tech Stack:** GitHub Actions, pnpm 10.15.0, Node 18, Cypress, CodeRabbit, Cubic, Dependabot, CODEOWNERS, conventional PR titles.

## Global Constraints

- Repository artifacts MUST be English-only, per `AGENTS.md`.
- Git workflow: GitHub Flow only (`main` + short-lived feature branches), no `develop` branch.
- Required checks: `lint`, `build`, `unit`, and PR-title check.
- E2E is non-blocking and runs on `workflow_dispatch`, nightly schedule, or PR label `e2e`.
- AI review from CodeRabbit and Cubic is advisory, not a required merge gate.
- Keep pnpm 10.15.0 and Node 18 (`.nvmrc`) as the CI toolchain.
- Do not modify product source code in this plan.
- Do not change package versions in this plan.
- Do not configure GitHub branch protection through committed files; provide a manual UI checklist.

---

## File Structure

Files modified:

- `.github/workflows/run-tests.yml` — removed/replaced by `ci.yml`.
- `.prettierignore` — unchanged unless generated config files require an ignore update.

Files created:

- `.github/workflows/ci.yml` — required fast CI jobs.
- `.github/workflows/e2e.yml` — non-blocking E2E workflow.
- `.github/workflows/pr-title.yml` — semantic PR-title check.
- `.github/CODEOWNERS` — owner review requests.
- `.github/pull_request_template.md` — PR template.
- `.github/ISSUE_TEMPLATE/bug_report.md` — bug report issue template.
- `.github/ISSUE_TEMPLATE/feature_request.md` — feature request issue template.
- `.github/ISSUE_TEMPLATE/config.yml` — issue template configuration.
- `.github/dependabot.yml` — dependency and GitHub Actions update automation.
- `.coderabbit.yaml` — CodeRabbit repository configuration.
- `cubic.yaml` — Cubic repository configuration.
- `CONTRIBUTING.md` — contributor guide.
- `docs/superpowers/specs/2026-07-08-github-pr-pipeline-design.md` — already written design spec.

---

## Task 1: Replace `run-tests.yml` with required fast CI jobs

**Files:**
- Delete: `.github/workflows/run-tests.yml`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: root scripts `prettier:check`, `locale:extract`, `pwa:build`, `web-extension:build`, `server:start-dry`, `test`.
- Produces: required GitHub status checks named `lint`, `build`, and `unit`.

- [ ] **Step 1: Delete the old workflow**

Remove `.github/workflows/run-tests.yml`.

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
    pull_request:
    push:
        branches:
            - main

concurrency:
    group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
    cancel-in-progress: true

jobs:
    lint:
        name: lint
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
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

    build:
        name: build
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with:
                  node-version-file: ".nvmrc"
                  cache: "pnpm"
            - name: Install dependencies
              run: pnpm install --frozen-lockfile
            - name: Build PWA
              run: pnpm run pwa:build
            - name: Build web extension
              run: pnpm run web-extension:build
            - name: Test zero-config server startup
              run: pnpm run server:start-dry

    unit:
        name: unit
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with:
                  node-version-file: ".nvmrc"
                  cache: "pnpm"
            - name: Install dependencies
              run: pnpm install --frozen-lockfile
            - name: Run unit tests
              run: pnpm test
```

- [ ] **Step 3: Validate the workflow YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('ci yaml ok')"`
Expected: `ci yaml ok`.

- [ ] **Step 4: Verify required scripts exist**

Run: `node -e "const s=require('./package.json').scripts; for (const k of ['prettier:check','locale:extract','pwa:build','web-extension:build','server:start-dry','test']) { if (!s[k]) throw new Error(k); } console.log('scripts ok')"`
Expected: `scripts ok`.

- [ ] **Step 5: Commit**

```bash
git add -A .github/workflows/run-tests.yml .github/workflows/ci.yml
git commit -m "ci: split required PR checks into lint build unit jobs"
```

---

## Task 2: Add non-blocking E2E workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

**Interfaces:**
- Consumes: root script `test:e2e`.
- Produces: non-required E2E workflow runnable manually, nightly, or by `e2e` label.

- [ ] **Step 1: Create `.github/workflows/e2e.yml`**

```yaml
name: E2E

on:
    workflow_dispatch:
    schedule:
        - cron: "0 3 * * *"
    pull_request:
        types:
            - labeled
            - synchronize
            - opened
            - reopened

concurrency:
    group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
    cancel-in-progress: true

jobs:
    e2e:
        name: e2e
        if: github.event_name != 'pull_request' || contains(github.event.pull_request.labels.*.name, 'e2e')
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with:
                  node-version-file: ".nvmrc"
                  cache: "pnpm"
            - name: Install dependencies
              run: pnpm install --frozen-lockfile
            - name: Run E2E tests
              run: pnpm run test:e2e
```

- [ ] **Step 2: Validate the workflow YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/e2e.yml')); print('e2e yaml ok')"`
Expected: `e2e yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: add non-blocking E2E workflow"
```

---

## Task 3: Add semantic PR title workflow

**Files:**
- Create: `.github/workflows/pr-title.yml`

**Interfaces:**
- Produces: required PR title status check.

- [ ] **Step 1: Create `.github/workflows/pr-title.yml`**

```yaml
name: PR Title

on:
    pull_request:
        types:
            - opened
            - edited
            - reopened
            - synchronize

permissions:
    contents: read
    pull-requests: read

jobs:
    pr-title:
        name: PR Title
        runs-on: ubuntu-latest
        steps:
            - uses: amannn/action-semantic-pull-request@v5
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
              with:
                  types: |
                      feat
                      fix
                      docs
                      chore
                      ci
                      test
                      refactor
                      build
                      perf
                      revert
                  requireScope: false
```

- [ ] **Step 2: Validate the workflow YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-title.yml')); print('pr title yaml ok')"`
Expected: `pr title yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pr-title.yml
git commit -m "ci: require conventional PR titles"
```

---

## Task 4: Add AI reviewer configuration

**Files:**
- Create: `.coderabbit.yaml`
- Create: `cubic.yaml`

**Interfaces:**
- Produces: advisory CodeRabbit and Cubic review behavior. Actual app installation remains manual.

- [ ] **Step 1: Create `.coderabbit.yaml`**

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: "en-US"
early_access: false

reviews:
    profile: "chill"
    request_changes_workflow: false
    high_level_summary: true
    poem: false
    review_status: true
    review_details: false
    auto_review:
        enabled: true
        drafts: false
        labels:
            - "!skip-ai-review"
    path_filters:
        - "!**/node_modules/**"
        - "!**/pnpm-lock.yaml"
        - "!**/package-lock.json"
        - "!packages/*/dist/**"
        - "!packages/*/build/**"
        - "!packages/*/target/**"

chat:
    auto_reply: true
```

- [ ] **Step 2: Create `cubic.yaml`**

```yaml
# yaml-language-server: $schema=https://cubic.dev/schema/cubic-repository-config.schema.json
version: 1

reviews:
    enabled: true
    sensitivity: medium
    incremental_commits: true
    architecture_diagrams: false
    resolve_threads_when_addressed: true
    custom_instructions: |
        Review all repository artifacts in English only. Flag any non-English text
        in committed files. TypeScript 5.x, @types/node@18, mongodb upgrades, and
        Vite migration are deferred follow-up efforts and should not be suggested
        as incidental changes in unrelated PRs.
    ignore:
        files:
            - pnpm-lock.yaml
            - package-lock.json
            - packages/*/dist/**
            - packages/*/build/**
            - packages/*/target/**
        pr_labels:
            - skip-ai-review

pr_descriptions:
    generate: true
    instructions: |
        Keep PR descriptions concise and in English. Include testing evidence and
        call out deferred follow-up work explicitly.
```

- [ ] **Step 3: Validate YAML files**

Run: `python3 -c "import yaml; [yaml.safe_load(open(f)) for f in ['.coderabbit.yaml','cubic.yaml']]; print('ai yaml ok')"`
Expected: `ai yaml ok`.

- [ ] **Step 4: Commit**

```bash
git add .coderabbit.yaml cubic.yaml
git commit -m "chore: configure advisory AI code review"
```

---

## Task 5: Add contributor templates and CODEOWNERS

**Files:**
- Create: `.github/CODEOWNERS`
- Create: `.github/pull_request_template.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/ISSUE_TEMPLATE/config.yml`

**Interfaces:**
- Produces: GitHub UI templates and automatic owner review requests.

- [ ] **Step 1: Create `.github/CODEOWNERS`**

```text
* @grigoreo-dev
```

- [ ] **Step 2: Create `.github/pull_request_template.md`**

```markdown
## Summary

<!-- Describe the change in 1-3 sentences. -->

## What changed

- 

## Testing

<!-- List the commands you ran and the result. -->

- [ ] `pnpm run prettier:check`
- [ ] `pnpm run locale:extract`
- [ ] `pnpm run pwa:build`
- [ ] `pnpm run web-extension:build`
- [ ] `pnpm run server:start-dry`
- [ ] `pnpm -r run test`
- [ ] Other: 

## Checklist

- [ ] The PR title follows the conventional format (`feat:`, `fix:`, `docs:`, `chore:`, etc.).
- [ ] All repository artifacts are in English.
- [ ] Documentation was updated where needed.
- [ ] AI review comments were read and either addressed or resolved.
- [ ] Follow-up work is listed explicitly, if any.
```

- [ ] **Step 3: Create `.github/ISSUE_TEMPLATE/bug_report.md`**

```markdown
---
name: Bug report
about: Report a reproducible problem
title: ""
labels: bug
assignees: ""
---

## Summary

<!-- What is broken? -->

## Steps to reproduce

1. 
2. 
3. 

## Expected behavior

<!-- What did you expect to happen? -->

## Actual behavior

<!-- What happened instead? -->

## Environment

- App target: PWA / server / extension / desktop / mobile
- Browser or runtime:
- Operating system:
- Node version, if local development:

## Logs or screenshots

<!-- Paste logs or attach screenshots if useful. Remove secrets before posting. -->
```

- [ ] **Step 4: Create `.github/ISSUE_TEMPLATE/feature_request.md`**

```markdown
---
name: Feature request
about: Suggest an improvement or new capability
title: ""
labels: enhancement
assignees: ""
---

## Problem

<!-- What user problem should this solve? -->

## Proposed solution

<!-- What should change? -->

## Alternatives considered

<!-- What other approaches did you consider? -->

## Scope

- Target: PWA / server / extension / desktop / mobile
- Breaking change: yes / no / unknown

## Additional context

<!-- Links, screenshots, examples, or related issues. -->
```

- [ ] **Step 5: Create `.github/ISSUE_TEMPLATE/config.yml`**

```yaml
blank_issues_enabled: false
contact_links:
    - name: Security issue
      url: https://github.com/grigoreo-dev/padloc/security/advisories/new
      about: Please report security vulnerabilities privately.
```

- [ ] **Step 6: Validate English-only and commit**

Run: `grep -rnP '\p{Cyrillic}' .github/CODEOWNERS .github/pull_request_template.md .github/ISSUE_TEMPLATE || true`
Expected: no output.

```bash
git add .github/CODEOWNERS .github/pull_request_template.md .github/ISSUE_TEMPLATE
git commit -m "docs: add PR and issue templates with CODEOWNERS"
```

---

## Task 6: Add contributor guide

**Files:**
- Create: `CONTRIBUTING.md`

**Interfaces:**
- Produces: contributor documentation for local setup and PR workflow.

- [ ] **Step 1: Create `CONTRIBUTING.md`**

```markdown
# Contributing

Thank you for contributing to this padloc fork.

## Language policy

Everything committed to this repository must be in English: code, comments,
documentation, commit messages, pull requests, issues, and GitHub templates.

## Development prerequisites

- Node.js 18 (see `.nvmrc`)
- pnpm 10.15.0 (see `packageManager` in `package.json`)
- Corepack

Recommended setup:

```bash
nvm use
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
```

## Branch workflow

Use GitHub Flow:

1. Create a short-lived branch from `main`.
2. Make the change.
3. Open a pull request into `main`.
4. Wait for CI and review.
5. Merge with squash merge.

Branch name examples:

- `feat/passkey-support`
- `fix/session-timeout`
- `docs/contributing-guide`
- `chore/dependency-refresh`

## Commit and PR title format

Use conventional-style prefixes:

- `feat: add ...`
- `fix: correct ...`
- `docs: update ...`
- `chore: change ...`
- `ci: adjust ...`
- `test: add ...`
- `refactor: simplify ...`

The PR title is checked automatically and should use the same format.

## Local validation

Run the focused checks relevant to your change. The common checks are:

```bash
pnpm run prettier:check
pnpm run locale:extract
pnpm run pwa:build
pnpm run web-extension:build
pnpm run server:start-dry
pnpm -r run test
```

E2E tests are slower and can be run with:

```bash
pnpm run test:e2e
```

## Pull request review

Every PR should:

- Fill out the PR template.
- Pass the required CI checks.
- Receive maintainer review.
- Read and resolve CodeRabbit and Cubic feedback where relevant.
- List any follow-up work explicitly.

AI review is advisory. The maintainer makes the final decision.
```

- [ ] **Step 2: Validate Markdown and English-only**

Run: `pnpm exec prettier --check CONTRIBUTING.md && ! grep -nP '\p{Cyrillic}' CONTRIBUTING.md`
Expected: Prettier passes and grep prints no Cyrillic.

- [ ] **Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributor guide"
```

---

## Task 7: Add Dependabot configuration

**Files:**
- Create: `.github/dependabot.yml`

**Interfaces:**
- Produces: weekly dependency and GitHub Actions update PRs.

- [ ] **Step 1: Create `.github/dependabot.yml`**

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

- [ ] **Step 2: Validate YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml')); print('dependabot yaml ok')"`
Expected: `dependabot yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot update configuration"
```

---

## Task 8: Add manual GitHub setup checklist

**Files:**
- Create: `docs/superpowers/specs/2026-07-08-github-pr-pipeline-ui-checklist.md`

**Interfaces:**
- Produces: manual setup instructions for GitHub UI settings that cannot be committed.

- [ ] **Step 1: Create the checklist file**

```markdown
# GitHub PR Pipeline UI Setup Checklist

Apply these steps after the repository-file PR is merged into `main` and the new
checks have run at least once.

## Install GitHub Apps

1. Install CodeRabbit for `grigoreo-dev/padloc`.
2. Install Cubic.dev for `grigoreo-dev/padloc`.
3. Grant access only to this repository.
4. Open a test PR and confirm both apps comment.

## Configure merge methods

Repository → Settings → General → Pull Requests:

- Enable **Allow squash merging**.
- Disable **Allow merge commits**.
- Disable **Allow rebase merging**.
- Enable automatic deletion of head branches if desired.

## Protect `main`

Repository → Settings → Branches → Add branch protection rule:

- Branch name pattern: `main`.
- Enable **Require a pull request before merging**.
- Required approvals: `1`.
- Enable **Require review from Code Owners**.
- Enable **Dismiss stale pull request approvals when new commits are pushed**.
- Enable **Require status checks to pass before merging**.
- Enable **Require branches to be up to date before merging**.
- Required checks:
  - `lint`
  - `build`
  - `unit`
  - `PR Title`
- Enable **Require conversation resolution before merging**.
- Do **not** enable admin bypass prevention while this is a solo-maintained repository.

When a second maintainer exists, revisit the admin-bypass setting and consider
enforcing the rules for administrators too.

## Validate

1. Open a test PR.
2. Confirm `lint`, `build`, `unit`, and `PR Title` appear as required checks.
3. Confirm E2E does not block the PR by default.
4. Add label `e2e` and confirm the E2E workflow starts.
5. Confirm CodeRabbit and Cubic leave advisory comments.
```

- [ ] **Step 2: Validate English-only**

Run: `grep -nP '\p{Cyrillic}' docs/superpowers/specs/2026-07-08-github-pr-pipeline-ui-checklist.md || true`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-08-github-pr-pipeline-ui-checklist.md
git commit -m "docs: add manual GitHub branch protection checklist"
```

---

## Task 9: Final verification

**Files:** none expected.

**Interfaces:**
- Consumes: all new governance files and workflows.
- Produces: confidence that the branch is ready for review.

- [ ] **Step 1: Validate all YAML files created or modified by this plan**

Run:

```bash
python3 - <<'PY'
import yaml
files = [
    '.github/workflows/ci.yml',
    '.github/workflows/e2e.yml',
    '.github/workflows/pr-title.yml',
    '.github/dependabot.yml',
    '.github/ISSUE_TEMPLATE/config.yml',
    '.coderabbit.yaml',
    'cubic.yaml',
]
for path in files:
    with open(path, 'r', encoding='utf-8') as fh:
        yaml.safe_load(fh)
    print(f'{path}: ok')
PY
```

Expected: every file prints `ok`.

- [ ] **Step 2: Run repository checks**

Run:

```bash
pnpm install --frozen-lockfile
pnpm run prettier:check
pnpm run pwa:build
pnpm run web-extension:build
pnpm run server:start-dry
pnpm -r run test
```

Expected: all commands exit 0.

- [ ] **Step 3: Verify English-only for added governance files**

Run:

```bash
grep -rnP '\p{Cyrillic}' \
  .github/CODEOWNERS \
  .github/pull_request_template.md \
  .github/ISSUE_TEMPLATE \
  .github/dependabot.yml \
  .github/workflows/ci.yml \
  .github/workflows/e2e.yml \
  .github/workflows/pr-title.yml \
  .coderabbit.yaml \
  cubic.yaml \
  CONTRIBUTING.md \
  docs/superpowers/specs/2026-07-08-github-pr-pipeline-ui-checklist.md || true
```

Expected: no output.

- [ ] **Step 4: Commit final marker only if needed**

No commit is needed if all previous tasks already committed their changes. If a
minor verification-only documentation fix was needed, commit it with:

```bash
git add -A
git commit -m "chore: finalize GitHub PR pipeline setup"
```

---

## Self-Review Notes

- **Spec coverage:** CI, E2E, PR-title check, AI configs, CODEOWNERS, PR/issue templates, CONTRIBUTING, Dependabot, and manual GitHub UI checklist all have implementation tasks.
- **Scope:** No product source changes and no dependency version changes are required.
- **Language:** All planned repository artifacts are English-only.
- **Known manual step:** Branch protection and GitHub App installation cannot be completed by committed files and are intentionally captured in the UI checklist.
