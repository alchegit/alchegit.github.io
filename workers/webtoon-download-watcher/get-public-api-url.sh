#!/usr/bin/env bash
set -euo pipefail

UNIT="${1:-neokim-webtoon-public-api-tunnel.service}"

journalctl -u "${UNIT}" -n 300 --no-pager \
  | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' \
  | tail -n 1
