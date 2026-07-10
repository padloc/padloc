# GitHub PR Pipeline Design

**Date:** 2026-07-08
**Branch:** `t1-node18-web-runtime`
**Status:** Approved design, ready for implementation planning

## Summary

This spec defines a mature pull-request workflow for the padloc fork. The owner
currently maintains the project alone, but expects outside contributors and wants
to adopt disciplined GitHub practices now.

The repository will use **GitHub Flow**: a protected `main` branch plus short-lived
feature branches and pull requests. The pipeline should be strict enough to teach
good habits and protect `main`, while avoiding excessive friction for a solo
maintainer.

All repository artifacts must be in English, per `AGENTS.md`. Conversation with
the owner remains in the owner's preferred language, but any committed file,
commit message, GitHub template, or PR/issue artifact must be English.

## Goals

- Require pull requests for changes to `main`.
- Gate merges on fast, reliable checks: formatting, builds, unit tests, and PR
  title format.
- Run E2E tests in GitHub Actions without making them a required check yet.
- Add AI review from CodeRabbit and Cubic as advisory review, not as a hard merge
  blocker.
- Add repository contributor scaffolding: PR template, issue templates,
  `CONTRIBUTING.md`, `CODEOWNERS`, and Dependabot.
- Provide a step-by-step GitHub UI checklist for settings that cannot be committed
  as files: branch protection, merge strategy, and GitHub App installation.

## Non-goals

- No `develop` branch or GitFlow. Use GitHub Flow only.
- No required AI approval. AI reviewers comment, but they do not block merges.
- No blocking E2E check at first. E2E runs nightly, manually, or when requested
  by label.
- No automation that requires storing a personal GitHub token in this repository.

## Current Repository State

Existing GitHub files:

- `.github/workflows/run-tests.yml`
- `.github/workflows/build-web-extension.yml`
- `.github/workflows/build-electron.yml`
- `.github/workflows/build-cordova.yml`
- `.github/workflows/build-tauri.yml`
- `.github/workflows/publish-release.yml`
- `.github/workflows/update-dockerhub.yml`
- `.github/workflows/update-deployment.yml`

Missing GitHub governance files:

- No `.github/CODEOWNERS`.
- No PR template.
- No issue templates.
- No Dependabot config.
- No AI-reviewer config files.
- No contributor guide.

## Architecture

The setup has three layers.

### Layer 1 — Repository files

These are committed in one PR.

- `.github/workflows/ci.yml` — fast required CI checks.
- `.github/workflows/e2e.yml` — slower E2E workflow, scheduled/manual/label-based.
- `.github/workflows/pr-title.yml` — conventional PR title check.
- `.github/CODEOWNERS` — request maintainer review automatically.
- `.github/pull_request_template.md` — PR checklist.
- `.github/ISSUE_TEMPLATE/bug_report.md` — bug report template.
- `.github/ISSUE_TEMPLATE/feature_request.md` — feature request template.
- `.github/ISSUE_TEMPLATE/config.yml` — issue-template config.
- `.github/dependabot.yml` — weekly npm/pnpm and GitHub Actions update PRs.
- `.coderabbit.yaml` — CodeRabbit review defaults.
- `cubic.yaml` — Cubic review defaults.
- `CONTRIBUTING.md` — contributor workflow and local setup.

### Layer 2 — GitHub Apps

The owner installs these manually through GitHub or the vendor onboarding flow.

- CodeRabbit
- Cubic.dev

Both tools review PRs and leave comments, but their output is advisory. They are
not required status checks.

### Layer 3 — GitHub repository settings

The owner applies these manually after Layer 1 is merged, because required status
checks only appear in branch-protection settings after they have run at least once
on `main`.

- Protect `main`.
- Require PR before merge.
- Require 1 approval.
- Require Code Owner review.
- Dismiss stale approvals after new commits.
- Require status checks: `lint`, `build`, `unit`, and PR title check.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Allow admin bypass while the owner is solo.
- Allow only squash merges.

## CI Design

### Required fast checks

Replace `.github/workflows/run-tests.yml` with `.github/workflows/ci.yml`.

Triggers:

- `pull_request`
- `push` to `main`

Global behavior:

- `concurrency` cancels older runs for the same branch/PR.
- Use Node from `.nvmrc`.
- Use pnpm 10 through `pnpm/action-setup@v4` and `actions/setup-node` cache.
- Install with `pnpm install --frozen-lockfile`.

Jobs:

1. `lint`
   - `pnpm run prettier:check`
   - `pnpm run locale:extract`
   - Fail if translation extraction changes tracked files.

2. `build`
   - `pnpm run pwa:build`
   - `pnpm run web-extension:build`
   - `pnpm run server:start-dry`

3. `unit`
   - `pnpm -r run test`

These jobs become required checks in branch protection.

### E2E workflow

Add `.github/workflows/e2e.yml`.

Triggers:

- `workflow_dispatch`
- Nightly `schedule`
- `pull_request` when the PR has label `e2e`

Behavior:

- Use the same Node/pnpm setup as `ci.yml`.
- Run `pnpm run test:e2e`.
- Do not make this workflow a required status check at first.

Reasoning:

- E2E is valuable but slower and more fragile than build/unit checks.
- Running it nightly and on demand gives coverage without blocking contributor
  velocity.
- If the E2E workflow proves stable, it can later become required.

### PR title workflow

Add `.github/workflows/pr-title.yml`.

Use `amannn/action-semantic-pull-request` to require conventional PR titles.

Allowed types:

- `feat`
- `fix`
- `docs`
- `chore`
- `ci`
- `test`
- `refactor`
- `build`
- `perf`
- `revert`

This check becomes required in branch protection.

## AI Review Design

### CodeRabbit

Add `.coderabbit.yaml` using CodeRabbit's repository YAML schema.

Configuration intent:

- Review language: English (`en-US`).
- Auto-review enabled for non-draft PRs.
- Chill review profile.
- Do not use CodeRabbit's request-changes workflow as a hard gate.
- Ignore generated or internal files:
  - `pnpm-lock.yaml`
  - `package-lock.json`
  - `docs/superpowers/**`
  - `.superpowers/**`
  - build output directories

### Cubic

Add `cubic.yaml` using Cubic's repository config schema.

Configuration intent:

- Reviews enabled.
- Medium sensitivity.
- Incremental review enabled.
- Ignore generated/internal files similar to CodeRabbit.
- Custom instructions remind Cubic that repository artifacts must be English and
  that TypeScript 5.x / Vite are deferred follow-up efforts.

### AI review policy

- CodeRabbit and Cubic must comment on PRs.
- Their comments must be read and resolved when relevant.
- They are not required status checks and do not block merges by themselves.
- After roughly one month of use, evaluate whether both tools are useful or one
  should be removed to reduce noise.

## Contributor Scaffolding

### CODEOWNERS

Add `.github/CODEOWNERS`:

```text
* @grigoreo-dev
```

This causes GitHub to request the owner's review automatically on PRs.

### PR template

Add `.github/pull_request_template.md` with sections:

- Summary
- What changed
- How it was tested
- Screenshots / recordings (if UI)
- Checklist
  - Tests added/updated where relevant
  - `pnpm run prettier:check` passes
  - Builds/tests run locally where practical
  - Documentation updated where needed

### Issue templates

Add:

- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/ISSUE_TEMPLATE/config.yml`

Bug reports collect reproduction steps, expected behavior, actual behavior,
environment, and logs. Feature requests collect problem statement, proposed
solution, alternatives, and scope.

### CONTRIBUTING.md

Add `CONTRIBUTING.md` with:

- English-only repository policy.
- Required tools: Node 18, pnpm 10, corepack.
- Setup commands:
  - `nvm use`
  - `corepack enable`
  - `corepack prepare pnpm@10.15.0 --activate`
  - `pnpm install`
- Branch naming examples:
  - `feat/<short-name>`
  - `fix/<short-name>`
  - `docs/<short-name>`
  - `chore/<short-name>`
- Commit / PR-title convention:
  - `feat: ...`
  - `fix: ...`
  - `docs: ...`
  - `chore: ...`
- Local validation commands:
  - `pnpm run prettier:check`
  - `pnpm run pwa:build`
  - `pnpm run web-extension:build`
  - `pnpm run server:start-dry`
  - `pnpm -r run test`
- PR process:
  - Open a feature branch.
  - Fill the PR template.
  - Wait for CI.
  - Read CodeRabbit/Cubic feedback.
  - Address or explicitly resolve review comments.

## Dependabot Design

Add `.github/dependabot.yml`.

Ecosystems:

- `npm` at repository root, weekly.
- `github-actions` under `.github/workflows`, weekly.

Behavior:

- Group minor and patch dependency updates to reduce PR noise.
- Do not automerge.
- Keep exact version pins; maintainers review the lockfile and CI output.
- Security updates remain separate and high priority.

Rationale:

The repository intentionally uses exact pins. Dependabot PRs should be reviewed
like any other dependency update, not merged blindly.

## GitHub UI Setup Guide

After the repository-file PR is merged into `main`, apply these settings manually.

### Install GitHub Apps

1. Install CodeRabbit for `grigoreo-dev/padloc`.
2. Install Cubic.dev for `grigoreo-dev/padloc`.
3. Restrict each app to this repository only, not all repositories.
4. Open a test PR and confirm both apps comment.

### Configure merge methods

Repository → Settings → General → Pull Requests:

- Enable **Allow squash merging**.
- Disable **Allow merge commits**.
- Disable **Allow rebase merging**.
- Enable automatic deletion of head branches if desired.

### Configure branch protection

Repository → Settings → Branches → Add branch protection rule:

- Branch name pattern: `main`
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
  - PR title check from `pr-title.yml`
- Enable **Require conversation resolution before merging**.
- Do **not** enable admin bypass prevention while the owner is solo. The owner can
  bypass if necessary; outside contributors are still protected by the rule.

When a second maintainer exists, revisit the admin-bypass setting and consider
enforcing the rules for administrators too.

## Acceptance Criteria

- `main` uses GitHub Flow with protected PR-based changes.
- Required checks exist and are selectable in branch protection:
  - `lint`
  - `build`
  - `unit`
  - PR title check
- E2E can be run manually, nightly, or by adding label `e2e`.
- CodeRabbit and Cubic are installed manually using the UI checklist and comment
  on PRs.
- AI review does not block merges by status check.
- PR and issue templates are present and English-only.
- `CONTRIBUTING.md` describes the pnpm/Node 18 workflow.
- Dependabot opens dependency and GitHub Actions update PRs on a weekly schedule.

## Risks and Follow-ups

- E2E may be flaky on GitHub Actions at first. Keep it non-blocking until it is
  stable for several runs.
- Two AI reviewers may create duplicate feedback. Reassess after one month.
- Solo admin bypass is practical now but should be revisited when a second
  maintainer exists.
- Dependabot may create noisy PRs because the repository uses exact pins. Grouping
  should reduce this, but maintainers should tune it after observing the first
  few PRs.
