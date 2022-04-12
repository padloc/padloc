sudo docker run --rm --name certbot -p 80:80 \
    -v "/etc/letsencrypt:/etc/letsencrypt" \
    -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
    certbot/certbot certonly --standalone \
    -d test.padloc.app \
    --expand --non-interactive --agree-tos -m martin@pentacode.app
