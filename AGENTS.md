# Padloc development and staging

The staging deployment setup currently lives on `staging-deployment` and has not
been merged into `main`. Start new development branches from
`staging-deployment` unless the user specifies another base. Do not merge into
`main` or open a pull request unless requested.

## Staging deployments

-   Read `deploy/staging/README.md` before deploying or changing deployment
    setup.
-   Use the existing tag-triggered GitHub Actions publishing workflow and the
    droplet's pull service. No dedicated staging branch or GitHub SSH secret is
    required.
-   When the user requests deployment, test the change, commit and push it, then
    push a unique `staging-*` tag at the intended commit. Use letters, digits,
    dots, underscores and hyphens in tag names. Never move or reuse a tag.
-   The tagged commit must contain `.github/workflows/deploy-staging.yml` and
    its supporting deployment files. Check this before tagging another branch.
-   Staging is one shared instance at `https://staging.padloc.app`, with the API
    under `/server`. Deploying any branch replaces that shared instance.
-   Verify the publishing workflow succeeds, then verify the droplet deployed
    the requested tag and commit. Check the HTTPS PWA, client routes and
    `/server/healthcheck`. Workflow success confirms publication, not
    deployment.
-   The droplet's root-owned scripts and Compose/Caddy configuration are
    installed separately; image publication does not update those files. Apply
    and verify host configuration changes separately when authorized.
-   Preserve database, attachment and certificate volumes. Never run
    `docker compose down --volumes` or prune volumes as deployment cleanup.
-   Keep private keys and credentials out of chat, source control and images.
    Public staging images allow the droplet to pull without registry
    credentials.
-   Staging email uses the console backend. Verification codes are in backend
    logs; use synthetic accounts and test data, and avoid exposing other users'
    codes or logs.

Deployment authorization is task-specific: do not publish a staging tag for a
review-only or local-only task. If deployment is requested, use this established
flow rather than introducing a new deployment mechanism.
