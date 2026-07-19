#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${TARGET_URL:-http://127.0.0.1:8088}"

exec cloudflared tunnel --no-autoupdate --url "${TARGET_URL}" --loglevel info
