#!/usr/bin/env bash
# Orchestrate Playwright e2e: Docker maildev + padloc stack on dedicated ports + Playwright.
# Uses non-default ports so host services on :3000/:8080 cannot steal the stack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-run}" # run | ui
MAILDEV_IMAGE="${MAILDEV_IMAGE:-maildev/maildev:2.1.0}"
MAILDEV_NAME="${MAILDEV_NAME:-padloc-e2e-maildev}"
SMTP_PORT="${E2E_MAILDEV_SMTP_PORT:-1025}"
WEB_PORT="${E2E_MAILDEV_WEB_PORT:-1080}"
PWA_PORT="${E2E_PWA_PORT:-18080}"
SERVER_PORT="${E2E_SERVER_PORT:-13000}"
STARTED_MAILDEV=0

export E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:${PWA_PORT}}"
export E2E_SERVER_URL="${E2E_SERVER_URL:-http://localhost:${SERVER_PORT}}"

if [[ -z "${E2E_MAILDEV_URL:-}" ]]; then
    export E2E_MAILDEV_URL="http://localhost:${WEB_PORT}"
    E2E_MAILDEV_URL_EXPLICIT=0
else
    E2E_MAILDEV_URL_EXPLICIT=1
fi

maildev_ready() {
    local url="${1:-$E2E_MAILDEV_URL}"
    local body
    body="$(curl -sf "${url}/email" 2>/dev/null)" || return 1
    [[ "$body" == \[* ]]
}

port_in_use() {
    local port="$1"
    if command -v ss >/dev/null 2>&1; then
        ss -tln | grep -qE "[:.]${port}[[:space:]]"
    else
        (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
    fi
}

start_docker_maildev() {
    local web_port="$1"
    docker rm -f "$MAILDEV_NAME" >/dev/null 2>&1 || true
    docker run -d --rm --name "$MAILDEV_NAME" \
        -p "${SMTP_PORT}:1025" \
        -p "${web_port}:1080" \
        "$MAILDEV_IMAGE" >/dev/null
    STARTED_MAILDEV=1
    export E2E_MAILDEV_URL="http://localhost:${web_port}"
    local i
    for i in $(seq 1 60); do
        if maildev_ready; then
            echo "maildev ready at ${E2E_MAILDEV_URL} (smtp :${SMTP_PORT})"
            return 0
        fi
        sleep 0.5
    done
    echo "maildev failed to become ready at ${E2E_MAILDEV_URL}" >&2
    docker logs "$MAILDEV_NAME" 2>&1 || true
    exit 1
}

ensure_maildev() {
    if maildev_ready; then
        echo "Using existing maildev at ${E2E_MAILDEV_URL}"
        return 0
    fi

    if [[ "$E2E_MAILDEV_URL_EXPLICIT" -eq 0 ]] && maildev_ready "http://localhost:1082"; then
        export E2E_MAILDEV_URL="http://localhost:1082"
        echo "Using existing maildev at ${E2E_MAILDEV_URL}"
        return 0
    fi

    if ! command -v docker >/dev/null 2>&1; then
        echo "maildev is not reachable at ${E2E_MAILDEV_URL} and Docker is not available." >&2
        exit 1
    fi

    local web_port="$WEB_PORT"
    if port_in_use "$web_port"; then
        if ! port_in_use 1082; then
            web_port=1082
        else
            echo "maildev web ports ${WEB_PORT} and 1082 are both in use." >&2
            exit 1
        fi
    fi

    if port_in_use "$SMTP_PORT"; then
        if [[ "$E2E_MAILDEV_URL_EXPLICIT" -eq 0 ]] && maildev_ready "http://localhost:1082"; then
            export E2E_MAILDEV_URL="http://localhost:1082"
            echo "Using existing maildev at ${E2E_MAILDEV_URL}"
            return 0
        fi
        echo "SMTP port ${SMTP_PORT} is already in use and maildev REST is not reachable." >&2
        exit 1
    fi

    echo "Starting Docker maildev (${MAILDEV_IMAGE}) smtp:${SMTP_PORT} web:${web_port}"
    start_docker_maildev "$web_port"
}

cleanup() {
    if [[ "$STARTED_MAILDEV" -eq 1 ]]; then
        docker rm -f "$MAILDEV_NAME" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

ensure_maildev

# Dedicated ports — never share host :3000/:8080 with unrelated apps
export PL_PWA_PORT="${PWA_PORT}"
export PL_TRANSPORT_HTTP_PORT="${SERVER_PORT}"
export PL_SERVER_URL="${E2E_SERVER_URL}"
export PL_PWA_URL="${E2E_BASE_URL}"
export PL_SERVER_CLIENT_URL="${E2E_BASE_URL}"
export PL_DATA_BACKEND=memory
export PL_DISABLE_SW=true
export PL_EMAIL_BACKEND=smtp
export PL_EMAIL_SMTP_HOST=localhost
export PL_EMAIL_SMTP_PORT="${SMTP_PORT}"
export PL_EMAIL_SMTP_IGNORE_TLS=true

echo "e2e stack: PWA ${E2E_BASE_URL}  API ${E2E_SERVER_URL}  maildev ${E2E_MAILDEV_URL}"

WAIT_CMD="./node_modules/.bin/wait-on tcp:localhost:${PWA_PORT} tcp:localhost:${SERVER_PORT}"

if [[ "$MODE" == "ui" ]]; then
    APP_CMD="pnpm run dev"
    PW_CMD="playwright test --ui"
else
    APP_CMD="pnpm start"
    PW_CMD="playwright test"
fi

shift || true
if [[ "${1:-}" == "--" ]]; then
    shift
fi
if [[ "$#" -gt 0 ]]; then
    PW_CMD="${PW_CMD} $*"
fi

export PATH="${ROOT}/node_modules/.bin:${PATH}"

# Export E2E_* into playwright child
concurrently \
    --prefix=name \
    --prefix-length=30 \
    --kill-others \
    --success=first \
    -n app,playwright \
    "${APP_CMD}" \
    "${WAIT_CMD} && E2E_BASE_URL=${E2E_BASE_URL} E2E_SERVER_URL=${E2E_SERVER_URL} E2E_MAILDEV_URL=${E2E_MAILDEV_URL} ${PW_CMD}"
status=$?
exit "$status"
