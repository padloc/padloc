# LevelDB + NGINX for External Reverse Proxy

This example runs Padloc with:

-   LevelDB storage
-   filesystem attachments
-   internal NGINX that serves the PWA and proxies the API on one port
-   no published host ports

The stack is designed to sit behind an external reverse proxy on a shared Docker
network named `proxy`.

## Architecture

-   `server` stores vault data in LevelDB and attachments on disk
-   `pwa` builds static frontend assets into a shared volume
-   `nginx` serves:
    -   `/` from the PWA volume
    -   `/server` to the Padloc API
-   external reverse proxy reaches this stack at `http://nginx:80`

## Prerequisites

1. Docker and Docker Compose
2. An external reverse proxy container that can join Docker networks
3. Create the shared network once:

```sh
docker network create proxy
```

## Setup

1. Copy this folder or work from the repository checkout.
2. Create env file:

```sh
cp .env.example .env
```

3. Edit `.env` and set real public URLs:

```env
PL_HOSTNAME=padloc.example.com
PL_PWA_URL=https://padloc.example.com
PL_SERVER_URL=https://padloc.example.com/server
PL_SERVER_CLIENT_URL=https://padloc.example.com
```

Important: `PL_SERVER_URL` and `PL_PWA_URL` are used during the PWA build. If
you change them later, rebuild the `pwa` service.

4. Start the stack from this directory:

```sh
docker compose up -d --build
```

## Connect an external reverse proxy

Attach your external proxy container to the `proxy` network and route the public
hostname to:

```text
http://nginx:80
```

### Example external nginx upstream

```nginx
upstream padloc {
    server nginx:80;
}

server {
    listen 443 ssl;
    server_name padloc.example.com;

    # TLS certificates are managed by the external proxy.
    # ssl_certificate     /path/to/fullchain.pem;
    # ssl_certificate_key /path/to/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://padloc;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Example Traefik labels alternative

If your external proxy is Traefik and you prefer labels on this stack's `nginx`
service, add labels in a local override file. This example keeps compose free of
a specific external-proxy vendor.

## Data and volumes

Named volumes:

-   `data` - LevelDB database files
-   `attachments` - encrypted attachment blobs
-   `pwa` - built frontend assets for nginx

Recreating containers does not delete named volumes.

## Upgrade / rebuild

After pulling newer code in this fork:

```sh
docker compose up -d --build
```

If public URLs changed:

```sh
docker compose up -d --build pwa
docker compose restart nginx
```

## Notes

-   This stack does not terminate TLS. Terminate TLS on the external reverse
    proxy.
-   Email defaults to console logging. Configure SMTP before production invite
    flows.
-   Existing simple demos remain available under `basic`, `nginx`, and `caddy`.
