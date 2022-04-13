# Docker + NGINX

This is a basic example of running an instance of the Padloc server component
and web app with Docker Compose, using [NGINX](https://www.nginx.com/) as a
reverse proxy.

## Setup Instructions

0. Install [Docker](https://docs.docker.com/get-docker/) and
   [Docker Compose](https://docs.docker.com/compose/install/)
1. Clone or download this folder and `cd` into it.
2. Start the server and pwa:

    ```sh
    docker-compose up
    ```

That's it! The web app is now available at http://localhost.
