# Padloc staging on DigitalOcean

The PWA runs at https://staging.padloc.app and the API at `/server`. Deployments
are requested by pushing a unique `staging-*` tag from any branch. There is no
staging branch. The tagged commit must contain the publishing workflow; tag a
fork PR's selected commit in `padloc/padloc` to deploy it.

```sh
git tag staging-2026-10-14-01 <commit>
git push origin staging-2026-10-14-01
```

Use tag names containing only letters, digits, dots, underscores and hyphens.
Never move or reuse deployment tags. Ordinary branch pushes do not deploy.
Creating a tag deploys to the single shared staging instance and its test data.

## How it works

GitHub Actions tests core/server, builds both Docker images and pushes them to
public GHCR packages `padloc-staging-server` and `padloc-staging-pwa`. Only
after both pushes succeed does it update the JSON body of the
`padloc-staging-channel` prerelease. The body contains the request sequence,
tag, commit and exact image digests. The channel tag is bookkeeping, not an
application release tag. The workflow uses its short-lived `GITHUB_TOKEN`; it
has no SSH credentials. An older workflow rerun cannot replace a newer requested
or published staging.

A systemd timer on the droplet polls that public manifest every two minutes. It
validates the manifest, pulls exact image digests and updates Compose. The
droplet has no GitHub or registry credential. Public images contain code and
assets, so never bake secrets into them. New GHCR packages default to private:
make both packages public before the initial deployment.

If organization policy blocks public packages, temporarily allow public package
creation in organization Settings → Packages, make only these two packages
public, then restore the restriction. Existing public packages retain their
visibility.

The droplet's scripts, Compose and Caddy configuration are installed separately
as root-owned files. The puller never downloads or executes deployment scripts
from a release. Application containers receive no Docker socket or privileged
host access. Publishing an accepted image still grants control of the staging
application and access to its mounted test data. Protect creation, updates and
deletion of `staging-*` tags; only trusted maintainers should request
deployments.

## Initial droplet setup

Install Docker Engine, the Compose plugin, Python 3, curl and util-linux
(flock). Point the DNS A record at the droplet and allow inbound TCP 80/443.
Only publish an AAAA record if IPv6 is configured. Verify administrative SSH
separately; keep its private key on your computer.

Install `compose.yml` and `Caddyfile` under `/opt/padloc-staging`, owned by
root. Install `pull.py` and `deploy.sh` under `/usr/local/lib/padloc-staging`,
owned by root. Install the service and timer under `/etc/systemd/system`, then
run:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now padloc-staging.timer
sudo systemctl start padloc-staging.service
```

Create the public `padloc-staging-channel` prerelease once, with an empty body
and `make_latest=false`. The publishing workflow updates this existing release.
Do not mark it as a stable production release. The initial channel reference can
point at the default branch; the manifest determines the deployed commit.

## Verification and failures

The puller verifies the API health endpoint and the PWA HTML over HTTPS. A
successful update records `.env` and `deployed.json` on the droplet. If startup
or health checks fail, it attempts to restore the previous images and records
`failed.json`. It will not retry that failed sequence automatically.
Registry/network failures before startup are retried on the next timer tick.
Push a new staging tag to try a corrected release. To deliberately retry a
blocked release, remove `failed.json` on the droplet and start the service
manually.

```sh
sudo systemctl status padloc-staging.timer padloc-staging.service
sudo journalctl -u padloc-staging.service --since today
sudo cat /opt/padloc-staging/deployed.json
sudo docker compose --env-file /opt/padloc-staging/.env -f /opt/padloc-staging/compose.yml ps
```

GitHub's workflow success confirms publication, not deployment. The service
journal and HTTPS checks confirm deployment. Updates may briefly interrupt
service. A rollback restores application images, not database changes. To deploy
an older commit deliberately, create a new staging tag at that commit.

## Persistent data

Named volumes `padloc-staging_data` and `padloc-staging_attachments` persist
through updates, along with Caddy certificate storage. Never run
`docker compose down --volumes`. Back up data off the droplet; stop the backend
while copying LevelDB for a consistent snapshot. Retained images consume disk;
inspect usage and remove obsolete images deliberately without deleting volumes.

Console email is enabled. Test verification codes appear in backend logs; keep
those logs private. Configure SMTP before expecting inbox delivery. Use test
data only. The repository's existing Dockerfiles use Node 16, and the current
droplet uses Ubuntu 20.04; upgrading those runtimes is separate work.

Container memory limits reserve room for the host on the 2 GB droplet. The PWA
uses an HTTP 200 fallback through its loopback address for client routes, rather
than proxying missing paths back through the public hostname. Its build heap is
capped at 768 MB.
