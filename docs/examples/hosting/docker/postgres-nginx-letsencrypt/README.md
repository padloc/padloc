# Docker + Postgres + NGINX + Letsencrypt

This is a more advanced example of running an instance of the Padloc server
component and web app with [Docker](https://www.docker.com/) and
[Docker Compose](https://docs.docker.com/compose/), using:

-   [PostgreSQL](https://www.postgresql.org/) as the datababase backend
-   [NGINX](https://www.nginx.com/) as a reverse proxy.
-   [Letsencrypt](https://letsencrypt.org/) for obtaining a TLS certificate.

## Setup Instructions

0. Install [Docker](https://docs.docker.com/get-docker/) and
   [Docker Compose](https://docs.docker.com/compose/install/)
1. Clone or download this folder and `cd` into it.
2. Edit the `.env` file to set your STMP settings, Postgres database name,
   username and password, and the host name / domain you want to host the web
   app and server under.

3. Obtain an TLS certificate

    ```sh
    docker-compose up cerbot
    ```

4. Start the server, pwa, database and reverse proxy:

    ```sh
    docker-compose up -d
    ```

Thats it! The web app is now available at `https://$PL_HOSTNAME`

## Renewing the TLS certificate

TLS certificates issued by Letsencrypt are usually valid for 90 days, so you'll
have to regularly renew your certificate. To do so, simply run the following:

```sh
docker-compose down && \
docker-compose up certbot && \
docker-compose up -d
```
