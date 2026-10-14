#!/usr/bin/env bash
set -euo pipefail
cd /opt/padloc-staging
candidate=${1:?candidate env file required}
[[ "$candidate" == /opt/padloc-staging/.candidate-* ]] || exit 1
compose=(docker compose --env-file "$candidate" -f compose.yml)
"${compose[@]}" config --quiet
"${compose[@]}" pull
if "${compose[@]}" up -d --remove-orphans; then
    for attempt in {1..60}; do
        if curl --fail --silent --show-error --max-time 10 https://staging.padloc.app/server/healthcheck >/dev/null &&
            curl --fail --silent --show-error --max-time 10 https://staging.padloc.app/ -o .healthcheck.html &&
            grep -q '<title>Padloc' .healthcheck.html; then
            mv "$candidate" .env
            echo 'Staging PWA and API are healthy.'
            exit 0
        fi
        sleep 5
    done
fi
echo 'Staging deployment failed health checks.' >&2
if [[ -f .env ]]; then
    echo 'Restoring previous images; persistent data is not rolled back.' >&2
    docker compose --env-file .env -f compose.yml up -d --remove-orphans
else
    echo 'No previous deployment exists for rollback.' >&2
fi
exit 10
