#!/bin/sh
set -eu
export DEVELOPER_DIR="${PADLOC_XCODE_DIR:-/Applications/Xcode.app/Contents/Developer}"
export PATH="$(cd "$(dirname "$0")" && pwd):/opt/homebrew/bin:$PATH"
exec npm run tauri -- ios "$@"
