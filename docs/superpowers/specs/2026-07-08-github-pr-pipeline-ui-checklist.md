# GitHub PR Pipeline UI Setup Checklist

Apply these steps after the repository-file PR is merged into `main` and the new
checks have run at least once.

## Install GitHub Apps

1. Install CodeRabbit for `grigoreo-dev/padloc`.
2. Install Cubic.dev for `grigoreo-dev/padloc`.
3. Grant access only to this repository.
4. Open a test PR and confirm both apps comment.

## Configure merge methods

Repository > Settings > General > Pull Requests:

- Enable **Allow squash merging**.
- Disable **Allow merge commits**.
- Disable **Allow rebase merging**.
- Enable automatic deletion of head branches if desired.

## Protect `main`

Repository > Settings > Branches > Add branch protection rule:

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
