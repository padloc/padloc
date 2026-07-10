# Production Docker Compose

Root `docker-compose.yml` is the main deploy entrypoint for this fork.

It follows the classic Padloc nginx example, extended with the admin portal on a
**separate subdomain**:

-   `server` with LevelDB
-   `pwa` build into a shared volume
-   `admin` build into a shared volume
-   `nginx` routes by `Host`:
    -   primary domain → PWA at `/` + API at `/server`
    -   `admin.*` host → Admin portal at `/` (+ optional `/server` proxy)

No host ports are published. Traefik/Dokploy (or another reverse proxy) should
route traffic to the `nginx` service on container port `80`.

## Local (optional host publish)

If you want to open the stack directly on a machine without Dokploy:

```sh
cp .env.example .env
# edit public URLs in .env if needed
docker compose up -d --build
```

Then temporarily publish nginx yourself, for example:

```sh
docker compose run --rm --service-ports nginx
```

or add a local override with `ports: ["80:80"]`.

## Dokploy (GitHub + Docker Compose)

1. Create a Compose application from this GitHub repo.
2. Branch: `release/v4.4.0-dokploy` (or `main` after merge).
3. Compose file path: `docker-compose.yml`
4. Set environment variables in Dokploy UI:
    - `PL_PWA_URL=https://your-domain`
    - `PL_SERVER_URL=https://your-domain/server`
    - `PL_SERVER_CLIENT_URL=https://your-domain`
    - `PL_ADMIN_URL=https://admin.your-domain`
    - `PL_ADMIN_URL_PATH=/`
    - `PL_SERVER_ADMINS=you@example.com` (comma-separated super-admin emails)
5. Domains → service `nginx`, port `80`:
    - `your-domain` (main PWA)
    - `admin.your-domain` (admin portal)
6. Deploy.

After any public URL change, rebuild the `pwa` and `admin` services (URLs are
baked in at build time). `PL_SERVER_ADMINS` only needs a **server restart**.

## Paths / hosts

| Host                | Path      | App                                                                 |
| ------------------- | --------- | ------------------------------------------------------------------- |
| `your-domain`       | `/`       | PWA                                                                 |
| `your-domain`       | `/server` | API                                                                 |
| `admin.your-domain` | `/`       | Admin portal                                                        |
| `admin.your-domain` | `/server` | API proxy (same backend; optional if admin uses main `/server` URL) |

nginx matches admin hosts with `server_name ~^admin\.` (any host starting with
`admin.`).

## Admin portal access

1. Register/login once on the normal PWA so the account exists.
2. Set `PL_SERVER_ADMINS` to that account's email (exact match).
3. Restart the `server` service.
4. Open `https://admin.your-domain` and log in there.

Admin uses a separate origin, so PWA and admin sessions do not share
`localStorage`. Always log in on the admin host for an `asAdmin` session.

If you see "You don't have the necessary permissions…", the email is missing
from `PL_SERVER_ADMINS`. If you see "session is not valid in this context", log
out and log in again on the **admin** host.

## Security note

The admin UI is a public SPA. Authorization is enforced by the server for emails
listed in `PL_SERVER_ADMINS`. Edge protection (Basic Auth, IP allowlist, SSO)
can be applied later **only** on the admin domain without affecting the main
app.

## Data

Named volumes:

-   `data` - LevelDB
-   `attachments` - file attachments
-   `pwa` - built PWA assets
-   `admin` - built admin portal assets
